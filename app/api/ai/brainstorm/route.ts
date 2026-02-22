import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
    messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string()
    })),
    currentDraft: z.object({
        name: z.string().optional(),
        goal: z.string().optional(),
        milestones: z.array(z.string()).optional(),
        constraints: z.array(z.string()).optional(),
        isReady: z.boolean().optional()
    }).optional()
});

const responseSchema = z.object({
    message: z.string(),
    options: z.array(z.string()),
    updatedDraft: z.object({
        name: z.string().optional(),
        goal: z.string().optional(),
        milestones: z.array(z.string()).optional(),
        constraints: z.array(z.string()).optional(),
        isReady: z.boolean().optional()
    })
});

const buildSystemPrompt = (turnCount: number) => {
    return `
You are an expert project architect and brainstorm partner. Your goal is to help users turn vague ideas into concrete, actionable project definitions.

CURRENT TURN: ${turnCount} (Aim to wrap up by turn 4-5)

YOUR CORE MISSION:
1.  **Sequential Inquiry**: Ask exactly ONE high-impact question at a time. Do NOT ask about small details (microcopy, button colors, specific error messages) unless it's a very simple app.
2.  **Stopping Criterion**: Once you have a clear Name, Goal, and 3 high-level Milestones, set "isReady: true" and stop asking questions. Your goal is to be helpful, not pedantic.
3.  **Proactive Suggestions**: For every question you ask, provide exactly 3 concise multiple-choice options.
    *   **CRITICAL**: If you set "isReady: true", return an EMPTY array for "options" []. Do NOT suggest anything once it is time to build.
4.  **Surgical Update (PATCH)**: Only provide fields in "updatedDraft" that have been clarified or changed in this turn.
5.  **Completion Signal**: When you set "isReady: true", you MUST explicitly tell the user in your "message" that the project structure is complete and they can now click the "INITIALIZE PROJECT" button to start building.

MILESTONE RULES:
- Milestones should be CONCRETE DELIVERABLES.
- If you have enough info, GENERATE the milestones yourself and ask if they look good, rather than asking the user to define them.

OUTPUT FORMAT:
{
  "message": "Friendly response. If isReady is true, tell the user the project is ready to build!",
  "options": ["Choice A", "Choice B", "Choice C"], // Empty if isReady: true
  "updatedDraft": { ... }
}
`;
};

const extractJson = (content: string) => {
    try {
        return JSON.parse(content);
    } catch (error) {
        const start = content.indexOf("{");
        const end = content.lastIndexOf("}");
        if (start >= 0 && end > start) {
            const slice = content.slice(start, end + 1);
            return JSON.parse(slice);
        }
        throw error;
    }
};

const getOutputText = (data: unknown) => {
    if (!data || typeof data !== "object") return null;
    const outputText = (data as { output_text?: unknown }).output_text;
    if (typeof outputText === "string") return outputText;
    const output = (data as { output?: unknown }).output;
    if (!Array.isArray(output)) return null;
    for (const item of output) {
        if (!item || typeof item !== "object") continue;
        const content = (item as { content?: unknown }).content;
        if (!Array.isArray(content)) continue;
        const textParts = content
            .map((part) => {
                const textValue = (part as { text?: unknown }).text;
                if (typeof textValue === "string") return textValue;
                const optText = (part as { output_text?: unknown }).output_text;
                if (typeof optText === "string") return optText;
                return null;
            })
            .filter(Boolean);
        if (textParts.length > 0) return textParts.join("");
    }
    return null;
};

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";

    if (!endpoint || !apiKey || !deployment) {
        return NextResponse.json({
            message: "AI configuration missing. I'm operating in offline mode. How can I help?",
            updatedDraft: parsed.data.currentDraft || { name: "", goal: "", milestones: [], constraints: [] }
        });
    }

    const normalize = (value: string) =>
        value
            .trim()
            .replace(/^"+|"+$/g, "")
            .replace(/^'+|'+$/g, "");

    const normalizedEndpoint = endpoint
        ? normalize(endpoint).replace(/\/+$/, "").replace(/\/openai\/.*$/, "")
        : null;

    const responsesUrl = process.env.AZURE_OPENAI_RESPONSES_URL;
    const normalizedResponsesUrl = responsesUrl
        ? normalize(responsesUrl).replace(/\/+$/, "")
        : null;

    const requestUrl = normalizedResponsesUrl
        ? normalizedResponsesUrl.includes("api-version=")
            ? normalizedResponsesUrl
            : `${normalizedResponsesUrl}?api-version=${apiVersion}`
        : `${normalizedEndpoint}/openai/deployments/${deployment}/responses?api-version=${apiVersion}`;

    const schema = {
        name: "brainstorm_response",
        strict: false,
        schema: {
            type: "object",
            additionalProperties: false,
            properties: {
                message: { type: "string" },
                options: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 0,
                    maxItems: 3
                },
                updatedDraft: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        name: { type: "string" },
                        goal: { type: "string" },
                        milestones: { type: "array", items: { type: "string" } },
                        constraints: { type: "array", items: { type: "string" } },
                        isReady: { type: "boolean" }
                    },
                    required: [] // Removing required to allow partial updates in non-strict schema
                }
            },
            required: ["message", "options", "updatedDraft"]
        }
    };

    const conversationContext = parsed.data.messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");

    const turnCount = Math.floor(parsed.data.messages.filter(m => m.role === "user").length);
    const draftContext = parsed.data.currentDraft ? `CURRENT DRAFT: ${JSON.stringify(parsed.data.currentDraft)}` : "NO DRAFT YET";

    try {
        console.log("Brainstorm Requesting:", requestUrl);
        const response = await fetch(requestUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": apiKey,
            },
            body: JSON.stringify({
                instructions: buildSystemPrompt(turnCount),
                input: `${draftContext}\n\nCONVERSATION HISTORY:\n${conversationContext}`,
                model: deployment,
                temperature: 0.7,
                text: {
                    format: {
                        type: "json_schema",
                        name: schema.name,
                        strict: false, // Changed to false to allow partial updates
                        schema: schema.schema,
                    },
                },
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Brainstorm API Error:", response.status, errorBody);
            return NextResponse.json({
                message: "Thinking hard... but I hit a snag. Let's try that again.",
                updatedDraft: parsed.data.currentDraft || { name: "", goal: "", milestones: [], constraints: [], isReady: false }
            });
        }

        const data = await response.json();
        const content = getOutputText(data);
        if (!content) throw new Error("No content in response");

        const result = extractJson(content);
        const validated = responseSchema.safeParse(result);
        if (!validated.success) throw new Error("Invalid output format");

        return NextResponse.json(validated.data);
    } catch (err) {
        console.error("Brainstorm error", err);
        return NextResponse.json({
            message: "I'm having trouble connecting to my creative gears. Can you try again?",
            updatedDraft: parsed.data.currentDraft || { name: "", goal: "", milestones: [], constraints: [] }
        });
    }
}

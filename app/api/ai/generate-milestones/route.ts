import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
    projectId: z.string().min(1),
    goal: z.string().min(1),
    projectName: z.string().min(1),
    constraints: z.object({
        timeBudgetMinutes: z.number().int().positive().optional(),
        focusNotes: z.string().optional(),
    }).optional(),
});

const milestoneSchema = z.object({
    title: z.string().min(1),
});

const responseSchema = z.object({
    milestones: z.array(milestoneSchema).min(1).max(7),
});

const fallbackMilestones = [
    { title: "Define core requirements and scope" },
    { title: "Complete initial prototype or draft" },
    { title: "Review and iterate based on feedback" },
    { title: "Finalize and deliver" },
];

const buildPrompt = (payload: z.infer<typeof requestSchema>) => {
    const focusNotes = payload.constraints?.focusNotes?.trim() || "None";
    const budget = payload.constraints?.timeBudgetMinutes || "Unspecified";

    return `
Project: ${payload.projectName}
Goal: ${payload.goal}
Daily Time Budget: ${budget} minutes
Focus Notes / Constraints: ${focusNotes}

You are an expert project planner. Break down this project's goal into 3 to 5 logical, sequential milestones.

CRITICAL INSTRUCTIONS:
- Each milestone title MUST be 8 words or fewer.
- Write milestones as CONCRETE DELIVERABLES, not process descriptions.
  GOOD: "Working login page with OAuth"
  GOOD: "Database schema and seed data"
  BAD: "Define core requirements and success criteria"
  BAD: "Draft a scoped implementation plan aligned to constraints"
- Do NOT echo back the project name, goal text, or focus notes in milestone titles. Use your own words.
- The milestones MUST respect the "Focus Notes / Constraints" above. Do not include anything outside that scope.
- If the goal is very vague (e.g. just a single word or generic phrase), produce practical starting milestones like research, prototype, and first deliverable.
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
    if (typeof outputText === "string") {
        return outputText;
    }
    const output = (data as { output?: unknown }).output;
    if (!Array.isArray(output)) return null;
    for (const item of output) {
        if (!item || typeof item !== "object") continue;
        const content = (item as { content?: unknown }).content;
        if (!Array.isArray(content)) continue;
        const textParts = content
            .map((part) => {
                if (!part || typeof part !== "object") return null;
                const textValue = (part as { text?: unknown }).text;
                if (typeof textValue === "string") return textValue;
                const outputTextValue = (part as { output_text?: unknown }).output_text;
                if (typeof outputTextValue === "string") return outputTextValue;
                return null;
            })
            .filter(Boolean);
        if (textParts.length > 0) {
            return textParts.join("");
        }
    }
    return null;
};

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid request payload", details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const responsesUrl = process.env.AZURE_OPENAI_RESPONSES_URL;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";

    if ((!endpoint && !responsesUrl) || !apiKey || !deployment) {
        return NextResponse.json({ milestones: fallbackMilestones });
    }

    const normalize = (value: string) =>
        value
            .trim()
            .replace(/^"+|"+$/g, "")
            .replace(/^'+|'+$/g, "");

    const normalizedEndpoint = endpoint
        ? normalize(endpoint).replace(/\/+$/, "").replace(/\/openai\/.*$/, "")
        : null;

    const normalizedResponsesUrl = responsesUrl
        ? normalize(responsesUrl).replace(/\/+$/, "")
        : null;

    const requestUrl = normalizedResponsesUrl
        ? normalizedResponsesUrl.includes("api-version=")
            ? normalizedResponsesUrl
            : `${normalizedResponsesUrl}?api-version=${apiVersion}`
        : `${normalizedEndpoint}/openai/deployments/${deployment}/responses?api-version=${apiVersion}`;

    const schema = {
        name: "milestone_plan",
        strict: true,
        schema: {
            type: "object",
            additionalProperties: false,
            properties: {
                milestones: {
                    type: "array",
                    minItems: 1,
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            title: { type: "string" },
                        },
                        required: ["title"],
                    },
                },
            },
            required: ["milestones"],
        },
    };

    try {
        const response = await fetch(requestUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": apiKey,
            },
            body: JSON.stringify({
                instructions:
                    "You are an expert project planner. Return only the JSON that matches the provided schema.",
                input: buildPrompt(parsed.data),
                model: deployment,
                temperature: 0.2,
                text: {
                    format: {
                        type: "json_schema",
                        name: schema.name,
                        strict: schema.strict,
                        schema: schema.schema,
                    },
                },
            }),
        });

        if (!response.ok) {
            console.error("Failed to fetch from OpenAI", await response.text());
            return NextResponse.json({ milestones: fallbackMilestones });
        }

        const data = await response.json();
        const content = getOutputText(data);
        if (!content || typeof content !== "string") {
            return NextResponse.json({ milestones: fallbackMilestones });
        }

        let payload: unknown;
        try {
            payload = extractJson(content);
        } catch {
            return NextResponse.json({ milestones: fallbackMilestones });
        }
        const validated = responseSchema.safeParse(payload);
        if (!validated.success) {
            return NextResponse.json({ milestones: fallbackMilestones });
        }

        return NextResponse.json(validated.data);
    } catch (err) {
        console.error("AI Milestone generation error", err);
        return NextResponse.json({ milestones: fallbackMilestones });
    }
}

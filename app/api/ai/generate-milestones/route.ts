import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
    projectId: z.string().min(1),
    goal: z.string().min(1),
    projectName: z.string().min(1),
    steeringNotes: z.string().optional(),
    constraints: z.object({
        timeBudgetMinutes: z.number().int().positive().optional(),
        focusNotes: z.string().optional(),
    }).optional(),
});

const milestoneSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
});

const responseSchema = z.object({
    milestones: z.array(milestoneSchema).min(1).max(7),
});

const fallbackMilestones = [
    {
        title: "Define core requirements and scope",
        description: "Document required outcomes, boundaries, and success criteria tied to the project goal.",
    },
    {
        title: "Complete initial prototype or draft",
        description: "Produce a working first version that demonstrates the project's main value in practice.",
    },
    {
        title: "Review and iterate based on feedback",
        description: "Validate results against the goal and refine weak areas with concrete fixes.",
    },
    {
        title: "Finalize and deliver",
        description: "Polish, verify, and package the final deliverable so it is ready for real use.",
    },
];

const buildPrompt = (payload: z.infer<typeof requestSchema>) => {
    const focusNotes = payload.constraints?.focusNotes?.trim() || "None";
    const steeringNotes = payload.steeringNotes?.trim() || "None";
    const budget = payload.constraints?.timeBudgetMinutes || "Unspecified";

    return `
Project: ${payload.projectName}
Goal: ${payload.goal}
Daily Time Budget: ${budget} minutes
Focus Notes / Constraints: ${focusNotes}
Additional Milestone Steering Guidance: ${steeringNotes}

You are an expert project planner. Break down this project's goal into 3 to 5 logical, sequential milestones.
Think hard before responding: reason carefully about scope boundaries, sequencing, and deliverable quality.

CRITICAL INSTRUCTIONS:
- Each milestone title MUST be 8 words or fewer.
- Write milestones as CONCRETE DELIVERABLES, not process descriptions.
  GOOD: "Working login page with OAuth"
  GOOD: "Database schema and seed data"
  BAD: "Define core requirements and success criteria"
  BAD: "Draft a scoped implementation plan aligned to constraints"
- Do NOT echo back the project name, goal text, or focus notes in milestone titles. Use your own words.
- The milestones MUST respect the "Focus Notes / Constraints" and "Additional Milestone Steering Guidance" above. Do not include anything outside that scope.
- If the goal is very vague (e.g. just a single word or generic phrase), produce practical starting milestones like research, prototype, and first deliverable.
- For each milestone, include a concise description (1 sentence) that grounds the title in concrete project content and expected outcome.
- Descriptions should mention what will exist or be validated once that milestone is complete.
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

const getReasoningTokens = (data: unknown): number | undefined => {
    if (!data || typeof data !== "object") return undefined;
    const usage = (data as { usage?: unknown }).usage;
    if (!usage || typeof usage !== "object") return undefined;
    const outputDetails = (usage as { output_tokens_details?: unknown }).output_tokens_details;
    if (!outputDetails || typeof outputDetails !== "object") return undefined;
    const reasoningTokens = (outputDetails as { reasoning_tokens?: unknown }).reasoning_tokens;
    return typeof reasoningTokens === "number" ? reasoningTokens : undefined;
};

export async function POST(request: Request) {
    const requestStartedAt = Date.now();
    const createDebugMeta = (
        overrides: Partial<{
            fallback: boolean;
            fallbackReason: string;
            reasoningFieldUsed: "reasoning.effort" | "none";
            reasoningTokens: number;
            reasoningAttemptErrors: Array<{
                label: "reasoning.effort" | "none";
                status: number;
                errorSnippet: string;
            }>;
        }> = {},
    ) => ({
        latencyMs: Date.now() - requestStartedAt,
        reasoningEffortRequested: "high",
        ...overrides,
    });

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
        return NextResponse.json({
            milestones: fallbackMilestones,
            meta: createDebugMeta({
                fallback: true,
                fallbackReason: "missing_ai_config",
                reasoningFieldUsed: "none",
            }),
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
                            description: { type: "string" },
                        },
                        required: ["title", "description"],
                    },
                },
            },
            required: ["milestones"],
        },
    };

    try {
        const requestBase = {
            instructions:
                "You are an expert project planner. Return only the JSON that matches the provided schema.",
            input: buildPrompt(parsed.data),
            model: deployment,
            text: {
                format: {
                    type: "json_schema" as const,
                    name: schema.name,
                    strict: schema.strict,
                    schema: schema.schema,
                },
            },
        };

        const requestVariants: Array<{
            label: "reasoning.effort" | "none";
            body: Record<string, unknown>;
        }> = [
            { label: "reasoning.effort", body: { ...requestBase, reasoning: { effort: "high" } } },
            { label: "none", body: { ...requestBase, temperature: 0.2 } },
        ];

        let response: Response | null = null;
        let reasoningFieldUsed: "reasoning.effort" | "none" = "none";
        let lastErrorBody = "";
        const reasoningAttemptErrors: Array<{
            label: "reasoning.effort" | "none";
            status: number;
            errorSnippet: string;
        }> = [];

        for (const variant of requestVariants) {
            const attempt = await fetch(requestUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "api-key": apiKey,
                },
                body: JSON.stringify(variant.body),
            });

            if (attempt.ok) {
                response = attempt;
                reasoningFieldUsed = variant.label;
                break;
            }
            lastErrorBody = await attempt.text();
            reasoningAttemptErrors.push({
                label: variant.label,
                status: attempt.status,
                errorSnippet: lastErrorBody.slice(0, 260),
            });
        }

        if (!response) {
            console.error("Failed to fetch from OpenAI", lastErrorBody);
            return NextResponse.json({
                milestones: fallbackMilestones,
                meta: createDebugMeta({
                    fallback: true,
                    fallbackReason: "all_request_variants_failed",
                    reasoningFieldUsed,
                    reasoningAttemptErrors,
                }),
            });
        }

        const data = await response.json();
        const content = getOutputText(data);
        if (!content || typeof content !== "string") {
            return NextResponse.json({
                milestones: fallbackMilestones,
                meta: createDebugMeta({
                    fallback: true,
                    fallbackReason: "empty_or_invalid_output_text",
                    reasoningFieldUsed,
                    reasoningTokens: getReasoningTokens(data),
                    reasoningAttemptErrors,
                }),
            });
        }

        let payload: unknown;
        try {
            payload = extractJson(content);
        } catch {
            return NextResponse.json({
                milestones: fallbackMilestones,
                meta: createDebugMeta({
                    fallback: true,
                    fallbackReason: "unparseable_model_json",
                    reasoningFieldUsed,
                    reasoningTokens: getReasoningTokens(data),
                    reasoningAttemptErrors,
                }),
            });
        }
        const validated = responseSchema.safeParse(payload);
        if (!validated.success) {
            return NextResponse.json({
                milestones: fallbackMilestones,
                meta: createDebugMeta({
                    fallback: true,
                    fallbackReason: "schema_validation_failed",
                    reasoningFieldUsed,
                    reasoningTokens: getReasoningTokens(data),
                    reasoningAttemptErrors,
                }),
            });
        }

        return NextResponse.json({
            ...validated.data,
            meta: createDebugMeta({
                fallback: false,
                reasoningFieldUsed,
                reasoningTokens: getReasoningTokens(data),
                reasoningAttemptErrors,
            }),
        });
    } catch (err) {
        console.error("AI Milestone generation error", err);
        return NextResponse.json({
            milestones: fallbackMilestones,
            meta: createDebugMeta({
                fallback: true,
                fallbackReason: "unexpected_route_error",
                reasoningFieldUsed: "none",
            }),
        });
    }
}

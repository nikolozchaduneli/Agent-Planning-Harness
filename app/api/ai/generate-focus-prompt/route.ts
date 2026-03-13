import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  goal: z.string().min(1),
  constraints: z
    .object({
      timeBudgetMinutes: z.number().int().positive().optional(),
      focusNotes: z.string().optional(),
      projectConstraints: z.string().optional(),
    })
    .optional(),
  task: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    estimateMinutes: z.number().int().positive().max(480).optional(),
    status: z.enum(["todo", "doing", "done"]).optional(),
    milestoneTitle: z.string().optional(),
    milestoneDescription: z.string().optional(),
  }),
  relatedTasks: z
    .array(
      z.object({
        title: z.string().min(1),
        status: z.enum(["todo", "doing", "done"]).optional(),
        estimateMinutes: z.number().int().positive().max(480).optional(),
        milestoneTitle: z.string().optional(),
      }),
    )
    .max(8)
    .optional(),
  userIntent: z.string().max(400).optional(),
  sandboxNotes: z
    .object({
      definitionOfDone: z.string().max(1000).optional(),
      firstMove: z.string().max(1000).optional(),
      risks: z.string().max(1000).optional(),
    })
    .optional(),
});

const responseSchema = z.object({
  prompt: z.string().min(1),
  checklist: z.array(z.string().min(1)).min(3).max(8),
});

const buildContextSummary = (payload: z.infer<typeof requestSchema>) => {
  const milestoneTitle = payload.task.milestoneTitle?.trim() || "Whole Project";
  const milestoneDescription = payload.task.milestoneDescription?.trim() || "None";
  const taskDescription = payload.task.description?.trim() || "None";
  const focusNotes = payload.constraints?.focusNotes?.trim() || "None";
  const projectConstraints = payload.constraints?.projectConstraints?.trim() || "None";
  const userIntent = payload.userIntent?.trim() || "Solve this task end-to-end with high confidence.";
  const definitionOfDone = payload.sandboxNotes?.definitionOfDone?.trim() || "Not specified";
  const firstMove = payload.sandboxNotes?.firstMove?.trim() || "Not specified";
  const risks = payload.sandboxNotes?.risks?.trim() || "Not specified";

  const relatedTasks =
    payload.relatedTasks && payload.relatedTasks.length > 0
      ? payload.relatedTasks
        .map((task) => {
          const parts = [
            task.title.trim(),
            task.status ? `status: ${task.status}` : "",
            task.estimateMinutes ? `estimate: ${task.estimateMinutes}m` : "",
            task.milestoneTitle ? `milestone: ${task.milestoneTitle}` : "",
          ].filter(Boolean);
          return `- ${parts.join(" | ")}`;
        })
        .join("\n")
      : "- None";

  return {
    milestoneTitle,
    milestoneDescription,
    taskDescription,
    focusNotes,
    projectConstraints,
    userIntent,
    definitionOfDone,
    firstMove,
    risks,
    relatedTasks,
  };
};

const buildFallbackPrompt = (payload: z.infer<typeof requestSchema>) => {
  const summary = buildContextSummary(payload);
  const timeBudget = payload.constraints?.timeBudgetMinutes
    ? `${payload.constraints.timeBudgetMinutes} minutes/day`
    : "Not specified";
  const taskEstimate = payload.task.estimateMinutes
    ? `${payload.task.estimateMinutes} minutes`
    : "Not specified";

  return {
    prompt: `You are my senior execution copilot. Help me complete one focused task with concrete steps, quality checks, and minimal ambiguity.

PROJECT CONTEXT
- Project: ${payload.projectName}
- Project goal: ${payload.goal}
- Time budget: ${timeBudget}
- Focus notes: ${summary.focusNotes}
- Project constraints: ${summary.projectConstraints}

TASK CONTEXT
- Task title: ${payload.task.title}
- Task description: ${summary.taskDescription}
- Task estimate: ${taskEstimate}
- Task status: ${payload.task.status || "todo"}
- Milestone: ${summary.milestoneTitle}
- Milestone scope: ${summary.milestoneDescription}
- My specific objective: ${summary.userIntent}

SANDBOX NOTES
- Definition of done: ${summary.definitionOfDone}
- First 10-minute move idea: ${summary.firstMove}
- Risks/blockers: ${summary.risks}

RELATED TASKS
${summary.relatedTasks}

INSTRUCTIONS
1) If critical details are missing, ask up to 3 precise clarifying questions first.
2) Then produce:
   - A short execution plan (ordered steps, each with expected output).
   - The exact first action I should do right now.
   - Any code/commands/templates needed for the next step.
   - A verification checklist mapped to the definition of done.
   - A fallback path if assumptions fail.
3) Keep recommendations tightly scoped to this task and milestone.
4) Be explicit, concise, and implementation-ready.`,
    checklist: [
      "Confirm assumptions and request only essential clarifications.",
      "Create an ordered plan with clear outputs for each step.",
      "Start with the smallest high-leverage action immediately.",
      "Validate against definition of done and milestone scope.",
      "Call out risks early and provide fallback options.",
    ],
  };
};

const buildPrompt = (payload: z.infer<typeof requestSchema>) => {
  const summary = buildContextSummary(payload);
  const timeBudget = payload.constraints?.timeBudgetMinutes
    ? `${payload.constraints.timeBudgetMinutes} minutes/day`
    : "Not specified";
  const taskEstimate = payload.task.estimateMinutes
    ? `${payload.task.estimateMinutes} minutes`
    : "Not specified";

  return `
Create a single high-quality prompt that the user can paste into an advanced AI assistant to complete the task below.
The prompt must be practical, context-rich, and structured for reliable execution.

PROJECT
- Name: ${payload.projectName}
- Goal: ${payload.goal}
- Time budget: ${timeBudget}
- Focus notes: ${summary.focusNotes}
- Project constraints: ${summary.projectConstraints}

TASK
- Title: ${payload.task.title}
- Description: ${summary.taskDescription}
- Estimate: ${taskEstimate}
- Status: ${payload.task.status || "todo"}
- Milestone: ${summary.milestoneTitle}
- Milestone details: ${summary.milestoneDescription}
- User objective: ${summary.userIntent}

SANDBOX NOTES
- Definition of done: ${summary.definitionOfDone}
- First move candidate: ${summary.firstMove}
- Risks/blockers: ${summary.risks}

RELATED TASKS
${summary.relatedTasks}

RESPONSE REQUIREMENTS
- Return JSON with:
  - "prompt": the final prompt text.
  - "checklist": 4 to 6 short execution checks.
- The generated prompt must:
  1) Assign a clear expert role to the assistant.
  2) Include explicit task scope, constraints, and success criteria.
  3) Demand a step-by-step plan plus immediate next action.
  4) Require verification steps tied to definition of done.
  5) Include a missing-information policy (ask up to 3 clarifying questions).
  6) Keep output concise, actionable, and implementation-ready.
- Keep the final generated prompt under 450 words.
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

  const fallback = buildFallbackPrompt(parsed.data);

  if ((!endpoint && !responsesUrl) || !apiKey || !deployment) {
    return NextResponse.json({
      ...fallback,
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

  const normalizedResponsesUrl = responsesUrl ? normalize(responsesUrl).replace(/\/+$/, "") : null;

  const requestUrl = normalizedResponsesUrl
    ? normalizedResponsesUrl.includes("api-version=")
      ? normalizedResponsesUrl
      : `${normalizedResponsesUrl}?api-version=${apiVersion}`
    : `${normalizedEndpoint}/openai/deployments/${deployment}/responses?api-version=${apiVersion}`;

  const schema = {
    name: "focus_prompt_plan",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        prompt: { type: "string" },
        checklist: {
          type: "array",
          minItems: 3,
          maxItems: 8,
          items: { type: "string" },
        },
      },
      required: ["prompt", "checklist"],
    },
  };

  try {
    const requestBase = {
      instructions:
        "You are an expert project execution coach and prompt engineer. Return only JSON matching the schema.",
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
      console.error("Focus prompt generation call failed", lastErrorBody);
      return NextResponse.json({
        ...fallback,
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
        ...fallback,
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
        ...fallback,
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
        ...fallback,
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
  } catch (error) {
    console.error("Focus prompt generation route failed", error);
    return NextResponse.json({
      ...fallback,
      meta: createDebugMeta({
        fallback: true,
        fallbackReason: "unexpected_route_error",
        reasoningFieldUsed: "none",
      }),
    });
  }
}

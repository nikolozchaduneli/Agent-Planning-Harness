import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  projectId: z.string().min(1),
  goal: z.string().min(1),
  projectName: z.string().optional(),
  milestoneTitle: z.string().optional(),
  milestones: z
    .array(
      z.object({
        title: z.string().min(1),
        status: z.enum(["active", "completed"]).optional(),
      }),
    )
    .optional(),
  constraints: z.object({
    timeBudgetMinutes: z.number().int().positive().optional(),
    focusNotes: z.string().optional(),
  }),
  timeBudgetMinutes: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  estimateMinutes: z.number().int().positive().max(480),
});

const responseSchema = z.object({
  tasks: z.array(taskSchema).min(1),
});

const getFallbackTasks = (milestoneTitle?: string | null) => {
  const trimmedMilestone = milestoneTitle?.trim();
  if (trimmedMilestone) {
    return [
      {
        title: `Clarify ${trimmedMilestone} scope`,
        description: "List in-scope deliverables and explicitly note exclusions.",
        estimateMinutes: 20,
      },
      {
        title: `Define ${trimmedMilestone} success criteria`,
        description: "Write acceptance criteria and measurable outcomes for this milestone.",
        estimateMinutes: 30,
      },
      {
        title: `Outline the execution plan for ${trimmedMilestone}`,
        description: "Sequence the key tasks needed to deliver this milestone.",
        estimateMinutes: 40,
      },
    ];
  }
  return [
    {
      title: "Define today's target outcome",
      description: "Write a 2-3 sentence definition of success for today.",
      estimateMinutes: 15,
    },
    {
      title: "Break goal into 3 concrete steps",
      description: "List the three smallest deliverables that move the goal forward.",
      estimateMinutes: 25,
    },
    {
      title: "Deliver the first step",
      description: "Complete the most important deliverable end-to-end.",
      estimateMinutes: 60,
    },
  ];
};

const buildPrompt = (payload: z.infer<typeof requestSchema>) => {
  const focusNotes = payload.constraints.focusNotes?.trim();
  const budget = payload.timeBudgetMinutes ?? payload.constraints.timeBudgetMinutes;
  const milestoneContext = payload.milestoneTitle ? `\nTarget Milestone: ${payload.milestoneTitle}` : "";
  const milestoneList = payload.milestones?.map((m) => m.title.trim()).filter(Boolean) ?? [];
  const otherMilestones = payload.milestoneTitle
    ? milestoneList.filter((title) => title !== payload.milestoneTitle)
    : milestoneList;
  const milestonesContext =
    milestoneList.length > 0
      ? `\nAll milestones: ${milestoneList.join(" | ")}`
      : "";
  const otherMilestonesContext =
    otherMilestones.length > 0
      ? `\nOther milestones (avoid overlap): ${otherMilestones.join(" | ")}`
      : "";
  const forbiddenMilestonesContext =
    otherMilestones.length > 0
      ? `\nDO NOT include tasks for these milestones: ${otherMilestones.join(" | ")}`
      : "";
  return `
Project: ${payload.projectName || 'Unspecified'}
Goal: ${payload.goal}${milestoneContext}${milestonesContext}${otherMilestonesContext}${forbiddenMilestonesContext}
Time budget (minutes): ${budget ?? "unspecified"}
Focus notes: ${focusNotes || "none"}
User notes: ${payload.notes?.trim() || "none"}

Create a concise list of tasks with realistic time estimates. Keep tasks actionable and ordered.
If a target milestone is provided, keep tasks tightly scoped to it and avoid tasks that belong to other milestones.
If a time budget is provided, the SUM of estimateMinutes across all tasks must be <= that budget.`;
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
    return NextResponse.json({ tasks: getFallbackTasks(parsed.data.milestoneTitle) });
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
    name: "task_plan",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        tasks: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              description: { type: ["string", "null"] },
              estimateMinutes: { type: "integer", minimum: 5, maximum: 480 },
            },
            required: ["title", "description", "estimateMinutes"],
          },
        },
      },
      required: ["tasks"],
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
      return NextResponse.json({ tasks: getFallbackTasks(parsed.data.milestoneTitle) });
    }

    const data = await response.json();
    const content = getOutputText(data);
    if (!content || typeof content !== "string") {
      return NextResponse.json({ tasks: getFallbackTasks(parsed.data.milestoneTitle) });
    }

    let payload: unknown;
    try {
      payload = extractJson(content);
    } catch {
      return NextResponse.json({ tasks: getFallbackTasks(parsed.data.milestoneTitle) });
    }
    const validated = responseSchema.safeParse(payload);
    if (!validated.success) {
      return NextResponse.json({ tasks: getFallbackTasks(parsed.data.milestoneTitle) });
    }

    const milestoneTitle = parsed.data.milestoneTitle?.trim();
    const otherMilestones = milestoneTitle
      ? (parsed.data.milestones ?? [])
          .map((milestone) => milestone.title.trim())
          .filter((title) => title && title.toLowerCase() !== milestoneTitle.toLowerCase())
      : [];
    let tasks = validated.data.tasks;
    let filteredCount = 0;

    if (milestoneTitle && otherMilestones.length > 0) {
      const forbidden = otherMilestones.map((title) => title.toLowerCase());
      const filtered = tasks.filter((task) => {
        const haystack = `${task.title} ${task.description ?? ""}`.toLowerCase();
        return !forbidden.some((title) => haystack.includes(title));
      });
      filteredCount = tasks.length - filtered.length;
      tasks = filtered;
    }

    if (tasks.length === 0) {
      tasks = getFallbackTasks(milestoneTitle);
    }

    return NextResponse.json({
      tasks,
      ...(filteredCount > 0 ? { scopeWarning: { filteredCount } } : {}),
    });
  } catch {
    return NextResponse.json({ tasks: getFallbackTasks(parsed.data.milestoneTitle) });
  }
}

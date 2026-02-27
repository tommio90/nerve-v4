import { z } from "zod";
import OpenAI from "openai";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const generatedTaskSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string().min(3).max(120),
      description: z.string().min(10).max(600),
      type: z.enum(["RESEARCH", "CONTENT", "ANALYSIS", "OUTREACH", "PHONE_CALL", "CUSTOM"]),
      priority: z.number().int().min(1).max(5),
    }),
  ).min(3).max(5),
});

function parseResponseContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const textPart = content.find(
    (item) => item && typeof item === "object" && "type" in item && (item as { type?: string }).type === "text",
  );
  if (!textPart || typeof textPart !== "object" || !("text" in textPart)) return "";
  const text = (textPart as { text?: unknown }).text;
  return typeof text === "string" ? text : "";
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  if (!process.env.OPENAI_API_KEY) {
    return fail("OPENAI_API_KEY is not configured", "INTERNAL_ERROR", 500);
  }

  try {
    const project = await db.project.findUnique({
      where: { id },
      include: { tasks: { select: { title: true, description: true } } },
    });

    if (!project) {
      return fail("Project not found", "NOT_FOUND", 404);
    }

    // Fetch whitepaper content for context
    let whitepaperContent = "";
    if (project.whitepaperDocId) {
      const wp = await db.doc.findUnique({ where: { id: project.whitepaperDocId } });
      whitepaperContent = wp?.content || "";
    }
    const existingTasks = project.tasks
      .slice(0, 10)
      .map((task) => `- ${task.title}: ${task.description}`)
      .join("\n");

    const prompt = `Generate 3 to 5 execution tasks for this project.

Include background whitepaper context if available.
Whitepaper:
${whitepaperContent || "None"}

Project title: ${project.title}
Project description: ${project.description}
Project reasoning: ${project.reasoning || "N/A"}

Existing tasks (avoid duplicates and overlap):
${existingTasks || "None"}

Output JSON only in this exact shape:
{
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "type": "RESEARCH|CONTENT|ANALYSIS|OUTREACH|PHONE_CALL|CUSTOM",
      "priority": 1
    }
  ]
}

Constraints:
- 3 to 5 tasks only
- Task titles must be short and actionable
- Descriptions should describe the concrete output expected
- Priorities must be 1 (highest) to 5 (lowest)
- Tasks should be sequenced logically by priority`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Return only valid JSON, no markdown, no prose.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = parseResponseContent(response.choices[0]?.message?.content ?? "");
    const parsed = generatedTaskSchema.parse(JSON.parse(raw));

    const tasks = await db.$transaction(
      parsed.tasks.map((task) =>
        db.task.create({
          data: {
            projectId: project.id,
            title: task.title.trim(),
            description: task.description.trim(),
            deliverable: task.description.trim(),
            type: task.type,
            priority: task.priority,
            modelTier: task.priority <= 2 ? "DEEP" : "BALANCED",
            status: "PROPOSED",
          },
        }),
      ),
    );

    return ok({ tasks }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid AI response structure", "INTERNAL_ERROR", 500, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to generate tasks", "INTERNAL_ERROR", 500);
  }
}

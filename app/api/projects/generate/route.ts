import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";
import OpenAI from "openai";

function getClient() { return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); }

export async function POST() {
  try {
    // Fetch recent tasks and memory context
    const recentTasks = await db.task.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { project: { select: { title: true } } },
    });

    const recentDocs = await db.doc.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: { title: true, summary: true, content: true },
    });

    // Build context
    const taskContext = recentTasks
      .map((t) => `- ${t.project.title}: ${t.title}`)
      .join("\n");

    const docContext = recentDocs
      .map((d) => `- ${d.title}${d.summary ? `: ${d.summary}` : ""}`)
      .join("\n");

    const prompt = `You are helping generate a new project proposal based on recent work and memory.

**Recent Tasks:**
${taskContext || "None"}

**Recent Docs:**
${docContext || "None"}

**Task:** Generate a new project proposal that:
1. Builds on existing work but explores new territory
2. Aligns with the thesis: "AI optimizes within distributions. Humans expand distributions. The future belongs to those who cultivate curiosity."
3. Is actionable and scoped appropriately

Respond with ONLY a JSON object in this exact format (no markdown, no explanation):
{
  "title": "Project Title",
  "description": "2-3 sentence description of the project",
  "thesisScore": 0.75,
  "scope": "M",
  "reasoning": "1-2 sentences explaining why this project aligns with the thesis and builds on recent work"
}`;

    const response = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Return only valid JSON. No markdown, no explanation.",
        },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return fail("Empty AI response", "INTERNAL_ERROR", 500);
    }

    const project = JSON.parse(content);

    // Validate required fields
    if (!project.title || !project.description || typeof project.thesisScore !== "number") {
      return fail("Invalid AI response structure", "INTERNAL_ERROR", 500);
    }

    return ok({ project });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to generate project", "INTERNAL_ERROR", 500);
  }
}

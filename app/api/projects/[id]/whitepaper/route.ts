import { z } from "zod";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { buildDocTags, serializeTags } from "@/lib/doc-tags";

function getClient() { return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); }

// Schema for linking existing doc
const linkSchema = z.object({ docId: z.string().cuid() });

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!process.env.OPENAI_API_KEY) {
    return fail("OPENAI_API_KEY is not configured", "INTERNAL_ERROR", 500);
  }
  // Load project
  const project = await db.project.findUnique({ where: { id } });
  if (!project) {
    return fail("Project not found", "NOT_FOUND", 404);
  }
  try {
    // Build whitepaper via AI
    const prompt = `You are a technical writer. Generate a detailed whitepaper in markdown for this project.

Project title: ${project.title}
Description: ${project.description}
Reasoning: ${project.reasoning || 'N/A'}
`;
    const response = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return only markdown content, no explanations." },
        { role: "user", content: prompt },
      ],
    });
    const content = response.choices[0]?.message?.content ?? "";
    // Create doc record
    const doc = await db.doc.create({
      data: {
        title: `${project.title} Whitepaper`,
        content: content.trim(),
        category: "whitepaper",
        source: "project-whitepaper",
        tags: serializeTags(
          buildDocTags({
            title: `${project.title} Whitepaper`,
            content: content.trim(),
            category: "whitepaper",
            source: "project-whitepaper",
            requiredTags: ["project-doc", "ai-generated"],
          }),
        ),
      },
    });
    // Link to project
    await db.project.update({ where: { id }, data: { whitepaperDocId: doc.id } });
    return ok({ doc }, { status: 201 });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to generate whitepaper', 'INTERNAL_ERROR', 500);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const json = await request.json();
  const result = linkSchema.safeParse(json);
  if (!result.success) {
    return fail("Invalid request body", "BAD_REQUEST", 400);
  }
  const { docId } = result.data;
  // Validate doc exists
  const doc = await db.doc.findUnique({ where: { id: docId } });
  if (!doc) {
    return fail("Doc not found", "NOT_FOUND", 404);
  }
  // Update project link
  await db.project.update({ where: { id }, data: { whitepaperDocId: docId } });
  return ok({ doc }, { status: 200 });
}

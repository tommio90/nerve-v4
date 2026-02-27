import OpenAI from "openai";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { buildDocTags, serializeTags } from "@/lib/doc-tags";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const requestSchema = z.object({
  prompt: z.string().min(8).max(8000),
  title: z.string().min(1).max(200).optional(),
});

function inferTitleFromContent(markdown: string) {
  const firstHeading = markdown
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("# "));

  return firstHeading?.replace(/^#\s+/, "").trim() || "AI Generated Document";
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return fail("OPENAI_API_KEY is not configured", "INTERNAL_ERROR", 500);
    }

    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Invalid payload", "BAD_REQUEST", 400, parsed.error.flatten());
    }

    const { prompt, title } = parsed.data;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You write dense, practical markdown docs. Return markdown only. Include clear sections, actionable steps, and concise reasoning.",
        },
        {
          role: "user",
          content: `Create a comprehensive document in markdown based on this topic/instructions:\n\n${prompt}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!content) {
      return fail("Empty AI response", "INTERNAL_ERROR", 500);
    }

    const docTitle = title?.trim() || inferTitleFromContent(content);

    const doc = await db.doc.create({
      data: {
        title: docTitle,
        content,
        category: "generated",
        source: "prompt",
        summary: "Generated from prompt with OpenAI",
        tags: serializeTags(
          buildDocTags({
            title: docTitle,
            content,
            category: "generated",
            source: "prompt",
            requiredTags: ["ai-generated"],
          }),
        ),
      },
    });

    return ok({ doc, content }, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to generate doc", "INTERNAL_ERROR", 500);
  }
}

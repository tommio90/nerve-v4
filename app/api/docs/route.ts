import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { buildDocTags, serializeTags } from "@/lib/doc-tags";

const docSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  summary: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  venture: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().datetime().optional(),
});

export async function GET() {
  try {
    const docs = await db.doc.findMany({ orderBy: { createdAt: "desc" } });
    return ok({ docs });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load docs", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = docSchema.parse(await request.json());
    const tags = buildDocTags({
      title: payload.title,
      content: payload.content,
      category: payload.category,
      source: payload.source,
      venture: payload.venture,
      existingTags: payload.tags || [],
    });

    const doc = await db.doc.create({
      data: {
        ...payload,
        tags: serializeTags(tags),
      },
    });
    return ok({ doc }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to create doc", "INTERNAL_ERROR", 500);
  }
}

import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { buildDocTags, parseTags, serializeTags } from "@/lib/doc-tags";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().optional(),
  category: z.string().optional(),
  venture: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const doc = await db.doc.findUnique({ where: { id } });
    if (!doc) {
      return fail("Doc not found", "NOT_FOUND", 404);
    }
    return ok({ doc });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load doc", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const payload = updateSchema.parse(await request.json());
    const existing = await db.doc.findUnique({ where: { id } });
    if (!existing) {
      return fail("Doc not found", "NOT_FOUND", 404);
    }

    const nextTitle = payload.title ?? existing.title;
    const nextContent = payload.content ?? existing.content;
    const nextCategory = payload.category ?? existing.category;
    const nextSource = payload.source ?? existing.source;
    const nextVenture = payload.venture ?? existing.venture;

    const tags = buildDocTags({
      title: nextTitle,
      content: nextContent,
      category: nextCategory,
      source: nextSource,
      venture: nextVenture,
      existingTags: payload.tags ?? parseTags(existing.tags),
    });

    const doc = await db.doc.update({
      where: { id },
      data: {
        ...payload,
        tags: serializeTags(tags),
      },
    });
    return ok({ doc });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to update doc", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    await db.doc.delete({ where: { id } });
    return ok({ success: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to delete doc", "INTERNAL_ERROR", 500);
  }
}

import { ok, fail } from "@/lib/api";
import { db } from "@/lib/db";
import { embedText } from "@/lib/embeddings";

function buildEmbeddingInput(doc: { title: string; summary: string | null; content: string }) {
  return [doc.title, doc.summary, doc.content].filter(Boolean).join(" ").slice(0, 8000);
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const doc = await db.doc.findUnique({
      where: { id },
      select: { id: true, title: true, summary: true, content: true },
    });

    if (!doc) {
      return fail("Doc not found", "NOT_FOUND", 404);
    }

    const input = buildEmbeddingInput(doc);
    const embedding = await embedText(input);

    await db.doc.update({
      where: { id },
      data: { embedding: JSON.stringify(embedding) },
    });

    return ok({ ok: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Embedding failed", "INTERNAL_ERROR", 500);
  }
}

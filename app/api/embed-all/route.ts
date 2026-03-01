import { ok, fail } from "@/lib/api";
import { db } from "@/lib/db";
import { embedText } from "@/lib/embeddings";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

function buildEmbeddingInput(doc: { title: string; summary: string | null; content: string }) {
  return [doc.title, doc.summary, doc.content].filter(Boolean).join(" ").slice(0, 8000);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST() {
  try {
    const docs = await db.doc.findMany({
      where: { embedding: null },
      select: { id: true, title: true, content: true, summary: true },
    });

    let embedded = 0;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE);

      for (const doc of batch) {
        try {
          const input = buildEmbeddingInput(doc);
          const embedding = await embedText(input);
          await db.doc.update({
            where: { id: doc.id },
            data: { embedding: JSON.stringify(embedding) },
          });
          embedded += 1;
        } catch {
          continue;
        }
      }

      if (i + BATCH_SIZE < docs.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    return ok({ embedded, total: docs.length });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Embedding failed", "INTERNAL_ERROR", 500);
  }
}

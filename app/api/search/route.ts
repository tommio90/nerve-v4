import { ok, fail } from "@/lib/api";
import { db } from "@/lib/db";
import { cosineSimilarity, embedText } from "@/lib/embeddings";

const DEFAULT_LIMIT = 8;

type DocRow = {
  id: string;
  title: string;
  summary: string | null;
  venture: string | null;
  tags: string;
  embedding: string | null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim();
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : DEFAULT_LIMIT;

    if (!query) {
      return ok({ results: [] });
    }

    const queryEmbedding = await embedText(query);

    const docs = await db.$queryRaw<DocRow[]>`
      SELECT id, title, summary, venture, tags, embedding
      FROM Doc
      WHERE embedding IS NOT NULL
    `;

    const scored = docs
      .map((doc) => {
        if (!doc.embedding) return null;
        try {
          const embedding = JSON.parse(doc.embedding) as number[];
          const score = cosineSimilarity(queryEmbedding, embedding);
          if (!Number.isFinite(score)) return null;
          return { ...doc, score };
        } catch {
          return null;
        }
      })
      .filter((doc): doc is DocRow & { score: number } => Boolean(doc))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((doc) => ({
        id: doc.id,
        title: doc.title,
        summary: doc.summary,
        venture: doc.venture,
        tags: doc.tags,
        score: doc.score,
      }));

    return ok({ results: scored });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Search failed", "INTERNAL_ERROR", 500);
  }
}

import { fail } from "@/lib/api";
import { db } from "@/lib/db";
import { generatePodcastScript, synthesizePodcast } from "@/lib/ai/podcast";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const doc = await db.doc.findUnique({ where: { id } });
    if (!doc) {
      return fail("Doc not found", "NOT_FOUND", 404);
    }

    const script = await generatePodcastScript(doc.content);
    const audioBase64 = await synthesizePodcast(script);

    return NextResponse.json({
      ok: true,
      docId: id,
      script,
      audio: audioBase64,
      mimeType: "audio/mpeg",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to generate podcast", "INTERNAL_ERROR", 500);
  }
}

import { z } from "zod";
import { randomUUID } from "crypto";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const shareSchema = z.object({
  enable: z.boolean(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const doc = await db.doc.findUnique({ where: { id } });
    if (!doc) {
      return fail("Doc not found", "NOT_FOUND", 404);
    }

    return ok({ shareToken: doc.shareToken, isPublic: doc.isPublic });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load share status", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const payload = shareSchema.parse(await request.json());
    const existing = await db.doc.findUnique({ where: { id } });
    if (!existing) {
      return fail("Doc not found", "NOT_FOUND", 404);
    }

    const origin = new URL(request.url).origin;

    if (payload.enable) {
      const shareToken = randomUUID();
      const doc = await db.doc.update({
        where: { id },
        data: { isPublic: true, shareToken },
      });
      return ok({ shareUrl: `${origin}/share/${doc.shareToken}`, isPublic: doc.isPublic });
    }

    const doc = await db.doc.update({
      where: { id },
      data: { isPublic: false, shareToken: null },
    });
    return ok({ shareUrl: null, isPublic: doc.isPublic });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to update share status", "INTERNAL_ERROR", 500);
  }
}

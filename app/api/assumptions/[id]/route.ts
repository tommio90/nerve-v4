import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  riskLevel: z.number().int().min(1).max(5).optional(),
  status: z.enum(["UNVALIDATED", "VALIDATING", "CONFIRMED", "INVALIDATED"]).optional(),
  confidence: z.number().min(0).max(100).optional(),
  evidenceAppend: z.string().optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const assumption = await db.assumption.findUnique({ where: { id } });
    if (!assumption) {
      return fail("Assumption not found", "NOT_FOUND", 404);
    }
    return ok({ assumption });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load assumption", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const payload = updateSchema.parse(await request.json());
    const current = await db.assumption.findUnique({ where: { id } });
    if (!current) {
      return fail("Assumption not found", "NOT_FOUND", 404);
    }

    const appendedEvidence = payload.evidenceAppend?.trim()
      ? `${current.evidence ? `${current.evidence}\n` : ""}${payload.evidenceAppend.trim()}`
      : undefined;

    const assumption = await db.assumption.update({
      where: { id },
      data: {
        title: payload.title,
        description: payload.description,
        riskLevel: payload.riskLevel,
        status: payload.status,
        confidence: payload.confidence,
        ...(appendedEvidence !== undefined ? { evidence: appendedEvidence } : {}),
      },
    });

    return ok({ assumption });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to update assumption", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await db.assumption.delete({ where: { id } });
    return ok({ success: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to delete assumption", "INTERNAL_ERROR", 500);
  }
}

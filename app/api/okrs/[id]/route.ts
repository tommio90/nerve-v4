import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  quarter: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const okr = await db.oKR.findUnique({
      where: { id },
      include: { keyResults: true },
    });

    if (!okr) {
      return fail("OKR not found", "NOT_FOUND", 404);
    }

    return ok({ okr });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load OKR", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const payload = updateSchema.parse(await request.json());
    const okr = await db.oKR.update({
      where: { id },
      data: {
        title: payload.title,
        description: payload.description,
        quarter: payload.quarter,
        status: payload.status,
      },
    });

    return ok({ okr });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to update OKR", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await db.oKR.delete({ where: { id } });
    return ok({ success: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to delete OKR", "INTERNAL_ERROR", 500);
  }
}

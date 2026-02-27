import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  target: z.number().positive().optional(),
  current: z.number().optional(),
  unit: z.string().optional(),
  status: z.enum(["ON_TRACK", "AT_RISK", "BEHIND", "COMPLETED"]).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string; krId: string }> }) {
  const { id, krId } = await context.params;
  try {
    const payload = updateSchema.parse(await request.json());
    const existing = await db.keyResult.findUnique({ where: { id: krId } });
    if (!existing || existing.okrId !== id) {
      return fail("Key result not found", "NOT_FOUND", 404);
    }

    const keyResult = await db.keyResult.update({
      where: { id: krId },
      data: {
        title: payload.title,
        target: payload.target,
        current: payload.current,
        unit: payload.unit,
        status: payload.status,
      },
    });

    return ok({ keyResult });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to update key result", "INTERNAL_ERROR", 500);
  }
}

import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  deliverable: z.string().min(1).optional(),
  type: z.enum(["RESEARCH", "CONTENT", "ANALYSIS", "OUTREACH", "PHONE_CALL", "CUSTOM"]).optional(),
  status: z.enum(["PROPOSED", "APPROVED", "QUEUED", "IN_PROGRESS", "REVIEW", "COMPLETE", "FAILED"]).optional(),
  modelTier: z.enum(["FAST", "BALANCED", "DEEP"]).optional(),
  priority: z.number().int().min(1).max(5).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const task = await db.task.findUnique({
      where: { id },
      include: {
        project: true,
        executionLog: { orderBy: { timestamp: "desc" } },
        artifacts: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!task) {
      return fail("Task not found", "NOT_FOUND", 404);
    }

    return ok({ task });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load task", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const payload = updateSchema.parse(await request.json());
    const task = await db.task.update({
      where: { id },
      data: {
        title: payload.title,
        description: payload.description,
        deliverable: payload.deliverable,
        type: payload.type,
        status: payload.status,
        modelTier: payload.modelTier,
        priority: payload.priority,
      },
    });

    return ok({ task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to update task", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await db.task.delete({ where: { id } });
    return ok({ success: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to delete task", "INTERNAL_ERROR", 500);
  }
}

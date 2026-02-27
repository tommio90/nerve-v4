import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const bodySchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "DEFER"]),
  feedback: z.string().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const payload = bodySchema.parse(await request.json());

    const task = await db.task.findUnique({ where: { id } });
    if (!task) {
      return fail("Task not found", "NOT_FOUND", 404);
    }

    const nextStatus =
      payload.action === "APPROVE"
        ? "APPROVED"
        : payload.action === "REJECT"
          ? "FAILED"
          : "PROPOSED";

    const [updatedTask, decision] = await db.$transaction([
      db.task.update({ where: { id }, data: { status: nextStatus } }),
      db.decision.create({
        data: {
          entityType: "TASK",
          entityId: id,
          action: payload.action,
          feedback: payload.feedback,
          context: JSON.stringify({ previousStatus: task.status }),
          metadata: JSON.stringify({ source: "tasks.approve.endpoint" }),
        },
      }),
    ]);

    return ok({ task: updatedTask, decision });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to approve task", "INTERNAL_ERROR", 500);
  }
}

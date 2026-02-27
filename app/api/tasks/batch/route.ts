import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const bodySchema = z.object({
  taskIds: z.array(z.string()).min(1),
  action: z.enum(["APPROVE", "REJECT", "DEFER"]),
  feedback: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());

    const status =
      payload.action === "APPROVE"
        ? "APPROVED"
        : payload.action === "REJECT"
          ? "FAILED"
          : "PROPOSED";

    const [result] = await db.$transaction([
      db.task.updateMany({ where: { id: { in: payload.taskIds } }, data: { status } }),
      ...payload.taskIds.map((entityId) =>
        db.decision.create({
          data: {
            entityType: "TASK",
            entityId,
            action: payload.action,
            feedback: payload.feedback,
            context: JSON.stringify({ batch: true }),
            metadata: JSON.stringify({ source: "tasks.batch.endpoint" }),
          },
        }),
      ),
    ]);

    return ok({ updated: result.count });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to run batch operation", "INTERNAL_ERROR", 500);
  }
}

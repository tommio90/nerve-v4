import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const bodySchema = z.object({
  taskId: z.string().min(1),
  targetPhoneNumber: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());
    const task = await db.task.findUnique({ where: { id: payload.taskId } });

    if (!task) {
      return fail("Call task not found", "NOT_FOUND", 404);
    }

    await db.executionLog.create({
      data: {
        taskId: task.id,
        level: "INFO",
        message: `Call initiation requested for ${payload.targetPhoneNumber ?? process.env.TARGET_PHONE_NUMBER ?? "default target"}.`,
      },
    });

    return ok({ initiated: true, taskId: task.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to initiate call", "INTERNAL_ERROR", 500);
  }
}

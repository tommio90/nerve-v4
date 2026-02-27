import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const decisionSchema = z.object({
  entityType: z.enum(["PROJECT", "TASK"]),
  entityId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT", "DEFER"]),
  feedback: z.string().optional(),
  context: z.unknown().optional(),
  metadata: z.unknown().optional(),
});

export async function GET() {
  try {
    const decisions = await db.decision.findMany({ orderBy: { createdAt: "desc" } });
    return ok({ decisions });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load decisions", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = decisionSchema.parse(await request.json());

    const result = await db.$transaction(async (tx) => {
      if (payload.entityType === "PROJECT") {
        const project = await tx.project.findUnique({ where: { id: payload.entityId } });
        if (!project) {
          throw new Error("Project not found");
        }

        const newStatus =
          payload.action === "APPROVE"
            ? "ACTIVE"
            : payload.action === "REJECT"
              ? "ARCHIVED"
              : "DEFERRED";

        await tx.project.update({ where: { id: payload.entityId }, data: { status: newStatus } });
      }

      if (payload.entityType === "TASK") {
        const task = await tx.task.findUnique({ where: { id: payload.entityId } });
        if (!task) {
          throw new Error("Task not found");
        }

        const newStatus =
          payload.action === "APPROVE"
            ? "APPROVED"
            : payload.action === "REJECT"
              ? "FAILED"
              : "PROPOSED";

        await tx.task.update({ where: { id: payload.entityId }, data: { status: newStatus } });
      }

      const lastDecision = await tx.decision.findFirst({
        where: {
          entityType: payload.entityType,
          entityId: payload.entityId,
        },
        orderBy: { createdAt: "desc" },
      });

      if (lastDecision && lastDecision.action === payload.action && (lastDecision.feedback ?? "") === (payload.feedback ?? "")) {
        return lastDecision;
      }

      return tx.decision.create({
        data: {
          entityType: payload.entityType,
          entityId: payload.entityId,
          action: payload.action,
          feedback: payload.feedback,
          context: JSON.stringify(payload.context ?? {}),
          metadata: JSON.stringify(payload.metadata ?? {}),
        },
      });
    });

    return ok({ decision: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return fail(error.message, "NOT_FOUND", 404);
    }

    return fail(error instanceof Error ? error.message : "Failed to log decision", "INTERNAL_ERROR", 500);
  }
}

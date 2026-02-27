import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const taskSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  deliverable: z.string().min(1),
  type: z.enum(["RESEARCH", "CONTENT", "ANALYSIS", "OUTREACH", "PHONE_CALL", "CUSTOM"]),
  modelTier: z.enum(["FAST", "BALANCED", "DEEP"]),
  priority: z.number().int().min(1).max(5).default(3),
  status: z.enum(["PROPOSED", "APPROVED", "QUEUED", "IN_PROGRESS", "REVIEW", "COMPLETE", "FAILED"]).optional(),
});

export async function GET() {
  try {
    const tasks = await db.task.findMany({
      include: {
        project: true,
      },
      orderBy: [{ status: "asc" }, { priority: "asc" }],
    });
    return ok({ tasks });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load tasks", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = taskSchema.parse(await request.json());
    const task = await db.task.create({
      data: {
        projectId: payload.projectId,
        title: payload.title,
        description: payload.description,
        deliverable: payload.deliverable,
        type: payload.type,
        modelTier: payload.modelTier,
        priority: payload.priority,
        status: payload.status ?? "PROPOSED",
      },
    });

    return ok({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to create task", "INTERNAL_ERROR", 500);
  }
}

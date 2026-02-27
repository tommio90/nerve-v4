import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const callSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  deliverable: z.string().default("Call transcript"),
  priority: z.number().int().min(1).max(5).default(3),
});

export async function GET() {
  try {
    const calls = await db.task.findMany({
      where: { type: "PHONE_CALL" },
      include: { project: true },
      orderBy: { updatedAt: "desc" },
    });
    return ok({ calls });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load calls", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = callSchema.parse(await request.json());
    const task = await db.task.create({
      data: {
        projectId: payload.projectId,
        title: payload.title,
        description: payload.description,
        deliverable: payload.deliverable,
        type: "PHONE_CALL",
        modelTier: "BALANCED",
        priority: payload.priority,
      },
    });

    return ok({ callTask: task }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to create call task", "INTERNAL_ERROR", 500);
  }
}

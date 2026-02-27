import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Fetch original project
    const original = await db.project.findUnique({
      where: { id },
      include: { tasks: true },
    });

    if (!original) {
      return fail("Project not found", "NOT_FOUND", 404);
    }

    // Create duplicate project
    const project = await db.project.create({
      data: {
        title: `${original.title} (Copy)`,
        description: original.description,
        thesisScore: original.thesisScore,
        scope: original.scope,
        reasoning: original.reasoning,
        status: "PROPOSED",
      },
    });

    // Duplicate tasks
    if (original.tasks.length > 0) {
      await db.task.createMany({
        data: original.tasks.map((task) => ({
          projectId: project.id,
          title: task.title,
          description: task.description,
          deliverable: task.deliverable,
          type: task.type,
          status: "PROPOSED",
          modelTier: task.modelTier,
          priority: task.priority,
        })),
      });
    }

    return ok({ project }, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to duplicate project", "INTERNAL_ERROR", 500);
  }
}

import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const patchSchema = z.object({
  status: z.enum(["PROPOSED", "ACTIVE", "DEFERRED", "COMPLETED", "ARCHIVED"]).optional(),
  description: z.string().optional(),
  reasoning: z.string().optional(),
  thesisScore: z.number().min(0).max(1).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = patchSchema.parse(await request.json());

    const project = await db.project.update({
      where: { id },
      data: payload,
    });

    return ok({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to update project", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Delete project (cascade will delete tasks, artifacts, etc.)
    await db.project.delete({
      where: { id },
    });

    return ok({ deleted: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to delete project", "INTERNAL_ERROR", 500);
  }
}

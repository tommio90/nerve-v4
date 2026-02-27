import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(["DOCUMENT", "RESEARCH", "ANALYSIS", "TRANSCRIPT", "MEDIA", "DATA"]).optional(),
  mimeType: z.string().min(1).optional(),
  content: z.string().optional(),
  filePath: z.string().optional(),
  sizeBytes: z.number().int().min(0).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const artifact = await db.artifact.findUnique({ where: { id }, include: { project: true, task: true } });
    if (!artifact) {
      return fail("Artifact not found", "NOT_FOUND", 404);
    }
    return ok({ artifact });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load artifact", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const payload = updateSchema.parse(await request.json());
    const artifact = await db.artifact.update({ where: { id }, data: payload });
    return ok({ artifact });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to update artifact", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await db.artifact.delete({ where: { id } });
    return ok({ success: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to delete artifact", "INTERNAL_ERROR", 500);
  }
}

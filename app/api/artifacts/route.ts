import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const artifactSchema = z.object({
  projectId: z.string().min(1),
  taskId: z.string().optional(),
  title: z.string().min(1),
  type: z.enum(["DOCUMENT", "RESEARCH", "ANALYSIS", "TRANSCRIPT", "MEDIA", "DATA"]),
  mimeType: z.string().min(1),
  content: z.string().optional(),
  filePath: z.string().optional(),
  sizeBytes: z.number().int().min(0).default(0),
});

export async function GET() {
  try {
    const artifacts = await db.artifact.findMany({
      include: { project: true, task: true },
      orderBy: { createdAt: "desc" },
    });
    return ok({ artifacts });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load artifacts", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = artifactSchema.parse(await request.json());
    const artifact = await db.artifact.create({ data: payload });
    return ok({ artifact }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to create artifact", "INTERNAL_ERROR", 500);
  }
}

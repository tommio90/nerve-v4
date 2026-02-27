import { fail, ok } from "@/lib/api";
import { decomposeProject } from "@/lib/ai/task-decomposer";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const tasks = await decomposeProject(id);
    return ok({ tasks }, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to decompose project", "INTERNAL_ERROR", 500);
  }
}

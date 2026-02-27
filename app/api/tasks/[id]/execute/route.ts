import { fail, ok } from "@/lib/api";
import { executeTask } from "@/lib/task-executor";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let executionContext = "";

  try {
    const body = (await request.json()) as { context?: unknown };
    if (typeof body.context === "string") {
      executionContext = body.context;
    }
  } catch {
    // Body is optional; execute without context.
  }

  try {
    const result = await executeTask(id, executionContext);
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to execute task", "INTERNAL_ERROR", 500);
  }
}

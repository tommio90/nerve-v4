import { fail, ok } from "@/lib/api";
import { runContextScan } from "@/lib/ai/context-engine";

export async function POST() {
  try {
    const snapshot = await runContextScan();
    return ok({ snapshot });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to scan context", "INTERNAL_ERROR", 500);
  }
}

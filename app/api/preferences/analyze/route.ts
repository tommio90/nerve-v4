import { fail, ok } from "@/lib/api";
import { analyzePreferences } from "@/lib/ai/preference-engine";

export async function POST() {
  try {
    const vector = await analyzePreferences();
    return ok({ vector });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to analyze preferences", "INTERNAL_ERROR", 500);
  }
}

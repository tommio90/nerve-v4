import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const preferenceSchema = z.object({
  dimension: z.string().min(1),
  value: z.number(),
  confidence: z.number().min(0).max(1),
  sampleSize: z.number().int().min(0).default(0),
  reasoning: z.string().min(1),
});

export async function GET() {
  try {
    const preferences = await db.preferenceVector.findMany({ orderBy: { updatedAt: "desc" } });
    return ok({ preferences });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load preferences", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = preferenceSchema.parse(await request.json());
    const vector = await db.preferenceVector.create({ data: payload });
    return ok({ vector }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to create preference", "INTERNAL_ERROR", 500);
  }
}

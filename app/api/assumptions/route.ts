import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  riskLevel: z.number().int().min(1).max(5).optional(),
  status: z.enum(["UNVALIDATED", "VALIDATING", "CONFIRMED", "INVALIDATED"]).optional(),
  confidence: z.number().min(0).max(100).optional(),
  evidence: z.string().optional(),
  projectId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const riskLevelRaw = searchParams.get("riskLevel");
    const riskLevel = riskLevelRaw ? Number(riskLevelRaw) : undefined;

    const assumptions = await db.assumption.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(riskLevel ? { riskLevel } : {}),
      },
      orderBy: [{ riskLevel: "desc" }, { updatedAt: "desc" }],
    });

    return ok({ assumptions });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load assumptions", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = createSchema.parse(await request.json());
    const assumption = await db.assumption.create({
      data: {
        title: payload.title,
        description: payload.description,
        riskLevel: payload.riskLevel ?? 3,
        status: payload.status ?? "UNVALIDATED",
        confidence: payload.confidence ?? 0,
        evidence: payload.evidence ?? "",
        projectId: payload.projectId,
      },
    });

    return ok({ assumption }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to create assumption", "INTERNAL_ERROR", 500);
  }
}

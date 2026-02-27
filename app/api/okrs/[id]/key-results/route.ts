import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const createSchema = z.object({
  title: z.string().min(1),
  target: z.number().positive(),
  current: z.number().optional(),
  unit: z.string().optional(),
  status: z.enum(["ON_TRACK", "AT_RISK", "BEHIND", "COMPLETED"]).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const keyResults = await db.keyResult.findMany({
      where: { okrId: id },
      orderBy: { createdAt: "asc" },
    });
    return ok({ keyResults });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load key results", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const payload = createSchema.parse(await request.json());
    const keyResult = await db.keyResult.create({
      data: {
        okrId: id,
        title: payload.title,
        target: payload.target,
        current: payload.current ?? 0,
        unit: payload.unit ?? "",
        status: payload.status ?? "ON_TRACK",
      },
    });

    return ok({ keyResult }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to create key result", "INTERNAL_ERROR", 500);
  }
}

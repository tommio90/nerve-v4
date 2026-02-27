import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  quarter: z.string().min(1),
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
});

export async function GET() {
  try {
    const okrs = await db.oKR.findMany({
      include: { keyResults: true },
      orderBy: [{ quarter: "desc" }, { updatedAt: "desc" }],
    });
    return ok({ okrs });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load OKRs", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = createSchema.parse(await request.json());
    const okr = await db.oKR.create({
      data: {
        title: payload.title,
        description: payload.description,
        quarter: payload.quarter,
        status: payload.status ?? "ACTIVE",
      },
    });

    return ok({ okr }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to create OKR", "INTERNAL_ERROR", 500);
  }
}

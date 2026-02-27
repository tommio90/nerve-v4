import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const patchSchema = z.object({
  transcript: z.string().optional(),
  questions: z.array(z.string()).optional(),
  insights: z.array(z.unknown()).optional(),
  assumptions: z.array(z.unknown()).optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
  followUpSent: z.boolean().optional(),
  completedAt: z.string().datetime().optional().nullable(),
});

function safeParseArray(val: string): unknown[] {
  try {
    const p = JSON.parse(val);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function normalize(interview: {
  questions: string;
  insights: string;
  assumptions: string;
  [key: string]: unknown;
}) {
  return {
    ...interview,
    questions: safeParseArray(interview.questions),
    insights: safeParseArray(interview.insights),
    assumptions: safeParseArray(interview.assumptions),
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const interview = await db.interview.findUnique({
      where: { id },
      include: {
        contact: { select: { id: true, name: true, organization: true, email: true } },
      },
    });
    if (!interview) return fail("Interview not found", "NOT_FOUND", 404);
    return ok({ interview: normalize(interview) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load interview", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = patchSchema.parse(await request.json());
    const data: Record<string, unknown> = {};
    if (payload.transcript !== undefined) data.transcript = payload.transcript;
    if (payload.questions !== undefined) data.questions = JSON.stringify(payload.questions);
    if (payload.insights !== undefined) data.insights = JSON.stringify(payload.insights);
    if (payload.assumptions !== undefined) data.assumptions = JSON.stringify(payload.assumptions);
    if (payload.status !== undefined) {
      data.status = payload.status;
      if (payload.status === "COMPLETED" && !data.completedAt) {
        data.completedAt = new Date();
      }
    }
    if (payload.followUpSent !== undefined) data.followUpSent = payload.followUpSent;
    if (payload.completedAt !== undefined) data.completedAt = payload.completedAt ? new Date(payload.completedAt) : null;

    const interview = await db.interview.update({
      where: { id },
      data,
      include: {
        contact: { select: { id: true, name: true, organization: true, email: true } },
      },
    });
    return ok({ interview: normalize(interview) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to update interview", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.interview.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to delete interview", "INTERNAL_ERROR", 500);
  }
}

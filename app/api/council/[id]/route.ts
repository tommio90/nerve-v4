import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCouncilSession, updateCouncilSession } from "@/lib/db";

const patchSchema = z.object({
  taskTitle: z.string().min(1).optional(),
  taskDescription: z.string().min(1).optional(),
  venture: z.string().nullable().optional(),
  entityType: z.enum(["PROJECT", "TASK"]).nullable().optional(),
  entityId: z.string().nullable().optional(),
  status: z.enum(["pending", "debating", "decided", "failed"]).optional(),
  opusAnalysis: z.unknown().optional(),
  o3Analysis: z.unknown().optional(),
  geminiAnalysis: z.unknown().optional(),
  aggregateScore: z.number().nullable().optional(),
  recommendation: z.enum(["approve", "reject", "revise"]).nullable().optional(),
  confidence: z.enum(["high", "medium", "low"]).nullable().optional(),
  summary: z.string().nullable().optional(),
  actionId: z.string().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getCouncilSession(id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ session });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const existing = await getCouncilSession(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const payload = patchSchema.parse(await request.json());
    const session = await updateCouncilSession(id, payload);
    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update session" }, { status: 500 });
  }
}

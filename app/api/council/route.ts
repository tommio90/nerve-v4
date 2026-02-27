import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCouncilSession, listCouncilSessions, updateCouncilSession } from "@/lib/db";
import { runCouncilDebate } from "@/lib/scoring/council";

const createSchema = z.object({
  taskTitle: z.string().min(1),
  taskDescription: z.string().min(1),
  venture: z.string().optional(),
  entityType: z.enum(["PROJECT", "TASK"]).optional(),
  entityId: z.string().optional(),
});

async function runDebateLifecycle(input: {
  id: string;
  taskTitle: string;
  taskDescription: string;
  venture?: string | null;
}) {
  try {
    await updateCouncilSession(input.id, { status: "debating" });
    const result = await runCouncilDebate({
      taskTitle: input.taskTitle,
      taskDescription: input.taskDescription,
      venture: input.venture,
    });

    await updateCouncilSession(input.id, {
      status: "decided",
      opusAnalysis: result.opusAnalysis,
      o3Analysis: result.o3Analysis,
      geminiAnalysis: result.geminiAnalysis,
      qwenAnalysis: result.qwenAnalysis,
      aggregateScore: result.aggregate_score,
      recommendation: result.recommendation,
      confidence: result.confidence,
      summary: result.reasoning_summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Council debate failed";
    await updateCouncilSession(input.id, {
      status: "failed",
      summary: message,
    });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const entityType = searchParams.get("entityType") || undefined;
  const entityId = searchParams.get("entityId") || undefined;

  const sessions = await listCouncilSessions({ status, entityType, entityId });
  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  try {
    const parsed = createSchema.parse(await request.json());

    const session = await createCouncilSession({
      taskTitle: parsed.taskTitle,
      taskDescription: parsed.taskDescription,
      venture: parsed.venture,
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      status: "pending",
    });

    // Run debate synchronously — serverless functions die after response
    await runDebateLifecycle({
      id: session.id,
      taskTitle: session.taskTitle,
      taskDescription: session.taskDescription,
      venture: session.venture,
    });

    // Re-fetch the updated session with results
    const { getCouncilSession } = await import("@/lib/db");
    const updated = await getCouncilSession(session.id);

    return NextResponse.json({ session: updated || session }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create session" }, { status: 500 });
  }
}

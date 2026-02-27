import { NextRequest, NextResponse } from "next/server";
import { db, getCouncilSession, updateCouncilSession } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getCouncilSession(id);

  if (!session) {
    return NextResponse.json({ error: "Council session not found" }, { status: 404 });
  }
  if (session.actionId) {
    return NextResponse.json({ error: "Project already created", actionId: session.actionId }, { status: 409 });
  }
  if (session.status !== "decided") {
    return NextResponse.json({ error: "Council session is not decided yet" }, { status: 400 });
  }
  if (session.recommendation !== "approve") {
    return NextResponse.json({ error: "Council recommendation is not approve" }, { status: 400 });
  }

  const project = await db.project.create({
    data: {
      title: session.taskTitle,
      description: session.summary || session.taskDescription,
      status: "PROPOSED",
      reasoning: `Council session ${session.id} approved this proposal.`,
    },
  });

  const updated = await updateCouncilSession(id, { actionId: project.id });
  return NextResponse.json({ session: updated, project }, { status: 201 });
}

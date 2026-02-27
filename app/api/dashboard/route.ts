import { db } from "@/lib/db";
import { NextResponse } from "next/server";

function currentQuarterLabel(date = new Date()) {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter}-${date.getFullYear()}`;
}

export async function GET() {
  const quarter = currentQuarterLabel();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const [
    pendingProjects,
    pendingTasks,
    activeProjects,
    recentDecisions,
    latestSnapshot,
    queueDepth,
    recentCouncilSessions,
    okrs,
    openAssumptions,
    interviewsThisWeek,
    activeAgents,
    personaCount,
  ] = await Promise.all([
    db.project.findMany({ where: { status: "PROPOSED" }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.task.findMany({ where: { status: "PROPOSED" }, include: { project: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.project.findMany({ where: { status: "ACTIVE" }, include: { tasks: true }, orderBy: { updatedAt: "desc" }, take: 5 }),
    db.decision.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.contextSnapshot.findFirst({ orderBy: { createdAt: "desc" } }),
    db.task.count({ where: { status: { in: ["APPROVED", "QUEUED", "IN_PROGRESS", "REVIEW"] } } }),
    db.councilSession.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    db.oKR.findMany({ where: { quarter }, include: { keyResults: true }, orderBy: { updatedAt: "desc" } }),
    db.assumption.count({ where: { status: { in: ["UNVALIDATED", "VALIDATING"] } } }),
    db.interview.count({ where: { createdAt: { gte: weekStart } } }),
    db.agentNode.count({ where: { status: { not: "idle" } } }),
    db.persona.count(),
  ]);

  return NextResponse.json({
    pendingProjects,
    pendingTasks,
    activeProjects,
    recentDecisions,
    latestSnapshot,
    queueDepth,
    recentCouncilSessions,
    okrs,
    startupStats: {
      openAssumptions,
      interviewsThisWeek,
      activeAgents,
      personas: personaCount,
    },
    currentQuarter: quarter,
  });
}

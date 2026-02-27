import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const [pendingProjects, pendingTasks, activeProjects, recentDecisions, latestSnapshot, queueDepth, recentCouncilSessions] = await Promise.all([
    db.project.findMany({ where: { status: "PROPOSED" }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.task.findMany({ where: { status: "PROPOSED" }, include: { project: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.project.findMany({ where: { status: "ACTIVE" }, include: { tasks: true }, orderBy: { updatedAt: "desc" }, take: 5 }),
    db.decision.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.contextSnapshot.findFirst({ orderBy: { createdAt: "desc" } }),
    db.task.count({ where: { status: { in: ["APPROVED", "QUEUED", "IN_PROGRESS", "REVIEW"] } } }),
    db.councilSession.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  return NextResponse.json({
    pendingProjects,
    pendingTasks,
    activeProjects,
    recentDecisions,
    latestSnapshot,
    queueDepth,
    recentCouncilSessions,
  });
}

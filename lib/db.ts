import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

type GlobalWithPrisma = typeof globalThis & { prisma?: PrismaClient };
const globalForPrisma = globalThis as GlobalWithPrisma;

function createPrismaClient() {
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    const adapter = new PrismaLibSql({
      url: (process.env.TURSO_DATABASE_URL || "").trim(),
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

type CouncilFilter = { status?: string; entityType?: string; entityId?: string };

type CouncilMutationData = {
  taskTitle?: string;
  taskDescription?: string;
  venture?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  proposalDocId?: string | null;
  status?: string;
  opusAnalysis?: unknown;
  o3Analysis?: unknown;
  geminiAnalysis?: unknown;
  qwenAnalysis?: unknown;
  aggregateScore?: number | null;
  recommendation?: string | null;
  confidence?: string | null;
  summary?: string | null;
  actionId?: string | null;
};

function parseJsonField<T = unknown>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function serializeJsonField(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return JSON.stringify(value);
}

function normalizeCouncilSession(session: {
  id: string;
  taskTitle: string;
  taskDescription: string;
  venture: string | null;
  entityType: string | null;
  entityId: string | null;
  proposalDocId: string | null;
  status: string;
  opusAnalysis: string | null;
  o3Analysis: string | null;
  geminiAnalysis: string | null;
  qwenAnalysis: string | null;
  aggregateScore: number | null;
  recommendation: string | null;
  confidence: string | null;
  summary: string | null;
  actionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...session,
    opusAnalysis: parseJsonField(session.opusAnalysis),
    o3Analysis: parseJsonField(session.o3Analysis),
    geminiAnalysis: parseJsonField(session.geminiAnalysis),
    qwenAnalysis: parseJsonField(session.qwenAnalysis),
  };
}

export async function listCouncilSessions(filter: CouncilFilter = {}) {
  const where: Record<string, string> = {};
  if (filter.status) where.status = filter.status;
  if (filter.entityType) where.entityType = filter.entityType;
  if (filter.entityId) where.entityId = filter.entityId;

  const sessions = await db.councilSession.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return sessions.map(normalizeCouncilSession);
}

export async function getCouncilSession(id: string) {
  const session = await db.councilSession.findUnique({ where: { id } });
  if (!session) return null;
  return normalizeCouncilSession(session);
}

export async function createCouncilSession(data: CouncilMutationData) {
  const session = await db.councilSession.create({
    data: {
      taskTitle: data.taskTitle || "",
      taskDescription: data.taskDescription || "",
      venture: data.venture ?? null,
      entityType: data.entityType ?? null,
      entityId: data.entityId ?? null,
      status: data.status || "pending",
      opusAnalysis: serializeJsonField(data.opusAnalysis) ?? null,
      o3Analysis: serializeJsonField(data.o3Analysis) ?? null,
      geminiAnalysis: serializeJsonField(data.geminiAnalysis) ?? null,
      qwenAnalysis: serializeJsonField(data.qwenAnalysis) ?? null,
      aggregateScore: data.aggregateScore ?? null,
      recommendation: data.recommendation ?? null,
      confidence: data.confidence ?? null,
      summary: data.summary ?? null,
      actionId: data.actionId ?? null,
    },
  });

  return normalizeCouncilSession(session);
}

// ─── Skills ───

export async function listSkills(filter: { status?: string } = {}) {
  const where: Record<string, string> = {};
  if (filter.status) where.status = filter.status;
  return db.skill.findMany({ where, orderBy: { name: "asc" } });
}

export async function getSkill(id: string) {
  return db.skill.findUnique({ where: { id } });
}

export async function updateSkill(id: string, data: { status?: string; config?: string; lastRunAt?: Date; runCount?: number }) {
  return db.skill.update({ where: { id }, data });
}

export async function createSkill(data: { name: string; description: string; type?: string; models?: string; config?: string; status?: string }) {
  return db.skill.create({
    data: {
      name: data.name,
      description: data.description,
      type: data.type || "workflow",
      models: data.models || "[]",
      config: data.config || "{}",
      status: data.status || "active",
    },
  });
}

export async function deleteSkill(id: string) {
  return db.skill.delete({ where: { id } });
}

export async function updateCouncilSession(id: string, data: CouncilMutationData) {
  const session = await db.councilSession.update({
    where: { id },
    data: {
      ...(data.taskTitle !== undefined ? { taskTitle: data.taskTitle } : {}),
      ...(data.taskDescription !== undefined ? { taskDescription: data.taskDescription } : {}),
      ...(data.venture !== undefined ? { venture: data.venture } : {}),
      ...(data.entityType !== undefined ? { entityType: data.entityType } : {}),
      ...(data.entityId !== undefined ? { entityId: data.entityId } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.opusAnalysis !== undefined ? { opusAnalysis: serializeJsonField(data.opusAnalysis) } : {}),
      ...(data.o3Analysis !== undefined ? { o3Analysis: serializeJsonField(data.o3Analysis) } : {}),
      ...(data.geminiAnalysis !== undefined ? { geminiAnalysis: serializeJsonField(data.geminiAnalysis) } : {}),
      ...(data.qwenAnalysis !== undefined ? { qwenAnalysis: serializeJsonField(data.qwenAnalysis) } : {}),
      ...(data.aggregateScore !== undefined ? { aggregateScore: data.aggregateScore } : {}),
      ...(data.recommendation !== undefined ? { recommendation: data.recommendation } : {}),
      ...(data.confidence !== undefined ? { confidence: data.confidence } : {}),
      ...(data.summary !== undefined ? { summary: data.summary } : {}),
      ...(data.actionId !== undefined ? { actionId: data.actionId } : {}),
    },
  });

  return normalizeCouncilSession(session);
}

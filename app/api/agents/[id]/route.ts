import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  description: z.string().optional(),
  capabilities: z.union([z.array(z.string()), z.string()]).optional(),
  tools: z.union([z.array(z.string()), z.string()]).optional(),
  memoryScope: z.union([z.array(z.string()), z.string()]).optional(),
  reportingTo: z.string().optional().nullable(),
  approvalTier: z.enum(["auto", "soft", "hard", "escalate"]).optional(),
  status: z.enum(["idle", "working", "blocked", "error"]).optional(),
  config: z.union([z.record(z.unknown()), z.string()]).optional(),
  okrLinks: z.union([z.array(z.string()), z.string()]).optional(),
});

type AgentInput = z.infer<typeof updateSchema>;

function parseArray(value: AgentInput[keyof AgentInput]) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function parseObject(value: AgentInput["config"]) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

function normalize(agent: {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string;
  tools: string;
  memoryScope: string;
  reportingTo: string | null;
  approvalTier: string;
  status: string;
  config: string;
  okrLinks: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...agent,
    capabilities: parseArray(agent.capabilities),
    tools: parseArray(agent.tools),
    memoryScope: parseArray(agent.memoryScope),
    okrLinks: parseArray(agent.okrLinks),
    config: parseObject(agent.config),
  };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const agent = await db.agentNode.findUnique({ where: { id } });
    if (!agent) {
      return fail("Agent not found", "NOT_FOUND", 404);
    }
    return ok({ agent: normalize(agent) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load agent", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const payload = updateSchema.parse(await request.json());
    const agent = await db.agentNode.update({
      where: { id },
      data: {
        name: payload.name,
        role: payload.role,
        description: payload.description,
        capabilities: payload.capabilities !== undefined ? JSON.stringify(parseArray(payload.capabilities)) : undefined,
        tools: payload.tools !== undefined ? JSON.stringify(parseArray(payload.tools)) : undefined,
        memoryScope: payload.memoryScope !== undefined ? JSON.stringify(parseArray(payload.memoryScope)) : undefined,
        reportingTo: payload.reportingTo ?? undefined,
        approvalTier: payload.approvalTier,
        status: payload.status,
        config: payload.config !== undefined ? JSON.stringify(parseObject(payload.config)) : undefined,
        okrLinks: payload.okrLinks !== undefined ? JSON.stringify(parseArray(payload.okrLinks)) : undefined,
      },
    });

    return ok({ agent: normalize(agent) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to update agent", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await db.agentNode.delete({ where: { id } });
    return ok({ success: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to delete agent", "INTERNAL_ERROR", 500);
  }
}

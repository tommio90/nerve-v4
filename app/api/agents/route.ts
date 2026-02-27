import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  description: z.string().optional(),
  capabilities: z.union([z.array(z.string()), z.string()]).optional(),
  tools: z.union([z.array(z.string()), z.string()]).optional(),
  memoryScope: z.union([z.array(z.string()), z.string()]).optional(),
  reportingTo: z.string().optional().nullable(),
  approvalTier: z.enum(["auto", "soft", "hard", "escalate"]).optional(),
  status: z.enum(["idle", "working", "blocked", "error"]).optional(),
  config: z.union([z.record(z.unknown()), z.string()]).optional(),
  okrLinks: z.union([z.array(z.string()), z.string()]).optional(),
  seedDefaults: z.boolean().optional(),
});

type AgentInput = z.infer<typeof createSchema>;

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

async function seedDefaults() {
  const definitions = [
    { key: "ceo", name: "CEO Agent", role: "CEO", description: "Strategic orchestrator", reportingTo: "founder", approvalTier: "escalate" },
    { key: "pm", name: "PM Agent", role: "PM", description: "Product manager and research coordinator", reportingTo: "ceo", approvalTier: "hard" },
    { key: "gtm", name: "GTM Agent", role: "GTM", description: "Growth and marketing lead", reportingTo: "ceo", approvalTier: "hard" },
    { key: "ops", name: "Ops Agent", role: "OPS", description: "Operations lead", reportingTo: "ceo", approvalTier: "soft" },
    { key: "dev", name: "Dev Agent", role: "DEV", description: "Engineering lead", reportingTo: "ceo", approvalTier: "hard" },
    { key: "persona", name: "Persona Agent", role: "PERSONA", description: "Maintains high-resolution user personas", reportingTo: "pm", approvalTier: "soft" },
    { key: "research", name: "Research Agent", role: "RESEARCH", description: "User discovery and matching", reportingTo: "pm", approvalTier: "soft" },
    { key: "interview", name: "Interview Agent", role: "INTERVIEW", description: "Interview questions and assumption mapping", reportingTo: "pm", approvalTier: "auto" },
    { key: "design", name: "Design Agent", role: "DESIGN", description: "Insights to mockups", reportingTo: "pm", approvalTier: "soft" },
    { key: "outreach", name: "Outreach Agent", role: "OUTREACH", description: "Outbound and scheduling", reportingTo: "gtm", approvalTier: "hard" },
    { key: "content", name: "Content Agent", role: "CONTENT", description: "Thought leadership and content", reportingTo: "gtm", approvalTier: "soft" },
    { key: "analytics", name: "Analytics Agent", role: "ANALYTICS", description: "Funnel and cohort analysis", reportingTo: "gtm", approvalTier: "soft" },
  ] as const;

  const idMap = new Map<string, string>();
  for (const def of definitions) {
    const reportingTo = def.reportingTo === "founder" ? "founder" : idMap.get(def.reportingTo) ?? null;
    const agent = await db.agentNode.create({
      data: {
        name: def.name,
        role: def.role,
        description: def.description,
        reportingTo,
        approvalTier: def.approvalTier,
        status: "idle",
      },
    });
    idMap.set(def.key, agent.id);
  }
}

export async function GET() {
  try {
    const agents = await db.agentNode.findMany({ orderBy: { createdAt: "asc" } });
    return ok({ agents: agents.map(normalize) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load agents", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = createSchema.parse(await request.json());

    if (payload.seedDefaults) {
      const existing = await db.agentNode.count();
      if (existing === 0) {
        await seedDefaults();
      }
      const agents = await db.agentNode.findMany({ orderBy: { createdAt: "asc" } });
      return ok({ agents: agents.map(normalize) });
    }

    const agent = await db.agentNode.create({
      data: {
        name: payload.name,
        role: payload.role,
        description: payload.description ?? "",
        capabilities: JSON.stringify(parseArray(payload.capabilities)),
        tools: JSON.stringify(parseArray(payload.tools)),
        memoryScope: JSON.stringify(parseArray(payload.memoryScope)),
        reportingTo: payload.reportingTo ?? null,
        approvalTier: payload.approvalTier ?? "soft",
        status: payload.status ?? "idle",
        config: JSON.stringify(parseObject(payload.config)),
        okrLinks: JSON.stringify(parseArray(payload.okrLinks)),
      },
    });

    return ok({ agent: normalize(agent) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to create agent", "INTERNAL_ERROR", 500);
  }
}

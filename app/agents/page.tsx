"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, LayoutGrid, List, Plus, Sparkles, X } from "lucide-react";

type Agent = {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  tools: string[];
  memoryScope: string[];
  reportingTo: string | null;
  approvalTier: string;
  status: string;
  config: Record<string, unknown>;
  okrLinks: string[];
};

const ROLE_TONES: Record<string, string> = {
  CEO: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  PM: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  GTM: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  OPS: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  DEV: "bg-red-500/20 text-red-300 border-red-500/40",
  PERSONA: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  RESEARCH: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  OUTREACH: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  INTERVIEW: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  DESIGN: "bg-pink-500/20 text-pink-300 border-pink-500/40",
  CONTENT: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  ANALYTICS: "bg-teal-500/20 text-teal-300 border-teal-500/40",
};

const STATUS_TONES: Record<string, string> = {
  idle: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  working: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  blocked: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  error: "bg-red-500/20 text-red-300 border-red-500/40",
};

const ROLES = [
  "CEO",
  "PM",
  "GTM",
  "OPS",
  "DEV",
  "PERSONA",
  "RESEARCH",
  "OUTREACH",
  "INTERVIEW",
  "DESIGN",
  "CONTENT",
  "ANALYTICS",
  "CRM",
  "MEMORY",
  "COST",
  "ARCHITECT",
  "BUILDER",
  "QA",
] as const;

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "org">("list");
  const [selected, setSelected] = useState<Agent | null>(null);
  const [autoSeeded, setAutoSeeded] = useState(false);

  const load = async () => {
    const res = await fetch("/api/agents");
    const data = await res.json();
    setAgents(data.agents ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!loading && agents.length === 0 && !autoSeeded) {
      seedDefaults();
      setAutoSeeded(true);
    }
  }, [loading, agents.length, autoSeeded]);

  const seedDefaults = async () => {
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seedDefaults: true, name: "seed", role: "CEO" }),
    });
    const data = await res.json();
    setAgents(data.agents ?? []);
  };

  const saveAgent = async (agent: Agent) => {
    await fetch(`/api/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: agent.name,
        role: agent.role,
        description: agent.description,
        tools: agent.tools,
        memoryScope: agent.memoryScope,
        approvalTier: agent.approvalTier,
        reportingTo: agent.reportingTo,
        okrLinks: agent.okrLinks,
        status: agent.status,
      }),
    });
    await load();
  };

  const orgTree = useMemo(() => {
    const map = new Map<string | null, Agent[]>();
    agents.forEach((agent) => {
      const key = agent.reportingTo === "founder" || agent.reportingTo == null ? "root" : agent.reportingTo;
      const list = map.get(key) ?? [];
      list.push(agent);
      map.set(key, list);
    });
    return map;
  }, [agents]);

  const reportingLabel = (value: string | null) => {
    if (!value || value === "founder") return "founder";
    return agents.find((agent) => agent.id === value)?.name ?? value;
  };

  const renderNode = (agent: Agent) => {
    const children = orgTree.get(agent.id) ?? [];
    return (
      <div key={agent.id} className="space-y-3">
        <Card
          className="flex items-center justify-between gap-3 p-3 cursor-pointer hover:border-cyan/40"
          onClick={() => setSelected(agent)}
        >
          <div>
            <p className="text-sm font-semibold">{agent.name}</p>
            <p className="text-xs text-muted-foreground">{agent.role}</p>
          </div>
          <Badge className={STATUS_TONES[agent.status] ?? STATUS_TONES.idle}>{agent.status}</Badge>
        </Card>
        {children.length > 0 ? (
          <div className="ml-4 grid gap-3 border-l border-white/10 pl-4">
            {children.map(renderNode)}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="synapse-page animate-fade-in space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="synapse-heading">Agents</h1>
          <p className="text-sm text-muted-foreground">Manage the org chart and activation status of your agent team.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}> <List className="h-4 w-4" /> </Button>
          <Button size="sm" variant={view === "org" ? "default" : "outline"} onClick={() => setView("org")}> <LayoutGrid className="h-4 w-4" /> </Button>
        </div>
      </div>

      {loading ? (
        <Card className="animate-pulse space-y-3 p-5">
          <div className="h-4 w-2/5 rounded-full bg-muted/50" />
          <div className="h-3 w-4/5 rounded-full bg-muted/40" />
        </Card>
      ) : agents.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="rounded-full border border-violet/30 bg-violet/10 p-3">
            <Sparkles className="h-6 w-6 text-violet" />
          </div>
          <p className="text-sm text-muted-foreground">No agents yet.</p>
          <Button onClick={seedDefaults} className="gap-2">
            <Plus className="h-4 w-4" />
            Seed default org chart
          </Button>
        </Card>
      ) : view === "list" ? (
        <Card className="space-y-3 p-4">
          <div className="grid grid-cols-4 gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span>Agent</span>
            <span>Role</span>
            <span>Status</span>
            <span>Reports To</span>
          </div>
          <div className="space-y-2">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="grid grid-cols-4 gap-2 rounded-xl border border-white/10 bg-white/3 p-3 text-sm hover:border-cyan/40 cursor-pointer"
                onClick={() => setSelected(agent)}
              >
                <span className="font-medium">{agent.name}</span>
                <Badge className={ROLE_TONES[agent.role] ?? ""}>{agent.role}</Badge>
                <Badge className={STATUS_TONES[agent.status] ?? STATUS_TONES.idle}>{agent.status}</Badge>
                <span className="text-muted-foreground truncate">{reportingLabel(agent.reportingTo)}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(orgTree.get("root") ?? []).map(renderNode)}
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelected(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-black/90 p-6 shadow-2xl transition-all animate-fade-in-up overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Agent Detail</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              <Input value={selected.name} onChange={(e) => setSelected({ ...selected, name: e.target.value })} />
              <select
                className="w-full rounded-md border border-white/10 bg-transparent px-2 py-2 text-sm"
                value={selected.role}
                onChange={(e) => setSelected({ ...selected, role: e.target.value })}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role} className="bg-black">
                    {role}
                  </option>
                ))}
              </select>
              <Textarea value={selected.description} onChange={(e) => setSelected({ ...selected, description: e.target.value })} placeholder="Description" />
              <Input
                value={selected.tools.join(", ")}
                onChange={(e) => setSelected({ ...selected, tools: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) })}
                placeholder="Tools (comma-separated)"
              />
              <Input
                value={selected.memoryScope.join(", ")}
                onChange={(e) => setSelected({ ...selected, memoryScope: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) })}
                placeholder="Memory scope (comma-separated)"
              />
              <Input
                value={selected.okrLinks.join(", ")}
                onChange={(e) => setSelected({ ...selected, okrLinks: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) })}
                placeholder="OKR links (comma-separated IDs)"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  className="rounded-md border border-white/10 bg-transparent px-2 py-2 text-sm"
                  value={selected.approvalTier}
                  onChange={(e) => setSelected({ ...selected, approvalTier: e.target.value })}
                >
                  {(["auto", "soft", "hard", "escalate"] as const).map((tier) => (
                    <option key={tier} value={tier} className="bg-black">
                      {tier}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-md border border-white/10 bg-transparent px-2 py-2 text-sm"
                  value={selected.status}
                  onChange={(e) => setSelected({ ...selected, status: e.target.value })}
                >
                  {(["idle", "working", "blocked", "error"] as const).map((status) => (
                    <option key={status} value={status} className="bg-black">
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <select
                className="w-full rounded-md border border-white/10 bg-transparent px-2 py-2 text-sm"
                value={selected.reportingTo ?? "founder"}
                onChange={(e) => setSelected({ ...selected, reportingTo: e.target.value === "founder" ? "founder" : e.target.value })}
              >
                <option value="founder" className="bg-black">founder</option>
                {agents.filter((agent) => agent.id !== selected.id).map((agent) => (
                  <option key={agent.id} value={agent.id} className="bg-black">
                    {agent.name}
                  </option>
                ))}
              </select>
              <Button onClick={() => saveAgent(selected)} className="gap-2">
                <Bot className="h-4 w-4" />
                Save Agent
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Bot, LayoutGrid, List, Plus, Sparkles } from "lucide-react";

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
          className="flex items-center justify-between gap-3 p-3 cursor-pointer hover:border-ring"
          onClick={() => setSelected(agent)}
        >
          <div>
            <p className="text-sm font-semibold">{agent.name}</p>
            <p className="text-caption">{agent.role}</p>
          </div>
          <Badge className={STATUS_TONES[agent.status] ?? STATUS_TONES.idle}>{agent.status}</Badge>
        </Card>
        {children.length > 0 ? (
          <div className="ml-4 grid gap-3 border-l border-border pl-4">
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
          <h1 className="title-3">Agents</h1>
          <p className="text-subtle">Manage the org chart and activation status of your agent team.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}> <List className="h-4 w-4" /> </Button>
          <Button size="sm" variant={view === "org" ? "default" : "outline"} onClick={() => setView("org")}> <LayoutGrid className="h-4 w-4" /> </Button>
        </div>
      </div>

      {loading ? (
        <Card className="space-y-3 p-5">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-4/5" />
        </Card>
      ) : agents.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="rounded-full border border-violet/30 bg-violet/10 p-3">
            <Sparkles className="h-6 w-6 text-violet" />
          </div>
          <p className="text-subtle">No agents yet.</p>
          <Button onClick={seedDefaults} className="gap-2">
            <Plus className="h-4 w-4" />
            Seed default org chart
          </Button>
        </Card>
      ) : view === "list" ? (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reports To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id} className="cursor-pointer" onClick={() => setSelected(agent)}>
                  <TableCell className="font-medium">{agent.name}</TableCell>
                  <TableCell><Badge className={ROLE_TONES[agent.role] ?? ""}>{agent.role}</Badge></TableCell>
                  <TableCell><Badge className={STATUS_TONES[agent.status] ?? STATUS_TONES.idle}>{agent.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground truncate">{reportingLabel(agent.reportingTo)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(orgTree.get("root") ?? []).map(renderNode)}
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Agent Detail</SheetTitle>
            <SheetDescription>Configure agent settings and permissions.</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={selected.name} onChange={(e) => setSelected({ ...selected, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={selected.role} onValueChange={(val) => setSelected({ ...selected, role: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={selected.description} onChange={(e) => setSelected({ ...selected, description: e.target.value })} placeholder="Description" />
              </div>
              <div className="space-y-1.5">
                <Label>Tools (comma-separated)</Label>
                <Input
                  value={selected.tools.join(", ")}
                  onChange={(e) => setSelected({ ...selected, tools: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) })}
                  placeholder="Tools (comma-separated)"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Memory Scope (comma-separated)</Label>
                <Input
                  value={selected.memoryScope.join(", ")}
                  onChange={(e) => setSelected({ ...selected, memoryScope: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) })}
                  placeholder="Memory scope (comma-separated)"
                />
              </div>
              <div className="space-y-1.5">
                <Label>OKR Links (comma-separated IDs)</Label>
                <Input
                  value={selected.okrLinks.join(", ")}
                  onChange={(e) => setSelected({ ...selected, okrLinks: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) })}
                  placeholder="OKR links (comma-separated IDs)"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Approval Tier</Label>
                  <Select value={selected.approvalTier} onValueChange={(val) => setSelected({ ...selected, approvalTier: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["auto", "soft", "hard", "escalate"] as const).map((tier) => (
                        <SelectItem key={tier} value={tier}>
                          {tier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={selected.status} onValueChange={(val) => setSelected({ ...selected, status: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["idle", "working", "blocked", "error"] as const).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Reports To</Label>
                <Select value={selected.reportingTo ?? "founder"} onValueChange={(val) => setSelected({ ...selected, reportingTo: val === "founder" ? "founder" : val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="founder">founder</SelectItem>
                    {agents.filter((agent) => agent.id !== selected.id).map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => saveAgent(selected)} className="gap-2">
                <Bot className="h-4 w-4" />
                Save Agent
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { CouncilSession, ModelAnalysis, ScoreDimension } from "@/lib/council/types";

const ventures = ["Docebo", "Perlea", "Magnisi", "LayerHuman", "NERVE", "Other"] as const;
const tabs = ["all", "pending", "debating", "decided", "failed"] as const;

const dimensions: { key: ScoreDimension; label: string }[] = [
  { key: "strategic_alignment", label: "Strategic Alignment" },
  { key: "execution_readiness", label: "Execution Readiness" },
  { key: "leverage_potential", label: "Leverage Potential" },
  { key: "novelty_factor", label: "Novelty Factor" },
  { key: "resource_efficiency", label: "Resource Efficiency" },
  { key: "timing_relevance", label: "Timing Relevance" },
];

type NewSessionForm = {
  taskTitle: string;
  taskDescription: string;
  venture: string;
  entityType: "" | "PROJECT" | "TASK";
  entityId: string;
};

const emptyForm: NewSessionForm = {
  taskTitle: "",
  taskDescription: "",
  venture: "",
  entityType: "",
  entityId: "",
};

function scoreTone(score: number) {
  if (score >= 4.2) return "text-emerald-300";
  if (score >= 3) return "text-amber-300";
  return "text-red-300";
}

function statusBadgeVariant(status: string) {
  if (status === "decided") return "complete" as const;
  if (status === "failed") return "failed" as const;
  if (status === "debating") return "active" as const;
  return "deferred" as const;
}

function recommendationBadgeVariant(rec: CouncilSession["recommendation"]) {
  if (rec === "approve") return "complete" as const;
  if (rec === "revise") return "active" as const;
  return "failed" as const;
}

function modelPanelTone(model: "opus" | "o3" | "gemini" | "qwen") {
  if (model === "opus") return "border-purple-500/30 bg-purple-500/5";
  if (model === "o3") return "border-blue-500/30 bg-blue-500/5";
  if (model === "gemini") return "border-cyan-500/30 bg-cyan-500/5";
  return "border-orange-500/30 bg-orange-500/5";
}

function safeAverage(analysis: ModelAnalysis | null) {
  if (!analysis) return null;
  const values = Object.values(analysis.scores);
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function SessionCard({
  session,
  onApprove,
}: {
  session: CouncilSession;
  onApprove: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(false);

  const modelRows: { key: "opusAnalysis" | "o3Analysis" | "geminiAnalysis" | "qwenAnalysis"; name: string; model: "opus" | "o3" | "gemini" | "qwen"; weight: string }[] = [
    { key: "opusAnalysis", name: "Claude Sonnet 4.5", model: "opus", weight: "30%" },
    { key: "geminiAnalysis", name: "Gemini 2.5 Pro", model: "gemini", weight: "25%" },
    { key: "o3Analysis", name: "DeepSeek R1", model: "o3", weight: "25%" },
    { key: "qwenAnalysis", name: "Qwen3 Coder", model: "qwen", weight: "20%" },
  ];

  const statusIcon =
    session.status === "decided" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
      session.status === "failed" ? <XCircle className="h-3.5 w-3.5" /> :
        session.status === "debating" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Clock3 className="h-3.5 w-3.5" />;

  return (
    <Card className="border-border bg-surface-deep p-0">
      <button
        type="button"
        className="w-full px-4 py-3 text-left hover:bg-surface-deep"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{session.taskTitle}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-caption">
              <Badge variant={statusBadgeVariant(session.status)} className="gap-1 rounded-full">
                {statusIcon}
                {session.status}
              </Badge>
              {session.venture ? <Badge variant="outline" className="rounded-full">{session.venture}</Badge> : null}
              {session.entityType && session.entityId ? <span>{session.entityType} · {session.entityId.slice(0, 8)}</span> : null}
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{session.taskDescription}</p>
          </div>
          <div className="flex items-center gap-3">
            {session.aggregateScore != null ? (
              <div className="text-right">
                <p className={`text-base font-semibold ${scoreTone(session.aggregateScore)}`}>{session.aggregateScore.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">aggregate</p>
              </div>
            ) : null}
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-border p-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Task Description</p>
              {session.proposalDocId ? (
                <Link
                  href={`/docs/${session.proposalDocId}`}
                  className="text-xs text-cyan hover:text-cyan hover:underline"
                >
                  View Original Proposal →
                </Link>
              ) : session.entityType && session.entityId ? (
                <Link
                  href={`/${session.entityType.toLowerCase()}s/${session.entityId}`}
                  className="text-xs text-cyan hover:text-cyan hover:underline"
                >
                  View {session.entityType.charAt(0) + session.entityType.slice(1).toLowerCase()} →
                </Link>
              ) : null}
            </div>
            <p className="text-sm text-slate-200">{session.taskDescription}</p>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Debate Arena</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {modelRows.map((row) => {
                const analysis = session[row.key];
                const avg = safeAverage(analysis);
                return (
                  <div key={row.key} className={`rounded-lg border p-3 ${modelPanelTone(row.model)}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground">{row.name}</p>
                      <span className="text-[10px] text-muted-foreground">{row.weight}</span>
                    </div>
                    {analysis ? (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-300">{analysis.keyArgument}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Avg Score</span>
                          <span className={avg ? scoreTone(avg) : "text-muted-foreground"}>{avg?.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Confidence</span>
                          <span className="text-slate-200">{analysis.confidence}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Stance</span>
                          <span className="text-slate-200 uppercase">{analysis.stance}</span>
                        </div>
                        {analysis.challenges.length > 0 ? (
                          <ul className="space-y-1 text-caption">
                            {analysis.challenges.map((challenge) => (
                              <li key={challenge} className="truncate">- {challenge}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-caption">Awaiting analysis...</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Score Comparison</p>
            <Table className="min-w-[768px] text-xs">
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Dimension</TableHead>
                  <TableHead className="text-purple-300">Sonnet 4.5</TableHead>
                  <TableHead className="text-cyan-300">Gemini 2.5 Pro</TableHead>
                  <TableHead className="text-blue-300">DeepSeek R1</TableHead>
                  <TableHead className="text-orange-300">Qwen3 Coder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dimensions.map((dimension) => (
                  <TableRow key={dimension.key} className="border-border">
                    <TableCell className="text-slate-300">{dimension.label}</TableCell>
                    <TableCell className="text-purple-200">{session.opusAnalysis?.scores[dimension.key]?.toFixed(1) || "-"}</TableCell>
                    <TableCell className="text-cyan-200">{session.geminiAnalysis?.scores[dimension.key]?.toFixed(1) || "-"}</TableCell>
                    <TableCell className="text-blue-200">{session.o3Analysis?.scores[dimension.key]?.toFixed(1) || "-"}</TableCell>
                    <TableCell className="text-orange-200">{session.qwenAnalysis?.scores[dimension.key]?.toFixed(1) || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-lg border border-border bg-surface-deep p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Council Verdict</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-border bg-surface-deep">
                <span className={`text-lg font-semibold ${session.aggregateScore != null ? scoreTone(session.aggregateScore) : "text-muted-foreground"}`}>
                  {session.aggregateScore != null ? session.aggregateScore.toFixed(1) : "-"}
                </span>
              </div>
              {session.recommendation ? (
                <Badge variant={recommendationBadgeVariant(session.recommendation)} className="rounded-full uppercase">
                  {session.recommendation}
                </Badge>
              ) : null}
              {session.confidence ? <span className="text-caption">Confidence: {session.confidence}</span> : null}
            </div>
            {session.summary ? <p className="mt-2 text-sm text-slate-300">{session.summary}</p> : null}
          </div>

          {session.status === "decided" && session.recommendation === "approve" && !session.actionId ? (
            <Button
              onClick={async () => {
                setApproving(true);
                try {
                  await onApprove(session.id);
                } finally {
                  setApproving(false);
                }
              }}
              disabled={approving}
              className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <ShieldCheck className="h-4 w-4" />
              {approving ? "Creating Project..." : "Approve -> Create Project"}
            </Button>
          ) : null}

          {session.actionId ? (
            <Link href={`/projects/${session.actionId}`} className="text-xs text-emerald-300 hover:text-emerald-200">
              Project created {"->"} {session.actionId}
            </Link>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export default function CouncilPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("all");
  const [sessions, setSessions] = useState<CouncilSession[]>([]);
  const [allSessions, setAllSessions] = useState<CouncilSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<NewSessionForm>(emptyForm);

  const loadSessions = useCallback(async () => {
    const filteredQuery = new URLSearchParams();
    if (activeTab !== "all") filteredQuery.set("status", activeTab);

    const [filteredRes, allRes] = await Promise.all([
      fetch(`/api/council?${filteredQuery.toString()}`),
      fetch("/api/council"),
    ]);
    const [filteredJson, allJson] = await Promise.all([filteredRes.json(), allRes.json()]);
    setSessions((filteredJson.sessions || []) as CouncilSession[]);
    setAllSessions((allJson.sessions || []) as CouncilSession[]);
    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (!(activeTab === "pending" || activeTab === "debating")) return;
    const interval = setInterval(() => {
      void loadSessions();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab, loadSessions]);

  const counts = useMemo(() => {
    const values: Record<string, number> = { all: allSessions.length, pending: 0, debating: 0, decided: 0, failed: 0 };
    for (const s of allSessions) values[s.status] += 1;
    return values;
  }, [allSessions]);

  const createSession = async () => {
    if (!form.taskTitle.trim() || !form.taskDescription.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: form.taskTitle.trim(),
          taskDescription: form.taskDescription.trim(),
          venture: form.venture || undefined,
          entityType: form.entityType || undefined,
          entityId: form.entityId || undefined,
        }),
      });
      setForm(emptyForm);
      setOpenModal(false);
      setLoading(true);
      await loadSessions();
    } finally {
      setSubmitting(false);
    }
  };

  const approveSession = async (id: string) => {
    await fetch(`/api/council/${id}/approve`, { method: "POST" });
    await loadSessions();
  };

  return (
    <div className="synapse-page animate-fade-in space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 title-3 text-foreground">
            <Users className="h-5 w-5 text-cyan" />
            Council of Models
          </h1>
          <p className="text-subtle">Three-model debate engine for project and task decisions.</p>
        </div>
        <Button className="gap-2" onClick={() => setOpenModal(true)}>
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setLoading(true);
          setActiveTab(value as (typeof tabs)[number]);
        }}
      >
        <TabsList className="h-auto flex-wrap gap-2 bg-transparent p-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-full border border-border bg-surface-deep px-3 py-1 text-xs data-[state=active]:border-violet/40 data-[state=active]:bg-violet/15 data-[state=active]:text-violet data-[state=active]:shadow-none"
            >
              {tab} ({counts[tab] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : sessions.length === 0 ? (
        <Card className="flex items-center gap-2 border-border bg-surface-deep p-6 text-subtle">
          <AlertTriangle className="h-4 w-4 text-amber-300" />
          No sessions in this filter.
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} onApprove={approveSession} />
          ))}
        </div>
      )}

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Council Session</DialogTitle>
            <DialogDescription>Create a new debate request for the council.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="council-task-title">Task Title</Label>
              <Input
                id="council-task-title"
                placeholder="Task title"
                value={form.taskTitle}
                onChange={(event) => setForm((prev) => ({ ...prev, taskTitle: event.target.value }))}
                className="border-border bg-surface-deep"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="council-task-desc">Task Description</Label>
              <Textarea
                id="council-task-desc"
                placeholder="Task description"
                value={form.taskDescription}
                onChange={(event) => setForm((prev) => ({ ...prev, taskDescription: event.target.value }))}
                className="border-border bg-surface-deep"
                rows={5}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Venture</Label>
                <Select
                  value={form.venture || undefined}
                  onValueChange={(val) => setForm((prev) => ({ ...prev, venture: val }))}
                >
                  <SelectTrigger className="border-border bg-surface-deep">
                    <SelectValue placeholder="Select venture" />
                  </SelectTrigger>
                  <SelectContent>
                    {ventures.map((venture) => (
                      <SelectItem key={venture} value={venture}>
                        {venture}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Entity Type</Label>
                <Select
                  value={form.entityType || undefined}
                  onValueChange={(val) => setForm((prev) => ({ ...prev, entityType: val as NewSessionForm["entityType"] }))}
                >
                  <SelectTrigger className="border-border bg-surface-deep">
                    <SelectValue placeholder="Entity type (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROJECT">PROJECT</SelectItem>
                    <SelectItem value="TASK">TASK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="council-entity-id">Entity ID</Label>
              <Input
                id="council-entity-id"
                placeholder="Entity ID (optional)"
                value={form.entityId}
                onChange={(event) => setForm((prev) => ({ ...prev, entityId: event.target.value }))}
                className="border-border bg-surface-deep"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Cancel
            </Button>
            <Button onClick={createSession} disabled={submitting} className="bg-violet text-white hover:bg-violet/85">
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

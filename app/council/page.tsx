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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

function recommendationTone(rec: CouncilSession["recommendation"]) {
  if (rec === "approve") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (rec === "revise") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return "bg-red-500/15 text-red-300 border-red-500/30";
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

  const statusTone =
    session.status === "decided" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" :
      session.status === "failed" ? "bg-red-500/15 text-red-300 border-red-500/30" :
        session.status === "debating" ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-black/40 text-slate-300 border-white/10";

  return (
    <Card className="border-white/10 bg-black/40 p-0">
      <button
        type="button"
        className="w-full px-4 py-3 text-left hover:bg-black/40"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{session.taskTitle}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${statusTone}`}>
                {statusIcon}
                {session.status}
              </span>
              {session.venture ? <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5">{session.venture}</span> : null}
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
        <div className="space-y-4 border-t border-white/10 p-4">
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
                          <ul className="space-y-1 text-xs text-muted-foreground">
                            {analysis.challenges.map((challenge) => (
                              <li key={challenge} className="truncate">- {challenge}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Awaiting analysis...</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Score Comparison</p>
            <table className="w-full min-w-[768px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground">
                  <th className="px-2 py-1 text-left font-medium">Dimension</th>
                  <th className="px-2 py-1 text-left font-medium text-purple-300">Sonnet 4.5</th>
                  <th className="px-2 py-1 text-left font-medium text-cyan-300">Gemini 2.5 Pro</th>
                  <th className="px-2 py-1 text-left font-medium text-blue-300">DeepSeek R1</th>
                  <th className="px-2 py-1 text-left font-medium text-orange-300">Qwen3 Coder</th>
                </tr>
              </thead>
              <tbody>
                {dimensions.map((dimension) => (
                  <tr key={dimension.key} className="border-b border-white/10">
                    <td className="px-2 py-1.5 text-slate-300">{dimension.label}</td>
                    <td className="px-2 py-1.5 text-purple-200">{session.opusAnalysis?.scores[dimension.key]?.toFixed(1) || "-"}</td>
                    <td className="px-2 py-1.5 text-cyan-200">{session.geminiAnalysis?.scores[dimension.key]?.toFixed(1) || "-"}</td>
                    <td className="px-2 py-1.5 text-blue-200">{session.o3Analysis?.scores[dimension.key]?.toFixed(1) || "-"}</td>
                    <td className="px-2 py-1.5 text-orange-200">{session.qwenAnalysis?.scores[dimension.key]?.toFixed(1) || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/40 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Council Verdict</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-black/40">
                <span className={`text-lg font-semibold ${session.aggregateScore != null ? scoreTone(session.aggregateScore) : "text-muted-foreground"}`}>
                  {session.aggregateScore != null ? session.aggregateScore.toFixed(1) : "-"}
                </span>
              </div>
              {session.recommendation ? (
                <span className={`rounded-full border px-2.5 py-1 text-xs uppercase ${recommendationTone(session.recommendation)}`}>
                  {session.recommendation}
                </span>
              ) : null}
              {session.confidence ? <span className="text-xs text-muted-foreground">Confidence: {session.confidence}</span> : null}
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
          <h1 className="inline-flex items-center gap-2 synapse-heading text-foreground">
            <Users className="h-5 w-5 text-cyan" />
            Council of Models
          </h1>
          <p className="text-sm text-muted-foreground">Three-model debate engine for project and task decisions.</p>
        </div>
        <Button className="gap-2" onClick={() => setOpenModal(true)}>
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setLoading(true);
              setActiveTab(tab);
            }}
            className={`rounded-full border px-3 py-1 text-xs transition ${activeTab === tab ? "border-violet/40 bg-violet/15 text-violet" : "border-white/10 bg-black/40 text-muted-foreground hover:text-foreground"}`}
          >
            {tab} ({counts[tab] ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="border-white/10 bg-black/40 p-6 text-sm text-muted-foreground">Loading council sessions...</Card>
      ) : sessions.length === 0 ? (
        <Card className="flex items-center gap-2 border-white/10 bg-black/40 p-6 text-sm text-muted-foreground">
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

      {openModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-xl space-y-3 border-white/10 bg-black/40">
            <div>
              <h2 className="text-sm font-semibold text-foreground">New Council Session</h2>
              <p className="text-xs text-muted-foreground">Create a new debate request for the council.</p>
            </div>
            <Input
              placeholder="Task title"
              value={form.taskTitle}
              onChange={(event) => setForm((prev) => ({ ...prev, taskTitle: event.target.value }))}
              className="border-white/10 bg-black/40"
            />
            <Textarea
              placeholder="Task description"
              value={form.taskDescription}
              onChange={(event) => setForm((prev) => ({ ...prev, taskDescription: event.target.value }))}
              className="border-white/10 bg-black/40"
              rows={5}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={form.venture}
                onChange={(event) => setForm((prev) => ({ ...prev, venture: event.target.value }))}
                className="h-9 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-slate-200"
              >
                <option value="">Select venture</option>
                {ventures.map((venture) => (
                  <option key={venture} value={venture}>
                    {venture}
                  </option>
                ))}
              </select>
              <select
                value={form.entityType}
                onChange={(event) => setForm((prev) => ({ ...prev, entityType: event.target.value as NewSessionForm["entityType"] }))}
                className="h-9 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-slate-200"
              >
                <option value="">Entity type (optional)</option>
                <option value="PROJECT">PROJECT</option>
                <option value="TASK">TASK</option>
              </select>
            </div>
            <Input
              placeholder="Entity ID (optional)"
              value={form.entityId}
              onChange={(event) => setForm((prev) => ({ ...prev, entityId: event.target.value }))}
              className="border-white/10 bg-black/40"
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenModal(false)}>
                Cancel
              </Button>
              <Button onClick={createSession} disabled={submitting} className="bg-violet text-white hover:bg-violet/85">
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

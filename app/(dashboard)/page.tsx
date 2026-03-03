"use client";

import Link from "next/link";
import { Activity, Bot, ClipboardCheck, Clock, FlaskConical, FolderOpen, KanbanSquare, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { useEffect, useMemo, useState, type ComponentType } from "react";

type DashboardData = {
  pendingProjects: { id: string; title: string; status: string; createdAt: string }[];
  pendingTasks: { id: string; title: string; status: string; project: { title: string } }[];
  activeProjects: { id: string; title: string; tasks: { status: string }[] }[];
  recentDecisions: { id: string; entityType: string; action: string; feedback: string | null; createdAt: string }[];
  latestSnapshot: { createdAt: string } | null;
  queueDepth: number;
  recentCouncilSessions: { id: string; taskTitle: string; status: string; aggregateScore: number | null; createdAt: string }[];
  okrs: { id: string; title: string; quarter: string; status: string; keyResults: { current: number; target: number }[] }[];
  startupStats: { openAssumptions: number; interviewsThisWeek: number; activeAgents: number; personas: number };
  currentQuarter: string;
};

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "violet" | "cyan" | "red" | "emerald";
}) {
  const toneClass =
    tone === "violet"
      ? "border-violet/45 bg-violet/15 text-violet"
      : tone === "cyan"
        ? "border-cyan/45 bg-cyan/15 text-cyan"
        : tone === "red"
          ? "border-red-400/45 bg-red-400/15 text-red-300"
          : "border-emerald/45 bg-emerald/15 text-emerald";

  return (
    <Card className={`flex items-center justify-between gap-3 ${toneClass}`}>
      <div>
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </div>
      <div className="rounded-xl border border-border bg-surface-deep p-2.5">
        <Icon className="h-4 w-4" />
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="synapse-page animate-fade-in space-y-6">
      <Skeleton className="h-28 w-full rounded-[2rem]" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="space-y-3">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-7 w-1/4" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </Card>
        <Card className="space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-16 w-full" />
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setData);
  }, []);

  const metrics = useMemo(() => {
    if (!data) return { totalProjects: 0 };
    return { totalProjects: data.activeProjects.length + data.pendingProjects.length };
  }, [data]);

  if (!data) return <DashboardSkeleton />;

  const okrProgress = (okr: DashboardData["okrs"][number]) => {
    if (!okr.keyResults.length) return 0;
    const total = okr.keyResults.reduce((acc, kr) => acc + (kr.target ? Math.min(100, (kr.current / kr.target) * 100) : 0), 0);
    return Math.round(total / okr.keyResults.length);
  };

  const okrTone = (value: number) => {
    if (value >= 80) return { bar: "bg-emerald-400", variant: "complete" as const };
    if (value >= 50) return { bar: "bg-yellow-400", variant: "active" as const };
    return { bar: "bg-red-400", variant: "failed" as const };
  };

  return (
    <div className="synapse-page animate-fade-in space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[radial-gradient(circle_at_20%_30%,rgba(139,92,246,0.25),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.2),transparent_52%),rgba(255,255,255,0.02)] p-6 sm:p-8">
        <h1 className="title-1">NERVE Command Deck</h1>
        <p className="mt-3 max-w-2xl text-subtle">
          Decision intelligence at a glance with approvals, council outputs, and execution flow in one surface.
        </p>
      </section>

      {/* OKR Health */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">OKR Health · {data.currentQuarter}</h2>
          <span className="text-caption">{data.okrs.length} OKRs</span>
        </div>
        {data.okrs.length === 0 ? (
          <Card className="text-subtle">No OKRs for the current quarter.</Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.okrs.map((okr) => {
              const progress = okrProgress(okr);
              const tone = okrTone(progress);
              return (
                <Card key={okr.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{okr.title}</span>
                    <Badge variant={tone.variant}>{progress}%</Badge>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full border border-border bg-surface">
                    <div
                      className={`h-full transition-all duration-300 ease-synapse ${tone.bar}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Metrics */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={KanbanSquare} label="Total Projects" value={metrics.totalProjects} tone="violet" />
        <MetricCard icon={FlaskConical} label="Open Assumptions" value={data.startupStats.openAssumptions} tone="red" />
        <MetricCard icon={MessageSquare} label="Interviews This Week" value={data.startupStats.interviewsThisWeek} tone="cyan" />
        <MetricCard icon={Bot} label="Active Agents" value={data.startupStats.activeAgents} tone="emerald" />
      </section>

      {/* Projects + Health */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-cyan" />
              Pending Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.pendingProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block rounded-xl border border-border bg-surface p-2.5 text-sm transition-all duration-300 ease-synapse hover:border-ring hover:bg-surface-hover"
              >
                <div className="flex items-center justify-between gap-2">
                  <p>{project.title}</p>
                  <StatusBadge status={project.status} />
                </div>
              </Link>
            ))}
            {data.pendingProjects.length === 0 && (
              <p className="text-subtle">No pending projects.</p>
            )}
          </CardContent>
        </Card>

        <Card className="space-y-3 p-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Context Freshness</span>
              <span>{data.latestSnapshot ? new Date(data.latestSnapshot.createdAt).toLocaleString() : "No scans yet"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Execution Queue Depth</span>
              <span>{data.queueDepth}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Preference Signals</span>
              <span>Phase 1 baseline</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Active Projects + Activity */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-violet" />
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.activeProjects.map((project) => {
              const total = project.tasks.length;
              const done = project.tasks.filter((t) => t.status === "COMPLETE").length;
              const progress = total === 0 ? 0 : Math.round((done / total) * 100);
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block space-y-2 rounded-xl border border-border bg-surface p-2.5 transition-all duration-300 ease-synapse hover:border-ring hover:bg-surface-hover"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{project.title}</span>
                    <span className="text-caption">{done}/{total}</span>
                  </div>
                  <Progress value={progress} />
                </Link>
              );
            })}
            {data.activeProjects.length === 0 && (
              <p className="text-subtle">No active projects.</p>
            )}
          </CardContent>
        </Card>

        <Card className="space-y-3 p-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentDecisions.map((d) => (
              <div key={d.id} className="rounded-xl border border-border bg-surface p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>{d.entityType} · {d.action}</span>
                  <span className="text-caption">{new Date(d.createdAt).toLocaleString()}</span>
                </div>
                {d.feedback && <p className="text-caption">{d.feedback}</p>}
              </div>
            ))}
            {data.recentDecisions.length === 0 && (
              <p className="text-subtle">No activity yet.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

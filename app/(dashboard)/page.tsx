"use client";

import Link from "next/link";
import { Activity, ClipboardCheck, Clock, FolderOpen, ListTodo, AlertTriangle, CheckCircle2, KanbanSquare, FlaskConical, Bot, Users, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
    <Card className={`flex items-center justify-between gap-3 p-4 ${toneClass}`}>
      <div>
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-black/30 p-2.5">
        <Icon className="h-4 w-4" />
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setData);
  }, []);

  const metrics = useMemo(() => {
    if (!data) {
      return { totalProjects: 0, totalTasks: 0, pendingApprovals: 0, completedTasks: 0 };
    }
    const totalProjects = data.activeProjects.length + data.pendingProjects.length;
    const totalTasks = data.pendingTasks.length + data.activeProjects.reduce((acc, p) => acc + p.tasks.length, 0);
    const pendingApprovals = data.pendingProjects.length + data.pendingTasks.length;
    const completedTasks = data.activeProjects.reduce((acc, p) => acc + p.tasks.filter((t) => t.status === "COMPLETE").length, 0);
    return { totalProjects, totalTasks, pendingApprovals, completedTasks };
  }, [data]);

  if (!data) {
    return (
      <div className="synapse-page animate-fade-in space-y-6">
        <h1 className="synapse-heading text-shimmer">Welcome back</h1>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse space-y-3 p-4">
              <div className="h-3 w-2/5 rounded-full bg-white/20" />
              <div className="h-7 w-1/4 rounded-full bg-white/30" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const okrProgress = (okr: DashboardData["okrs"][number]) => {
    if (!okr.keyResults.length) return 0;
    const total = okr.keyResults.reduce((acc, kr) => acc + (kr.target ? Math.min(100, (kr.current / kr.target) * 100) : 0), 0);
    return Math.round(total / okr.keyResults.length);
  };

  const okrTone = (value: number) => {
    if (value >= 80) return { bar: "bg-emerald-400", badge: "bg-emerald-400/20 text-emerald-300" };
    if (value >= 50) return { bar: "bg-yellow-400", badge: "bg-yellow-400/20 text-yellow-300" };
    return { bar: "bg-red-400", badge: "bg-red-400/20 text-red-300" };
  };

  return (
    <div className="synapse-page animate-fade-in space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_20%_30%,rgba(139,92,246,0.25),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.2),transparent_52%),rgba(255,255,255,0.02)] p-6 sm:p-8">
        <h1 className="synapse-display text-shimmer">NERVE Command Deck</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">Decision intelligence at a glance with approvals, council outputs, and execution flow in one surface.</p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">OKR Health · {data.currentQuarter}</h2>
          <span className="text-xs text-muted-foreground">{data.okrs.length} OKRs</span>
        </div>
        {data.okrs.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">No OKRs for the current quarter.</Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.okrs.map((okr) => {
              const progress = okrProgress(okr);
              const tone = okrTone(progress);
              return (
                <Card key={okr.id} className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{okr.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${tone.badge}`}>{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full border border-white/10 bg-white/5">
                    <div className={`h-full transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] ${tone.bar}`} style={{ width: `${progress}%` }} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={FlaskConical} label="Open Assumptions" value={data.startupStats.openAssumptions} tone="red" />
        <MetricCard icon={MessageSquare} label="Interviews This Week" value={data.startupStats.interviewsThisWeek} tone="cyan" />
        <MetricCard icon={Bot} label="Active Agents" value={data.startupStats.activeAgents} tone="emerald" />
        <MetricCard icon={Users} label="Personas" value={data.startupStats.personas} tone="violet" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={KanbanSquare} label="Total Projects" value={metrics.totalProjects} tone="violet" />
        <MetricCard icon={ListTodo} label="Total Tasks" value={metrics.totalTasks} tone="cyan" />
        <MetricCard icon={AlertTriangle} label="Pending Approvals" value={metrics.pendingApprovals} tone="red" />
        <MetricCard icon={CheckCircle2} label="Completed Tasks" value={metrics.completedTasks} tone="emerald" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardCheck className="h-4 w-4 text-cyan" />
            Pending Approvals
          </h2>
          <div className="space-y-2">
            {data.pendingProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="block rounded-xl border border-white/10 bg-white/3 p-2.5 text-sm transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-violet/35 hover:bg-white/10">
                <div className="flex items-center justify-between gap-2">
                  <p>{project.title}</p>
                  <StatusBadge status={project.status} />
                </div>
              </Link>
            ))}
            {data.pendingTasks.map((task) => (
              <Link key={task.id} href={`/tasks/${task.id}`} className="block rounded-xl border border-white/10 bg-white/3 p-2.5 text-sm transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-cyan/35 hover:bg-white/10">
                <div className="flex items-center justify-between gap-2">
                  <p>
                    {task.title} · {task.project.title}
                  </p>
                  <StatusBadge status={task.status} />
                </div>
              </Link>
            ))}
            {data.pendingProjects.length + data.pendingTasks.length === 0 && <p className="text-sm text-muted-foreground">No pending approvals.</p>}
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-emerald" />
            System Health
          </h2>
          <div className="space-y-2 text-sm">
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
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FolderOpen className="h-4 w-4 text-violet" />
            Active Projects
          </h2>
          <div className="space-y-3">
            {data.activeProjects.map((project) => {
              const total = project.tasks.length;
              const done = project.tasks.filter((t) => t.status === "COMPLETE").length;
              const progress = total === 0 ? 0 : Math.round((done / total) * 100);
              return (
                <Link key={project.id} href={`/projects/${project.id}`} className="block space-y-2 rounded-xl border border-white/10 bg-white/3 p-2.5 transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-violet/35 hover:bg-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{project.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {done}/{total}
                    </span>
                  </div>
                  <Progress value={progress} />
                </Link>
              );
            })}
            {data.activeProjects.length === 0 && <p className="text-sm text-muted-foreground">No active projects.</p>}
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-cyan" />
            Recent Activity
          </h2>
          <div className="space-y-2">
            {data.recentDecisions.map((d) => (
              <div key={d.id} className="rounded-xl border border-white/10 bg-white/3 p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>
                    {d.entityType} · {d.action}
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</span>
                </div>
                {d.feedback && <p className="text-xs text-muted-foreground">{d.feedback}</p>}
              </div>
            ))}
            {data.recentDecisions.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
          </div>
        </Card>
      </section>

      <section>
        <Card className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-violet" />
            Recent Council Sessions
          </h2>
          <div className="space-y-2">
            {data.recentCouncilSessions.map((session) => (
              <Link key={session.id} href="/council" className="block rounded-xl border border-white/10 bg-white/3 p-2.5 transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-violet/35 hover:bg-white/10">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm">{session.taskTitle}</span>
                  <span className="text-xs text-muted-foreground">{session.status}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(session.createdAt).toLocaleString()}</span>
                  <span>{session.aggregateScore != null ? `Score ${session.aggregateScore.toFixed(2)}` : "No score yet"}</span>
                </div>
              </Link>
            ))}
            {data.recentCouncilSessions.length === 0 && <p className="text-sm text-muted-foreground">No council sessions yet.</p>}
          </div>
        </Card>
      </section>
    </div>
  );
}

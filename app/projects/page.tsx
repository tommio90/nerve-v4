"use client";

import Link from "next/link";
import { ProjectForm } from "@/components/projects/project-form";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Progress } from "@/components/ui/progress";
import { useEffect, useMemo, useState } from "react";
import { FolderKanban, Plus, Sparkles, Search, ListChecks, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Task = {
  id: string;
  status: string;
};

type Project = {
  id: string;
  title: string;
  description: string;
  status: string;
  thesisScore: number;
  scope: string;
  createdAt: string;
  updatedAt: string;
  tasks?: Task[];
};

const FILTER_TABS = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "PROPOSED", label: "Proposed" },
  { key: "COMPLETED", label: "Completed" },
  { key: "DEFERRED", label: "Deferred" },
] as const;

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function formatRelative(iso: string) {
  const date = new Date(iso).getTime();
  const diff = date - Date.now();
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;
  if (Math.abs(diff) < hour) return rtf.format(Math.round(diff / minute), "minute");
  if (Math.abs(diff) < day) return rtf.format(Math.round(diff / hour), "hour");
  return rtf.format(Math.round(diff / day), "day");
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const load = async () => {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data.projects);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = projects;
    if (filter !== "ALL") {
      result = result.filter((p) => p.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [projects, filter, search]);

  // Tab counts
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: projects.length };
    for (const p of projects) {
      c[p.status] = (c[p.status] || 0) + 1;
    }
    return c;
  }, [projects]);

  return (
    <div className="synapse-page animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="synapse-heading">Projects</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Track and approve your AI-backed project portfolio.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="shrink-0 gap-1.5 sm:gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Project</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent onClose={() => setShowForm(false)}>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
          </DialogHeader>
          <ProjectForm
            onCreated={async () => {
              await load();
              setShowForm(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Filter Tabs + Search */}
      {!loading && projects.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1">
            {FILTER_TABS.map((tab) => {
              const count = counts[tab.key] || 0;
              const active = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "bg-violet/15 text-violet ring-1 ring-violet/35"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                        active ? "bg-violet/20 text-violet" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {projects.length > 4 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="pl-9"
              />
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse space-y-3 p-5">
              <div className="h-4 w-2/5 rounded-full bg-muted/50" />
              <div className="h-3 w-4/5 rounded-full bg-muted/40" />
              <div className="h-3 w-1/3 rounded-full bg-muted/30" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((project) => {
            const tasks = project.tasks || [];
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter((t) => t.status === "COMPLETE").length;
            const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return (
              <Card
                key={project.id}
            className="group relative overflow-hidden transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-violet/40 hover:shadow-violet-glow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/projects/${project.id}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight hover:text-cyan"
                      >
                        <FolderKanban className="h-4 w-4 shrink-0 text-cyan" />
                        <span className="truncate">{project.title}</span>
                      </Link>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>

                    {/* Meta row */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      <span>Updated {formatRelative(project.updatedAt)}</span>
                      <span>Scope {project.scope}</span>
                      <span>Thesis {project.thesisScore.toFixed(2)}</span>
                      {totalTasks > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <ListChecks className="h-3 w-3" />
                          {completedTasks}/{totalTasks} tasks
                        </span>
                      )}
                    </div>

                    {/* Mini progress bar */}
                    {totalTasks > 0 && (
                      <div className="mt-2.5 max-w-xs">
                        <Progress value={progressPercent} />
                      </div>
                    )}
                  </div>
                  <StatusBadge status={project.status} />
                </div>
              </Card>
            );
          })}

          {/* Empty state — no projects at all */}
          {projects.length === 0 && (
            <Card className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="rounded-full border border-violet/30 bg-violet/10 p-4">
                <Sparkles className="h-7 w-7 text-violet" />
              </div>
              <div>
                <p className="text-sm font-medium">No projects yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Create your first project to get started.</p>
              </div>
            </Card>
          )}

          {/* Empty state — filter has no results */}
          {projects.length > 0 && filtered.length === 0 && (
            <Card className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Search className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No projects match{" "}
                {search.trim() ? `"${search}"` : `the "${filter.toLowerCase()}" filter`}.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

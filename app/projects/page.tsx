"use client";

import Link from "next/link";
import { ProjectForm } from "@/components/projects/project-form";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useState } from "react";
import { FolderKanban, Plus, Sparkles, Search, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Task = { id: string; status: string };
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
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let result = projects;
    if (filter !== "ALL") result = result.filter((p) => p.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [projects, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: projects.length };
    for (const p of projects) c[p.status] = (c[p.status] || 0) + 1;
    return c;
  }, [projects]);

  return (
    <div className="synapse-page animate-fade-in space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="title-3">Projects</h1>
          <p className="mt-1 text-caption sm:text-sm">
            Track and approve your AI-backed project portfolio.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Project</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
          </DialogHeader>
          <ProjectForm onCreated={async () => { await load(); setShowForm(false); }} />
        </DialogContent>
      </Dialog>

      {!loading && projects.length > 0 && (
        <div className="space-y-3">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              {FILTER_TABS.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5">
                  {tab.label}
                  {(counts[tab.key] || 0) > 0 && (
                    <Badge variant="outline" className="ml-1 px-1.5 py-0 text-[10px]">
                      {counts[tab.key]}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

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

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-1/3" />
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
                className="group relative overflow-hidden transition-all duration-300 ease-synapse hover:border-ring hover:shadow-glow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight hover:text-cyan"
                    >
                      <FolderKanban className="h-4 w-4 shrink-0 text-cyan" />
                      <span className="truncate">{project.title}</span>
                    </Link>
                    <p className="mt-1.5 line-clamp-2 text-subtle">{project.description}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption">
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

          {projects.length === 0 && (
            <Card className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="rounded-full border border-violet/30 bg-violet/10 p-4">
                <Sparkles className="h-7 w-7 text-violet" />
              </div>
              <div>
                <p className="text-sm font-medium">No projects yet</p>
                <p className="mt-1 text-caption">Create your first project to get started.</p>
              </div>
            </Card>
          )}

          {projects.length > 0 && filtered.length === 0 && (
            <Card className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Search className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-subtle">
                No projects match {search.trim() ? `"${search}"` : `the "${filter.toLowerCase()}" filter`}.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

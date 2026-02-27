import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  FileText,
  File,
  ListChecks,
  CircleOff,
  Pencil,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { TaskKanban } from "@/components/tasks/task-kanban";
import { ProjectActions } from "@/components/projects/project-actions";
import { CreateWhitepaperButton } from "@/components/projects/create-whitepaper-button";
import { db } from "@/lib/db";
import { CouncilReviewLauncher } from "@/components/council/council-review-launcher";
import { GenerateTasksButton } from "@/components/projects/generate-tasks-button";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    include: { tasks: { orderBy: [{ priority: "asc" }, { createdAt: "asc" }] } },
  });

  if (!project) {
    notFound();
  }

  // Load whitepaper document if linked
  let whitepaper = null;
  if (project.whitepaperDocId) {
    whitepaper = await db.doc.findUnique({ where: { id: project.whitepaperDocId } });
  }
  // Compute task stats
  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter((t) => t.status === "COMPLETE").length;
  const inProgressTasks = project.tasks.filter((t) => ["IN_PROGRESS", "REVIEW"].includes(t.status)).length;
  const proposedTasks = project.tasks.filter((t) => ["PROPOSED", "APPROVED", "QUEUED"].includes(t.status)).length;

  return (
    <div className="synapse-page animate-fade-in space-y-5">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link
          href="/"
          className="rounded-sm px-1 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
        >
          Dashboard
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link
          href="/projects"
          className="rounded-sm px-1 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
        >
          Projects
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="max-w-[260px] truncate text-foreground">{project.title}</span>
      </nav>

      {/* Focused layout */}
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        {/* Main Content */}
        <div className="space-y-4">
          <Card className="space-y-3 border-violet/25 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <StatusBadge status={project.status} />
              <Badge className="border-white/20 bg-white/8 text-slate-300">{project.scope}</Badge>
            </div>
            <div>
              <h1 className="synapse-heading">{project.title}</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{project.description}</p>
            </div>
          </Card>

          <Card className="space-y-4 p-3 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <ListChecks className="h-4 w-4 text-cyan" />
                Tasks
              </h2>
              <GenerateTasksButton projectId={project.id} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-cyan/35 bg-cyan/12 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-cyan">Proposed</p>
                <p className="mt-1 text-lg font-semibold text-cyan">{proposedTasks}</p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-amber-400">In Progress</p>
                <p className="mt-1 text-lg font-semibold text-amber-300">{inProgressTasks}</p>
              </div>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-emerald-400">Complete</p>
                <p className="mt-1 text-lg font-semibold text-emerald-300">{completedTasks}</p>
              </div>
            </div>

            {totalTasks === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
                <CircleOff className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No tasks yet. Generate tasks with AI to get started.</p>
              </div>
            ) : (
              <TaskKanban
                tasks={project.tasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  status: t.status,
                  type: t.type,
                  priority: t.priority,
                  modelTier: t.modelTier,
                }))}
              />
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {project.whitepaperDocId ? (
            <Card className="space-y-3 border-cyan/20 p-3 sm:p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4 text-cyan" />
                Whitepaper
              </h2>
              {/* Preview content */}
              <article className="prose prose-invert max-w-none text-xs line-clamp-3 overflow-hidden">
                {whitepaper?.content}
              </article>
              <div className="flex gap-2">
                <Link
                  href={`/docs/${project.whitepaperDocId}`}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-cyan hover:underline"
                >
                  <File className="h-4 w-4" /> View
                </Link>
                <Link
                  href={`/docs/${project.whitepaperDocId}`}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-cyan hover:underline"
                >
                  <Pencil className="h-4 w-4" /> Edit Whitepaper
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="p-3 sm:p-4">
              <CreateWhitepaperButton projectId={project.id} />
            </Card>
          )}

          <CouncilReviewLauncher
            entityType="PROJECT"
            entityId={project.id}
            title={project.title}
            description={project.description}
          />

          <ProjectActions
            projectId={project.id}
            projectTitle={project.title}
            currentStatus={project.status}
          />
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckSquare, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { TaskEditor } from "@/components/tasks/task-editor";
import { TaskExecutorButton } from "@/components/tasks/task-executor-button";
import { TaskApprovalCard } from "@/components/tasks/task-approval-card";
import { db } from "@/lib/db";
import { Separator } from "@/components/ui/separator";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await db.task.findUnique({
    where: { id },
    include: {
      project: true,
      executionLog: { orderBy: { timestamp: "desc" } },
      artifacts: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!task) {
    notFound();
  }

  return (
    <div className="synapse-page animate-fade-in space-y-4">
      <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="rounded-sm px-1 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan">
          Dashboard
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/projects" className="rounded-sm px-1 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan">
          Projects
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/projects/${task.project.id}`} className="rounded-sm px-1 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan">
          {task.project.title}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="max-w-[260px] truncate text-foreground">{task.title}</span>
      </nav>

      <div className="flex items-center justify-between gap-2">
        <h1 className="inline-flex items-center gap-2 synapse-heading">
          <CheckSquare className="h-5 w-5 text-cyan" />
          {task.title}
        </h1>
        <Link
          href={`/projects/${task.project.id}`}
          className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <StatusBadge status={task.status} />
          <span className="text-xs text-muted-foreground">{task.type} · {task.modelTier} · P{task.priority}</span>
        </div>
        <p className="text-sm">{task.description}</p>
        <p className="text-xs text-muted-foreground">Deliverable: {task.deliverable}</p>
        <TaskExecutorButton
          taskId={task.id}
          taskTitle={task.title}
          taskDescription={task.description}
          status={task.status}
          initialLogCount={task.executionLog.length}
        />
      </Card>

      <Separator />

      <Card>
        <TaskApprovalCard taskId={task.id} initialStatus={task.status} />
      </Card>

      <Separator />

      <Card className="space-y-2">
        <h2 className="text-sm font-semibold">Edit Task</h2>
        <TaskEditor id={task.id} description={task.description} deliverable={task.deliverable} status={task.status} />
      </Card>

      <Separator />

      <Card className="space-y-2">
        <h2 className="text-sm font-semibold">Artifacts</h2>
        {task.artifacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No artifacts yet.</p>
        ) : (
          <div className="space-y-2">
            {task.artifacts.map((artifact) => (
              <div key={artifact.id} className="rounded-xl border border-white/10 p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/artifacts/${artifact.id}`} className="font-medium text-cyan hover:underline">
                    {artifact.title}
                  </Link>
                  <span className="text-xs text-muted-foreground">{artifact.type}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(artifact.createdAt).toLocaleString()}</span>
                  {artifact.filePath?.startsWith("/docs/") ? (() => {
                    const docId = artifact.filePath.split("/")[2];
                    if (!docId) return null;
                    return (
                      <Link href={`/docs/${docId}`} className="text-cyan hover:underline">
                        Open linked doc
                      </Link>
                    );
                  })() : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Separator />

      <Card className="space-y-2">
        <h2 className="text-sm font-semibold">Execution Log</h2>
        <div className="space-y-2">
          {task.executionLog.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-white/10 p-2 text-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{entry.level}</span>
                <span>{new Date(entry.timestamp).toLocaleString()}</span>
              </div>
              <p>{entry.message}</p>
            </div>
          ))}
          {task.executionLog.length === 0 ? <p className="text-sm text-muted-foreground">No logs yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}

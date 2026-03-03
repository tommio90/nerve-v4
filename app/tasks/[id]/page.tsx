import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckSquare, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/status-badge";
import { TaskEditor } from "@/components/tasks/task-editor";
import { TaskExecutorButton } from "@/components/tasks/task-executor-button";
import { TaskApprovalCard } from "@/components/tasks/task-approval-card";
import { db } from "@/lib/db";

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
      <nav className="flex flex-wrap items-center gap-1 text-caption">
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
        <h1 className="inline-flex items-center gap-2 title-3">
          <CheckSquare className="h-5 w-5 text-cyan" />
          {task.title}
        </h1>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/projects/${task.project.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <Card className="p-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <StatusBadge status={task.status} />
            <div className="flex items-center gap-1.5">
              <Badge variant="outline">{task.type}</Badge>
              <Badge variant="outline">{task.modelTier}</Badge>
              <Badge variant="outline">P{task.priority}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">{task.description}</p>
          <p className="text-caption">Deliverable: {task.deliverable}</p>
          <TaskExecutorButton
            taskId={task.id}
            taskTitle={task.title}
            taskDescription={task.description}
            status={task.status}
            initialLogCount={task.executionLog.length}
          />
        </CardContent>
      </Card>

      <Separator />

      <Card className="p-0">
        <CardContent className="pt-4">
          <TaskApprovalCard taskId={task.id} initialStatus={task.status} />
        </CardContent>
      </Card>

      <Separator />

      <Card className="p-0">
        <CardHeader>
          <CardTitle>Edit Task</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskEditor id={task.id} description={task.description} deliverable={task.deliverable} status={task.status} />
        </CardContent>
      </Card>

      <Separator />

      <Card className="p-0">
        <CardHeader>
          <CardTitle>Artifacts</CardTitle>
        </CardHeader>
        <CardContent>
          {task.artifacts.length === 0 ? (
            <p className="text-subtle">No artifacts yet.</p>
          ) : (
            <div className="space-y-2">
              {task.artifacts.map((artifact) => (
                <div key={artifact.id} className="rounded-xl border border-border p-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/artifacts/${artifact.id}`} className="font-medium text-cyan hover:underline">
                      {artifact.title}
                    </Link>
                    <Badge variant="outline">{artifact.type}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-caption">
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
        </CardContent>
      </Card>

      <Separator />

      <Card className="p-0">
        <CardHeader>
          <CardTitle>Execution Log</CardTitle>
        </CardHeader>
        <CardContent>
          {task.executionLog.length === 0 ? (
            <p className="text-subtle">No logs yet.</p>
          ) : (
            <div className="space-y-2">
              {task.executionLog.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-border p-2 text-sm">
                  <div className="flex items-center justify-between text-caption">
                    <Badge variant="outline">{entry.level}</Badge>
                    <span>{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="mt-1">{entry.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

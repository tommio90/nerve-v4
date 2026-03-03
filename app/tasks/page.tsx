"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { CheckSquare, Plus, Sparkles } from "lucide-react";

type Task = {
  id: string;
  title: string;
  status: string;
  type: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
  project: { id: string; title: string };
};

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

function priorityVariant(priority: number): "failed" | "active" | "proposed" | "default" {
  if (priority <= 2) return "failed";
  if (priority === 3) return "active";
  return "proposed";
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data.tasks);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="synapse-page animate-fade-in space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="title-3">Tasks</h1>
          <p className="text-subtle">Plan, prioritize, and approve work units in one place.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <TaskForm onCreated={async () => { await load(); setShowForm(false); }} />
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="space-y-3">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-1/3" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className="flex items-start justify-between gap-4 transition-all duration-300 ease-synapse hover:border-ring hover:shadow-glow"
            >
              <div className="min-w-0">
                <Link href={`/tasks/${task.id}`} className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight hover:text-cyan">
                  <CheckSquare className="h-4 w-4 text-cyan" />
                  <span className="truncate">{task.title}</span>
                </Link>
                <p className="mt-1 text-subtle">{task.project.title} · {task.type}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={priorityVariant(task.priority)}>P{task.priority}</Badge>
                  <span className="text-caption">Updated {formatRelative(task.updatedAt)}</span>
                </div>
              </div>
              <StatusBadge status={task.status} />
            </Card>
          ))}
          {tasks.length === 0 && (
            <Card className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="rounded-full border border-violet/30 bg-violet/10 p-3">
                <Sparkles className="h-6 w-6 text-violet" />
              </div>
              <p className="text-subtle">No tasks yet — create your first one.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

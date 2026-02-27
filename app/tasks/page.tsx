"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
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

function priorityColor(priority: number) {
  if (priority === 1) return "bg-red-500";
  if (priority === 2) return "bg-orange-500";
  if (priority === 3) return "bg-yellow-500";
  if (priority === 4) return "bg-cyan";
  return "bg-violet";
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
          <h1 className="synapse-heading">Tasks</h1>
          <p className="text-sm text-muted-foreground">Plan, prioritize, and approve work units in one place.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent onClose={() => setShowForm(false)}>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <TaskForm
            onCreated={async () => {
              await load();
              setShowForm(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse space-y-3 p-4">
              <div className="h-4 w-2/5 rounded-full bg-muted/50" />
              <div className="h-3 w-4/5 rounded-full bg-muted/40" />
              <div className="h-3 w-1/3 rounded-full bg-muted/30" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className="flex items-start justify-between gap-4 transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-cyan/40 hover:shadow-cyan-glow"
            >
              <div className="min-w-0">
                <Link href={`/tasks/${task.id}`} className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight hover:text-cyan">
                  <CheckSquare className="h-4 w-4 text-cyan" />
                  <span className="truncate">{task.title}</span>
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{task.project.title} · {task.type}</p>
                <p className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`h-2.5 w-2.5 rounded-full ${priorityColor(task.priority)}`} />
                  P{task.priority} · Updated {formatRelative(task.updatedAt)}
                </p>
              </div>
              <StatusBadge status={task.status} />
            </Card>
          ))}
          {tasks.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="rounded-full border border-violet/30 bg-violet/10 p-3">
                <Sparkles className="h-6 w-6 text-violet" />
              </div>
              <p className="text-sm text-muted-foreground">No tasks yet — create your first one.</p>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

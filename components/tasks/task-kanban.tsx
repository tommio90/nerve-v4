"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { LayoutGrid, List } from "lucide-react";
import { useEffect, useState } from "react";

interface KanbanTask {
  id: string;
  title: string;
  status: string;
  type: string;
  priority: number;
  modelTier: string;
}

interface TaskKanbanProps {
  tasks: KanbanTask[];
}

const COLUMNS = [
  { key: "PROPOSED", label: "Proposed", accent: "border-t-blue-500" },
  { key: "APPROVED", label: "Approved", accent: "border-t-cyan" },
  { key: "QUEUED", label: "Queued", accent: "border-t-violet-500" },
  { key: "IN_PROGRESS", label: "In Progress", accent: "border-t-amber-500" },
  { key: "REVIEW", label: "Review", accent: "border-t-orange-500" },
  { key: "COMPLETE", label: "Complete", accent: "border-t-emerald-500" },
  { key: "FAILED", label: "Failed", accent: "border-t-red-500" },
];

const TASK_TYPE_COLORS: Record<string, string> = {
  RESEARCH: "border-blue-500/40 text-blue-400 bg-blue-500/10",
  CONTENT: "border-purple-500/40 text-purple-400 bg-purple-500/10",
  ANALYSIS: "border-amber-500/40 text-amber-400 bg-amber-500/10",
  OUTREACH: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  PHONE_CALL: "border-rose-500/40 text-rose-400 bg-rose-500/10",
  CUSTOM: "border-border text-muted-foreground bg-surface-deep",
};

const PRIORITY_COLORS: Record<number, string> = {
  1: "text-red-400",
  2: "text-orange-400",
  3: "text-yellow-400",
  4: "text-blue-400",
  5: "text-muted-foreground",
};

function TaskCard({ task }: { task: KanbanTask }) {
  const typeClass = TASK_TYPE_COLORS[task.type] || TASK_TYPE_COLORS.CUSTOM;
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS[3];

  return (
    <Link
      href={`/tasks/${task.id}`}
      className="group block rounded-lg border border-border/70 bg-card p-2.5 transition-all duration-150 hover:border-ring hover:shadow-md hover:shadow-ring/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="text-xs font-medium leading-snug group-hover:text-cyan sm:text-sm">{task.title}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Badge className={`text-[10px] ${typeClass}`}>{task.type}</Badge>
        <span className={`text-[10px] font-bold ${priorityColor}`}>P{task.priority}</span>
      </div>
    </Link>
  );
}

function KanbanColumn({ column, tasks }: { column: (typeof COLUMNS)[number]; tasks: KanbanTask[] }) {
  return (
    <div
      className={`flex min-w-[180px] max-w-[260px] flex-1 flex-col rounded-xl border border-border/50 bg-background/50 ${column.accent} border-t-2`}
    >
      <div className="flex items-center justify-between px-2.5 py-2">
        <h3 className="text-[11px] font-semibold text-muted-foreground">{column.label}</h3>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-1.5 pb-1.5">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-4">
            <p className="text-[11px] text-muted-foreground/40">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ListView({ tasks }: { tasks: KanbanTask[] }) {
  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const typeClass = TASK_TYPE_COLORS[task.type] || TASK_TYPE_COLORS.CUSTOM;
        const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS[3];
        return (
          <Link
            key={task.id}
            href={`/tasks/${task.id}`}
            className="group flex items-center gap-3 rounded-lg border border-border/70 bg-background/40 p-3 transition-all duration-200 hover:border-ring hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex shrink-0 flex-col items-center">
              <span className={`text-[10px] font-bold ${priorityColor}`}>P{task.priority}</span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="truncate text-sm font-medium group-hover:text-cyan">{task.title}</span>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge className={`text-[10px] ${typeClass}`}>{task.type}</Badge>
                {task.modelTier && (
                  <span className="text-[10px] text-muted-foreground">{task.modelTier}</span>
                )}
              </div>
            </div>
            <StatusBadge status={task.status} />
          </Link>
        );
      })}
    </div>
  );
}

export function TaskKanban({ tasks }: TaskKanbanProps) {
  // Default to list on mobile, kanban on desktop
  const [view, setView] = useState<"kanban" | "list">("list");

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setView("kanban");
    }
  }, []);

  const activeColumns = COLUMNS.filter(
    (col) =>
      tasks.some((t) => t.status === col.key) ||
      ["PROPOSED", "IN_PROGRESS", "COMPLETE"].includes(col.key)
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-1">
        <button
          onClick={() => setView("kanban")}
          className={`rounded-md p-1.5 transition ${view === "kanban" ? "bg-cyan/15 text-cyan" : "text-muted-foreground hover:text-foreground"}`}
          title="Kanban view"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button
          onClick={() => setView("list")}
          className={`rounded-md p-1.5 transition ${view === "list" ? "bg-cyan/15 text-cyan" : "text-muted-foreground hover:text-foreground"}`}
          title="List view"
        >
          <List className="h-4 w-4" />
        </button>
      </div>

      {view === "kanban" ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {activeColumns.map((col) => (
            <KanbanColumn
              key={col.key}
              column={col}
              tasks={tasks.filter((t) => t.status === col.key)}
            />
          ))}
        </div>
      ) : (
        <ListView tasks={tasks} />
      )}
    </div>
  );
}

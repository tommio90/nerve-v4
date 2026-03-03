"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TaskExecutorButtonProps = {
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  status: string;
  initialLogCount: number;
};

function isRunnable(status: string) {
  return ["APPROVED", "QUEUED", "IN_PROGRESS"].includes(status);
}

export function TaskExecutorButton({
  taskId,
  taskTitle,
  taskDescription,
  status,
  initialLogCount,
}: TaskExecutorButtonProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [logCount, setLogCount] = useState(initialLogCount);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState("");

  const canExecute = useMemo(() => isRunnable(currentStatus), [currentStatus]);

  useEffect(() => {
    setCurrentStatus(status);
  }, [status]);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { task?: { status?: string; executionLog?: unknown[] } };

        const nextStatus = data.task?.status ?? currentStatus;
        const nextLogCount = Array.isArray(data.task?.executionLog) ? data.task!.executionLog.length : logCount;

        setCurrentStatus(nextStatus);
        setLogCount(nextLogCount);

        if (nextStatus === "COMPLETE" || nextStatus === "FAILED") {
          setRunning(false);
          router.refresh();
        }
      } catch {
        // best-effort polling
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [running, taskId, currentStatus, logCount, router]);

  async function executeNow(contextValue: string) {
    setError(null);
    setRunning(true);
    setOpen(false);
    setCurrentStatus((prev) => (prev === "APPROVED" ? "QUEUED" : prev));

    try {
      const response = await fetch(`/api/tasks/${taskId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: contextValue.trim() }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error || "Execution failed");
        setRunning(false);
        router.refresh();
        return;
      }

      setRunning(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
      setRunning(false);
    }
  }

  if (!canExecute && !running) {
    return null;
  }

  return (
    <div className="space-y-1">
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        disabled={running || !canExecute}
        className="gap-2"
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {running ? `Executing (${logCount} logs)` : "Execute Now"}
      </Button>
      {running ? <p className="text-caption">Status: {currentStatus}</p> : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl border border-border bg-surface-deep backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Execute Task with Context</DialogTitle>
            <p className="text-subtle">Optional context can refine execution output quality.</p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-surface-deep p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Task Preview</p>
              <p className="mt-2 text-sm font-medium text-foreground">{taskTitle}</p>
              <p className="mt-1 line-clamp-4 text-subtle">{taskDescription}</p>
            </div>

            <div className="space-y-2">
              <label htmlFor={`execute-context-${taskId}`} className="text-xs font-medium text-muted-foreground">
                Additional Context
              </label>
              <Textarea
                id={`execute-context-${taskId}`}
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="Add specific instructions, constraints, or context to guide execution..."
                className="min-h-[180px] bg-surface-deep text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => executeNow(context)}
                disabled={running}
                className="transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]"
              >
                Execute with Context
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

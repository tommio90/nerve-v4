"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Swords, Plus, LoaderCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CouncilSession } from "@/lib/council/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-500/40 text-amber-400 bg-amber-500/10",
  debating: "border-blue-500/40 text-blue-400 bg-blue-500/10",
  complete: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  failed: "border-red-500/40 text-red-400 bg-red-500/10",
};

export function CouncilReviewLauncher({
  entityType,
  entityId,
  title,
  description,
}: {
  entityType: "PROJECT" | "TASK";
  entityId: string;
  title: string;
  description: string;
}) {
  const [sessions, setSessions] = useState<CouncilSession[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [taskTitle, setTaskTitle] = useState(title);
  const [taskDescription, setTaskDescription] = useState(description);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ entityType, entityId });
    const response = await fetch(`/api/council?${params.toString()}`);
    const json = await response.json();
    setSessions((json.sessions || []) as CouncilSession[]);
    setLoading(false);
  }, [entityId, entityType]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!sessions.some((session) => session.status === "pending" || session.status === "debating")) return;
    const interval = setInterval(() => {
      void load();
    }, 5000);
    return () => clearInterval(interval);
  }, [load, sessions]);

  return (
    <Card className="space-y-4 p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Swords className="h-4 w-4 text-cyan" />
          Council Review
        </h2>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New Review
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-caption">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          Loading sessions...
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-caption">
          No council sessions for this {entityType.toLowerCase()} yet.
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const statusClass = STATUS_STYLES[session.status] || STATUS_STYLES.pending;
            return (
              <div
                key={session.id}
                className="rounded-lg border border-border/70 bg-background/40 p-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{session.taskTitle}</span>
                  <Badge className={`text-[10px] ${statusClass}`}>{session.status}</Badge>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-muted-foreground">
                  <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                  <span className="font-medium">
                    {session.aggregateScore != null
                      ? `Score ${session.aggregateScore.toFixed(2)}`
                      : "In progress"}
                  </span>
                </div>
              </div>
            );
          })}
          <Link
            href="/council"
            className="inline-flex items-center gap-1 text-xs text-cyan transition hover:text-cyan"
          >
            Full Council page
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Modal */}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-deep backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg space-y-4 p-4 sm:p-6">
            <div>
              <h3 className="text-sm font-semibold">Run Council Review</h3>
              <p className="mt-0.5 text-caption">
                Submit "{title}" for council evaluation
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/40 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Description:</p>
              <p className="text-sm leading-relaxed">{description}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={running || !taskTitle.trim() || !taskDescription.trim()}
                onClick={async () => {
                  setRunning(true);
                  try {
                    await fetch("/api/council", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        taskTitle: taskTitle.trim(),
                        taskDescription: taskDescription.trim(),
                        entityType,
                        entityId,
                      }),
                    });
                    setOpen(false);
                    setLoading(true);
                    await load();
                  } finally {
                    setRunning(false);
                  }
                }}
                className="gap-1.5"
              >
                {running ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Swords className="h-3.5 w-3.5" />
                )}
                {running ? "Submitting..." : "Submit to Council"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </Card>
  );
}

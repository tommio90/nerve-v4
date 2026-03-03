"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, MessageSquare, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type TaskApprovalCardProps = {
  taskId: string;
  initialStatus: string;
};

const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

function normalizeStatus(status: string) {
  return status.toUpperCase();
}

function badgeStyle(status: string) {
  const normalized = normalizeStatus(status);
  if (normalized.includes("APPROVED")) {
    return "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  }
  if (normalized.includes("REJECT")) {
    return "border border-red-500/40 bg-red-500/15 text-red-300";
  }
  if (normalized.includes("DEFER")) {
    return "border border-amber-500/40 bg-amber-500/15 text-amber-300";
  }
  return "border border-border bg-surface text-slate-300";
}

function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function TaskApprovalCard({ taskId, initialStatus }: TaskApprovalCardProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState<null | "APPROVE" | "REJECT" | "DEFER">(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [status, setStatus] = useState(initialStatus);

  const isProposed = useMemo(() => normalizeStatus(status) === "PROPOSED", [status]);

  async function decide(action: "APPROVE" | "REJECT" | "DEFER") {
    setLoading(action);

    try {
      const response = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "TASK", entityId: taskId, action, feedback }),
      });

      if (!response.ok) {
        setLoading(null);
        return;
      }

      if (action === "APPROVE") {
        setStatus("APPROVED");
      } else if (action === "REJECT") {
        setStatus("REJECTED");
      } else {
        setStatus("DEFERRED");
      }

      setFeedback("");
      setShowFeedback(false);
      setLoading(null);

      const waitMs = action === "APPROVE" ? 360 : 120;
      setTimeout(() => router.refresh(), waitMs);
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">Approval</h2>

      <div
        className="overflow-hidden transition-[max-height,opacity,transform] duration-500"
        style={{
          transitionTimingFunction: EASE,
          maxHeight: isProposed ? "320px" : "0px",
          opacity: isProposed ? 1 : 0,
          transform: isProposed ? "translateY(0px)" : "translateY(-6px)",
        }}
      >
        <div className="space-y-3 pb-1">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => decide("APPROVE")}
              disabled={loading !== null}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-xs font-medium text-emerald-400 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/20 disabled:pointer-events-none disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {loading === "APPROVE" ? "..." : "Approve"}
            </button>
            <button
              onClick={() => decide("REJECT")}
              disabled={loading !== null}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-3 text-xs font-medium text-red-400 transition-all hover:border-red-500/50 hover:bg-red-500/20 disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              {loading === "REJECT" ? "..." : "Reject"}
            </button>
            <button
              onClick={() => decide("DEFER")}
              disabled={loading !== null}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-xs font-medium text-amber-400 transition-all hover:border-amber-500/50 hover:bg-amber-500/20 disabled:pointer-events-none disabled:opacity-50"
            >
              <Clock className="h-4 w-4" />
              {loading === "DEFER" ? "..." : "Defer"}
            </button>
          </div>

          {!showFeedback ? (
            <button
              onClick={() => setShowFeedback(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-caption transition hover:border-ring hover:text-foreground"
            >
              <MessageSquare className="h-3 w-3" />
              Add feedback
            </button>
          ) : (
            <Textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="Optional feedback or notes..."
              rows={3}
              className="text-xs"
              autoFocus
            />
          )}
        </div>
      </div>

      <div
        className="overflow-hidden transition-[max-height,opacity,transform] duration-500"
        style={{
          transitionTimingFunction: EASE,
          maxHeight: isProposed ? "0px" : "40px",
          opacity: isProposed ? 0 : 1,
          transform: isProposed ? "translateY(6px)" : "translateY(0px)",
        }}
      >
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${badgeStyle(status)}`}>
          {statusLabel(status)}
        </span>
      </div>
    </div>
  );
}

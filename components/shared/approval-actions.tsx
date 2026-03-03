"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ApprovalActionsProps {
  entityType: "PROJECT" | "TASK";
  entityId: string;
}

export function ApprovalActions({ entityType, entityId }: ApprovalActionsProps) {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState<null | "APPROVE" | "REJECT" | "DEFER">(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const router = useRouter();

  async function decide(action: "APPROVE" | "REJECT" | "DEFER") {
    setLoading(action);

    const response = await fetch("/api/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType, entityId, action, feedback }),
    });

    if (!response.ok) {
      setLoading(null);
      return;
    }

    router.refresh();
    setFeedback("");
    setLoading(null);
    setShowFeedback(false);
  }

  return (
    <div className="space-y-3">
      {/* Action Buttons */}
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

      {/* Feedback Toggle */}
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
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, MessageSquare, Sparkles } from "lucide-react";

type Interview = {
  id: string;
  status: string;
  scheduledAt?: string | null;
  completedAt?: string | null;
  followUpSent: boolean;
  insights: { type: string; content: string }[];
  contact: { name: string };
};

const FILTERS = ["ALL", "SCHEDULED", "COMPLETED", "CANCELLED"] as const;

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  const load = async () => {
    const res = await fetch("/api/interviews");
    const data = await res.json();
    setInterviews(data.interviews ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "ALL") return interviews;
    return interviews.filter((i) => i.status === filter);
  }, [interviews, filter]);

  return (
    <div className="synapse-page animate-fade-in space-y-4">
      <div>
        <h1 className="synapse-heading">Interviews</h1>
        <p className="text-sm text-muted-foreground">Track interview status and AI-extracted insights.</p>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {FILTERS.map((tab) => {
          const active = filter === tab;
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "bg-violet/15 text-violet ring-1 ring-violet/35"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {loading ? (
        <Card className="animate-pulse space-y-3 p-5">
          <div className="h-4 w-2/5 rounded-full bg-muted/50" />
          <div className="h-3 w-4/5 rounded-full bg-muted/40" />
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((interview) => (
            <Card key={interview.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <Link href={`/interviews/${interview.id}`} className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight hover:text-cyan">
                  <MessageSquare className="h-4 w-4 text-cyan" />
                  {interview.contact.name}
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  <span>{interview.scheduledAt ? new Date(interview.scheduledAt).toLocaleDateString() : "No schedule"}</span>
                  <span>Insights: {interview.insights?.length ?? 0}</span>
                  <span>{interview.followUpSent ? "Follow-up sent" : "No follow-up"}</span>
                </div>
              </div>
              <Badge>{interview.status}</Badge>
            </Card>
          ))}
          {filtered.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="rounded-full border border-violet/30 bg-violet/10 p-3">
                <Sparkles className="h-6 w-6 text-violet" />
              </div>
              <p className="text-sm text-muted-foreground">No interviews yet.</p>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

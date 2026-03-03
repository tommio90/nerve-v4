"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
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
        <h1 className="title-3">Interviews</h1>
        <p className="text-subtle">Track interview status and AI-extracted insights.</p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          {FILTERS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <Card className="space-y-3 p-5">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-4/5" />
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
                <div className="mt-2 flex flex-wrap items-center gap-2 text-caption">
                  <CalendarClock className="h-3.5 w-3.5" />
                  <span>{interview.scheduledAt ? new Date(interview.scheduledAt).toLocaleDateString() : "No schedule"}</span>
                  <span>Insights: {interview.insights?.length ?? 0}</span>
                  <span>{interview.followUpSent ? "Follow-up sent" : "No follow-up"}</span>
                </div>
              </div>
              <StatusBadge status={interview.status} />
            </Card>
          ))}
          {filtered.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="rounded-full border border-violet/30 bg-violet/10 p-3">
                <Sparkles className="h-6 w-6 text-violet" />
              </div>
              <p className="text-subtle">No interviews yet.</p>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { Target, Plus, Sparkles } from "lucide-react";

type KeyResult = {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  status: string;
};

type OKR = {
  id: string;
  title: string;
  description: string | null;
  quarter: string;
  status: string;
  keyResults: KeyResult[];
  updatedAt: string;
};

function progressForOkrs(keyResults: KeyResult[]) {
  if (!keyResults.length) return 0;
  const total = keyResults.reduce((acc, kr) => acc + (kr.target ? Math.min(100, (kr.current / kr.target) * 100) : 0), 0);
  return Math.round(total / keyResults.length);
}

export default function OkrsPage() {
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [quarter, setQuarter] = useState("");
  const [description, setDescription] = useState("");

  const load = async () => {
    const res = await fetch("/api/okrs");
    const data = await res.json();
    setOkrs(data.okrs ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, OKR[]>();
    okrs.forEach((okr) => {
      const list = map.get(okr.quarter) ?? [];
      list.push(okr);
      map.set(okr.quarter, list);
    });
    return Array.from(map.entries()).sort((a, b) => (a[0] > b[0] ? -1 : 1));
  }, [okrs]);

  const submit = async () => {
    if (!title.trim() || !quarter.trim()) return;
    await fetch("/api/okrs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, quarter, description: description.trim() || undefined }),
    });
    setTitle("");
    setQuarter("");
    setDescription("");
    await load();
    setShowForm(false);
  };

  return (
    <div className="synapse-page animate-fade-in space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="title-3">OKRs</h1>
          <p className="text-subtle">Track quarterly objectives and measurable key results.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New OKR
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create OKR</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Objective title" />
            <Input value={quarter} onChange={(e) => setQuarter(e.target.value)} placeholder="Quarter (e.g. Q1-2026)" />
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Objective description" />
            <Button onClick={submit}>Create OKR</Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-1/3" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([quarterLabel, items]) => (
            <section key={quarterLabel} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{quarterLabel}</h2>
                <span className="text-caption">{items.length} OKRs</span>
              </div>
              <div className="grid gap-3">
                {items.map((okr) => {
                  const progress = progressForOkrs(okr.keyResults);
                  return (
                    <Card key={okr.id} className="group relative overflow-hidden transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-ring hover:shadow-glow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-2">
                          <Link href={`/okrs/${okr.id}`} className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight hover:text-cyan">
                            <Target className="h-4 w-4 text-cyan" />
                            <span className="truncate">{okr.title}</span>
                          </Link>
                          {okr.description ? <p className="text-subtle">{okr.description}</p> : null}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-caption">
                              <span>{okr.keyResults.length} key results</span>
                              <span>{progress}% complete</span>
                            </div>
                            <Progress value={progress} />
                          </div>
                        </div>
                        <StatusBadge status={okr.status} />
                      </div>
                    </Card>
                  );
                })}
                {items.length === 0 ? (
                  <Card className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                    <div className="rounded-full border border-violet/30 bg-violet/10 p-3">
                      <Sparkles className="h-6 w-6 text-violet" />
                    </div>
                    <p className="text-subtle">No OKRs yet — create your first objective.</p>
                  </Card>
                ) : null}
              </div>
            </section>
          ))}
          {grouped.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="rounded-full border border-violet/30 bg-violet/10 p-3">
                <Sparkles className="h-6 w-6 text-violet" />
              </div>
              <p className="text-subtle">No OKRs yet — create your first objective.</p>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

function progressTone(value: number) {
  if (value >= 80) return { bar: "bg-emerald-400", badge: "bg-emerald-400/20 text-emerald-300" };
  if (value >= 50) return { bar: "bg-yellow-400", badge: "bg-yellow-400/20 text-yellow-300" };
  return { bar: "bg-red-400", badge: "bg-red-400/20 text-red-300" };
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
          <h1 className="synapse-heading">OKRs</h1>
          <p className="text-sm text-muted-foreground">Track quarterly objectives and measurable key results.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New OKR
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent onClose={() => setShowForm(false)}>
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
            <Card key={i} className="animate-pulse space-y-3 p-5">
              <div className="h-4 w-2/5 rounded-full bg-muted/50" />
              <div className="h-3 w-4/5 rounded-full bg-muted/40" />
              <div className="h-3 w-1/3 rounded-full bg-muted/30" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([quarterLabel, items]) => (
            <section key={quarterLabel} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{quarterLabel}</h2>
                <span className="text-xs text-muted-foreground">{items.length} OKRs</span>
              </div>
              <div className="grid gap-3">
                {items.map((okr) => {
                  const progress = progressForOkrs(okr.keyResults);
                  const tone = progressTone(progress);
                  return (
                    <Card key={okr.id} className="group relative overflow-hidden transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-violet/40 hover:shadow-violet-glow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-2">
                          <Link href={`/okrs/${okr.id}`} className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight hover:text-cyan">
                            <Target className="h-4 w-4 text-cyan" />
                            <span className="truncate">{okr.title}</span>
                          </Link>
                          {okr.description ? <p className="text-sm text-muted-foreground">{okr.description}</p> : null}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{okr.keyResults.length} key results</span>
                              <span>{progress}% complete</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full border border-white/10 bg-white/5">
                              <div className={`h-full transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] ${tone.bar}`} style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${tone.badge}`}>{okr.status}</span>
                      </div>
                    </Card>
                  );
                })}
                {items.length === 0 ? (
                  <Card className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                    <div className="rounded-full border border-violet/30 bg-violet/10 p-3">
                      <Sparkles className="h-6 w-6 text-violet" />
                    </div>
                    <p className="text-sm text-muted-foreground">No OKRs yet — create your first objective.</p>
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
              <p className="text-sm text-muted-foreground">No OKRs yet — create your first objective.</p>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

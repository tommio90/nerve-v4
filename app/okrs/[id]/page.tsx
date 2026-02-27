"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, Plus } from "lucide-react";

type KeyResult = {
  id: string;
  title: string;
  target: number;
  current: number;
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
};

export default function OkrDetailPage() {
  const params = useParams<{ id: string }>();
  const okrId = params.id;
  const [okr, setOkr] = useState<OKR | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newKrTitle, setNewKrTitle] = useState("");
  const [newKrTarget, setNewKrTarget] = useState("");
  const [newKrUnit, setNewKrUnit] = useState("");

  const load = async () => {
    const res = await fetch(`/api/okrs/${okrId}`);
    const data = await res.json();
    setOkr(data.okr ?? null);
    setLoading(false);
  };

  useEffect(() => {
    if (okrId) {
      load();
    }
  }, [okrId]);

  const overallProgress = useMemo(() => {
    if (!okr?.keyResults.length) return 0;
    const total = okr.keyResults.reduce((acc, kr) => acc + (kr.target ? Math.min(100, (kr.current / kr.target) * 100) : 0), 0);
    return Math.round(total / okr.keyResults.length);
  }, [okr]);

  const updateOkr = async () => {
    if (!okr) return;
    setSaving(true);
    await fetch(`/api/okrs/${okr.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: okr.title,
        description: okr.description,
        quarter: okr.quarter,
        status: okr.status,
      }),
    });
    setSaving(false);
    await load();
  };

  const updateKeyResult = async (krId: string, updates: Partial<KeyResult>) => {
    await fetch(`/api/okrs/${okrId}/key-results/${krId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    await load();
  };

  const createKeyResult = async () => {
    if (!newKrTitle.trim() || !newKrTarget.trim()) return;
    await fetch(`/api/okrs/${okrId}/key-results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newKrTitle,
        target: Number(newKrTarget),
        unit: newKrUnit.trim(),
      }),
    });
    setNewKrTitle("");
    setNewKrTarget("");
    setNewKrUnit("");
    await load();
  };

  if (loading || !okr) {
    return (
      <div className="synapse-page animate-fade-in space-y-4">
        <Card className="animate-pulse space-y-3 p-5">
          <div className="h-4 w-2/5 rounded-full bg-muted/50" />
          <div className="h-3 w-4/5 rounded-full bg-muted/40" />
          <div className="h-3 w-1/3 rounded-full bg-muted/30" />
        </Card>
      </div>
    );
  }

  return (
    <div className="synapse-page animate-fade-in space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="synapse-heading inline-flex items-center gap-2">
          <Target className="h-5 w-5 text-cyan" />
          {okr.title}
        </h1>
        <Button onClick={updateOkr} disabled={saving} className="gap-2">
          Save Changes
        </Button>
      </div>

      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input value={okr.title} onChange={(e) => setOkr({ ...okr, title: e.target.value })} />
          <Input value={okr.quarter} onChange={(e) => setOkr({ ...okr, quarter: e.target.value })} />
        </div>
        <Textarea value={okr.description ?? ""} onChange={(e) => setOkr({ ...okr, description: e.target.value })} placeholder="Objective description" />
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Status</label>
          <select
            className="rounded-md border border-white/10 bg-transparent px-2 py-1 text-xs"
            value={okr.status}
            onChange={(e) => setOkr({ ...okr, status: e.target.value })}
          >
            {["ACTIVE", "COMPLETED", "CANCELLED"].map((status) => (
              <option key={status} value={status} className="bg-black">
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Overall progress</span>
            <span>{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} />
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Key Results</h2>
          <span className="text-xs text-muted-foreground">{okr.keyResults.length} total</span>
        </div>
        <div className="space-y-3">
          {okr.keyResults.map((kr) => {
            const progress = kr.target ? Math.min(100, (kr.current / kr.target) * 100) : 0;
            return (
              <div key={kr.id} className="rounded-xl border border-white/10 bg-white/3 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{kr.title}</span>
                  <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input
                    type="number"
                    value={kr.current}
                    onChange={(e) => setOkr({
                      ...okr,
                      keyResults: okr.keyResults.map((item) => (item.id === kr.id ? { ...item, current: Number(e.target.value) } : item)),
                    })}
                    onBlur={() => updateKeyResult(kr.id, { current: kr.current })}
                  />
                  <Input
                    type="number"
                    value={kr.target}
                    onChange={(e) => setOkr({
                      ...okr,
                      keyResults: okr.keyResults.map((item) => (item.id === kr.id ? { ...item, target: Number(e.target.value) } : item)),
                    })}
                    onBlur={() => updateKeyResult(kr.id, { target: kr.target })}
                  />
                  <Input
                    value={kr.unit}
                    onChange={(e) => setOkr({
                      ...okr,
                      keyResults: okr.keyResults.map((item) => (item.id === kr.id ? { ...item, unit: e.target.value } : item)),
                    })}
                    onBlur={() => updateKeyResult(kr.id, { unit: kr.unit })}
                    placeholder="Unit"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <select
                    className="rounded-md border border-white/10 bg-transparent px-2 py-1 text-xs"
                    value={kr.status}
                    onChange={(e) => {
                      const next = e.target.value;
                      setOkr({
                        ...okr,
                        keyResults: okr.keyResults.map((item) => (item.id === kr.id ? { ...item, status: next } : item)),
                      });
                      updateKeyResult(kr.id, { status: next });
                    }}
                  >
                    {["ON_TRACK", "AT_RISK", "BEHIND", "COMPLETED"].map((status) => (
                      <option key={status} value={status} className="bg-black">
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
          {okr.keyResults.length === 0 ? <p className="text-sm text-muted-foreground">No key results yet.</p> : null}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold">Add Key Result</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input value={newKrTitle} onChange={(e) => setNewKrTitle(e.target.value)} placeholder="Key result" />
          <Input value={newKrTarget} onChange={(e) => setNewKrTarget(e.target.value)} placeholder="Target" type="number" />
          <Input value={newKrUnit} onChange={(e) => setNewKrUnit(e.target.value)} placeholder="Unit" />
        </div>
        <Button onClick={createKeyResult} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Key Result
        </Button>
      </Card>
    </div>
  );
}

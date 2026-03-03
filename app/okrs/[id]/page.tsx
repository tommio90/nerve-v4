"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
        <Card className="space-y-3 p-5">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-1/3" />
        </Card>
      </div>
    );
  }

  return (
    <div className="synapse-page animate-fade-in space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="title-3 inline-flex items-center gap-2">
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
          <Label className="text-caption">Status</Label>
          <Select value={okr.status} onValueChange={(val) => setOkr({ ...okr, status: val })}>
            <SelectTrigger className="w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["ACTIVE", "COMPLETED", "CANCELLED"].map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-caption">
            <span>Overall progress</span>
            <span>{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} />
        </div>
      </Card>

      <Card className="p-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Key Results</CardTitle>
            <span className="text-caption">{okr.keyResults.length} total</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {okr.keyResults.map((kr) => {
            const progress = kr.target ? Math.min(100, (kr.current / kr.target) * 100) : 0;
            return (
              <div key={kr.id} className="rounded-xl border border-border bg-surface p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{kr.title}</span>
                  <span className="text-caption">{Math.round(progress)}%</span>
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
                  <Label className="text-caption">Status</Label>
                  <Select
                    value={kr.status}
                    onValueChange={(val) => {
                      setOkr({
                        ...okr,
                        keyResults: okr.keyResults.map((item) => (item.id === kr.id ? { ...item, status: val } : item)),
                      });
                      updateKeyResult(kr.id, { status: val });
                    }}
                  >
                    <SelectTrigger className="w-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["ON_TRACK", "AT_RISK", "BEHIND", "COMPLETED"].map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
          {okr.keyResults.length === 0 ? <p className="text-subtle">No key results yet.</p> : null}
        </CardContent>
      </Card>

      <Card className="p-0">
        <CardHeader>
          <CardTitle>Add Key Result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Input value={newKrTitle} onChange={(e) => setNewKrTitle(e.target.value)} placeholder="Key result" />
            <Input value={newKrTarget} onChange={(e) => setNewKrTarget(e.target.value)} placeholder="Target" type="number" />
            <Input value={newKrUnit} onChange={(e) => setNewKrUnit(e.target.value)} placeholder="Unit" />
          </div>
          <Button onClick={createKeyResult} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Key Result
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AssumptionForm } from "@/components/assumptions/assumption-form";
import { Plus, Sparkles } from "lucide-react";

type Assumption = {
  id: string;
  title: string;
  description: string;
  riskLevel: number;
  status: string;
  confidence: number;
  evidence: string;
  updatedAt: string;
};

const FILTER_TABS = [
  { key: "ALL", label: "All" },
  { key: "UNVALIDATED", label: "Unvalidated" },
  { key: "VALIDATING", label: "Validating" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "INVALIDATED", label: "Invalidated" },
] as const;

const STATUS_OPTIONS = ["UNVALIDATED", "VALIDATING", "CONFIRMED", "INVALIDATED"] as const;

function riskTone(level: number) {
  if (level >= 5) return "bg-red-500/20 text-red-300 border-red-500/40";
  if (level === 4) return "bg-orange-500/20 text-orange-300 border-orange-500/40";
  if (level === 3) return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
  if (level === 2) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
}

function confidenceTone(value: number) {
  if (value >= 70) return "bg-emerald-400";
  if (value >= 40) return "bg-yellow-400";
  return "bg-red-400";
}

export default function AssumptionsPage() {
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [appendText, setAppendText] = useState<Record<string, string>>({});

  const load = async () => {
    const res = await fetch("/api/assumptions");
    const data = await res.json();
    setAssumptions(data.assumptions ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = assumptions;
    if (filter !== "ALL") {
      result = result.filter((a) => a.status === filter);
    }
    return result.sort((a, b) => b.riskLevel - a.riskLevel);
  }, [assumptions, filter]);

  const updateAssumption = async (id: string, payload: Partial<Assumption> & { evidenceAppend?: string }) => {
    await fetch(`/api/assumptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await load();
  };

  const appendEvidence = async (assumption: Assumption) => {
    const next = appendText[assumption.id]?.trim();
    if (!next) return;
    await updateAssumption(assumption.id, { evidenceAppend: next });
    setAppendText((prev) => ({ ...prev, [assumption.id]: "" }));
  };

  return (
    <div className="synapse-page animate-fade-in space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="synapse-heading">Assumptions</h1>
          <p className="text-sm text-muted-foreground">Log and validate the riskiest assumptions in your startup plan.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Assumption
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent onClose={() => setShowForm(false)}>
          <DialogHeader>
            <DialogTitle>Create Assumption</DialogTitle>
          </DialogHeader>
          <AssumptionForm
            onCreated={async () => {
              await load();
              setShowForm(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center gap-1">
        {FILTER_TABS.map((tab) => {
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "bg-violet/15 text-violet ring-1 ring-violet/35"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

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
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((assumption) => {
            const expanded = expandedId === assumption.id;
            return (
              <Card
                key={assumption.id}
                className="space-y-3 p-4 transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:border-cyan/40 hover:shadow-cyan-glow"
                onClick={() => setExpandedId(expanded ? null : assumption.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate">{assumption.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {assumption.description.length > 120 ? `${assumption.description.slice(0, 120)}...` : assumption.description}
                    </p>
                  </div>
                  <Badge className={riskTone(assumption.riskLevel)}>R{assumption.riskLevel}</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge>{assumption.status}</Badge>
                  <span className="text-muted-foreground">Confidence</span>
                  <div className="h-2 w-24 overflow-hidden rounded-full border border-white/10 bg-white/5">
                    <div className={`h-full ${confidenceTone(assumption.confidence)}`} style={{ width: `${Math.min(100, Math.max(0, assumption.confidence))}%` }} />
                  </div>
                  <span className="text-muted-foreground">{Math.round(assumption.confidence)}%</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateAssumption(assumption.id, { status });
                      }}
                      className={`rounded-full px-2 py-0.5 text-[11px] transition ${
                        assumption.status === status ? "bg-white/15 text-foreground" : "text-muted-foreground hover:bg-white/10"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {expanded ? (
                  <div className="space-y-3">
                    <Textarea
                      defaultValue={assumption.description}
                      onBlur={(e) => updateAssumption(assumption.id, { description: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        type="number"
                        defaultValue={assumption.riskLevel}
                        onBlur={(e) => updateAssumption(assumption.id, { riskLevel: Number(e.target.value) })}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Input
                        type="number"
                        defaultValue={assumption.confidence}
                        onBlur={(e) => updateAssumption(assumption.id, { confidence: Number(e.target.value) })}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Evidence (append only)</p>
                      <Textarea
                        value={appendText[assumption.id] ?? ""}
                        onChange={(e) => setAppendText((prev) => ({ ...prev, [assumption.id]: e.target.value }))}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Add evidence notes..."
                      />
                      <Button onClick={(e) => { e.stopPropagation(); appendEvidence(assumption); }} size="sm">Append Evidence</Button>
                      {assumption.evidence ? (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-xs text-muted-foreground whitespace-pre-wrap">
                          {assumption.evidence}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {assumption.evidence ? `${assumption.evidence.slice(0, 80)}...` : "No evidence yet."}
                  </p>
                )}
              </Card>
            );
          })}
          {filtered.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-3 py-10 text-center md:col-span-2">
              <div className="rounded-full border border-violet/30 bg-violet/10 p-3">
                <Sparkles className="h-6 w-6 text-violet" />
              </div>
              <p className="text-sm text-muted-foreground">No assumptions yet — add the riskiest ones first.</p>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

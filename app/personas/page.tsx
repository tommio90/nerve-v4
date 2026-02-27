"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Sparkles, Brain } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Persona = {
  id: string;
  name: string;
  archetype: string;
  demographics: string;
  goals: string;
  pains: string;
  behaviors: string;
  dayInLife: string;
  aiAdoptionReadiness: number;
  notes: string;
  createdAt: string;
};

function safeParseArray(val: string): string[] {
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeParseObj(val: string): Record<string, string> {
  try {
    const parsed = JSON.parse(val);
    return typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function AIBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 70 ? "from-emerald-400 to-cyan" : pct >= 40 ? "from-yellow-400 to-orange-400" : "from-red-500 to-red-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>AI Adoption Readiness</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PersonaForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [archetype, setArchetype] = useState("");
  const [goals, setGoals] = useState("");
  const [pains, setPains] = useState("");
  const [dayInLife, setDayInLife] = useState("");
  const [aiReadiness, setAiReadiness] = useState(50);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const generate = async () => {
    if (!name.trim() || !archetype.trim()) return;
    setGenerating(true);
    try {
      const description = `Name: ${name}. Archetype: ${archetype}.`;
      const res = await fetch("/api/personas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.persona) {
          const p = data.persona;
          setGoals(safeParseArray(p.goals).join("\n"));
          setPains(safeParseArray(p.pains).join("\n"));
          setDayInLife(p.dayInLife ?? "");
          setAiReadiness(p.aiAdoptionReadiness ?? 50);
        }
      }
    } catch {
      // ignore
    }
    setGenerating(false);
  };

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const goalsArr = goals.split("\n").map((s) => s.trim()).filter(Boolean);
    const painsArr = pains.split("\n").map((s) => s.trim()).filter(Boolean);
    await fetch("/api/personas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        archetype,
        goals: goalsArr,
        pains: painsArr,
        dayInLife,
        aiAdoptionReadiness: aiReadiness,
      }),
    });
    setSaving(false);
    onCreated();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="Persona name (e.g. 'Alex the Founder')" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
      </div>
      <Input placeholder="Archetype (e.g. 'Solo Founder, 30s, B2B SaaS')" value={archetype} onChange={(e) => setArchetype(e.target.value)} />
      <Button variant="outline" onClick={generate} disabled={generating || !name.trim() || !archetype.trim()} className="w-full gap-2">
        <Sparkles className="h-4 w-4 text-violet" />
        {generating ? "Generating with AI…" : "Generate with AI"}
      </Button>
      <Textarea placeholder={"Goals (one per line)"} value={goals} onChange={(e) => setGoals(e.target.value)} rows={3} />
      <Textarea placeholder={"Pains (one per line)"} value={pains} onChange={(e) => setPains(e.target.value)} rows={3} />
      <Textarea placeholder="A day in the life…" value={dayInLife} onChange={(e) => setDayInLife(e.target.value)} rows={3} />
      <div>
        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
          <span>AI Adoption Readiness</span>
          <span>{aiReadiness}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={aiReadiness}
          onChange={(e) => setAiReadiness(Number(e.target.value))}
          className="w-full accent-violet"
        />
      </div>
      <Button onClick={submit} disabled={saving || !name.trim()} className="w-full">
        {saving ? "Saving…" : "Save Persona"}
      </Button>
    </div>
  );
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const res = await fetch("/api/personas");
    const data = await res.json();
    setPersonas(data.personas ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="synapse-page animate-fade-in space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="synapse-heading">Personas</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            User archetypes to guide product decisions and research.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Persona</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent onClose={() => setShowForm(false)}>
          <DialogHeader>
            <DialogTitle>Create Persona</DialogTitle>
          </DialogHeader>
          <PersonaForm
            onCreated={async () => {
              await load();
              setShowForm(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse space-y-3 p-5">
              <div className="h-4 w-2/5 rounded-full bg-muted/50" />
              <div className="h-3 w-4/5 rounded-full bg-muted/40" />
              <div className="h-2 w-full rounded-full bg-muted/30" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {personas.map((p) => {
            const goals = safeParseArray(p.goals);
            const pains = safeParseArray(p.pains);
            return (
              <Card key={p.id} className="space-y-4 transition-all hover:border-violet/30">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet/20 to-cyan/20 text-sm font-bold uppercase text-violet">
                    {p.name.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    {p.archetype && (
                      <p className="text-xs text-muted-foreground">{p.archetype}</p>
                    )}
                  </div>
                </div>

                <AIBar value={p.aiAdoptionReadiness} />

                {goals.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Goals</p>
                    <ul className="space-y-0.5">
                      {goals.slice(0, 3).map((g, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs">
                          <Brain className="mt-0.5 h-3 w-3 shrink-0 text-cyan" />
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {pains.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Pains</p>
                    <ul className="space-y-0.5">
                      {pains.slice(0, 3).map((pain, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <span className="mt-0.5 h-3 w-3 shrink-0 text-[10px] leading-3">⚡</span>
                          <span>{pain}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {p.dayInLife && (
                  <p className="line-clamp-2 text-xs italic text-muted-foreground/70">{p.dayInLife}</p>
                )}
              </Card>
            );
          })}

          {personas.length === 0 && (
            <div className="col-span-full">
              <Card className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="rounded-full border border-violet/30 bg-violet/10 p-4">
                  <Users className="h-7 w-7 text-violet" />
                </div>
                <div>
                  <p className="text-sm font-medium">No personas yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Create AI-powered user archetypes.</p>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

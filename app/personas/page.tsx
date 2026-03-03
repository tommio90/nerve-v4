"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Plus, Sparkles, Wand2 } from "lucide-react";

type Persona = {
  id: string;
  name: string;
  archetype: string;
  demographics: Record<string, string>;
  goals: string[];
  pains: string[];
  behaviors: string[];
  dayInLife: string;
  aiAdoptionReadiness: number;
  notes: string;
};

const emptyForm = {
  name: "",
  archetype: "",
  demographics: { ageRange: "", location: "", jobTitle: "", income: "" },
  goals: "",
  pains: "",
  behaviors: "",
  dayInLife: "",
  aiAdoptionReadiness: 0,
  notes: "",
  description: "",
};

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    const res = await fetch("/api/personas");
    const data = await res.json();
    setPersonas(data.personas ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!form.name.trim()) return;
    await fetch("/api/personas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        archetype: form.archetype,
        demographics: form.demographics,
        goals: form.goals.split("\n").map((line) => line.trim()).filter(Boolean),
        pains: form.pains.split("\n").map((line) => line.trim()).filter(Boolean),
        behaviors: form.behaviors.split("\n").map((line) => line.trim()).filter(Boolean),
        dayInLife: form.dayInLife,
        aiAdoptionReadiness: form.aiAdoptionReadiness,
        notes: form.notes,
      }),
    });
    setForm(emptyForm);
    await load();
    setShowForm(false);
  };

  const generatePersona = async () => {
    if (!form.description.trim()) return;
    setGenerating(true);
    const res = await fetch("/api/personas/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: form.description }),
    });
    const data = await res.json();
    if (data.persona) {
      const persona = data.persona as Persona;
      setForm({
        ...form,
        name: persona.name,
        archetype: persona.archetype,
        demographics: { ...form.demographics, ...(persona.demographics ?? {}) },
        goals: (persona.goals ?? []).join("\n"),
        pains: (persona.pains ?? []).join("\n"),
        behaviors: (persona.behaviors ?? []).join("\n"),
        dayInLife: persona.dayInLife ?? "",
        aiAdoptionReadiness: persona.aiAdoptionReadiness ?? 0,
        notes: persona.notes ?? "",
      });
    }
    setGenerating(false);
  };

  const cards = useMemo(() => personas, [personas]);

  return (
    <div className="synapse-page animate-fade-in space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="title-3">Personas</h1>
          <p className="text-subtle">Capture high-resolution personas and AI adoption readiness.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Persona
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Persona</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-caption">AI Generate</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the target persona in free text..."
              />
              <Button onClick={generatePersona} disabled={generating} variant="outline" className="gap-2">
                <Wand2 className="h-4 w-4" />
                {generating ? "Generating..." : "AI Generate"}
              </Button>
            </div>

            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" />
            <Input value={form.archetype} onChange={(e) => setForm({ ...form, archetype: e.target.value })} placeholder="Archetype" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={form.demographics.ageRange} onChange={(e) => setForm({ ...form, demographics: { ...form.demographics, ageRange: e.target.value } })} placeholder="Age range" />
              <Input value={form.demographics.location} onChange={(e) => setForm({ ...form, demographics: { ...form.demographics, location: e.target.value } })} placeholder="Location" />
              <Input value={form.demographics.jobTitle} onChange={(e) => setForm({ ...form, demographics: { ...form.demographics, jobTitle: e.target.value } })} placeholder="Job title" />
              <Input value={form.demographics.income} onChange={(e) => setForm({ ...form, demographics: { ...form.demographics, income: e.target.value } })} placeholder="Income" />
            </div>
            <Textarea value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} placeholder="Goals (one per line)" />
            <Textarea value={form.pains} onChange={(e) => setForm({ ...form, pains: e.target.value })} placeholder="Pains (one per line)" />
            <Textarea value={form.behaviors} onChange={(e) => setForm({ ...form, behaviors: e.target.value })} placeholder="Behaviors (one per line)" />
            <Textarea value={form.dayInLife} onChange={(e) => setForm({ ...form, dayInLife: e.target.value })} placeholder="Day in the life" />
            <div className="space-y-1">
              <Label className="text-caption">AI Adoption Readiness: {form.aiAdoptionReadiness}%</Label>
              <input
                type="range"
                min={0}
                max={100}
                value={form.aiAdoptionReadiness}
                onChange={(e) => setForm({ ...form, aiAdoptionReadiness: Number(e.target.value) })}
                className="w-full"
              />
            </div>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" />
            <Button onClick={submit}>Save Persona</Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-4/5" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((persona) => (
            <Card key={persona.id} className="p-0">
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle>{persona.name}</CardTitle>
                {persona.archetype ? <Badge>{persona.archetype}</Badge> : null}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-caption">
                    <span>AI readiness</span>
                    <span>{Math.round(persona.aiAdoptionReadiness)}%</span>
                  </div>
                  <Progress value={persona.aiAdoptionReadiness} />
                </div>
                <div className="space-y-1 text-caption">
                  <p>Goals: {(persona.goals ?? []).slice(0, 3).join(" · ") || "None"}</p>
                  <p>Pains: {(persona.pains ?? []).slice(0, 3).join(" · ") || "None"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {cards.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-3 py-10 text-center md:col-span-2 xl:col-span-3">
              <div className="rounded-full border border-violet/30 bg-violet/10 p-3">
                <Sparkles className="h-6 w-6 text-violet" />
              </div>
              <p className="text-subtle">No personas yet — create the first one.</p>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, UserRound, X } from "lucide-react";

type Contact = {
  id: string;
  name: string;
  email?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  organization?: string | null;
  personaId?: string | null;
  personaScore: number;
  pipelineStage: string;
  pains: string[];
  objections: string[];
  signals: string[];
  followUps: string[];
  notes: string;
};

type Persona = { id: string; name: string };

const STAGES = ["LEAD", "CONTACTED", "INTERVIEWED", "CUSTOMER", "ADVOCATE"] as const;

function scoreTone(score: number) {
  if (score >= 70) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  if (score >= 40) return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
  return "bg-red-500/20 text-red-300 border-red-500/40";
}

export default function CrmPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [filterPersona, setFilterPersona] = useState("ALL");
  const [sortByScore, setSortByScore] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    linkedin: "",
    twitter: "",
    organization: "",
    personaId: "",
    notes: "",
  });

  const load = async () => {
    const res = await fetch("/api/crm");
    const data = await res.json();
    setContacts(data.contacts ?? []);
    const personasRes = await fetch("/api/personas");
    const personaData = await personasRes.json();
    setPersonas(personaData.personas ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    let list = contacts;
    if (filterPersona !== "ALL") {
      list = list.filter((c) => c.personaId === filterPersona);
    }
    if (sortByScore) {
      list = [...list].sort((a, b) => b.personaScore - a.personaScore);
    }

    const map = new Map<string, Contact[]>();
    STAGES.forEach((stage) => map.set(stage, []));
    list.forEach((contact) => {
      const stage = contact.pipelineStage as string;
      map.get(stage)?.push(contact);
    });
    return map;
  }, [contacts, filterPersona, sortByScore]);

  const submit = async () => {
    if (!form.name.trim()) return;
    await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email || undefined,
        linkedin: form.linkedin || undefined,
        twitter: form.twitter || undefined,
        organization: form.organization || undefined,
        personaId: form.personaId || undefined,
        notes: form.notes,
      }),
    });
    setForm({ name: "", email: "", linkedin: "", twitter: "", organization: "", personaId: "", notes: "" });
    await load();
    setShowForm(false);
  };

  const updateContact = async (contact: Contact, updates: Partial<Contact>) => {
    await fetch(`/api/crm/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    await load();
  };

  const moveContact = (contact: Contact, direction: "next" | "prev") => {
    const index = STAGES.indexOf(contact.pipelineStage as typeof STAGES[number]);
    const nextIndex = direction === "next" ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= STAGES.length) return;
    updateContact(contact, { pipelineStage: STAGES[nextIndex] });
  };

  return (
    <div className="synapse-page animate-fade-in space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="synapse-heading">CRM</h1>
          <p className="text-sm text-muted-foreground">Manage your pipeline and persona fit signals.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Contact
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent onClose={() => setShowForm(false)}>
          <DialogHeader>
            <DialogTitle>Create Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" />
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" />
            <Input value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} placeholder="LinkedIn" />
            <Input value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} placeholder="Twitter" />
            <Input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} placeholder="Organization" />
            <select
              className="w-full rounded-md border border-white/10 bg-transparent px-2 py-2 text-sm"
              value={form.personaId}
              onChange={(e) => setForm({ ...form, personaId: e.target.value })}
            >
              <option value="" className="bg-black">No persona</option>
              {personas.map((persona) => (
                <option key={persona.id} value={persona.id} className="bg-black">{persona.name}</option>
              ))}
            </select>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" />
            <Button onClick={submit}>Create Contact</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-md border border-white/10 bg-transparent px-2 py-1 text-xs"
          value={filterPersona}
          onChange={(e) => setFilterPersona(e.target.value)}
        >
          <option value="ALL" className="bg-black">All personas</option>
          {personas.map((persona) => (
            <option key={persona.id} value={persona.id} className="bg-black">{persona.name}</option>
          ))}
        </select>
        <Button size="sm" variant={sortByScore ? "default" : "outline"} onClick={() => setSortByScore((prev) => !prev)}>
          Sort by persona score
        </Button>
      </div>

      {loading ? (
        <Card className="animate-pulse space-y-3 p-5">
          <div className="h-4 w-2/5 rounded-full bg-muted/50" />
          <div className="h-3 w-4/5 rounded-full bg-muted/40" />
        </Card>
      ) : (
        <div className="grid gap-3 xl:grid-cols-5">
          {STAGES.map((stage) => (
            <div key={stage} className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{stage}</h2>
                <span className="text-xs text-muted-foreground">{grouped.get(stage)?.length ?? 0}</span>
              </div>
              <div className="space-y-2">
                {(grouped.get(stage) ?? []).map((contact) => (
                  <Card key={contact.id} className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <button className="text-sm font-semibold hover:text-cyan" onClick={() => setSelected(contact)}>
                        {contact.name}
                      </button>
                      <Badge className={scoreTone(contact.personaScore)}>{Math.round(contact.personaScore)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{contact.organization || "No org"}</p>
                    <p className="text-xs text-muted-foreground">{contact.notes?.slice(0, 60) || "No notes"}</p>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => moveContact(contact, "prev")} disabled={stage === STAGES[0]}>Back</Button>
                      <Button size="sm" variant="outline" onClick={() => moveContact(contact, "next")} disabled={stage === STAGES[STAGES.length - 1]}>Advance</Button>
                    </div>
                  </Card>
                ))}
                {(grouped.get(stage) ?? []).length === 0 ? (
                  <Card className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                    <UserRound className="h-5 w-5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">No contacts</p>
                  </Card>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelected(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-black/90 p-6 shadow-2xl transition-all animate-fade-in-up overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Contact Detail</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              <Input value={selected.name} onChange={(e) => setSelected({ ...selected, name: e.target.value })} />
              <Input value={selected.email ?? ""} onChange={(e) => setSelected({ ...selected, email: e.target.value })} placeholder="Email" />
              <Input value={selected.linkedin ?? ""} onChange={(e) => setSelected({ ...selected, linkedin: e.target.value })} placeholder="LinkedIn" />
              <Input value={selected.twitter ?? ""} onChange={(e) => setSelected({ ...selected, twitter: e.target.value })} placeholder="Twitter" />
              <Input value={selected.organization ?? ""} onChange={(e) => setSelected({ ...selected, organization: e.target.value })} placeholder="Organization" />
              <select
                className="w-full rounded-md border border-white/10 bg-transparent px-2 py-2 text-sm"
                value={selected.pipelineStage}
                onChange={(e) => setSelected({ ...selected, pipelineStage: e.target.value })}
              >
                {STAGES.map((stage) => (
                  <option key={stage} value={stage} className="bg-black">{stage}</option>
                ))}
              </select>
              <Textarea value={selected.notes} onChange={(e) => setSelected({ ...selected, notes: e.target.value })} placeholder="Notes" />
              <Textarea
                value={selected.pains.join("\n")}
                onChange={(e) => setSelected({ ...selected, pains: e.target.value.split("\n").map((line) => line.trim()).filter(Boolean) })}
                placeholder="Pains (one per line)"
              />
              <Textarea
                value={selected.objections.join("\n")}
                onChange={(e) => setSelected({ ...selected, objections: e.target.value.split("\n").map((line) => line.trim()).filter(Boolean) })}
                placeholder="Objections (one per line)"
              />
              <Textarea
                value={selected.signals.join("\n")}
                onChange={(e) => setSelected({ ...selected, signals: e.target.value.split("\n").map((line) => line.trim()).filter(Boolean) })}
                placeholder="Signals (one per line)"
              />
              <Textarea
                value={selected.followUps.join("\n")}
                onChange={(e) => setSelected({ ...selected, followUps: e.target.value.split("\n").map((line) => line.trim()).filter(Boolean) })}
                placeholder="Follow-ups (one per line)"
              />
              <Button onClick={() => updateContact(selected, selected)} className="gap-2">
                Save Contact
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

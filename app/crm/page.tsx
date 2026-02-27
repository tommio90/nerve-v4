"use client";

import { useEffect, useMemo, useState } from "react";
import { Contact, Plus, Building2, Mail, Linkedin, Twitter, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CRMContact = {
  id: string;
  name: string;
  email?: string;
  linkedin?: string;
  twitter?: string;
  organization?: string;
  pipelineStage: string;
  personaScore: number;
  pains: unknown[];
  objections: unknown[];
  signals: unknown[];
  notes: string;
  interviews: unknown[];
  createdAt: string;
  updatedAt: string;
};

const STAGES = [
  { key: "LEAD", label: "Lead", color: "text-muted-foreground bg-muted" },
  { key: "CONTACTED", label: "Contacted", color: "text-blue-400 bg-blue-400/10" },
  { key: "INTERVIEWED", label: "Interviewed", color: "text-violet bg-violet/10" },
  { key: "CUSTOMER", label: "Customer", color: "text-emerald-400 bg-emerald-400/10" },
  { key: "ADVOCATE", label: "Advocate", color: "text-cyan bg-cyan/10" },
];

const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.key, s]));

const FILTER_TABS = [{ key: "ALL", label: "All" }, ...STAGES.map((s) => ({ key: s.key, label: s.label }))];

function ContactForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [stage, setStage] = useState("LEAD");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, organization, linkedin, pipelineStage: stage, notes }),
    });
    setSaving(false);
    onCreated();
  };

  return (
    <div className="space-y-4">
      <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Organization" value={organization} onChange={(e) => setOrganization(e.target.value)} />
      </div>
      <Input placeholder="LinkedIn URL" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Pipeline stage</p>
        <div className="flex flex-wrap gap-1">
          {STAGES.map((s) => (
            <button
              key={s.key}
              onClick={() => setStage(s.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                stage === s.key
                  ? "bg-violet/15 text-violet ring-1 ring-violet/35"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <Textarea placeholder="Notes…" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      <Button onClick={submit} disabled={saving || !name.trim()} className="w-full">
        {saving ? "Adding…" : "Add Contact"}
      </Button>
    </div>
  );
}

function StageAdvance({ contact, onRefresh }: { contact: CRMContact; onRefresh: () => void }) {
  const stageKeys = STAGES.map((s) => s.key);
  const currentIdx = stageKeys.indexOf(contact.pipelineStage);
  const nextStage = stageKeys[currentIdx + 1];

  if (!nextStage) return null;

  const advance = async () => {
    await fetch(`/api/crm/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: nextStage }),
    });
    onRefresh();
  };

  return (
    <button
      onClick={advance}
      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      <ArrowRight className="h-2.5 w-2.5" />
      Move to {STAGE_MAP[nextStage]?.label}
    </button>
  );
}

export default function CRMPage() {
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("ALL");

  const load = async () => {
    const res = await fetch("/api/crm");
    const data = await res.json();
    setContacts(data.contacts ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === "ALL") return contacts;
    return contacts.filter((c) => c.pipelineStage === filter);
  }, [contacts, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: contacts.length };
    for (const contact of contacts) c[contact.pipelineStage] = (c[contact.pipelineStage] || 0) + 1;
    return c;
  }, [contacts]);

  return (
    <div className="synapse-page animate-fade-in space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="synapse-heading">CRM</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Manage your research contacts and pipeline.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Contact</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent onClose={() => setShowForm(false)}>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <ContactForm
            onCreated={async () => {
              await load();
              setShowForm(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {!loading && contacts.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {FILTER_TABS.map((tab) => {
            const count = counts[tab.key] || 0;
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
                {count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-violet/20 text-violet" : "bg-muted text-muted-foreground"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse space-y-3 p-5">
              <div className="h-4 w-2/5 rounded-full bg-muted/50" />
              <div className="h-3 w-3/5 rounded-full bg-muted/40" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((contact) => {
            const stageCfg = STAGE_MAP[contact.pipelineStage];
            return (
              <Card key={contact.id} className="transition-all hover:border-violet/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet/20 to-cyan/20 text-xs font-bold uppercase text-violet">
                        {contact.name.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{contact.name}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {contact.organization && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {contact.organization}
                            </span>
                          )}
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-foreground">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </a>
                          )}
                          {contact.linkedin && (
                            <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                              <Linkedin className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    {contact.notes && (
                      <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{contact.notes}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground">{contact.interviews.length} interviews</span>
                      <StageAdvance contact={contact} onRefresh={load} />
                    </div>
                  </div>
                  {stageCfg && (
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${stageCfg.color}`}>
                      {stageCfg.label}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}

          {contacts.length === 0 && (
            <Card className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="rounded-full border border-violet/30 bg-violet/10 p-4">
                <Contact className="h-7 w-7 text-violet" />
              </div>
              <div>
                <p className="text-sm font-medium">No contacts yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Add your first research contact.</p>
              </div>
            </Card>
          )}

          {contacts.length > 0 && filtered.length === 0 && (
            <Card className="py-10 text-center">
              <p className="text-sm text-muted-foreground">No contacts in this stage.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

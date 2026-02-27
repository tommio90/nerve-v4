"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Plus, Calendar, CheckCircle2, XCircle, Clock, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type InterviewContact = {
  id: string;
  name: string;
  organization?: string;
  email?: string;
};

type Interview = {
  id: string;
  contactId: string;
  contact: InterviewContact;
  transcript: string;
  questions: unknown[];
  insights: unknown[];
  assumptions: unknown[];
  status: string;
  scheduledAt?: string;
  completedAt?: string;
  followUpSent: boolean;
  createdAt: string;
};

type CRMContact = {
  id: string;
  name: string;
  organization?: string;
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  SCHEDULED: { label: "Scheduled", icon: <Clock className="h-3 w-3" />, color: "text-blue-400 bg-blue-400/10 ring-blue-400/20" },
  COMPLETED: { label: "Completed", icon: <CheckCircle2 className="h-3 w-3" />, color: "text-emerald-400 bg-emerald-400/10 ring-emerald-400/20" },
  CANCELLED: { label: "Cancelled", icon: <XCircle className="h-3 w-3" />, color: "text-red-400 bg-red-400/10 ring-red-400/20" },
};

const FILTER_TABS = [
  { key: "ALL", label: "All" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function formatRelative(iso?: string) {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - Date.now();
  const day = 1000 * 60 * 60 * 24;
  const hour = 1000 * 60 * 60;
  if (Math.abs(diff) < hour) return rtf.format(Math.round(diff / 60000), "minute");
  if (Math.abs(diff) < day) return rtf.format(Math.round(diff / hour), "hour");
  return rtf.format(Math.round(diff / day), "day");
}

function InterviewForm({ onCreated }: { onCreated: () => void }) {
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [contactId, setContactId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [questions, setQuestions] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/crm")
      .then((r) => r.json())
      .then((d) => setContacts(d.contacts ?? []));
  }, []);

  const submit = async () => {
    if (!contactId) return;
    setSaving(true);
    const qs = questions.split("\n").map((s) => s.trim()).filter(Boolean);
    await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId,
        scheduledAt: scheduledAt || undefined,
        questions: qs,
      }),
    });
    setSaving(false);
    onCreated();
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Contact</p>
        {contacts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No contacts yet — add one in CRM first.</p>
        ) : (
          <select
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          >
            <option value="">Select contact…</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.organization ? ` — ${c.organization}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Scheduled date & time</p>
        <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
      </div>
      <Textarea
        placeholder={"Interview questions (one per line)\n\nWhat's your biggest pain with X?\nHow do you currently solve Y?"}
        value={questions}
        onChange={(e) => setQuestions(e.target.value)}
        rows={5}
      />
      <Button onClick={submit} disabled={saving || !contactId} className="w-full">
        {saving ? "Scheduling…" : "Schedule Interview"}
      </Button>
    </div>
  );
}

function CompleteModal({
  interview,
  onSaved,
  onClose,
}: {
  interview: Interview;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [transcript, setTranscript] = useState(interview.transcript ?? "");
  const [insights, setInsights] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const insightArr = insights.split("\n").map((s) => s.trim()).filter(Boolean).map((content) => ({ type: "observation", content }));
    await fetch(`/api/interviews/${interview.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, insights: insightArr, status: "COMPLETED" }),
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Paste or type interview transcript…"
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        rows={6}
      />
      <Textarea
        placeholder={"Key insights (one per line)\n\nThey mentioned X…\nStrong pain around Y…"}
        value={insights}
        onChange={(e) => setInsights(e.target.value)}
        rows={4}
      />
      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? "Saving…" : "Mark Complete"}
      </Button>
    </div>
  );
}

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>("ALL");
  const [completing, setCompleting] = useState<Interview | null>(null);

  const load = async () => {
    const res = await fetch("/api/interviews");
    const data = await res.json();
    setInterviews(data.interviews ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === "ALL") return interviews;
    return interviews.filter((i) => i.status === filter);
  }, [interviews, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: interviews.length };
    for (const i of interviews) c[i.status] = (c[i.status] || 0) + 1;
    return c;
  }, [interviews]);

  return (
    <div className="synapse-page animate-fade-in space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="synapse-heading">Interviews</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Schedule and analyze customer discovery interviews.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Schedule Interview</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent onClose={() => setShowForm(false)}>
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
          </DialogHeader>
          <InterviewForm
            onCreated={async () => {
              await load();
              setShowForm(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {completing && (
        <Dialog open onOpenChange={() => setCompleting(null)}>
          <DialogContent onClose={() => setCompleting(null)}>
            <DialogHeader>
              <DialogTitle>Complete Interview — {completing.contact.name}</DialogTitle>
            </DialogHeader>
            <CompleteModal interview={completing} onSaved={load} onClose={() => setCompleting(null)} />
          </DialogContent>
        </Dialog>
      )}

      {!loading && interviews.length > 0 && (
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
          {filtered.map((interview) => {
            const statusCfg = STATUS_CONFIG[interview.status] ?? STATUS_CONFIG.SCHEDULED;
            const insightCount = Array.isArray(interview.insights) ? interview.insights.length : 0;
            const questionCount = Array.isArray(interview.questions) ? interview.questions.length : 0;
            return (
              <Card key={interview.id} className="space-y-3 transition-all hover:border-violet/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 shrink-0 text-violet" />
                      <span className="text-sm font-semibold">{interview.contact.name}</span>
                      {interview.contact.organization && (
                        <span className="text-xs text-muted-foreground">@ {interview.contact.organization}</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {interview.scheduledAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatRelative(interview.scheduledAt)}
                        </span>
                      )}
                      {questionCount > 0 && <span>{questionCount} questions</span>}
                      {insightCount > 0 && (
                        <span className="flex items-center gap-1 text-yellow-400">
                          <Lightbulb className="h-3 w-3" />
                          {insightCount} insights
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${statusCfg.color}`}>
                      {statusCfg.icon}
                      {statusCfg.label}
                    </span>
                    {interview.status === "SCHEDULED" && (
                      <button
                        onClick={() => setCompleting(interview)}
                        className="text-[10px] text-cyan hover:underline"
                      >
                        Complete →
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {interviews.length === 0 && (
            <Card className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="rounded-full border border-violet/30 bg-violet/10 p-4">
                <MessageSquare className="h-7 w-7 text-violet" />
              </div>
              <div>
                <p className="text-sm font-medium">No interviews yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Schedule your first customer discovery call.</p>
              </div>
            </Card>
          )}

          {interviews.length > 0 && filtered.length === 0 && (
            <Card className="py-10 text-center">
              <p className="text-sm text-muted-foreground">No interviews match the selected filter.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

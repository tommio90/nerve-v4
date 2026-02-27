"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Sparkles } from "lucide-react";

type Interview = {
  id: string;
  status: string;
  scheduledAt?: string | null;
  completedAt?: string | null;
  transcript: string;
  insights: { type: string; content: string }[];
  assumptions: { assumptionId: string; confidenceDelta: number; evidence: string }[];
  questions: string[];
  followUpSent: boolean;
};

type Contact = { name: string; email?: string | null; organization?: string | null };

export default function InterviewDetailPage() {
  const params = useParams<{ id: string }>();
  const interviewId = params.id;
  const [interview, setInterview] = useState<Interview | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState("");

  const load = async () => {
    const res = await fetch(`/api/interviews/${interviewId}`);
    const data = await res.json();
    setInterview(data.interview ?? null);
    setContact(data.contact ?? null);
    setTranscriptDraft(data.interview?.transcript ?? "");
    setLoading(false);
  };

  useEffect(() => {
    if (interviewId) {
      load();
    }
  }, [interviewId]);

  const saveTranscript = async () => {
    if (!interview) return;
    await fetch(`/api/interviews/${interview.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: transcriptDraft }),
    });
    await load();
  };

  const processTranscript = async () => {
    if (!interview) return;
    setProcessing(true);
    await fetch(`/api/interviews/${interview.id}/process`, { method: "POST" });
    setProcessing(false);
    await load();
  };

  if (loading || !interview) {
    return (
      <div className="synapse-page animate-fade-in space-y-4">
        <Card className="animate-pulse space-y-3 p-5">
          <div className="h-4 w-2/5 rounded-full bg-muted/50" />
          <div className="h-3 w-4/5 rounded-full bg-muted/40" />
        </Card>
      </div>
    );
  }

  return (
    <div className="synapse-page animate-fade-in space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="synapse-heading inline-flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-cyan" />
            {contact?.name ?? "Interview"}
          </h1>
          <p className="text-sm text-muted-foreground">{contact?.organization ?? ""}</p>
        </div>
        <Badge>{interview.status}</Badge>
      </div>

      <Card className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>Scheduled: {interview.scheduledAt ? new Date(interview.scheduledAt).toLocaleString() : "Not set"}</span>
          <span>Completed: {interview.completedAt ? new Date(interview.completedAt).toLocaleString() : "Not set"}</span>
          <span>{interview.followUpSent ? "Follow-up sent" : "No follow-up"}</span>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Transcript</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={saveTranscript}>Save Transcript</Button>
            <Button onClick={processTranscript} disabled={processing}>
              {processing ? "Processing..." : "Process Transcript"}
            </Button>
          </div>
        </div>
        <Textarea value={transcriptDraft} onChange={(e) => setTranscriptDraft(e.target.value)} className="min-h-[200px]" />
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold">Insights</h2>
        {interview.insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">No insights extracted yet.</p>
        ) : (
          <div className="space-y-2">
            {interview.insights.map((insight, index) => (
              <div key={`${insight.type}-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{insight.type}</span>
                </div>
                <p>{insight.content}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold">Assumptions Updated</h2>
        {interview.assumptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assumptions updated yet.</p>
        ) : (
          <div className="space-y-2">
            {interview.assumptions.map((item, index) => (
              <div key={`${item.assumptionId}-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.assumptionId}</span>
                  <span>{item.confidenceDelta >= 0 ? `+${item.confidenceDelta}` : item.confidenceDelta} confidence</span>
                </div>
                {item.evidence ? <p className="mt-1 text-xs text-muted-foreground">{item.evidence}</p> : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold">Questions</h2>
        {interview.questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No questions captured.</p>
        ) : (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {interview.questions.map((question, index) => (
              <li key={`${question}-${index}`}>• {question}</li>
            ))}
          </ul>
        )}
      </Card>

      {interview.insights.length === 0 && interview.assumptions.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="rounded-full border border-violet/30 bg-violet/10 p-3">
            <Sparkles className="h-6 w-6 text-violet" />
          </div>
          <p className="text-sm text-muted-foreground">Paste a transcript and process it to extract insights.</p>
        </Card>
      ) : null}
    </div>
  );
}

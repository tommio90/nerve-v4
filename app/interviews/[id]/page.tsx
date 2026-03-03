"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
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
        <Card className="space-y-3 p-5">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-4/5" />
        </Card>
      </div>
    );
  }

  return (
    <div className="synapse-page animate-fade-in space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="title-3 inline-flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-cyan" />
            {contact?.name ?? "Interview"}
          </h1>
          <p className="text-subtle">{contact?.organization ?? ""}</p>
        </div>
        <StatusBadge status={interview.status} />
      </div>

      <Card className="p-0">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3 text-caption">
            <span>Scheduled: {interview.scheduledAt ? new Date(interview.scheduledAt).toLocaleString() : "Not set"}</span>
            <span>Completed: {interview.completedAt ? new Date(interview.completedAt).toLocaleString() : "Not set"}</span>
            <span>{interview.followUpSent ? "Follow-up sent" : "No follow-up"}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="p-0">
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle>Transcript</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={saveTranscript}>Save Transcript</Button>
            <Button onClick={processTranscript} disabled={processing}>
              {processing ? "Processing..." : "Process Transcript"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea value={transcriptDraft} onChange={(e) => setTranscriptDraft(e.target.value)} className="min-h-[200px]" />
        </CardContent>
      </Card>

      <Card className="p-0">
        <CardHeader>
          <CardTitle>Insights</CardTitle>
        </CardHeader>
        <CardContent>
          {interview.insights.length === 0 ? (
            <p className="text-subtle">No insights extracted yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead>Content</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interview.insights.map((insight, index) => (
                  <TableRow key={`${insight.type}-${index}`}>
                    <TableCell className="text-caption">{insight.type}</TableCell>
                    <TableCell className="text-sm">{insight.content}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="p-0">
        <CardHeader>
          <CardTitle>Assumptions Updated</CardTitle>
        </CardHeader>
        <CardContent>
          {interview.assumptions.length === 0 ? (
            <p className="text-subtle">No assumptions updated yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assumption</TableHead>
                  <TableHead className="w-[120px]">Confidence</TableHead>
                  <TableHead>Evidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interview.assumptions.map((item, index) => (
                  <TableRow key={`${item.assumptionId}-${index}`}>
                    <TableCell className="text-sm">{item.assumptionId}</TableCell>
                    <TableCell className="text-sm">
                      {item.confidenceDelta >= 0 ? `+${item.confidenceDelta}` : item.confidenceDelta}
                    </TableCell>
                    <TableCell className="text-caption">{item.evidence || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="p-0">
        <CardHeader>
          <CardTitle>Questions</CardTitle>
        </CardHeader>
        <CardContent>
          {interview.questions.length === 0 ? (
            <p className="text-subtle">No questions captured.</p>
          ) : (
            <ul className="space-y-2 text-subtle">
              {interview.questions.map((question, index) => (
                <li key={`${question}-${index}`}>• {question}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {interview.insights.length === 0 && interview.assumptions.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="rounded-full border border-violet/30 bg-violet/10 p-3">
            <Sparkles className="h-6 w-6 text-violet" />
          </div>
          <p className="text-subtle">Paste a transcript and process it to extract insights.</p>
        </Card>
      ) : null}
    </div>
  );
}

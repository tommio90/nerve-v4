"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type MemoryDoc = {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  source: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function RelativeTime({ iso }: { iso: string }) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return <span>just now</span>;
  if (mins < 60) return <span>{mins}m ago</span>;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return <span>{hrs}h ago</span>;
  const days = Math.floor(hrs / 24);
  return <span>{days}d ago</span>;
}

function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let key = 0;
  const processInline = (text: string) =>
    text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  for (const line of lines) {
    key++;
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={key} className="my-3 overflow-x-auto rounded-lg bg-surface-deep p-4 text-caption">
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) { codeLines.push(line); continue; }
    if (line.startsWith("# ")) elements.push(<h1 key={key} className="mb-3 mt-5 text-xl font-bold text-white">{line.slice(2)}</h1>);
    else if (line.startsWith("## ")) elements.push(<h2 key={key} className="mb-2 mt-4 text-lg font-semibold text-white">{line.slice(3)}</h2>);
    else if (line.startsWith("### ")) elements.push(<h3 key={key} className="mb-2 mt-3 text-base font-semibold text-slate-200">{line.slice(4)}</h3>);
    else if (line.startsWith("---")) elements.push(<hr key={key} className="my-4 border-border" />);
    else if (line.startsWith("- ") || line.startsWith("* ")) elements.push(
      <div key={key} className="flex gap-2 py-0.5 pl-4 text-sm text-slate-300">
        <span className="text-muted-foreground">•</span>
        <span dangerouslySetInnerHTML={{ __html: processInline(line.slice(2)) }} />
      </div>
    );
    else if (line.trim() === "") elements.push(<div key={key} className="h-1.5" />);
    else elements.push(<p key={key} className="text-sm leading-relaxed text-slate-300" dangerouslySetInnerHTML={{ __html: processInline(line) }} />);
  }
  return elements;
}

export default function MemoryPage() {
  const [docs, setDocs] = useState<MemoryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<MemoryDoc | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/docs");
      const data = await res.json();
      const memDocs = (data.docs || []).filter((d: MemoryDoc) => d.category === "memory");
      memDocs.sort((a: MemoryDoc, b: MemoryDoc) => {
        if (a.source === "MEMORY.md") return -1;
        if (b.source === "MEMORY.md") return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setDocs(memDocs);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync/memory", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setSyncResult(`✅ Synced ${data.synced} files${data.errors > 0 ? `, ${data.errors} errors` : ""}`);
        await load();
      } else {
        setSyncResult(`❌ ${data.error || "Sync failed"}`);
      }
    } catch {
      setSyncResult("❌ Sync request failed");
    }
    setSyncing(false);
    setTimeout(() => setSyncResult(null), 4000);
  };

  if (selectedDoc) {
    return (
      <div className="synapse-page space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedDoc(null)}
          className="gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          ← Back to memory vault
        </Button>
        <Card className="p-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{selectedDoc.title}</CardTitle>
                <div className="mt-1 flex items-center gap-3 text-caption">
                  {selectedDoc.source && <span className="font-mono">{selectedDoc.source}</span>}
                  <span>{formatDate(selectedDoc.createdAt)}</span>
                  <span>Updated <RelativeTime iso={selectedDoc.updatedAt} /></span>
                </div>
              </div>
              <span className="text-2xl">🧠</span>
            </div>
          </CardHeader>
          <CardContent>
            {renderMarkdown(selectedDoc.content)}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="synapse-page space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="title-3">Memory Vault</h1>
          <p className="text-subtle">Daily notes, long-term memory, and context files</p>
        </div>
        <div className="flex items-center gap-3">
          {syncResult && (
            <span className="text-caption animate-in fade-in">{syncResult}</span>
          )}
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? "Syncing…" : "🔄 Sync Now"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <span className="mb-3 text-4xl">🧠</span>
          <h3 className="text-sm font-semibold text-white">No memory files synced yet</h3>
          <p className="mt-1 text-caption">Click &quot;Sync Now&quot; to import memory files from your workspace</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => {
            const isLongTerm = doc.source === "MEMORY.md";
            return (
              <button
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className="w-full rounded-xl border border-border bg-surface p-4 text-left transition hover:border-ring hover:bg-surface-hover"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span>{isLongTerm ? "🧠" : "📝"}</span>
                      <h3 className="text-sm font-semibold text-white truncate">{doc.title}</h3>
                      {isLongTerm && (
                        <Badge className="border-violet/30 bg-violet/20 text-[10px] text-violet">
                          long-term
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-caption truncate">
                      {doc.source && <span className="font-mono">{doc.source}</span>}
                      {doc.source && " · "}
                      Updated <RelativeTime iso={doc.updatedAt} />
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">{formatDate(doc.createdAt)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback } from "react";

type Preference = { id: string; dimension: string; value: number; confidence: number; sampleSize: number; reasoning: string };
type Decision = { id: string; entityType: string; entityId: string; action: string; feedback: string | null; createdAt: string };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<Preference[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [prefRes, decRes] = await Promise.all([
        fetch("/api/preferences"),
        fetch("/api/decisions"),
      ]);
      const [prefData, decData] = await Promise.all([prefRes.json(), decRes.json()]);
      setPrefs(prefData.preferences || []);
      setDecisions(decData.decisions || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalyzeResult(null);
    try {
      const res = await fetch("/api/preferences/analyze", { method: "POST" });
      if (res.ok) {
        setAnalyzeResult("✅ Preferences updated from decision history");
        await load();
      } else {
        setAnalyzeResult("❌ Analysis failed");
      }
    } catch {
      setAnalyzeResult("❌ Request failed");
    }
    setAnalyzing(false);
    setTimeout(() => setAnalyzeResult(null), 4000);
  };

  const approvals = decisions.filter(d => d.action === "APPROVE").length;
  const rejects = decisions.filter(d => d.action === "REJECT").length;
  const defers = decisions.filter(d => d.action === "DEFER").length;

  return (
    <div className="synapse-page space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="synapse-heading">Preferences</h1>
          <p className="text-sm text-muted-foreground">Learned from your approval/rejection patterns</p>
        </div>
        <div className="flex items-center gap-3">
          {analyzeResult && <span className="text-xs text-muted-foreground">{analyzeResult}</span>}
          <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? "Analyzing…" : "🔄 Analyze Decisions"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Card key={i} className="h-16 animate-pulse bg-muted/20" />)}</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{approvals}</div>
              <div className="text-xs text-muted-foreground">Approved</div>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold text-red-400">{rejects}</div>
              <div className="text-xs text-muted-foreground">Rejected</div>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold text-amber-400">{defers}</div>
              <div className="text-xs text-muted-foreground">Deferred</div>
            </Card>
          </div>

          {/* Preference Vectors */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-300">Learned Dimensions</h2>
            {prefs.length === 0 ? (
              <Card>
                <p className="text-sm text-muted-foreground">No preference signals yet. They build as you approve and reject proposals. Click "Analyze Decisions" after making some decisions.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {prefs.map((p) => (
                  <Card key={p.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{p.dimension}</span>
                      <span className="text-sm font-mono text-muted-foreground">{p.value.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-cyan transition-all"
                          style={{ width: `${Math.min(p.value * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{(p.confidence * 100).toFixed(0)}% conf</span>
                    </div>
                    {p.reasoning && <p className="text-xs text-muted-foreground">{p.reasoning}</p>}
                    <p className="text-[10px] text-slate-500">{p.sampleSize} samples</p>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Decision Feedback Log */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-300">Decision History</h2>
            {decisions.length === 0 ? (
              <Card><p className="text-sm text-muted-foreground">No decisions recorded yet.</p></Card>
            ) : (
              <div className="space-y-1.5">
                {decisions.slice(0, 50).map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <span className="text-sm">
                      {d.action === "APPROVE" ? "✅" : d.action === "REJECT" ? "❌" : "⏸️"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-slate-300">{d.entityType}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-muted-foreground">{d.action}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-muted-foreground">{formatDate(d.createdAt)}</span>
                      </div>
                      {d.feedback && <p className="mt-0.5 text-xs text-muted-foreground truncate">{d.feedback}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

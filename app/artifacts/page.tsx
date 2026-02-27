"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";

type Artifact = { id: string; title: string; type: string; mimeType: string; createdAt: string };

export default function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/artifacts").then(r => r.json()).then(d => { setArtifacts(d.artifacts || []); setLoading(false); });
  }, []);

  return (
    <div className="synapse-page space-y-4">
      <h1 className="synapse-heading">Artifacts</h1>
      {loading ? (
        <Card className="h-20 animate-pulse bg-muted/20" />
      ) : artifacts.length === 0 ? (
        <Card><p className="text-sm text-muted-foreground">No artifacts yet. They appear when tasks produce deliverables.</p></Card>
      ) : (
        <div className="grid gap-3">
          {artifacts.map((a) => (
            <Card key={a.id}>
              <Link href={`/artifacts/${a.id}`} className="text-sm font-medium hover:underline">{a.title}</Link>
              <p className="text-xs text-muted-foreground">{a.type} · {new Date(a.createdAt).toLocaleDateString()}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

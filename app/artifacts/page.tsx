"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
      <h1 className="title-3">Artifacts</h1>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : artifacts.length === 0 ? (
        <Card>
          <p className="text-subtle">No artifacts yet. They appear when tasks produce deliverables.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {artifacts.map((a) => (
            <Card key={a.id} className="p-0">
              <CardContent className="flex items-center justify-between gap-3 pt-4">
                <div>
                  <Link href={`/artifacts/${a.id}`} className="text-sm font-medium hover:underline">{a.title}</Link>
                  <p className="text-caption">{new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge variant="outline">{a.type}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

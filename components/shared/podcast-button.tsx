"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PodcastButton({ docId }: { docId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/docs/${docId}/podcast`, { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Failed to generate podcast");
      setLoading(false);
      return;
    }

    setAudioUrl(data.doc.podcastAudio || null);
    setLoading(false);
  }

  return (
    <div className="space-y-2">
      <Button onClick={generate} disabled={loading}>
        {loading ? "Generating podcast..." : "Generate Podcast"}
      </Button>
      {error ? <p className="text-xs text-failed">{error}</p> : null}
      {audioUrl ? <audio controls src={audioUrl} className="w-full" /> : null}
    </div>
  );
}

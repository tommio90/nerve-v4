"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function GenerateTasksButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleGenerate() {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/generate-tasks`, {
        method: "POST",
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to generate tasks");
      }

      const count = Array.isArray(payload?.tasks) ? payload.tasks.length : 0;
      toast(`Generated ${count} task${count === 1 ? "" : "s"} with AI`);
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to generate tasks");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="gap-1.5 border-cyan/40 bg-cyan/10 text-cyan hover:bg-cyan/20"
      onClick={handleGenerate}
      disabled={loading}
    >
      <Sparkles className="h-3.5 w-3.5" />
      {loading ? "Generating..." : "Generate Tasks with AI"}
    </Button>
  );
}

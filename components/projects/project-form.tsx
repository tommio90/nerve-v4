"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

export function ProjectForm({ onCreated }: { onCreated?: () => void | Promise<void> } = {}) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thesisScore, setThesisScore] = useState("0.70");
  const [scope, setScope] = useState("M");
  const [reasoning, setReasoning] = useState("Manual entry");

  async function generateWithAI() {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/projects/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to generate project");
        return;
      }

      const { project } = await response.json();
      setTitle(project.title);
      setDescription(project.description);
      setThesisScore(project.thesisScore.toString());
      setScope(project.scope);
      setReasoning(project.reasoning);
      toast("Project generated from memory");
    } catch {
      setError("Failed to generate project");
    } finally {
      setGenerating(false);
    }
  }

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        title: String(formData.get("title") || ""),
        description: String(formData.get("description") || ""),
        thesisScore: Number(formData.get("thesisScore") || 0.5),
        scope: String(formData.get("scope") || "M"),
        reasoning: String(formData.get("reasoning") || "Manual project creation"),
      };

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to create project");
        return;
      }

      formRef.current?.reset();
      setTitle("");
      setDescription("");
      setThesisScore("0.70");
      setScope("M");
      setReasoning("Manual entry");
      toast("Project created");
      router.refresh();
      await onCreated?.();
    } catch {
      setError("Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} action={onSubmit} className="grid gap-3">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={generateWithAI}
          disabled={generating || loading}
          className="gap-1.5"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {generating ? "Generating..." : "Generate from Memory"}
        </Button>
      </div>
      <Input name="title" placeholder="Project title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Textarea name="description" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} />
      <div className="grid grid-cols-3 gap-2">
        <Input name="thesisScore" type="number" min="0" max="1" step="0.01" value={thesisScore} onChange={(e) => setThesisScore(e.target.value)} required />
        <Input name="scope" value={scope} onChange={(e) => setScope(e.target.value)} required />
        <Input name="reasoning" value={reasoning} onChange={(e) => setReasoning(e.target.value)} required />
      </div>
      {error ? <p className="text-xs text-failed">{error}</p> : null}
      <Button type="submit" disabled={loading || generating}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {loading ? "Creating..." : "Create Project"}
      </Button>
    </form>
  );
}

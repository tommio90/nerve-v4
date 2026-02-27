"use client";

import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

interface TaskFormProps {
  projectOptions?: { id: string; title: string }[];
  defaultProjectId?: string;
  onCreated?: () => void | Promise<void>;
}

export function TaskForm({ projectOptions: initialOptions, defaultProjectId, onCreated }: TaskFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [projectOptions, setProjectOptions] = useState(initialOptions || []);
  const [formNonce, setFormNonce] = useState(0);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!initialOptions) {
      fetch("/api/projects").then(r => r.json()).then(d => setProjectOptions(d.projects.map((p: { id: string; title: string }) => ({ id: p.id, title: p.title }))));
    }
  }, [initialOptions]);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        projectId: String(formData.get("projectId") || ""),
        title: String(formData.get("title") || ""),
        description: String(formData.get("description") || ""),
        deliverable: String(formData.get("deliverable") || ""),
        type: String(formData.get("type") || "CUSTOM"),
        modelTier: String(formData.get("modelTier") || "BALANCED"),
        priority: Number(formData.get("priority") || 3),
      };

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to create task");
        return;
      }

      setFormNonce((prev) => prev + 1);
      toast("Task created");
      router.refresh();
      await onCreated?.();
    } catch {
      setError("Failed to create task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form key={formNonce} action={onSubmit} className="grid gap-3">
      <select
        name="projectId"
        defaultValue={defaultProjectId}
        className="h-9 rounded-lg border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        required
      >
        <option value="">Select project</option>
        {projectOptions.map((project) => (
          <option key={project.id} value={project.id}>{project.title}</option>
        ))}
      </select>
      <Input name="title" placeholder="Task title" required />
      <Textarea name="description" placeholder="Description" required />
      <Input name="deliverable" placeholder="Deliverable" required />
      <div className="grid grid-cols-3 gap-2">
        <select
          name="type"
          className="h-9 rounded-lg border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <option value="RESEARCH">RESEARCH</option>
          <option value="CONTENT">CONTENT</option>
          <option value="ANALYSIS">ANALYSIS</option>
          <option value="OUTREACH">OUTREACH</option>
          <option value="PHONE_CALL">PHONE_CALL</option>
          <option value="CUSTOM">CUSTOM</option>
        </select>
        <select
          name="modelTier"
          className="h-9 rounded-lg border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <option value="FAST">FAST</option>
          <option value="BALANCED">BALANCED</option>
          <option value="DEEP">DEEP</option>
        </select>
        <Input name="priority" type="number" min="1" max="5" defaultValue="3" required />
      </div>
      {error ? <p className="text-xs text-failed">{error}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {loading ? "Creating..." : "Create Task"}
      </Button>
    </form>
  );
}

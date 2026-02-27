"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TaskEditorProps {
  id: string;
  description: string;
  deliverable: string;
  status: string;
}

export function TaskEditor({ id, description, deliverable, status }: TaskEditorProps) {
  const router = useRouter();
  const [desc, setDesc] = useState(description);
  const [deliv, setDeliv] = useState(deliverable);
  const [state, setState] = useState(status);
  const [loading, setLoading] = useState(false);

  async function update() {
    setLoading(true);
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: desc, deliverable: deliv, status: state }),
    });
    router.refresh();
    setLoading(false);
  }

  async function remove() {
    setLoading(true);
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    router.push("/tasks");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <select value={state} onChange={(event) => setState(event.target.value as typeof state)} className="h-9 rounded-md border bg-background px-3 text-sm">
        <option value="PROPOSED">PROPOSED</option>
        <option value="APPROVED">APPROVED</option>
        <option value="QUEUED">QUEUED</option>
        <option value="IN_PROGRESS">IN_PROGRESS</option>
        <option value="REVIEW">REVIEW</option>
        <option value="COMPLETE">COMPLETE</option>
        <option value="FAILED">FAILED</option>
      </select>
      <Textarea value={desc} onChange={(event) => setDesc(event.target.value)} />
      <Textarea value={deliv} onChange={(event) => setDeliv(event.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={update} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
        <Button size="sm" variant="destructive" onClick={remove} disabled={loading}>Delete</Button>
      </div>
    </div>
  );
}

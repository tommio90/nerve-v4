"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Pencil, Trash2, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

interface ProjectEditorProps {
  id: string;
  description: string;
  reasoning: string;
  status: string;
}

export function ProjectEditor({ id, description, reasoning, status }: ProjectEditorProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [desc, setDesc] = useState(description);
  const [why, setWhy] = useState(reasoning);
  const [state, setState] = useState(status);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function update() {
    setLoading(true);
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: desc, reasoning: why, status: state }),
    });
    router.refresh();
    setLoading(false);
  }

  async function remove() {
    setLoading(true);
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.push("/projects");
    router.refresh();
  }

  return (
    <Card className="p-3 sm:p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 text-sm font-semibold transition hover:text-cyan"
      >
        <span className="flex items-center gap-2">
          <Pencil className="h-4 w-4 text-cyan" />
          Edit Project
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 animate-fade-in space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
            <select
              value={state}
              onChange={(event) => setState(event.target.value as typeof state)}
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <option value="PROPOSED">PROPOSED</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DEFERRED">DEFERRED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Description</label>
            <Textarea value={desc} onChange={(event) => setDesc(event.target.value)} rows={3} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Reasoning</label>
            <Textarea value={why} onChange={(event) => setWhy(event.target.value)} rows={2} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Button size="sm" onClick={update} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {loading ? "Saving..." : "Save Changes"}
            </Button>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:text-red-400"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Are you sure?</span>
                <Button size="sm" variant="destructive" onClick={remove} disabled={loading}>
                  Yes, delete
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

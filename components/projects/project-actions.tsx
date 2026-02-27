"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Copy, Trash2, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export function ProjectActions({
  projectId,
  projectTitle,
  currentStatus,
}: {
  projectId: string;
  projectTitle: string;
  currentStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const isArchived = currentStatus === "ARCHIVED";

  async function handleArchive() {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isArchived ? "ACTIVE" : "ARCHIVED" }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      toast(isArchived ? "Project unarchived" : "Project archived");
      router.refresh();
    } catch (error) {
      toast("Failed to update project");
    } finally {
      setLoading(false);
    }
  }

  async function handleDuplicate() {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/duplicate`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to duplicate");

      const { project } = await response.json();
      toast("Project duplicated");
      router.push(`/projects/${project.id}`);
    } catch (error) {
      toast("Failed to duplicate project");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 5000);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast("Project deleted");
      router.push("/projects");
    } catch (error) {
      toast("Failed to delete project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-3 p-3 sm:p-4">
      <h2 className="text-sm font-semibold">Project Actions</h2>
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleArchive}
          disabled={loading}
        >
          {isArchived ? (
            <>
              <ArchiveRestore className="h-3.5 w-3.5" />
              Unarchive
            </>
          ) : (
            <>
              <Archive className="h-3.5 w-3.5" />
              Archive
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleDuplicate}
          disabled={loading}
        >
          <Copy className="h-3.5 w-3.5" />
          Duplicate
        </Button>

        <Button
          variant="outline"
          size="sm"
          className={`w-full justify-start gap-2 ${confirmDelete ? "border-red-500/50 bg-red-500/10 text-red-400" : ""}`}
          onClick={handleDelete}
          disabled={loading}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {confirmDelete ? "Click again to confirm" : "Delete"}
        </Button>
      </div>
    </Card>
  );
}

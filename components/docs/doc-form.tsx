"use client";

import { Loader2, Sparkles, Video } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type TabKey = "manual" | "youtube" | "prompt";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "manual", label: "Manual" },
  { key: "youtube", label: "From YouTube" },
  { key: "prompt", label: "From Prompt" },
];

function parseApiError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "error" in data) {
    const maybeError = (data as { error?: unknown }).error;
    if (typeof maybeError === "string" && maybeError.trim()) {
      return maybeError;
    }
  }
  return fallback;
}

export function DocForm({ onCreated }: { onCreated?: () => void | Promise<void> } = {}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>("manual");
  const [error, setError] = useState<string | null>(null);

  const [manualLoading, setManualLoading] = useState(false);

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [youtubeLoading, setYoutubeLoading] = useState(false);

  const [promptInput, setPromptInput] = useState("");
  const [promptTitle, setPromptTitle] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);

  async function handleCreated(successMessage: string) {
    toast(successMessage);
    router.refresh();
    await onCreated?.();
  }

  async function onManualSubmit(formData: FormData) {
    setManualLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(formData.get("title") || ""),
          content: String(formData.get("content") || ""),
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(parseApiError(data, "Failed to create doc"));
        return;
      }

      formRef.current?.reset();
      await handleCreated("Doc created");
    } catch {
      setError("Failed to create doc");
    } finally {
      setManualLoading(false);
    }
  }

  async function onYoutubeCreate() {
    if (!youtubeUrl.trim()) {
      setError("YouTube URL is required");
      return;
    }

    setYoutubeLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/docs/extract-youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: youtubeUrl.trim(),
          title: youtubeTitle.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(parseApiError(data, "Failed to extract YouTube content"));
        return;
      }

      setYoutubeUrl("");
      setYoutubeTitle("");
      await handleCreated("YouTube doc created");
    } catch {
      setError("Failed to extract YouTube content");
    } finally {
      setYoutubeLoading(false);
    }
  }

  async function onPromptCreate() {
    if (!promptInput.trim()) {
      setError("Topic or instructions are required");
      return;
    }

    setPromptLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/docs/generate-from-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptInput.trim(),
          title: promptTitle.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(parseApiError(data, "Failed to generate doc"));
        return;
      }

      setPromptInput("");
      setPromptTitle("");
      await handleCreated("AI doc generated");
    } catch {
      setError("Failed to generate doc");
    } finally {
      setPromptLoading(false);
    }
  }

  const anyLoading = manualLoading || youtubeLoading || promptLoading;

  return (
    <div className="glass-panel grid gap-3 rounded-xl p-4">
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key);
              setError(null);
            }}
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan",
              activeTab === tab.key
                ? "bg-gradient-to-r from-violet/40 to-cyan/35 text-white shadow-violet-glow"
                : "text-muted-foreground hover:bg-black/40 hover:text-slate-300",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "manual" ? (
        <form ref={formRef} action={onManualSubmit} className="grid gap-2">
          <Input name="title" placeholder="Doc title" required disabled={anyLoading} />
          <Textarea
            name="content"
            placeholder="# Markdown content"
            required
            className="min-h-32"
            disabled={anyLoading}
          />
          <Button type="submit" disabled={anyLoading}>
            {manualLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {manualLoading ? "Creating..." : "Create Doc"}
          </Button>
        </form>
      ) : null}

      {activeTab === "youtube" ? (
        <div className="grid gap-2">
          <Input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={anyLoading}
          />
          <Input
            value={youtubeTitle}
            onChange={(e) => setYoutubeTitle(e.target.value)}
            placeholder="Optional title override"
            disabled={anyLoading}
          />
          {youtubeLoading ? (
            <p className="text-xs text-cyan/80">Extracting with summarize CLI and creating doc...</p>
          ) : null}
          <Button type="button" onClick={() => void onYoutubeCreate()} disabled={anyLoading}>
            {youtubeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
            {youtubeLoading ? "Extracting..." : "Extract & Create Doc"}
          </Button>
        </div>
      ) : null}

      {activeTab === "prompt" ? (
        <div className="grid gap-2">
          <Input
            value={promptTitle}
            onChange={(e) => setPromptTitle(e.target.value)}
            placeholder="Optional title"
            disabled={anyLoading}
          />
          <Textarea
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Topic, structure, audience, and instructions for the document..."
            className="min-h-36"
            disabled={anyLoading}
          />
          {promptLoading ? <p className="text-xs text-cyan/80">Generating comprehensive doc...</p> : null}
          <Button type="button" onClick={() => void onPromptCreate()} disabled={anyLoading}>
            {promptLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {promptLoading ? "Generating..." : "Generate Doc"}
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-failed">{error}</p> : null}
    </div>
  );
}

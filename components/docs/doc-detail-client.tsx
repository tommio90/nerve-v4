"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Pencil, Save, Trash2 } from "lucide-react";
import { DocChat } from "@/components/docs/doc-chat";
import { SelectionToolbar } from "@/components/docs/selection-toolbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { parseTags } from "@/lib/doc-tags";

type DocDetailClientProps = {
  doc: {
    id: string;
    title: string;
    summary: string | null;
    category: string | null;
    venture: string | null;
    source: string | null;
    tags: string;
    shareToken: string | null;
    isPublic: boolean;
    createdAt: string | Date;
    content: string;
  };
};

const CATEGORY_ICONS: Record<string, string> = {
  strategy: "🎯",
  concept: "💡",
  article: "📝",
  report: "📊",
  guide: "📖",
  research: "🔬",
  app: "📱",
};

function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const elements: ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let key = 0;
  const processInline = (text: string) =>
    text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-violet-400 hover:text-violet-300 underline">$1</a>');

  for (const line of lines) {
    key += 1;
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={key} className="my-3 overflow-x-auto rounded-lg bg-black/40 p-4 text-xs text-muted-foreground">
            <code>{codeLines.join("\n")}</code>
          </pre>,
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(<h1 key={key} className="mb-4 mt-6 text-2xl font-bold text-white">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={key} className="mb-3 mt-5 text-xl font-semibold text-white">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={key} className="mb-2 mt-4 text-lg font-semibold text-slate-200">{line.slice(4)}</h3>);
    } else if (line.startsWith("---")) {
      elements.push(<hr key={key} className="my-4 border-white/10" />);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={key} className="flex gap-2 py-0.5 pl-4 text-sm text-slate-300">
          <span className="text-muted-foreground">•</span>
          <span dangerouslySetInnerHTML={{ __html: processInline(line.slice(2)) }} />
        </div>,
      );
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\.\s/)?.[1];
      elements.push(
        <div key={key} className="flex gap-2 py-0.5 pl-4 text-sm text-slate-300">
          <span className="text-muted-foreground">{num}.</span>
          <span dangerouslySetInnerHTML={{ __html: processInline(line.replace(/^\d+\.\s/, "")) }} />
        </div>,
      );
    } else if (line.startsWith("|")) {
      elements.push(
        <div key={key} className="font-mono text-xs text-muted-foreground">
          {line}
        </div>,
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key} className="h-2" />);
    } else {
      elements.push(
        <p key={key} className="text-sm leading-relaxed text-slate-300" dangerouslySetInnerHTML={{ __html: processInline(line) }} />,
      );
    }
  }

  return elements;
}

export function DocDetailClient({ doc }: DocDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedDoc, setSelectedDoc] = useState(doc);
  const [podcastLoading, setPodcastLoading] = useState(false);
  const [podcastAudio, setPodcastAudio] = useState<string | null>(null);
  const [podcastScript, setPodcastScript] = useState<{ speaker: string; text: string }[] | null>(null);
  const [podcastError, setPodcastError] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(false);

  const [imageLoading, setImageLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [showImageGen, setShowImageGen] = useState(false);

  const docContentRef = useRef<HTMLDivElement>(null);
  const [chatSelectedText, setChatSelectedText] = useState<string | undefined>(undefined);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  useEffect(() => {
    if (selectedDoc.isPublic && selectedDoc.shareToken && !shareUrl) {
      setShareUrl(`${window.location.origin}/share/${selectedDoc.shareToken}`);
    }
  }, [selectedDoc.isPublic, selectedDoc.shareToken, shareUrl]);

  const saveDoc = async (content: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/docs/${selectedDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = (await res.json()) as { doc?: typeof selectedDoc };
        setSelectedDoc(data.doc ?? { ...selectedDoc, content });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // ignore save failures here; user can retry
    } finally {
      setSaving(false);
    }
  };

  const generatePodcast = async () => {
    setPodcastLoading(true);
    setPodcastError(null);
    setPodcastAudio(null);
    setPodcastScript(null);

    try {
      const res = await fetch(`/api/docs/${selectedDoc.id}/podcast`, { method: "POST" });
      const data = (await res.json()) as { error?: string; mimeType?: string; audio?: string; script?: { speaker: string; text: string }[] };
      if (!res.ok || !data.audio || !data.mimeType) {
        throw new Error(data.error || "Failed");
      }
      setPodcastAudio(`data:${data.mimeType};base64,${data.audio}`);
      setPodcastScript(data.script || null);
    } catch (err: unknown) {
      setPodcastError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPodcastLoading(false);
    }
  };

  const generateImage = async () => {
    if (!imagePrompt.trim()) return;
    setImageLoading(true);
    setImageError(null);
    setImageUrl(null);

    try {
      const res = await fetch(`/api/docs/${selectedDoc.id}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt }),
      });
      const data = (await res.json()) as { error?: string; image?: string };
      if (!res.ok || !data.image) {
        throw new Error(data.error || "Failed");
      }
      setImageUrl(`data:image/png;base64,${data.image}`);
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setImageLoading(false);
    }
  };

  const handleInsertContent = (content: string) => {
    const newContent = `${selectedDoc.content}\n\n${content}`;
    setEditContent(newContent);
    setSelectedDoc((prev) => ({ ...prev, content: newContent }));
    void saveDoc(newContent);
  };

  const handleReplaceContent = (newFullContent: string) => {
    setEditContent(newFullContent);
    setSelectedDoc((prev) => ({ ...prev, content: newFullContent }));
    void saveDoc(newFullContent);
  };

  const handleEditSection = (oldText: string, newText: string) => {
    const currentContent = selectedDoc.content;
    if (!currentContent.includes(oldText)) return;
    const newContent = currentContent.replace(oldText, newText);
    setEditContent(newContent);
    setSelectedDoc((prev) => ({ ...prev, content: newContent }));
    void saveDoc(newContent);
  };

  const confirmStartEdit = () => {
    setEditContent(selectedDoc.content);
    setConfirmEditOpen(false);
    setEditMode(true);
    setTimeout(() => editorRef.current?.focus(), 50);
  };

  const deleteDoc = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/docs/${selectedDoc.id}`, { method: "DELETE" });
      if (!res.ok) return;
      router.push("/docs");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  const toggleShare = async (enable: boolean) => {
    setShareLoading(true);
    try {
      const res = await fetch(`/api/docs/${selectedDoc.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enable }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { shareUrl: string | null; isPublic: boolean };
      const shareToken = data.shareUrl ? data.shareUrl.split("/share/")[1] ?? null : null;
      setSelectedDoc((prev) => ({ ...prev, isPublic: data.isPublic, shareToken }));
      setShareUrl(data.shareUrl);
      if (!enable) {
        setShareUrl(null);
      }
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast("Share link copied.");
    } catch {
      // ignore clipboard failures
    }
  };

  return (
    <div className="synapse-page animate-fade-in space-y-4">
      <Link
        href="/docs"
        className="w-fit rounded-md text-xs font-semibold text-muted-foreground transition hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
      >
        ← Back to docs
      </Link>

      <div className="relative rounded-2xl border border-white/10 bg-black/40 p-6" ref={docContentRef}>
        {!editMode ? (
          <SelectionToolbar
            containerRef={docContentRef}
            onAction={(_action, text) => setChatSelectedText(text)}
          />
        ) : null}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          {selectedDoc.category ? (
            <span className="rounded-full bg-black/40 px-3 py-1 text-xs text-muted-foreground">
              {CATEGORY_ICONS[selectedDoc.category] ?? "📄"} {selectedDoc.category}
            </span>
          ) : null}
          {selectedDoc.venture ? (
            <span className="rounded-full bg-black/40 px-3 py-1 text-xs text-muted-foreground">{selectedDoc.venture}</span>
          ) : null}
          {parseTags(selectedDoc.tags).map((tag) => (
            <span key={tag} className="rounded-full bg-black/40 px-3 py-1 text-xs text-cyan">
              #{tag}
            </span>
          ))}
          <span className="text-xs text-muted-foreground">{formatDate(selectedDoc.createdAt)}</span>

          <div className="flex w-full flex-wrap justify-end gap-1.5">
            <button
              onClick={() => {
                if (editMode) {
                  void saveDoc(editContent);
                  setEditMode(false);
                } else {
                  setConfirmEditOpen(true);
                }
              }}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan ${
                editMode ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-black/40 text-slate-300 hover:bg-black/40"
              }`}
            >
              {editMode ? (
                <>
                  <Save className="h-3 w-3" /> Save
                </>
              ) : (
                <>
                  <Pencil className="h-3 w-3" /> Edit
                </>
              )}
            </button>

            {saved ? <span className="self-center text-xs text-emerald-400">✓ Saved</span> : null}
            {saving ? <span className="self-center text-xs text-muted-foreground">Saving...</span> : null}
            <button
              onClick={() => setConfirmDeleteOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>

            <button
              onClick={() => void toggleShare(!selectedDoc.isPublic)}
              disabled={shareLoading}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan disabled:opacity-60 ${
                selectedDoc.isPublic
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "bg-black/40 text-slate-300 hover:bg-black/40"
              }`}
            >
              {selectedDoc.isPublic ? (
                <>
                  <Check className="h-3 w-3" /> Shared
                </>
              ) : (
                <>
                  <Link2 className="h-3 w-3" /> Share
                </>
              )}
            </button>

            <button
              onClick={() => setShowImageGen((value) => !value)}
              className="rounded-lg bg-black/40 px-4 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
            >
              🎨 Image
            </button>

            <button
              onClick={() => void generatePodcast()}
              disabled={podcastLoading}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan disabled:opacity-50"
            >
              {podcastLoading ? "🎙️ Generating…" : "🎙️ Podcast"}
            </button>
          </div>
        </div>

        {selectedDoc.isPublic && shareUrl ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
            <span className="text-emerald-200">Public link:</span>
            <span className="truncate font-mono text-emerald-100">{shareUrl}</span>
            <button
              onClick={() => void copyShareUrl()}
              className="ml-auto inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
        ) : null}

        {showImageGen ? (
          <div className="mb-4 space-y-3 rounded-lg bg-black/40 p-4">
            <div className="flex gap-2">
              <input
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Describe the image to generate..."
                className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
                onKeyDown={(e) => e.key === "Enter" && void generateImage()}
              />
              <button
                onClick={() => void generateImage()}
                disabled={imageLoading || !imagePrompt.trim()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan disabled:opacity-50"
              >
                {imageLoading ? "Generating…" : "Generate"}
              </button>
            </div>
            {imageError ? <p className="text-xs text-red-400">{imageError}</p> : null}
            {imageUrl ? <img src={imageUrl} alt="Generated" className="max-w-full rounded-lg" /> : null}
          </div>
        ) : null}

        {podcastError ? <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{podcastError}</div> : null}
        {podcastAudio ? (
          <div className="mb-4 space-y-3 rounded-lg bg-black/40 p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-white">🎧 Podcast</span>
              <button
                onClick={() => setShowScript((value) => !value)}
                className="rounded-md text-xs text-muted-foreground transition hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
              >
                {showScript ? "Hide script" : "Show script"}
              </button>
            </div>
            <audio controls className="w-full" src={podcastAudio} />
            {showScript && podcastScript ? (
              <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
                {podcastScript.map((line, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className={`shrink-0 font-bold ${line.speaker === "A" ? "text-blue-400" : "text-emerald-400"}`}>
                      {line.speaker === "A" ? "Host A:" : "Host B:"}
                    </span>
                    <span className="text-slate-300">{line.text}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {editMode ? (
          <textarea
            ref={editorRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[500px] w-full resize-y rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-sm leading-relaxed text-slate-200 placeholder:text-slate-500 focus:border-cyan/50 focus:outline-none"
            placeholder="Write your document in markdown..."
          />
        ) : (
          <div>{renderMarkdown(selectedDoc.content)}</div>
        )}
      </div>

      <DocChat
        documentId={selectedDoc.id}
        documentTitle={selectedDoc.title}
        documentContent={selectedDoc.content}
        selectedText={chatSelectedText}
        onClearSelection={() => setChatSelectedText(undefined)}
        onInsertContent={handleInsertContent}
        onReplaceContent={handleReplaceContent}
        onEditSection={handleEditSection}
      />

      <Dialog open={confirmEditOpen} onOpenChange={setConfirmEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Edit Mode?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">You are about to edit this document directly.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmEditOpen(false)}>Cancel</Button>
            <Button onClick={confirmStartEdit}>Start Editing</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button onClick={() => void deleteDoc()} disabled={deleting} className="bg-red-600 hover:bg-red-500">
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

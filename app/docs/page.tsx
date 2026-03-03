"use client";

import {
  Check,
  Copy,
  Link2,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DocForm } from "@/components/docs/doc-form";
import { DocChat } from "@/components/docs/doc-chat";
import { SelectionToolbar } from "@/components/docs/selection-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { parseTags } from "@/lib/doc-tags";

type DocMeta = {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  venture: string | null;
  source: string | null;
  tags: string;
  createdAt: string;
};

type DocFull = DocMeta & {
  content: string;
  shareToken: string | null;
  isPublic: boolean;
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let key = 0;
  const processInline = (text: string) =>
    text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  for (const line of lines) {
    key++;
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={key}
            className="my-3 overflow-x-auto rounded-lg bg-surface-deep p-4 text-caption"
          >
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
    if (line.startsWith("# "))
      elements.push(
        <h1 key={key} className="mb-4 mt-6 text-2xl font-bold text-white">
          {line.slice(2)}
        </h1>,
      );
    else if (line.startsWith("## "))
      elements.push(
        <h2 key={key} className="mb-3 mt-5 text-xl font-semibold text-white">
          {line.slice(3)}
        </h2>,
      );
    else if (line.startsWith("### "))
      elements.push(
        <h3
          key={key}
          className="mb-2 mt-4 text-lg font-semibold text-slate-200"
        >
          {line.slice(4)}
        </h3>,
      );
    else if (line.startsWith("---"))
      elements.push(<hr key={key} className="my-4 border-border" />);
    else if (line.startsWith("- ") || line.startsWith("* "))
      elements.push(
        <div
          key={key}
          className="flex gap-2 py-0.5 pl-4 text-sm text-slate-300"
        >
          <span className="text-muted-foreground">•</span>
          <span
            dangerouslySetInnerHTML={{ __html: processInline(line.slice(2)) }}
          />
        </div>,
      );
    else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\.\s/)?.[1];
      elements.push(
        <div
          key={key}
          className="flex gap-2 py-0.5 pl-4 text-sm text-slate-300"
        >
          <span className="text-muted-foreground">{num}.</span>
          <span
            dangerouslySetInnerHTML={{
              __html: processInline(line.replace(/^\d+\.\s/, "")),
            }}
          />
        </div>,
      );
    } else if (line.startsWith("|"))
      elements.push(
        <div key={key} className="font-mono text-caption">
          {line}
        </div>,
      );
    else if (line.trim() === "")
      elements.push(<div key={key} className="h-2" />);
    else
      elements.push(
        <p
          key={key}
          className="text-sm leading-relaxed text-slate-300"
          dangerouslySetInnerHTML={{ __html: processInline(line) }}
        />,
      );
  }
  return elements;
}

function normalizeDocsPayload(payload: unknown): DocMeta[] {
  if (Array.isArray(payload)) return payload as DocMeta[];
  if (
    payload &&
    typeof payload === "object" &&
    "docs" in payload &&
    Array.isArray((payload as { docs?: unknown }).docs)
  ) {
    return (payload as { docs: DocMeta[] }).docs;
  }
  return [];
}

export default function DocsPage() {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const loadDocs = useCallback(async () => {
    try {
      const response = await fetch("/api/docs");
      if (!response.ok) {
        setDocs([]);
      } else {
        const data = (await response.json()) as unknown;
        setDocs(normalizeDocsPayload(data));
      }
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  const openDoc = async (id: string) => {
    setLoadingDoc(true);
    try {
      const res = await fetch(`/api/docs/${id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { doc?: DocFull } | DocFull;
      const doc = (
        typeof data === "object" && data && "doc" in data ? data.doc : data
      ) as DocFull | undefined;
      if (!doc) return;
      setSelectedDoc(doc);
      setShareUrl(
        doc.isPublic && doc.shareToken
          ? `${window.location.origin}/share/${doc.shareToken}`
          : null,
      );
    } catch {
      /* */
    }
    setLoadingDoc(false);
  };

  const [podcastLoading, setPodcastLoading] = useState(false);
  const [podcastAudio, setPodcastAudio] = useState<string | null>(null);
  const [podcastScript, setPodcastScript] = useState<
    { speaker: string; text: string }[] | null
  >(null);
  const [podcastError, setPodcastError] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(false);

  const generatePodcast = async (docId: string) => {
    setPodcastLoading(true);
    setPodcastError(null);
    setPodcastAudio(null);
    setPodcastScript(null);
    try {
      const res = await fetch(`/api/docs/${docId}/podcast`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPodcastAudio(`data:${data.mimeType};base64,${data.audio}`);
      setPodcastScript(data.script);
    } catch (err: unknown) {
      setPodcastError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPodcastLoading(false);
    }
  };

  const [imageLoading, setImageLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [showImageGen, setShowImageGen] = useState(false);

  const generateImage = async (docId: string) => {
    if (!imagePrompt.trim()) return;
    setImageLoading(true);
    setImageError(null);
    setImageUrl(null);
    try {
      const res = await fetch(`/api/docs/${docId}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setImageUrl(`data:image/png;base64,${data.image}`);
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setImageLoading(false);
    }
  };

  const docContentRef = useRef<HTMLDivElement>(null);
  const [chatSelectedText, setChatSelectedText] = useState<string | undefined>(
    undefined,
  );
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "title" | "tag-relevance"
  >("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DocMeta[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=20`,
        );
        const data = (await res.json()) as {
          results: {
            id: string;
            title: string;
            summary: string | null;
            venture: string | null;
            tags: string;
            score: number;
          }[];
        };
        setSearchResults(
          data.results.map((r) => ({
            id: r.id,
            title: r.title,
            summary: r.summary,
            venture: r.venture,
            tags: r.tags,
            category: null,
            source: null,
            createdAt: "",
          })),
        );
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  const toggleShare = async (enable: boolean) => {
    if (!selectedDoc) return;
    setShareLoading(true);
    try {
      const res = await fetch(`/api/docs/${selectedDoc.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enable }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        shareUrl: string | null;
        isPublic: boolean;
      };
      const token = data.shareUrl
        ? (data.shareUrl.split("/share/")[1] ?? null)
        : null;
      setSelectedDoc((prev) =>
        prev ? { ...prev, isPublic: data.isPublic, shareToken: token } : prev,
      );
      setShareUrl(enable ? data.shareUrl : null);
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      /* ignore */
    }
  };

  const allTags = useMemo(() => {
    const unique = new Set<string>();
    for (const doc of docs) {
      for (const tag of parseTags(doc.tags)) {
        unique.add(tag);
      }
    }
    return [...unique].sort();
  }, [docs]);

  const filteredDocs = useMemo(() => {
    const filtered = docs.filter((doc) => {
      if (selectedTags.length === 0) return true;
      const docTags = parseTags(doc.tags);
      return selectedTags.every((tag) => docTags.includes(tag));
    });

    const withScore = filtered.map((doc) => {
      const docTags = parseTags(doc.tags);
      const matchCount = selectedTags.reduce(
        (count, tag) => (docTags.includes(tag) ? count + 1 : count),
        0,
      );
      return { doc, matchCount };
    });

    withScore.sort((a, b) => {
      if (sortBy === "oldest")
        return (
          new Date(a.doc.createdAt).getTime() -
          new Date(b.doc.createdAt).getTime()
        );
      if (sortBy === "title") return a.doc.title.localeCompare(b.doc.title);
      if (sortBy === "tag-relevance") {
        if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      }
      return (
        new Date(b.doc.createdAt).getTime() -
        new Date(a.doc.createdAt).getTime()
      );
    });

    return withScore.map((entry) => entry.doc);
  }, [docs, selectedTags, sortBy]);

  const handleSelectionAction = (
    action: "ask" | "edit" | "comment" | "expand",
    text: string,
  ) => {
    setChatSelectedText(text);
  };

  const saveDoc = async (content: string) => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/docs/${selectedDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        const updatedDoc = (data.doc || data) as DocFull;
        setSelectedDoc(updatedDoc);
        setDocs((prev) =>
          prev.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc)),
        );
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      /* */
    } finally {
      setSaving(false);
    }
  };

  const handleInsertContent = (content: string) => {
    if (!selectedDoc) return;
    const newContent = selectedDoc.content + "\n\n" + content;
    setEditContent(newContent);
    setSelectedDoc({ ...selectedDoc, content: newContent });
    void saveDoc(newContent);
  };

  const handleReplaceContent = (newFullContent: string) => {
    if (!selectedDoc) return;
    setEditContent(newFullContent);
    setSelectedDoc({ ...selectedDoc, content: newFullContent });
    void saveDoc(newFullContent);
  };

  const handleEditSection = (oldText: string, newText: string) => {
    if (!selectedDoc) return;
    const currentContent = selectedDoc.content;
    if (!currentContent.includes(oldText)) return;
    const newContent = currentContent.replace(oldText, newText);
    setEditContent(newContent);
    setSelectedDoc({ ...selectedDoc, content: newContent });
    void saveDoc(newContent);
  };

  const beginEdit = () => {
    setEditContent(selectedDoc?.content || "");
    setConfirmEditOpen(true);
  };

  const confirmStartEdit = () => {
    setConfirmEditOpen(false);
    setEditMode(true);
    setTimeout(() => editorRef.current?.focus(), 50);
  };

  const deleteDoc = async () => {
    if (!selectedDoc) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/docs/${selectedDoc.id}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      setSelectedDoc(null);
      setConfirmDeleteOpen(false);
      await loadDocs();
    } finally {
      setDeleting(false);
    }
  };

  if (selectedDoc) {
    return (
      <div className="animate-fade-in space-y-4">
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs font-semibold text-muted-foreground hover:text-slate-300 hover:no-underline"
          onClick={() => {
            setSelectedDoc(null);
            setPodcastAudio(null);
            setPodcastScript(null);
            setPodcastError(null);
            setImageUrl(null);
            setImageError(null);
            setShowImageGen(false);
            setChatSelectedText(undefined);
            setEditMode(false);
          }}
        >
          ← Back to docs
        </Button>

        <Card
          className="relative border-border bg-surface-deep p-6"
          ref={docContentRef}
        >
          {!editMode && (
            <SelectionToolbar
              containerRef={docContentRef}
              onAction={handleSelectionAction}
            />
          )}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {selectedDoc.category && (
              <Badge variant="default" className="rounded-full">
                {CATEGORY_ICONS[selectedDoc.category] ?? "📄"}{" "}
                {selectedDoc.category}
              </Badge>
            )}
            {selectedDoc.venture && (
              <Badge variant="default" className="rounded-full">
                {selectedDoc.venture}
              </Badge>
            )}
            {parseTags(selectedDoc.tags).map((tag) => (
              <Badge key={tag} variant="proposed" className="rounded-full">
                #{tag}
              </Badge>
            ))}
            <span className="text-caption">
              {formatDate(selectedDoc.createdAt)}
            </span>
            <div className="flex w-full flex-wrap justify-end gap-1.5">
              <Button
                size="sm"
                variant={editMode ? "default" : "ghost"}
                className={
                  editMode
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : ""
                }
                onClick={() => {
                  if (editMode) {
                    void saveDoc(editContent);
                    setEditMode(false);
                  } else beginEdit();
                }}
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
              </Button>
              {saved && (
                <span className="self-center text-xs text-emerald-400">
                  ✓ Saved
                </span>
              )}
              {saving && (
                <span className="self-center text-caption">Saving...</span>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <Trash2 className="h-3 w-3" /> Delete
              </Button>
              <Button
                size="sm"
                variant={selectedDoc.isPublic ? "default" : "ghost"}
                className={
                  selectedDoc.isPublic
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : ""
                }
                onClick={() => void toggleShare(!selectedDoc.isPublic)}
                disabled={shareLoading}
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
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowImageGen(!showImageGen)}
              >
                🎨 Image
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-500"
                onClick={() => void generatePodcast(selectedDoc.id)}
                disabled={podcastLoading}
              >
                {podcastLoading ? "🎙️ Generating…" : "🎙️ Podcast"}
              </Button>
            </div>
          </div>

          {selectedDoc.isPublic && shareUrl && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              <span className="text-emerald-200">Public link:</span>
              <span className="truncate font-mono text-emerald-100">
                {shareUrl}
              </span>
              <Button
                size="sm"
                className="ml-auto bg-emerald-600 text-white hover:bg-emerald-500"
                onClick={() => void copyShareUrl()}
              >
                <Copy className="h-3 w-3" /> Copy
              </Button>
            </div>
          )}

          {showImageGen && (
            <div className="mb-4 space-y-3 rounded-lg bg-surface-deep p-4">
              <div className="flex gap-2">
                <Input
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Describe the image to generate..."
                  className="flex-1 border-border bg-surface-deep text-slate-200"
                  onKeyDown={(e) =>
                    e.key === "Enter" && generateImage(selectedDoc.id)
                  }
                />
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-500"
                  onClick={() => generateImage(selectedDoc.id)}
                  disabled={imageLoading || !imagePrompt.trim()}
                >
                  {imageLoading ? "Generating…" : "Generate"}
                </Button>
              </div>
              {imageError && (
                <p className="text-xs text-red-400">{imageError}</p>
              )}
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Generated"
                  className="max-w-full rounded-lg"
                />
              )}
            </div>
          )}

          {podcastError && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
              {podcastError}
            </div>
          )}
          {podcastAudio && (
            <div className="mb-4 space-y-3 rounded-lg bg-surface-deep p-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-white">
                  🎧 Podcast
                </span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-caption hover:text-slate-300 hover:no-underline"
                  onClick={() => setShowScript(!showScript)}
                >
                  {showScript ? "Hide script" : "Show script"}
                </Button>
              </div>
              <audio controls className="w-full" src={podcastAudio} />
              {showScript && podcastScript && (
                <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
                  {podcastScript.map((line, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <span
                        className={`font-bold shrink-0 ${line.speaker === "A" ? "text-blue-400" : "text-emerald-400"}`}
                      >
                        {line.speaker === "A" ? "Host A:" : "Host B:"}
                      </span>
                      <span className="text-slate-300">{line.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {editMode ? (
            <textarea
              ref={editorRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[500px] w-full resize-y rounded-lg border border-border bg-surface-deep p-4 font-mono text-sm leading-relaxed text-slate-200 placeholder:text-slate-500 focus:border-cyan/50 focus:outline-none"
              placeholder="Write your document in markdown..."
            />
          ) : (
            <div>{renderMarkdown(selectedDoc.content)}</div>
          )}
        </Card>

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
            <p className="text-subtle">
              You are about to edit this document directly.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmStartEdit}>Start Editing</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Document?</DialogTitle>
            </DialogHeader>
            <p className="text-subtle">This action cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void deleteDoc()}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-500"
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="synapse-page animate-fade-in space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="title-3">Docs</h1>
          <p className="text-subtle">
            Strategy docs, concept papers, reports & articles
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate((v) => !v)}>
          <Plus className="h-4 w-4" />+ New Doc
        </Button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ${showCreate ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <DocForm
          onCreated={async () => {
            await loadDocs();
            setShowCreate(false);
          }}
        />
      </div>

      <div className="relative flex items-center gap-2 rounded-xl border border-border bg-surface-deep px-3 py-2 focus-within:border-cyan/40 transition-colors">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search docs semantically…"
          className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-muted-foreground"
        />
        {searchLoading && (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-cyan border-t-transparent" />
        )}
        {searchQuery && !searchLoading && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface-deep overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          <span className="text-xs font-semibold text-muted-foreground">
            Sort
          </span>
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as typeof sortBy)}
          >
            <SelectTrigger className="h-auto w-auto border-border bg-surface-deep px-2 py-1 text-xs text-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="tag-relevance">Tag Relevance</SelectItem>
            </SelectContent>
          </Select>

          <div className="mx-1 h-3.5 w-px bg-border" />

          <button
            onClick={() => setTagsExpanded((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface-deep px-2.5 py-1 text-xs text-slate-300 transition hover:border-ring hover:text-cyan focus:outline-none"
          >
            <span className="font-semibold">Tags</span>
            {allTags.length > 0 && (
              <Badge
                variant="default"
                className="rounded-full px-1.5 py-0.5 text-[10px]"
              >
                {allTags.length}
              </Badge>
            )}
            <span
              className={`text-[10px] transition-transform duration-200 ${tagsExpanded ? "rotate-180" : ""}`}
            >
              ▼
            </span>
          </button>

          {selectedTags.length > 0 && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() =>
                      setSelectedTags((prev) => prev.filter((t) => t !== tag))
                    }
                    className="flex items-center gap-1 rounded-full border border-cyan/30 bg-cyan/15 px-2.5 py-0.5 text-xs text-cyan transition hover:bg-cyan/25"
                  >
                    #{tag}
                    <X className="h-2.5 w-2.5 opacity-60" />
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-caption"
                onClick={() => setSelectedTags([])}
              >
                Clear all
              </Button>
            </>
          )}
        </div>

        <div
          className={`transition-all duration-300 ${tagsExpanded ? "max-h-64 opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}
        >
          <div className="border-t border-border px-3 py-3">
            {allTags.length === 0 ? (
              <span className="text-caption">No tags yet</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() =>
                        setSelectedTags((prev) =>
                          prev.includes(tag)
                            ? prev.filter((entry) => entry !== tag)
                            : [...prev, tag],
                        )
                      }
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${
                        active
                          ? "border-cyan/30 bg-cyan/20 text-cyan"
                          : "border-border bg-surface-deep text-muted-foreground hover:border-border hover:text-slate-300"
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="space-y-3 rounded-xl border border-border bg-surface-deep p-5"
            >
              <Skeleton className="h-4 w-2/5 rounded-full" />
              <Skeleton className="h-3 w-4/5 rounded-full" />
              <Skeleton className="h-3 w-2/5 rounded-full" />
            </div>
          ))}
        </div>
      ) : (searchResults ?? filteredDocs).length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-deep p-8 text-center">
          <div className="mx-auto mb-3 w-fit rounded-full border border-violet/30 bg-violet/10 p-3">
            <Sparkles className="h-6 w-6 text-cyan" />
          </div>
          <p className="text-subtle">
            {searchQuery
              ? "No docs matched your search."
              : docs.length === 0
                ? "No docs yet — create your first one."
                : "No docs match the selected tags."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(searchResults ?? filteredDocs).map((doc) => (
            <button
              key={doc.id}
              onClick={() => void openDoc(doc.id)}
              disabled={loadingDoc}
              className="rounded-xl border border-border bg-surface-deep p-5 text-left transition hover:-translate-y-0.5 hover:border-ring hover:bg-surface-deep hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-white">
                    {doc.title}
                  </h3>
                  {doc.summary && (
                    <p className="mt-1 line-clamp-2 text-caption">
                      {doc.summary}
                    </p>
                  )}
                </div>
                <span className="text-lg">
                  {CATEGORY_ICONS[doc.category ?? ""] ?? "📄"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {doc.category && (
                  <Badge variant="default">{doc.category}</Badge>
                )}
                {doc.venture && <Badge variant="default">{doc.venture}</Badge>}
                {parseTags(doc.tags)
                  .slice(0, 4)
                  .map((tag) => (
                    <Badge key={tag} variant="proposed">
                      #{tag}
                    </Badge>
                  ))}
                <span className="text-caption">
                  {formatDate(doc.createdAt)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { Check, Copy, Link2, Pencil, Plus, Save, Search, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DocForm } from "@/components/docs/doc-form";
import { DocChat } from "@/components/docs/doc-chat";
import { SelectionToolbar } from "@/components/docs/selection-toolbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

type DocFull = DocMeta & { content: string; shareToken: string | null; isPublic: boolean };

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
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let key = 0;
  const processInline = (text: string) => text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  for (const line of lines) {
    key++;
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(<pre key={key} className="my-3 overflow-x-auto rounded-lg bg-black/40 p-4 text-xs text-muted-foreground"><code>{codeLines.join("\n")}</code></pre>);
        codeLines = [];
        inCodeBlock = false;
      } else { inCodeBlock = true; }
      continue;
    }
    if (inCodeBlock) { codeLines.push(line); continue; }
    if (line.startsWith("# ")) elements.push(<h1 key={key} className="mb-4 mt-6 text-2xl font-bold text-white">{line.slice(2)}</h1>);
    else if (line.startsWith("## ")) elements.push(<h2 key={key} className="mb-3 mt-5 text-xl font-semibold text-white">{line.slice(3)}</h2>);
    else if (line.startsWith("### ")) elements.push(<h3 key={key} className="mb-2 mt-4 text-lg font-semibold text-slate-200">{line.slice(4)}</h3>);
    else if (line.startsWith("---")) elements.push(<hr key={key} className="my-4 border-white/10" />);
    else if (line.startsWith("- ") || line.startsWith("* ")) elements.push(<div key={key} className="flex gap-2 py-0.5 pl-4 text-sm text-slate-300"><span className="text-muted-foreground">•</span><span dangerouslySetInnerHTML={{ __html: processInline(line.slice(2)) }} /></div>);
    else if (/^\d+\.\s/.test(line)) { const num = line.match(/^(\d+)\.\s/)?.[1]; elements.push(<div key={key} className="flex gap-2 py-0.5 pl-4 text-sm text-slate-300"><span className="text-muted-foreground">{num}.</span><span dangerouslySetInnerHTML={{ __html: processInline(line.replace(/^\d+\.\s/, "")) }} /></div>); }
    else if (line.startsWith("|")) elements.push(<div key={key} className="font-mono text-xs text-muted-foreground">{line}</div>);
    else if (line.trim() === "") elements.push(<div key={key} className="h-2" />);
    else elements.push(<p key={key} className="text-sm leading-relaxed text-slate-300" dangerouslySetInnerHTML={{ __html: processInline(line) }} />);
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
      const doc = (typeof data === "object" && data && "doc" in data ? data.doc : data) as DocFull | undefined;
      if (!doc) return;
      setSelectedDoc(doc);
      setShareUrl(doc.isPublic && doc.shareToken ? `${window.location.origin}/share/${doc.shareToken}` : null);
    } catch { /* */ }
    setLoadingDoc(false);
  };

  // Podcast state
  const [podcastLoading, setPodcastLoading] = useState(false);
  const [podcastAudio, setPodcastAudio] = useState<string | null>(null);
  const [podcastScript, setPodcastScript] = useState<{speaker: string; text: string}[] | null>(null);
  const [podcastError, setPodcastError] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(false);

  const generatePodcast = async (docId: string) => {
    setPodcastLoading(true); setPodcastError(null); setPodcastAudio(null); setPodcastScript(null);
    try {
      const res = await fetch(`/api/docs/${docId}/podcast`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPodcastAudio(`data:${data.mimeType};base64,${data.audio}`);
      setPodcastScript(data.script);
    } catch (err: unknown) { setPodcastError(err instanceof Error ? err.message : "Unknown error"); }
    finally { setPodcastLoading(false); }
  };

  // Image generation state
  const [imageLoading, setImageLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [showImageGen, setShowImageGen] = useState(false);

  const generateImage = async (docId: string) => {
    if (!imagePrompt.trim()) return;
    setImageLoading(true); setImageError(null); setImageUrl(null);
    try {
      const res = await fetch(`/api/docs/${docId}/image`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: imagePrompt }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setImageUrl(`data:image/png;base64,${data.image}`);
    } catch (err: unknown) { setImageError(err instanceof Error ? err.message : "Unknown error"); }
    finally { setImageLoading(false); }
  };

  // Selection & chat state
  const docContentRef = useRef<HTMLDivElement>(null);
  const [chatSelectedText, setChatSelectedText] = useState<string | undefined>(undefined);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title" | "tag-relevance">("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DocMeta[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) { setSearchResults(null); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=20`);
        const data = (await res.json()) as { results: { id: string; title: string; summary: string | null; venture: string | null; tags: string; score: number }[] };
        setSearchResults(data.results.map(r => ({ id: r.id, title: r.title, summary: r.summary, venture: r.venture, tags: r.tags, category: null, source: null, createdAt: "" })));
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
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
      const data = (await res.json()) as { shareUrl: string | null; isPublic: boolean };
      const token = data.shareUrl ? data.shareUrl.split("/share/")[1] ?? null : null;
      setSelectedDoc((prev) => prev ? { ...prev, isPublic: data.isPublic, shareToken: token } : prev);
      setShareUrl(enable ? data.shareUrl : null);
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch { /* ignore */ }
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
      const matchCount = selectedTags.reduce((count, tag) => (docTags.includes(tag) ? count + 1 : count), 0);
      return { doc, matchCount };
    });

    withScore.sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.doc.createdAt).getTime() - new Date(b.doc.createdAt).getTime();
      if (sortBy === "title") return a.doc.title.localeCompare(b.doc.title);
      if (sortBy === "tag-relevance") {
        if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      }
      return new Date(b.doc.createdAt).getTime() - new Date(a.doc.createdAt).getTime();
    });

    return withScore.map((entry) => entry.doc);
  }, [docs, selectedTags, sortBy]);

  const handleSelectionAction = (action: "ask" | "edit" | "comment" | "expand", text: string) => {
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
        setDocs((prev) => prev.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc)));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch { /* */ }
    finally { setSaving(false); }
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
    if (!currentContent.includes(oldText)) return; // exact match not found
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
      const res = await fetch(`/api/docs/${selectedDoc.id}`, { method: "DELETE" });
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
        <button
          onClick={() => { setSelectedDoc(null); setPodcastAudio(null); setPodcastScript(null); setPodcastError(null); setImageUrl(null); setImageError(null); setShowImageGen(false); setChatSelectedText(undefined); setEditMode(false); }}
          className="rounded-md text-xs font-semibold text-muted-foreground transition hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
        >
          ← Back to docs
        </button>
        <div className="relative rounded-2xl border border-white/10 bg-black/40 p-6" ref={docContentRef}>
          {!editMode && <SelectionToolbar containerRef={docContentRef} onAction={handleSelectionAction} />}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {selectedDoc.category && <span className="rounded-full bg-black/40 px-3 py-1 text-xs text-muted-foreground">{CATEGORY_ICONS[selectedDoc.category] ?? "📄"} {selectedDoc.category}</span>}
            {selectedDoc.venture && <span className="rounded-full bg-black/40 px-3 py-1 text-xs text-muted-foreground">{selectedDoc.venture}</span>}
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
                    // Save and switch to preview
                    void saveDoc(editContent);
                    setEditMode(false);
                  } else beginEdit();
                }}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan ${
                  editMode ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-black/40 text-slate-300 hover:bg-black/40"
                }`}
              >
                {editMode ? <><Save className="h-3 w-3" /> Save</> : <><Pencil className="h-3 w-3" /> Edit</>}
              </button>
              {saved && <span className="self-center text-xs text-emerald-400">✓ Saved</span>}
              {saving && <span className="self-center text-xs text-muted-foreground">Saving...</span>}
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
                  selectedDoc.isPublic ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-black/40 text-slate-300 hover:bg-black/60"
                }`}
              >
                {selectedDoc.isPublic ? <><Check className="h-3 w-3" /> Shared</> : <><Link2 className="h-3 w-3" /> Share</>}
              </button>
              <button
                onClick={() => setShowImageGen(!showImageGen)}
                className="rounded-lg bg-black/40 px-4 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
              >
                🎨 Image
              </button>
              <button
                onClick={() => void generatePodcast(selectedDoc.id)}
                disabled={podcastLoading}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan disabled:opacity-50"
              >
                {podcastLoading ? "🎙️ Generating…" : "🎙️ Podcast"}
              </button>
            </div>
          </div>

          {/* Share URL Banner */}
          {selectedDoc.isPublic && shareUrl && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              <span className="text-emerald-200">Public link:</span>
              <span className="truncate font-mono text-emerald-100">{shareUrl}</span>
              <button
                onClick={() => void copyShareUrl()}
                className="ml-auto inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-500"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
          )}

          {/* Image Generator */}
          {showImageGen && (
            <div className="mb-4 space-y-3 rounded-lg bg-black/40 p-4">
              <div className="flex gap-2">
                <input
                  value={imagePrompt}
                  onChange={e => setImagePrompt(e.target.value)}
                  placeholder="Describe the image to generate..."
                  className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
                  onKeyDown={e => e.key === "Enter" && generateImage(selectedDoc.id)}
                />
                <button
                  onClick={() => generateImage(selectedDoc.id)}
                  disabled={imageLoading || !imagePrompt.trim()}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan disabled:opacity-50"
                >
                  {imageLoading ? "Generating…" : "Generate"}
                </button>
              </div>
              {imageError && <p className="text-xs text-red-400">{imageError}</p>}
              {imageUrl && <img src={imageUrl} alt="Generated" className="max-w-full rounded-lg" />}
            </div>
          )}

          {/* Podcast Player */}
          {podcastError && <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">{podcastError}</div>}
          {podcastAudio && (
            <div className="mb-4 space-y-3 rounded-lg bg-black/40 p-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-white">🎧 Podcast</span>
                <button
                  onClick={() => setShowScript(!showScript)}
                  className="rounded-md text-xs text-muted-foreground transition hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
                >
                  {showScript ? "Hide script" : "Show script"}
                </button>
              </div>
              <audio controls className="w-full" src={podcastAudio} />
              {showScript && podcastScript && (
                <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
                  {podcastScript.map((line, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <span className={`font-bold shrink-0 ${line.speaker === "A" ? "text-blue-400" : "text-emerald-400"}`}>{line.speaker === "A" ? "Host A:" : "Host B:"}</span>
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

  return (
    <div className="synapse-page animate-fade-in space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="synapse-heading">Docs</h1>
          <p className="text-sm text-muted-foreground">Strategy docs, concept papers, reports & articles</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate((v) => !v)}>
          <Plus className="h-4 w-4" />
          + New Doc
        </Button>
      </div>

      <div className={`overflow-hidden transition-all duration-300 ${showCreate ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"}`}>
        <DocForm
          onCreated={async () => {
            await loadDocs();
            setShowCreate(false);
          }}
        />
      </div>

      {/* Semantic Search Bar */}
      <div className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 focus-within:border-cyan/40 transition-colors">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search docs semantically…"
          className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-muted-foreground"
        />
        {searchLoading && <div className="h-3 w-3 animate-spin rounded-full border-2 border-cyan border-t-transparent" />}
        {searchQuery && !searchLoading && (
          <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-white transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-3">
        <span className="text-xs font-semibold text-muted-foreground">Sort</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-slate-300"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="title">Title</option>
          <option value="tag-relevance">Tag Relevance</option>
        </select>
        <span className="ml-2 text-xs font-semibold text-muted-foreground">Tags</span>
        {allTags.length === 0 ? (
          <span className="text-xs text-muted-foreground">No tags yet</span>
        ) : (
          allTags.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() =>
                  setSelectedTags((prev) =>
                    prev.includes(tag) ? prev.filter((entry) => entry !== tag) : [...prev, tag],
                  )
                }
                className={`rounded-full px-2.5 py-1 text-xs transition ${
                  active ? "bg-cyan/20 text-cyan border border-cyan/30" : "bg-black/40 text-muted-foreground border border-white/10"
                }`}
              >
                #{tag}
              </button>
            );
          })
        )}
        {selectedTags.length > 0 ? (
          <button
            onClick={() => setSelectedTags([])}
            className="ml-auto rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-muted-foreground"
          >
            Clear
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-5">
              <div className="h-4 w-2/5 animate-pulse rounded-full bg-black/40" />
              <div className="h-3 w-4/5 animate-pulse rounded-full bg-black/40" />
              <div className="h-3 w-2/5 animate-pulse rounded-full bg-black/40" />
            </div>
          ))}
        </div>
      ) : (searchResults ?? filteredDocs).length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-center">
          <div className="mx-auto mb-3 w-fit rounded-full border border-violet/30 bg-violet/10 p-3">
            <Sparkles className="h-6 w-6 text-cyan" />
          </div>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "No docs matched your search." : docs.length === 0 ? "No docs yet — create your first one." : "No docs match the selected tags."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(searchResults ?? filteredDocs).map((doc) => (
            <button
              key={doc.id}
              onClick={() => void openDoc(doc.id)}
              disabled={loadingDoc}
              className="rounded-xl border border-white/10 bg-black/40 p-5 text-left transition hover:-translate-y-0.5 hover:border-violet/35 hover:bg-black/40 hover:shadow-violet-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-white">{doc.title}</h3>
                  {doc.summary && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{doc.summary}</p>}
                </div>
                <span className="text-lg">{CATEGORY_ICONS[doc.category ?? ""] ?? "📄"}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {doc.category && <span className="rounded bg-black/40 px-2 py-0.5 text-xs text-muted-foreground">{doc.category}</span>}
                {doc.venture && <span className="rounded bg-black/40 px-2 py-0.5 text-xs text-muted-foreground">{doc.venture}</span>}
                {parseTags(doc.tags).slice(0, 4).map((tag) => (
                  <span key={tag} className="rounded bg-cyan/15 px-2 py-0.5 text-xs text-cyan">
                    #{tag}
                  </span>
                ))}
                <span className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

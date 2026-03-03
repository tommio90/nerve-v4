"use client";

import { useEffect, useRef, useState } from "react";

type SearchResult = {
  id: string;
  title: string;
  summary: string | null;
  venture: string | null;
  tags: string;
  score: number;
};

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  onSelectDoc: (id: string) => void;
};

export function CommandPalette({ open, onClose, onSelectDoc }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setSelectedIndex(0);
    setLoading(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handler = setTimeout(async () => {
      const trimmed = query.trim();
      if (!trimmed) {
        setResults([]);
        setSelectedIndex(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(Array.isArray(data.results) ? data.results : []);
        setSelectedIndex(0);
      } catch {
        setResults([]);
        setSelectedIndex(0);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query, open]);

  useEffect(() => {
    if (!loading) {
      setShowSpinner(false);
      return;
    }
    const timer = setTimeout(() => setShowSpinner(true), 500);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(results.length - 1, 0)));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (event.key === "Enter") {
        if (!results.length) return;
        event.preventDefault();
        const selected = results[selectedIndex] ?? results[0];
        if (selected) {
          onSelectDoc(selected.id);
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, results, selectedIndex, onClose, onSelectDoc]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-surface-deep backdrop-blur-sm" onClick={onClose}>
      <div
        className="fixed left-1/2 top-[20%] w-full max-w-xl -translate-x-1/2 rounded-2xl border border-border bg-popover shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="text-caption">Search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search docs..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <span className="text-caption">Cmd+K</span>
        </div>
        <div className="max-h-[420px] overflow-y-auto px-2 pb-2 pt-2">
          {!query.trim() && !loading && (
            <div className="px-3 py-6 text-caption">
              Type to search across all docs semantically
            </div>
          )}
          {loading && showSpinner && (
            <div className="flex items-center gap-2 px-3 py-4 text-caption">
              <span className="h-4 w-4 animate-spin rounded-full border border-border border-t-white" />
              Searching...
            </div>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <div className="px-3 py-6 text-caption">No results</div>
          )}
          {results.map((result, index) => {
            const selected = index === selectedIndex;
            return (
              <button
                key={result.id}
                type="button"
                onClick={() => {
                  onSelectDoc(result.id);
                  onClose();
                }}
                className={
                  "w-full rounded-lg px-3 py-3 text-left transition hover:bg-surface-hover " +
                  (selected ? "bg-surface" : "")
                }
              >
                <div className="flex items-center gap-2">
                  <span className="text-caption">&gt;</span>
                  <span className="text-sm text-foreground">{result.title}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-caption">
                  {result.venture && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide">
                      {result.venture}
                    </span>
                  )}
                  <span className="truncate">{result.summary || "No summary available"}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Send,
  X,
  Trash2,
  Copy,
  Check,
  Loader2,
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type DocOperation = {
  type: "append" | "replace" | "edit_section";
  content: string;
  oldText?: string;
};

function parseDocOperations(text: string): { cleanText: string; operations: DocOperation[] } {
  const operations: DocOperation[] = [];
  let cleanText = text;

  // Parse <doc_append>...</doc_append>
  const appendRegex = /<doc_append>([\s\S]*?)<\/doc_append>/g;
  let match;
  while ((match = appendRegex.exec(text)) !== null) {
    operations.push({ type: "append", content: match[1].trim() });
    cleanText = cleanText.replace(match[0], "✅ Content appended to document.");
  }

  // Parse <doc_replace>...</doc_replace>
  const replaceRegex = /<doc_replace>([\s\S]*?)<\/doc_replace>/g;
  while ((match = replaceRegex.exec(text)) !== null) {
    operations.push({ type: "replace", content: match[1].trim() });
    cleanText = cleanText.replace(match[0], "✅ Document content replaced.");
  }

  // Parse <doc_edit_section old="...">...</doc_edit_section>
  const editRegex = /<doc_edit_section\s+old="([\s\S]*?)">([\s\S]*?)<\/doc_edit_section>/g;
  while ((match = editRegex.exec(text)) !== null) {
    operations.push({ type: "edit_section", oldText: match[1], content: match[2].trim() });
    cleanText = cleanText.replace(match[0], "✅ Document section updated.");
  }

  return { cleanText: cleanText.trim(), operations };
}

type Props = {
  documentId: string;
  documentTitle: string;
  documentContent: string;
  selectedText?: string;
  onClearSelection?: () => void;
  onInsertContent?: (content: string) => void;
  onReplaceContent?: (newFullContent: string) => void;
  onEditSection?: (oldText: string, newText: string) => void;
};

function renderMessageContent(content: string) {
  // Simple markdown-like rendering for chat messages
  const lines = content.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("### ")) return <h4 key={i} className="mt-2 mb-1 text-xs font-bold text-foreground">{line.slice(4)}</h4>;
    if (line.startsWith("## ")) return <h3 key={i} className="mt-2 mb-1 text-sm font-bold text-foreground">{line.slice(3)}</h3>;
    if (line.startsWith("# ")) return <h2 key={i} className="mt-2 mb-1 text-sm font-bold text-foreground">{line.slice(2)}</h2>;
    if (line.startsWith("- ") || line.startsWith("* ")) return <div key={i} className="flex gap-1.5 text-xs"><span className="text-muted-foreground">•</span><span>{line.slice(2)}</span></div>;
    if (line.startsWith("```")) return null;
    if (line.trim() === "") return <div key={i} className="h-1.5" />;
    // Bold
    const html = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/`(.*?)`/g, '<code class="rounded bg-black/40 px-1 py-0.5 text-[10px] text-cyan">$1</code>');
    return <p key={i} className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
  });
}

export function DocChat({
  documentId,
  documentTitle,
  documentContent,
  selectedText,
  onClearSelection,
  onInsertContent,
  onReplaceContent,
  onEditSection,
}: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/docs/${documentId}/messages`);
        if (res.ok) {
          const data = (await res.json()) as { messages: Message[] };
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      } finally {
        setLoadingHistory(false);
      }
    };
    void loadHistory();
  }, [documentId]);

  // Auto-open when text is selected with an action
  useEffect(() => {
    if (selectedText && !open) {
      setOpen(true);
    }
  }, [selectedText, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (overrideInput?: string) => {
    const text = overrideInput ?? input.trim();
    if (!text || streaming) return;

    const userContent = selectedText ? `[Selected text: "${selectedText.slice(0, 500)}${selectedText.length > 500 ? "..." : ""}"]\n\n${text}` : text;

    // Save user message to database
    let userMsg: Message;
    try {
      const res = await fetch(`/api/docs/${documentId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: userContent }),
      });
      const data = (await res.json()) as { message: Message };
      userMsg = data.message;
    } catch {
      // Fallback to local-only message
      userMsg = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userContent,
      };
    }

    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
    };

    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, assistantMsg]);
    setInput("");
    setStreaming(true);
    if (onClearSelection) onClearSelection();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          documentContent: documentContent.slice(0, 12000),
          documentTitle,
          selectedText: selectedText?.slice(0, 2000),
        }),
      });

      if (!res.ok) throw new Error("Chat API failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: fullContent };
                }
                return updated;
              });
            }
          } catch { /* skip */ }
        }
      }

      // Parse for document operation tags and auto-apply
      const { cleanText, operations } = parseDocOperations(fullContent);
      const finalContent = operations.length > 0 ? cleanText : fullContent;

      // Save assistant message to database
      try {
        const res = await fetch(`/api/docs/${documentId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "assistant", content: finalContent }),
        });
        const data = (await res.json()) as { message: Message };
        
        // Update with the saved message (has proper ID)
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.role === "assistant") {
            updated[lastIdx] = data.message;
          }
          return updated;
        });
      } catch {
        // Fallback: just update content locally
        if (operations.length > 0) {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = { ...last, content: cleanText };
            }
            return updated;
          });
        }
      }

      // Apply operations
      if (operations.length > 0) {
        for (const op of operations) {
          if (op.type === "append" && onInsertContent) {
            onInsertContent(op.content);
          } else if (op.type === "replace" && onReplaceContent) {
            onReplaceContent(op.content);
          } else if (op.type === "edit_section" && onEditSection && op.oldText) {
            onEditSection(op.oldText, op.content);
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: `Error: ${err instanceof Error ? err.message : "Failed to get response"}`,
          };
        }
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }, [input, messages, streaming, documentContent, documentTitle, selectedText, onClearSelection]);

  const copyContent = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-cyan text-white shadow-lg shadow-cyan/25 transition hover:bg-cyan/85 hover:shadow-cyan/40"
      >
        <MessageSquare className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col border-l border-white/10 bg-black/40 shadow-2xl sm:w-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🦞</span>
          <span className="text-sm font-semibold text-foreground">Lobster</span>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">AI Author</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-black/40 hover:text-slate-300"
            title="Clear chat"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-black/40 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Selected text banner */}
      {selectedText && (
        <div className="border-b border-white/10 bg-cyan/5 px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan">Selected text</span>
            <button onClick={onClearSelection} className="text-muted-foreground hover:text-slate-300">
              <X className="h-3 w-3" />
            </button>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground italic">"{selectedText.slice(0, 200)}{selectedText.length > 200 ? "..." : ""}"</p>
          <div className="mt-2 flex gap-1.5">
            {["Edit this", "Expand", "Summarize", "Add comment"].map((action) => (
              <button
                key={action}
                onClick={() => sendMessage(action)}
                className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-slate-300 transition hover:border-cyan/30 hover:bg-cyan/10 hover:text-cyan"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loadingHistory && (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading chat history...
            </div>
          </div>
        )}
        {!loadingHistory && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <span className="text-3xl mb-3">🦞</span>
            <p className="text-sm font-semibold text-slate-200 mb-1">Doc Assistant</p>
            <p className="text-xs text-muted-foreground mb-4">Ask me to write, edit, or improve your document. Highlight text for targeted edits.</p>
            <div className="space-y-1.5 w-full">
              {[
                "Write an executive summary",
                "Suggest improvements",
                "Add a conclusion section",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); setTimeout(() => sendMessage(suggestion), 50); }}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-left text-xs text-muted-foreground transition hover:border-cyan/20 hover:text-slate-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${msg.role === "user" ? "ml-8" : "mr-4"}`}
          >
            <div
              className={`rounded-xl px-3 py-2 ${
                msg.role === "user"
                  ? "bg-cyan/15 text-slate-200"
                  : "bg-black/40 border border-white/10 text-slate-300"
              }`}
            >
              {msg.role === "assistant" && msg.content === "" && streaming ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Thinking...
                </div>
              ) : (
                <div>{renderMessageContent(msg.content)}</div>
              )}
            </div>
            {msg.role === "assistant" && msg.content && (
              <div className="mt-1 flex gap-1 pl-1">
                <button
                  onClick={() => copyContent(msg.id, msg.content)}
                  className="rounded p-1 text-slate-500 transition hover:bg-black/40 hover:text-muted-foreground"
                  title="Copy"
                >
                  {copiedId === msg.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={selectedText ? "What do you want to do with the selection?" : "Ask Lobster to write or edit..."}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-200 placeholder:text-muted-foreground focus:border-cyan/50 focus:outline-none"
            style={{ maxHeight: "120px" }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming}
            className="rounded-lg bg-cyan p-2 text-white transition hover:bg-cyan/85 disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

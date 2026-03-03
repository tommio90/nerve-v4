"use client";

import { useEffect, useRef, useState } from "react";
import { Edit3, HelpCircle, MessageCircle, Sparkles } from "lucide-react";

type Props = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onAction: (action: "ask" | "edit" | "comment" | "expand", selectedText: string) => void;
};

export function SelectionToolbar({ containerRef, onAction }: Props) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const selectedTextRef = useRef("");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseUp = () => {
      // Small delay to let selection finalize
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim() || "";

        if (text.length < 3) {
          setVisible(false);
          return;
        }

        // Check if selection is within our container
        if (!selection?.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (!container.contains(range.commonAncestorContainer)) {
          setVisible(false);
          return;
        }

        selectedTextRef.current = text;
        const rect = range.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        setPosition({
          top: rect.top - containerRect.top - 44,
          left: rect.left - containerRect.left + rect.width / 2,
        });
        setVisible(true);
      }, 10);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (toolbarRef.current?.contains(e.target as Node)) return;
      setVisible(false);
    };

    container.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      container.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [containerRef]);

  if (!visible) return null;

  const actions = [
    { key: "ask" as const, icon: HelpCircle, label: "Ask" },
    { key: "edit" as const, icon: Edit3, label: "Edit" },
    { key: "expand" as const, icon: Sparkles, label: "Expand" },
    { key: "comment" as const, icon: MessageCircle, label: "Comment" },
  ];

  return (
    <div
      ref={toolbarRef}
      className="absolute z-40 flex items-center gap-0.5 rounded-lg border border-border bg-surface-deep p-1 shadow-xl shadow-surface-deep/30"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateX(-50%)",
      }}
    >
      {actions.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => {
            onAction(key, selectedTextRef.current);
            setVisible(false);
            window.getSelection()?.removeAllRanges();
          }}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition hover:bg-cyan/15 hover:text-cyan"
        >
          <Icon className="h-3 w-3" />
          {label}
        </button>
      ))}
    </div>
  );
}

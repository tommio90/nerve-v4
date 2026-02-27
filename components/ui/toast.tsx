"use client";

import { CheckCircle2, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type ToastEntry = { id: number; message: string };
type ToastContextValue = { toast: (message: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current, { id, message }]);
      window.setTimeout(() => dismiss(id), 2800);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((entry) => (
          <div
            key={entry.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2 rounded-2xl border border-emerald/40 bg-[rgba(10,10,10,0.78)] px-3 py-2 text-sm text-foreground shadow-cyan-glow backdrop-blur-glass",
              "animate-fade-in-up",
            )}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald" />
            <p className="flex-1">{entry.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(entry.id)}
              className="rounded-md p-1 text-muted-foreground transition-colors duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

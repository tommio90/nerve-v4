import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-20 w-full rounded-xl border border-white/10 bg-[#0a0a0a]/80 px-3 py-2 text-sm text-foreground transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        props.className,
      )}
    />
  );
}

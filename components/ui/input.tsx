import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-xl border border-white/10 bg-[#0a0a0a]/80 px-3 text-sm text-foreground transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        props.className,
      )}
    />
  );
}

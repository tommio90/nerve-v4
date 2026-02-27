import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-xs font-medium", className)}
      {...props}
    />
  );
}

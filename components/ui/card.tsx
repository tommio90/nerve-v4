import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/5 bg-white/[0.02] p-4 text-card-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-3 hover:border-violet/40 hover:shadow-[0_26px_58px_-30px_rgba(139,92,246,0.78)]",
        className,
      )}
      {...props}
    />
  );
}

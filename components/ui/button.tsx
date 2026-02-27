import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-violet text-foreground shadow-[0_16px_28px_-18px_rgba(139,92,246,0.95)] hover:bg-violet/85",
        outline: "border border-white/10 bg-white/5 text-foreground hover:border-cyan/40 hover:bg-white/10",
        ghost: "text-muted-foreground hover:bg-white/10 hover:text-foreground",
        destructive: "bg-failed/85 text-foreground hover:bg-failed",
        shinyBorder:
          "relative isolate overflow-hidden border border-white/10 bg-transparent p-[1px] shadow-[0_22px_42px_-28px_rgba(139,92,246,0.95)] before:absolute before:inset-[-190%] before:animate-[synapse-spin_4s_linear_infinite] before:bg-[conic-gradient(from_0deg,transparent_0%,#8b5cf6_40%,#06b6d4_50%,transparent_60%)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, children, ...props }: ButtonProps) {
  const isShiny = variant === "shinyBorder";

  return (
    <button className={cn(buttonVariants({ variant, size, className }))} {...props}>
      {isShiny ? (
        <span className="relative z-10 inline-flex h-full w-full items-center justify-center rounded-[11px] bg-[#0a0a0a] px-4 py-2">
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

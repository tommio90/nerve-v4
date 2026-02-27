import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();

  const colorClass =
    normalized.includes("PROPOSED")
      ? "border-cyan/50 bg-cyan/15 text-cyan"
      : normalized.includes("IN_PROGRESS") || normalized.includes("REVIEW") || normalized.includes("APPROVED")
        ? "border-yellow-400/50 bg-yellow-400/15 text-yellow-300"
        : normalized.includes("COMPLETE") || normalized.includes("ACTIVE")
          ? "border-emerald/50 bg-emerald/15 text-emerald"
          : normalized.includes("FAILED") || normalized.includes("REJECT")
            ? "border-red-400/50 bg-red-400/15 text-red-300"
            : "border-white/20 bg-white/8 text-slate-300";

  return <Badge className={colorClass}>{status}</Badge>;
}

import { Badge, type BadgeProps } from "@/components/ui/badge";

function statusToVariant(status: string): BadgeProps["variant"] {
  const s = status.toUpperCase();
  if (s.includes("PROPOSED")) return "proposed";
  if (s.includes("IN_PROGRESS") || s.includes("REVIEW") || s.includes("APPROVED") || s.includes("ACTIVE"))
    return "active";
  if (s.includes("COMPLETE")) return "complete";
  if (s.includes("FAILED") || s.includes("REJECT")) return "failed";
  if (s.includes("DEFERRED")) return "deferred";
  return "default";
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={statusToVariant(status)}>{status}</Badge>;
}

interface ProgressProps {
  value: number;
}

export function Progress({ value }: ProgressProps) {
  const bounded = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full border border-border bg-surface">
      <div className="h-full bg-gradient-to-r from-violet via-cyan to-emerald transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]" style={{ width: `${bounded}%` }} />
    </div>
  );
}

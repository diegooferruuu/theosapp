/** Barra de tomas dadas sobre el total del tratamiento. */
export function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-label="Tomas dadas"
        aria-valuenow={value}
        aria-valuemax={total}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted">
        {value}/{total} dadas
      </span>
    </div>
  );
}

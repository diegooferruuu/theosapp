import type { TreatmentProgress } from "@/lib/types";

export function ProgressBar({ progress }: { progress: TreatmentProgress }) {
  const pct = Math.min(100, Math.round((progress.dosesElapsed / progress.totalDoses) * 100));
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={progress.dosesElapsed}
        aria-valuemax={progress.totalDoses}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted">
        {progress.dosesElapsed}/{progress.totalDoses}
      </span>
    </div>
  );
}

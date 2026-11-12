import type { DueStatus } from "@/lib/types";
import { relativeDays } from "@/lib/format";
import { Badge, type Tone } from "./ui";

const TONE: Record<DueStatus, Tone> = {
  OVERDUE: "danger",
  TODAY: "warn",
  SOON: "warn",
  UPCOMING: "ok",
  DONE: "neutral",
  NONE: "neutral",
};

export function DueBadge({ status, daysUntil }: { status: DueStatus; daysUntil: number | null }) {
  if (status === "NONE") return <Badge>Sin próxima fecha</Badge>;
  if (status === "DONE") return <Badge>✓ Renovado</Badge>;
  const label =
    status === "OVERDUE" ? `Vencido · ${relativeDays(daysUntil).toLowerCase()}` : relativeDays(daysUntil);
  return <Badge tone={TONE[status]}>{label}</Badge>;
}

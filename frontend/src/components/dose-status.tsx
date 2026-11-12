"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatTime } from "@/lib/format";
import { kindOf } from "@/lib/treatment-kinds";
import type { GivenDose, Treatment, TreatmentType } from "@/lib/types";
import { useSession } from "./session";
import { Button } from "./ui";

const NON_MEDICINE: TreatmentType[] = ["EAR_DROPS", "EYE_DROPS", "OINTMENT", "CLEANING", "MEDICATED_BATH"];

/** "Toma", "Limpieza", "Baño", "Aplicación" según el tipo. */
function doseWord(type: TreatmentType): { word: string; article: string } {
  if (type === "CLEANING") return { word: "Limpieza", article: "la" };
  if (type === "MEDICATED_BATH") return { word: "Baño", article: "el" };
  if (NON_MEDICINE.includes(type)) return { word: "Aplicación", article: "la" };
  return { word: "Toma", article: "la" };
}

/**
 * Estado de la toma actual: permite marcarla como dada (avisa a los demás),
 * muestra quién la dio para evitar dosis dobles, y en "según necesidad"
 * indica cuándo se puede dar la siguiente.
 */
export function DoseStatus({ treatment: t, onChange }: { treatment: Treatment; onChange: () => void }) {
  const me = useSession();
  const [busy, setBusy] = useState(false);
  // Momento en que se mostró la tarjeta (para marcar tomas atrasadas).
  const [shownAt] = useState(() => Date.now());
  if (t.status !== "ACTIVE") return null;

  const { word, article } = doseWord(t.type);
  const medicine = !NON_MEDICINE.includes(t.type);
  const icon = kindOf(t.type).icon;
  const who = (g: GivenDose) => (g.givenBy?.id === me.id ? "ti" : (g.givenBy?.name ?? "alguien"));
  const canUndo = (g: GivenDose) => g.givenBy?.id === me.id || me.role === "SUPERADMIN";

  async function give(doseNumber?: number) {
    const which = doseNumber ? `${article} ${word.toLowerCase()} ${doseNumber}` : "una dosis";
    if (!confirm(`¿Confirmas ${which} de ${t.pet.name}?\n${t.medicineName} — ${t.dosage}`)) return;
    setBusy(true);
    try {
      await api(`/treatments/${t.id}/doses`, { body: doseNumber ? { doseNumber } : {} });
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "No se pudo registrar");
    } finally {
      setBusy(false);
      onChange();
    }
  }

  async function undo(doseNumber: number) {
    if (!confirm("¿Deshacer este registro? Solo hazlo si se marcó por error.")) return;
    setBusy(true);
    try {
      await api(`/treatments/${t.id}/doses/${doseNumber}`, { method: "DELETE" });
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "No se pudo deshacer");
    } finally {
      setBusy(false);
      onChange();
    }
  }

  const instructions = t.instructions ? <p className="px-1 text-xs text-muted">📝 {t.instructions}</p> : null;
  const giveLabel = `${icon} ${medicine ? "Marcar como dada" : "Marcar como hecha"}`;

  // ─── Según necesidad ───
  if (t.scheduleType === "AS_NEEDED" && t.asNeeded) {
    const last = t.lastGiven;
    return (
      <div className="flex flex-col gap-1.5">
        {last && (
          <p className="flex items-center justify-between gap-2 px-1 text-sm text-muted">
            <span>
              Última: {who(last)} · {formatDateTime(last.givenAt)}
            </span>
            {canUndo(last) && (
              <button onClick={() => undo(last.doseNumber)} disabled={busy} className="shrink-0 text-xs underline">
                Deshacer
              </button>
            )}
          </p>
        )}
        {t.asNeeded.canGive ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary-soft px-3 py-2">
            <span className="text-sm text-primary-strong">Se puede dar si la necesita</span>
            <Button size="sm" loading={busy} onClick={() => give()}>
              {icon} Dar ahora
            </Button>
          </div>
        ) : (
          <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
            ⏳ Próxima posible: <b>{t.asNeeded.nextAllowedAt ? formatDateTime(t.asNeeded.nextAllowedAt) : "—"}</b>
            {t.asNeeded.reason === "max" ? ` (máx. ${t.maxPerDay} al día)` : ` (mín. ${t.minIntervalHours} h entre dosis)`}
          </p>
        )}
        {instructions}
      </div>
    );
  }

  const c = t.current;
  if (!c) return null;

  if (c.given) {
    const g = c.given;
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2 rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">
          <span>
            ✓ {word} {c.number} {medicine ? "dada" : "hecha"} por <b>{who(g)}</b> a las {formatTime(g.givenAt)}
          </span>
          {canUndo(g) && (
            <button onClick={() => undo(c.number)} disabled={busy} className="shrink-0 text-xs underline opacity-80 hover:opacity-100">
              Deshacer
            </button>
          )}
        </div>
        {c.nextAt && (
          <p className="px-1 text-xs text-muted">
            Siguiente: {word.toLowerCase()} {c.number + 1} · {formatDateTime(c.nextAt)}
          </p>
        )}
      </div>
    );
  }

  if (c.canGive) {
    const late = shownAt - new Date(c.at).getTime() > 15 * 60_000;
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-warn-soft px-3 py-2">
          <span className="text-sm text-warn">
            {late ? "⚠️ Pendiente" : "Toca"}: {word.toLowerCase()} {c.number} · {formatDateTime(c.at)}
          </span>
          <Button size="sm" loading={busy} onClick={() => give(c.number)}>
            {giveLabel}
          </Button>
        </div>
        {instructions}
      </div>
    );
  }

  return (
    <p className="rounded-xl bg-primary-soft px-3 py-2 text-sm text-primary-strong">
      Próxima: {word.toLowerCase()} {c.number} · <span className="font-semibold">{formatDateTime(c.at)}</span>
      {!t.notifyDoses && " · sin aviso"}
    </p>
  );
}

"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatTime } from "@/lib/format";
import type { Treatment } from "@/lib/types";
import { useSession } from "./session";
import { Button } from "./ui";

/**
 * Estado de la toma actual de un tratamiento activo: permite marcarla como dada
 * (avisa a los demás) y muestra quién la dio para evitar dosis dobles.
 */
export function DoseStatus({ treatment: t, onChange }: { treatment: Treatment; onChange: () => void }) {
  const me = useSession();
  const [busy, setBusy] = useState(false);
  // Momento en que se mostró la tarjeta (para marcar tomas atrasadas).
  const [shownAt] = useState(() => Date.now());
  if (t.status !== "ACTIVE") return null;

  const c = t.current;
  const nextAt =
    c.number < t.progress.totalDoses ? new Date(new Date(c.at).getTime() + t.frequencyHours * 3_600_000) : null;

  async function give() {
    if (!confirm(`¿Confirmas que le diste a ${t.pet.name} la toma ${c.number} de ${t.medicineName} (${t.dosage})?`)) return;
    setBusy(true);
    try {
      await api(`/treatments/${t.id}/doses`, { body: { doseNumber: c.number } });
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "No se pudo registrar la toma");
    } finally {
      setBusy(false);
      onChange();
    }
  }

  async function undo() {
    if (!confirm(`¿Deshacer la toma ${c.number}? Solo hazlo si se marcó por error.`)) return;
    setBusy(true);
    try {
      await api(`/treatments/${t.id}/doses/${c.number}`, { method: "DELETE" });
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "No se pudo deshacer");
    } finally {
      setBusy(false);
      onChange();
    }
  }

  if (c.given) {
    const canUndo = c.given.givenBy?.id === me.id || me.role === "SUPERADMIN";
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2 rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">
          <span>
            ✓ Toma {c.number} dada por <b>{c.given.givenBy?.id === me.id ? "ti" : (c.given.givenBy?.name ?? "alguien")}</b>{" "}
            a las {formatTime(c.given.givenAt)}
          </span>
          {canUndo && (
            <button onClick={undo} disabled={busy} className="shrink-0 text-xs underline opacity-80 hover:opacity-100">
              Deshacer
            </button>
          )}
        </div>
        {nextAt && (
          <p className="px-1 text-xs text-muted">
            Siguiente: toma {c.number + 1} · {formatDateTime(nextAt.toISOString())}
          </p>
        )}
      </div>
    );
  }

  if (c.canGive) {
    const late = shownAt - new Date(c.at).getTime() > 15 * 60_000;
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-warn-soft px-3 py-2">
        <span className="text-sm text-warn">
          {late ? "⚠️ Pendiente" : "Toca"}: toma {c.number} · {formatDateTime(c.at)}
        </span>
        <Button size="sm" loading={busy} onClick={give}>
          💊 Marcar como dada
        </Button>
      </div>
    );
  }

  return (
    <p className="rounded-xl bg-primary-soft px-3 py-2 text-sm text-primary-strong">
      Próxima: toma {c.number} · <span className="font-semibold">{formatDateTime(c.at)}</span>
      {!t.notifyDoses && " · sin aviso"}
    </p>
  );
}

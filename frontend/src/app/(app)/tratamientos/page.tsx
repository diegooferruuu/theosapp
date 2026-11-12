"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { DoseStatus } from "@/components/dose-status";
import { PetFilter } from "@/components/pet-filter";
import { editTreatmentForm, newTreatmentForm, TreatmentForm } from "@/components/treatment-form";
import { ProgressBar } from "@/components/treatment-progress";
import {
  Badge,
  Button,
  Card,
  cx,
  EditIcon,
  EmptyState,
  IconButton,
  LoadError,
  Loading,
  Modal,
  PageHeader,
  PlusIcon,
  TrashIcon,
} from "@/components/ui";
import { api, fetcher } from "@/lib/api";
import { formatDate, formatDateTime, formatDayHeading, formatTime, toLocalDateInput } from "@/lib/format";
import { unitLabel } from "@/lib/dose-text";
import { qs, usePets } from "@/lib/hooks";
import { TREATMENT_STATUS } from "@/lib/labels";
import { kindOf, scheduleSummary } from "@/lib/treatment-kinds";
import type { Treatment, TreatmentSchedule, TreatmentStatus } from "@/lib/types";

const STATUS_TABS: { value: TreatmentStatus | ""; label: string }[] = [
  { value: "ACTIVE", label: "Activos" },
  { value: "FINISHED", label: "Finalizados" },
  { value: "CANCELLED", label: "Cancelados" },
  { value: "", label: "Todos" },
];

const STATUS_TONE = { ACTIVE: "primary", FINISHED: "ok", CANCELLED: "neutral" } as const;

export default function TratamientosPage() {
  const { data: pets } = usePets();
  const [petId, setPetId] = useState<number | null>(null);
  const [status, setStatus] = useState<TreatmentStatus | "">("ACTIVE");
  const [form, setForm] = useState<ReturnType<typeof newTreatmentForm> | null>(null);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const { data, error, mutate } = useSWR<Treatment[]>(`/treatments${qs({ petId, status })}`, fetcher, {
    refreshInterval: 60_000,
  });

  async function setTreatmentStatus(t: Treatment, next: TreatmentStatus) {
    const verb = next === "CANCELLED" ? "cancelar" : next === "FINISHED" ? "finalizar" : "reactivar";
    if (!confirm(`¿Seguro que quieres ${verb} ${t.medicineName} de ${t.pet.name}?`)) return;
    try {
      await api(`/treatments/${t.id}`, { method: "PATCH", body: { status: next } });
      await mutate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo actualizar");
    }
  }

  async function restock(t: Treatment) {
    if (!t.stock) return;
    const answer = prompt(`¿Cuánto agregas al stock de ${t.medicineName}? (en ${unitLabel(t.stock.unit, 2)})`, "");
    if (answer === null) return;
    const added = Number(answer.replace(",", "."));
    if (!Number.isFinite(added) || added <= 0) return alert("Cantidad inválida");
    try {
      await api(`/treatments/${t.id}`, { method: "PATCH", body: { stockQuantity: t.stock.quantity + added } });
      await mutate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo actualizar el stock");
    }
  }

  async function remove(t: Treatment) {
    if (!confirm(`¿Eliminar el tratamiento ${t.medicineName} de ${t.pet.name}? Se borra también su historial de tomas.`)) return;
    try {
      await api(`/treatments/${t.id}`, { method: "DELETE" });
      await mutate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  return (
    <>
      <PageHeader
        title="Tratamientos"
        description="Pastillas, jarabes, gotas, limpiezas y más. Al marcar una toma, los demás reciben el aviso para no repetirla."
        action={
          <Button onClick={() => setForm(newTreatmentForm(petId ?? (pets?.length === 1 ? pets[0].id : "")))}>
            <PlusIcon /> Nuevo
          </Button>
        }
      />
      <PetFilter pets={pets} value={petId} onChange={setPetId} />
      <div className="mb-4 grid grid-cols-4 rounded-xl border border-line bg-surface p-1 sm:inline-grid">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value || "all"}
            onClick={() => setStatus(tab.value)}
            className={cx(
              "rounded-lg px-2 py-1.5 text-sm font-medium sm:px-3",
              status === tab.value ? "bg-primary-soft text-primary-strong" : "text-muted hover:text-fg",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <LoadError error={error} retry={() => mutate()} />}
      {!data && !error && <Loading />}
      {data?.length === 0 && (
        <EmptyState icon="💊" title="No hay tratamientos">
          {status === "ACTIVE" ? "Theo no tiene tratamientos activos ahora." : "Sin resultados para este filtro."}
        </EmptyState>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((t) => {
          const kind = kindOf(t.type);
          return (
            <Card key={t.id} className="flex min-w-0 flex-col gap-3">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-xl" aria-hidden>
                  {kind.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{t.medicineName}</p>
                  <p className="text-sm text-muted">
                    {kind.label} · {t.dosage}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[t.status]}>{TREATMENT_STATUS[t.status]}</Badge>
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <p>🕒 {scheduleSummary(t)}</p>
                <p className="text-muted">
                  Desde {formatDate(t.startAt)}
                  {t.progress.endAt &&
                    (t.scheduleType === "FIXED_TIMES"
                      ? ` · hasta el ${formatDate(toLocalDateInput(new Date(new Date(t.progress.endAt).getTime() - 1)))}`
                      : ` · termina ${formatDateTime(t.progress.endAt)}`)}
                  {(pets?.length ?? 0) > 1 && ` · ${t.pet.name}`}
                </p>
                {t.instructions && <p className="text-muted">📝 {t.instructions}</p>}
              </div>
              {t.scheduleType !== "AS_NEEDED" && <ProgressBar value={t.givenCount} total={t.progress.totalDoses} />}
              {t.stock && (
                <div
                  className={cx(
                    "flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm",
                    t.stock.low ? "bg-danger-soft text-danger" : "bg-surface-2",
                  )}
                >
                  <span>
                    📦 Quedan <b>{t.stock.label}</b>
                    {t.stock.daysLeft !== null && ` (≈ ${t.stock.daysLeft} ${t.stock.daysLeft === 1 ? "día" : "días"})`}
                    {t.stock.low && " · comprar"}
                  </span>
                  <button onClick={() => restock(t)} className="shrink-0 text-xs font-medium underline">
                    Reponer
                  </button>
                </div>
              )}
              <DoseStatus treatment={t} onChange={() => mutate()} />
              {t.notes && <p className="whitespace-pre-line text-sm text-muted">{t.notes}</p>}
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
                <Button size="sm" variant="secondary" onClick={() => setScheduleId(t.id)}>
                  {t.scheduleType === "AS_NEEDED" ? "Historial" : "Ver horario"}
                </Button>
                <div className="flex items-center">
                  {t.status === "ACTIVE" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setTreatmentStatus(t, t.durationDays === null ? "FINISHED" : "CANCELLED")}
                    >
                      {t.durationDays === null ? "Finalizar" : "Cancelar"}
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setTreatmentStatus(t, "ACTIVE")}>
                      Reactivar
                    </Button>
                  )}
                  <IconButton label="Editar" onClick={() => setForm(editTreatmentForm(t))}>
                    <EditIcon />
                  </IconButton>
                  <IconButton label="Eliminar" tone="danger" onClick={() => remove(t)}>
                    <TrashIcon />
                  </IconButton>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {form && (
        <TreatmentForm
          initial={form}
          pets={pets}
          onClose={() => setForm(null)}
          onSaved={async () => {
            setForm(null);
            await mutate();
          }}
        />
      )}
      {scheduleId && <ScheduleModal id={scheduleId} onClose={() => setScheduleId(null)} />}
    </>
  );
}

function ScheduleModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, error } = useSWR<TreatmentSchedule>(`/treatments/${id}/schedule`, fetcher);
  const days = useMemo(() => {
    const groups = new Map<string, TreatmentSchedule["doses"]>();
    for (const d of data?.doses ?? []) {
      const key = formatDayHeading(d.at);
      groups.set(key, [...(groups.get(key) ?? []), d]);
    }
    return [...groups.entries()];
  }, [data]);
  const asNeeded = data?.scheduleType === "AS_NEEDED";

  return (
    <Modal open title={data ? `${data.medicineName} · ${data.pet.name}` : "Horario"} onClose={onClose}>
      {error && <LoadError error={error} />}
      {!data && !error && <Loading />}
      {data && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            {data.dosage} · {scheduleSummary(data)}
            <br />
            {data.givenCount} {asNeeded ? "dosis registradas" : `de ${data.progress.totalDoses ?? "∞"} tomas dadas`}
          </p>
          {!asNeeded && (
            <div className="flex flex-wrap gap-3 text-xs text-muted">
              <span>
                <span className="text-ok">✓</span> dada
              </span>
              <span>
                <span className="line-through">tachada</span> sin registrar
              </span>
              <span className="font-semibold text-primary-strong">resaltada: la actual</span>
            </div>
          )}
          {data.partial && <p className="text-xs text-muted">Se muestran las tomas recientes y las próximas.</p>}
          {asNeeded && data.doses.length === 0 && <p className="text-sm text-muted">Aún no se dio ninguna dosis.</p>}
          {days.map(([day, doses]) => (
            <div key={day}>
              <p className="mb-2 text-sm font-medium">{day}</p>
              <div className="flex flex-wrap gap-2">
                {doses.map((d) => (
                  <span
                    key={d.number}
                    className={cx(
                      "rounded-lg border px-2.5 py-1 text-sm tabular-nums",
                      d.given
                        ? "border-ok/30 bg-ok-soft text-ok"
                        : d.number === data.current?.number
                          ? "border-primary bg-primary-soft font-semibold text-primary-strong"
                          : d.past
                            ? "border-line bg-surface-2 text-muted line-through decoration-muted/50"
                            : "border-line",
                    )}
                    title={
                      d.given
                        ? `La dio ${d.given.givenBy?.name ?? "alguien"} a las ${formatTime(d.given.givenAt)}`
                        : `Toma ${d.number}`
                    }
                  >
                    {d.given ? "✓ " : ""}
                    {asNeeded ? formatTime(d.at) : `#${d.number} · ${formatTime(d.at)}`}
                    {d.given?.givenBy && <span className="ml-1 text-xs opacity-80">({d.given.givenBy.name})</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

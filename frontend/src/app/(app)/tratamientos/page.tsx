"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { PetFilter, PetSelect } from "@/components/pet-filter";
import { ProgressBar } from "@/components/treatment-progress";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  cx,
  EditIcon,
  EmptyState,
  Field,
  FormActions,
  FormError,
  IconButton,
  Input,
  LoadError,
  Loading,
  Modal,
  PageHeader,
  PlusIcon,
  Select,
  Textarea,
  TrashIcon,
} from "@/components/ui";
import { api, fetcher } from "@/lib/api";
import { formatDateTime, formatDayHeading, formatTime, toDateTimeLocal } from "@/lib/format";
import { qs, usePets } from "@/lib/hooks";
import { FREQUENCIES, TREATMENT_STATUS } from "@/lib/labels";
import type { Treatment, TreatmentSchedule, TreatmentStatus } from "@/lib/types";

interface FormState {
  id?: number;
  petId: number | "";
  medicineName: string;
  dosage: string;
  startAt: string;
  durationDays: string;
  frequencyHours: string;
  notifyDoses: boolean;
  notes: string;
}

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
  const [form, setForm] = useState<FormState | null>(null);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const { data, error, mutate } = useSWR<Treatment[]>(`/treatments${qs({ petId, status })}`, fetcher, {
    refreshInterval: 60_000,
  });

  const openNew = () => {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);
    setForm({
      petId: petId ?? (pets?.length === 1 ? pets[0].id : ""),
      medicineName: "",
      dosage: "",
      startAt: toDateTimeLocal(now),
      durationDays: "7",
      frequencyHours: "8",
      notifyDoses: true,
      notes: "",
    });
  };

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

  async function remove(t: Treatment) {
    if (!confirm(`¿Eliminar el tratamiento ${t.medicineName} de ${t.pet.name}?`)) return;
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
        description="Calcula cada toma y avisa por Telegram a la hora indicada."
        action={
          <Button onClick={openNew}>
            <PlusIcon /> Nuevo tratamiento
          </Button>
        }
      />
      <PetFilter pets={pets} value={petId} onChange={setPetId} />
      <div className="mb-4 inline-flex rounded-xl border border-line bg-surface p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value || "all"}
            onClick={() => setStatus(tab.value)}
            className={cx(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
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
          {status === "ACTIVE" ? "Ninguna mascota está con medicación ahora." : "Sin resultados para este filtro."}
        </EmptyState>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((t) => (
          <Card key={t.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{t.medicineName}</p>
                <p className="text-sm text-muted">
                  {t.pet.name} · {t.dosage}
                </p>
              </div>
              <Badge tone={STATUS_TONE[t.status]}>{TREATMENT_STATUS[t.status]}</Badge>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted">Frecuencia</dt>
              <dd>Cada {t.frequencyHours} h</dd>
              <dt className="text-muted">Duración</dt>
              <dd>
                {t.durationDays} {t.durationDays === 1 ? "día" : "días"}
              </dd>
              <dt className="text-muted">Inicio</dt>
              <dd>{formatDateTime(t.startAt)}</dd>
              <dt className="text-muted">Fin</dt>
              <dd>{formatDateTime(t.progress.endAt)}</dd>
            </dl>
            <ProgressBar progress={t.progress} />
            {t.status === "ACTIVE" && (
              <p className="rounded-xl bg-primary-soft px-3 py-2 text-sm text-primary-strong">
                {t.progress.nextDoseAt ? (
                  <>
                    Toma {t.progress.nextDoseNumber}:{" "}
                    <span className="font-semibold">{formatDateTime(t.progress.nextDoseAt)}</span>
                    {!t.notifyDoses && " · sin aviso"}
                  </>
                ) : (
                  "Todas las tomas completadas"
                )}
              </p>
            )}
            {t.notes && <p className="whitespace-pre-line text-sm text-muted">{t.notes}</p>}
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
              <Button size="sm" variant="secondary" onClick={() => setScheduleId(t.id)}>
                Ver horario
              </Button>
              <div className="flex items-center">
                {t.status === "ACTIVE" ? (
                  <Button size="sm" variant="ghost" onClick={() => setTreatmentStatus(t, "CANCELLED")}>
                    Cancelar
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setTreatmentStatus(t, "ACTIVE")}>
                    Reactivar
                  </Button>
                )}
                <IconButton
                  label="Editar"
                  onClick={() =>
                    setForm({
                      id: t.id,
                      petId: t.petId,
                      medicineName: t.medicineName,
                      dosage: t.dosage,
                      startAt: toDateTimeLocal(t.startAt),
                      durationDays: String(t.durationDays),
                      frequencyHours: String(t.frequencyHours),
                      notifyDoses: t.notifyDoses,
                      notes: t.notes ?? "",
                    })
                  }
                >
                  <EditIcon />
                </IconButton>
                <IconButton label="Eliminar" tone="danger" onClick={() => remove(t)}>
                  <TrashIcon />
                </IconButton>
              </div>
            </div>
          </Card>
        ))}
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

function TreatmentForm({
  initial,
  pets,
  onClose,
  onSaved,
}: {
  initial: FormState;
  pets: ReturnType<typeof usePets>["data"];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const customFrequency = !FREQUENCIES.includes(Number(f.frequencyHours));

  const preview = useMemo(() => {
    const days = Number(f.durationDays);
    const freq = Number(f.frequencyHours);
    const start = new Date(f.startAt);
    if (!days || !freq || Number.isNaN(start.getTime())) return null;
    const total = Math.max(1, Math.ceil((days * 24) / freq));
    const last = new Date(start.getTime() + (total - 1) * freq * 3_600_000);
    return { total, last };
  }, [f.durationDays, f.frequencyHours, f.startAt]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api(f.id ? `/treatments/${f.id}` : "/treatments", {
        method: f.id ? "PATCH" : "POST",
        body: {
          petId: f.petId,
          medicineName: f.medicineName,
          dosage: f.dosage,
          startAt: new Date(f.startAt).toISOString(),
          durationDays: Number(f.durationDays),
          frequencyHours: Number(f.frequencyHours),
          notifyDoses: f.notifyDoses,
          notes: f.notes,
        },
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setSaving(false);
    }
  }

  return (
    <Modal open title={f.id ? "Editar tratamiento" : "Nuevo tratamiento"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Mascota">
          {(id) => <PetSelect id={id} pets={pets} value={f.petId} onChange={(v) => set("petId", v)} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Medicamento">
            {(id) => (
              <Input
                id={id}
                value={f.medicineName}
                onChange={(e) => set("medicineName", e.target.value)}
                placeholder="Ej. Amoxicilina"
                required
              />
            )}
          </Field>
          <Field label="Dosis">
            {(id) => (
              <Input id={id} value={f.dosage} onChange={(e) => set("dosage", e.target.value)} placeholder="5 ml" required />
            )}
          </Field>
        </div>
        <Field label="Fecha y hora de la primera toma">
          {(id) => (
            <Input
              id={id}
              type="datetime-local"
              value={f.startAt}
              onChange={(e) => set("startAt", e.target.value)}
              required
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Frecuencia">
            {(id) => (
              <Select
                id={id}
                value={customFrequency ? "custom" : f.frequencyHours}
                onChange={(e) => set("frequencyHours", e.target.value === "custom" ? "" : e.target.value)}
              >
                {FREQUENCIES.map((h) => (
                  <option key={h} value={h}>
                    Cada {h} horas
                  </option>
                ))}
                <option value="custom">Otra…</option>
              </Select>
            )}
          </Field>
          <Field label="Duración (días)">
            {(id) => (
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={1}
                max={365}
                value={f.durationDays}
                onChange={(e) => set("durationDays", e.target.value)}
                required
              />
            )}
          </Field>
        </div>
        {customFrequency && (
          <Field label="Cada cuántas horas">
            {(id) => (
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={1}
                max={168}
                value={f.frequencyHours}
                onChange={(e) => set("frequencyHours", e.target.value)}
                required
              />
            )}
          </Field>
        )}
        {preview && (
          <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">
            {preview.total} {preview.total === 1 ? "toma" : "tomas"} · última el{" "}
            <span className="font-medium text-fg">{formatDateTime(preview.last.toISOString())}</span>
          </p>
        )}
        <Checkbox
          label="Avisar por Telegram en cada toma"
          checked={f.notifyDoses}
          onChange={(v) => set("notifyDoses", v)}
        />
        <Field label="Notas">
          {(id) => (
            <Textarea
              id={id}
              value={f.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Con comida, indicaciones del veterinario…"
            />
          )}
        </Field>
        <FormError message={error} />
        <FormActions onCancel={onClose} saving={saving} />
      </form>
    </Modal>
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

  return (
    <Modal open title={data ? `${data.medicineName} · ${data.pet.name}` : "Horario"} onClose={onClose}>
      {error && <LoadError error={error} />}
      {!data && !error && <Loading />}
      {data && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            {data.dosage} cada {data.frequencyHours} h · {data.progress.totalDoses} tomas
          </p>
          {days.map(([day, doses]) => (
            <div key={day}>
              <p className="mb-2 text-sm font-medium">{day}</p>
              <div className="flex flex-wrap gap-2">
                {doses.map((d) => (
                  <span
                    key={d.number}
                    className={cx(
                      "rounded-lg border px-2.5 py-1 text-sm tabular-nums",
                      d.past
                        ? "border-line bg-surface-2 text-muted line-through decoration-muted/50"
                        : d.number === data.progress.nextDoseNumber
                          ? "border-primary bg-primary-soft font-semibold text-primary-strong"
                          : "border-line",
                    )}
                    title={`Toma ${d.number}`}
                  >
                    #{d.number} · {formatTime(d.at)}
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

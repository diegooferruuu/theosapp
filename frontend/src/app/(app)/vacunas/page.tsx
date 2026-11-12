"use client";

import { useState } from "react";
import useSWR from "swr";
import { DueBadge } from "@/components/due-badge";
import { PetFilter, PetSelect } from "@/components/pet-filter";
import {
  Button,
  Card,
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
import { addDaysLocal, dateOnly, formatDate, todayLocal } from "@/lib/format";
import { qs, usePets } from "@/lib/hooks";
import { HEALTH_TYPES, healthIcon, healthLabel } from "@/lib/labels";
import type { HealthRecord, HealthRecordType } from "@/lib/types";

interface FormState {
  id?: number;
  petId: number | "";
  type: HealthRecordType;
  name: string;
  dateGiven: string;
  nextDueDate: string;
  notes: string;
}

const SUGGESTIONS: Record<HealthRecordType, string[]> = {
  VACCINE: ["Antirrábica", "Séxtuple", "Óctuple", "Triple felina", "Leucemia felina", "Tos de las perreras"],
  DEWORMING_INTERNAL: ["Drontal", "Milbemax", "Endogard", "Total Full"],
  DEWORMING_EXTERNAL: ["NexGard", "Bravecto", "Simparica", "Frontline", "Revolution"],
};

export default function VacunasPage() {
  const { data: pets } = usePets();
  const [petId, setPetId] = useState<number | null>(null);
  const [type, setType] = useState<HealthRecordType | "">("");
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  const { data, error, mutate } = useSWR<HealthRecord[]>(
    `/health-records${qs({ petId, type })}`,
    fetcher,
  );
  const visible = data?.filter((r) => showHistory || r.due.status !== "DONE");
  const hiddenCount = (data?.length ?? 0) - (visible?.length ?? 0);

  const openNew = () =>
    setForm({
      petId: petId ?? (pets?.length === 1 ? pets[0].id : ""),
      type: type || "VACCINE",
      name: "",
      dateGiven: todayLocal(),
      nextDueDate: "",
      notes: "",
    });

  const openEdit = (r: HealthRecord) =>
    setForm({
      id: r.id,
      petId: r.petId,
      type: r.type,
      name: r.name,
      dateGiven: dateOnly(r.dateGiven),
      nextDueDate: dateOnly(r.nextDueDate),
      notes: r.notes ?? "",
    });

  /** Nueva aplicación del mismo producto, manteniendo el intervalo anterior. */
  const openRenew = (r: HealthRecord) => {
    const today = todayLocal();
    let next = "";
    if (r.nextDueDate) {
      const days = Math.round(
        (Date.parse(dateOnly(r.nextDueDate)) - Date.parse(dateOnly(r.dateGiven))) / 86_400_000,
      );
      if (days > 0) next = addDaysLocal(today, days);
    }
    setForm({ petId: r.petId, type: r.type, name: r.name, dateGiven: today, nextDueDate: next, notes: "" });
  };

  async function remove(r: HealthRecord) {
    if (!confirm(`¿Eliminar "${r.name}" de ${r.pet.name}?`)) return;
    try {
      await api(`/health-records/${r.id}`, { method: "DELETE" });
      await mutate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  return (
    <>
      <PageHeader
        title="Vacunas y desparasitación"
        description="Avisos por Telegram 1 semana antes, 1 día antes y el mismo día."
        action={
          <Button onClick={openNew}>
            <PlusIcon /> Registrar
          </Button>
        }
      />

      <PetFilter pets={pets} value={petId} onChange={setPetId} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          value={type}
          onChange={(e) => setType(e.target.value as HealthRecordType | "")}
          className="w-auto min-w-56"
          aria-label="Filtrar por tipo"
        >
          <option value="">Todos los tipos</option>
          {HEALTH_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={showHistory}
            onChange={(e) => setShowHistory(e.target.checked)}
            className="size-4 accent-[var(--primary)]"
          />
          Mostrar historial{hiddenCount > 0 ? ` (${hiddenCount})` : ""}
        </label>
      </div>

      {error && <LoadError error={error} retry={() => mutate()} />}
      {!data && !error && <Loading />}
      {visible && visible.length === 0 && (
        <EmptyState icon="💉" title="Sin registros">
          Registra la última vacuna o desparasitación para recibir recordatorios.
        </EmptyState>
      )}

      <div className="flex flex-col gap-3">
        {visible?.map((r) => (
          <Card key={r.id} className={cx(r.due.status === "DONE" && "opacity-60")}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-2xl" aria-hidden>
                {healthIcon(r.type)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{r.name}</p>
                  <DueBadge status={r.due.status} daysUntil={r.due.daysUntil} />
                </div>
                <p className="text-sm text-muted">
                  {r.pet.name} · {healthLabel(r.type)}
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:max-w-md">
                  <dt className="text-muted">Aplicada</dt>
                  <dd>{formatDate(r.dateGiven)}</dd>
                  <dt className="text-muted">Próxima</dt>
                  <dd className="font-medium">{formatDate(r.nextDueDate)}</dd>
                </dl>
                {r.notes && <p className="mt-2 whitespace-pre-line text-sm text-muted">{r.notes}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                {r.due.status !== "DONE" && r.nextDueDate && (
                  <Button size="sm" variant="secondary" onClick={() => openRenew(r)}>
                    Renovar
                  </Button>
                )}
                <div className="flex">
                  <IconButton label="Editar" onClick={() => openEdit(r)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton label="Eliminar" tone="danger" onClick={() => remove(r)}>
                    <TrashIcon />
                  </IconButton>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {form && (
        <HealthForm
          initial={form}
          pets={pets}
          onClose={() => setForm(null)}
          onSaved={async () => {
            setForm(null);
            await mutate();
          }}
        />
      )}
    </>
  );
}

function HealthForm({
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        petId: f.petId,
        type: f.type,
        name: f.name,
        dateGiven: f.dateGiven,
        nextDueDate: f.nextDueDate || null,
        notes: f.notes,
      };
      await api(f.id ? `/health-records/${f.id}` : "/health-records", {
        method: f.id ? "PATCH" : "POST",
        body,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setSaving(false);
    }
  }

  return (
    <Modal open title={f.id ? "Editar registro" : "Nuevo registro"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mascota">
            {(id) => <PetSelect id={id} pets={pets} value={f.petId} onChange={(v) => set("petId", v)} />}
          </Field>
          <Field label="Tipo">
            {(id) => (
              <Select id={id} value={f.type} onChange={(e) => set("type", e.target.value as HealthRecordType)}>
                {HEALTH_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Producto / vacuna">
          {(id) => (
            <>
              <Input
                id={id}
                list="health-suggestions"
                value={f.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ej. Antirrábica, NexGard"
                required
              />
              <datalist id="health-suggestions">
                {SUGGESTIONS[f.type].map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha de aplicación">
            {(id) => (
              <Input id={id} type="date" value={f.dateGiven} onChange={(e) => set("dateGiven", e.target.value)} required />
            )}
          </Field>
          <Field label="Próxima aplicación">
            {(id) => (
              <Input
                id={id}
                type="date"
                min={f.dateGiven}
                value={f.nextDueDate}
                onChange={(e) => set("nextDueDate", e.target.value)}
              />
            )}
          </Field>
        </div>
        <div className="-mt-2 flex flex-wrap gap-2">
          {[
            ["1 mes", 30],
            ["3 meses", 90],
            ["6 meses", 182],
            ["1 año", 365],
          ].map(([label, days]) => (
            <button
              key={label}
              type="button"
              onClick={() => set("nextDueDate", addDaysLocal(f.dateGiven || todayLocal(), Number(days)))}
              className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-primary hover:text-primary"
            >
              +{label}
            </button>
          ))}
        </div>
        <Field label="Notas">
          {(id) => <Textarea id={id} value={f.notes} onChange={(e) => set("notes", e.target.value)} />}
        </Field>
        <FormError message={error} />
        <FormActions onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}

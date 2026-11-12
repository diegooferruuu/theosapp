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
import { GROOMING_TYPES, groomingIcon, groomingLabel } from "@/lib/labels";
import type { GroomingLog, GroomingServiceType } from "@/lib/types";

interface FormState {
  id?: number;
  petId: number | "";
  serviceType: GroomingServiceType;
  dateDone: string;
  nextDueDate: string;
  notes: string;
}

const DEFAULT_INTERVAL: Record<GroomingServiceType, number> = {
  BATH: 15,
  HAIRCUT: 60,
  NAIL_TRIM: 30,
  DENTAL_CLEANING: 180,
};

export default function HigienePage() {
  const { data: pets } = usePets();
  const [petId, setPetId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const { data, error, mutate } = useSWR<GroomingLog[]>(`/grooming${qs({ petId })}`, fetcher);

  const visible = data?.filter((g) => showHistory || g.due.status !== "DONE");
  const hiddenCount = (data?.length ?? 0) - (visible?.length ?? 0);

  const openNew = (serviceType: GroomingServiceType = "BATH", pet?: number) => {
    const today = todayLocal();
    setForm({
      petId: pet ?? petId ?? (pets?.length === 1 ? pets[0].id : ""),
      serviceType,
      dateDone: today,
      nextDueDate: addDaysLocal(today, DEFAULT_INTERVAL[serviceType]),
      notes: "",
    });
  };

  async function remove(g: GroomingLog) {
    if (!confirm(`¿Eliminar este registro de ${g.pet.name}?`)) return;
    try {
      await api(`/grooming/${g.id}`, { method: "DELETE" });
      await mutate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  return (
    <>
      <PageHeader
        title="Higiene y estética"
        description="Te avisa 3 días antes del próximo turno."
        action={
          <Button onClick={() => openNew()}>
            <PlusIcon /> Registrar
          </Button>
        }
      />
      <PetFilter pets={pets} value={petId} onChange={setPetId} />
      <label className="mb-4 flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={showHistory}
          onChange={(e) => setShowHistory(e.target.checked)}
          className="size-4 accent-[var(--primary)]"
        />
        Mostrar historial{hiddenCount > 0 ? ` (${hiddenCount})` : ""}
      </label>

      {error && <LoadError error={error} retry={() => mutate()} />}
      {!data && !error && <Loading />}
      {visible && visible.length === 0 && (
        <EmptyState icon="🛁" title="Sin registros de higiene">
          Registra el último baño, corte o limpieza.
        </EmptyState>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {visible?.map((g) => (
          <Card key={g.id} className={cx("flex flex-col gap-3", g.due.status === "DONE" && "opacity-60")}>
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden>
                {groomingIcon(g.serviceType)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{groomingLabel(g.serviceType)}</p>
                <p className="text-sm text-muted">{g.pet.name}</p>
              </div>
              <DueBadge status={g.due.status} daysUntil={g.due.daysUntil} />
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted">Realizado</dt>
              <dd>{formatDate(g.dateDone)}</dd>
              <dt className="text-muted">Próximo turno</dt>
              <dd className="font-medium">{formatDate(g.nextDueDate)}</dd>
            </dl>
            {g.notes && <p className="whitespace-pre-line text-sm text-muted">{g.notes}</p>}
            <div className="mt-auto flex items-center justify-between border-t border-line pt-2">
              {g.due.status !== "DONE" ? (
                <Button size="sm" variant="secondary" onClick={() => openNew(g.serviceType, g.petId)}>
                  Hecho hoy
                </Button>
              ) : (
                <span />
              )}
              <div className="flex">
                <IconButton
                  label="Editar"
                  onClick={() =>
                    setForm({
                      id: g.id,
                      petId: g.petId,
                      serviceType: g.serviceType,
                      dateDone: dateOnly(g.dateDone),
                      nextDueDate: dateOnly(g.nextDueDate),
                      notes: g.notes ?? "",
                    })
                  }
                >
                  <EditIcon />
                </IconButton>
                <IconButton label="Eliminar" tone="danger" onClick={() => remove(g)}>
                  <TrashIcon />
                </IconButton>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {form && (
        <GroomingForm
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

function GroomingForm({
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
      await api(f.id ? `/grooming/${f.id}` : "/grooming", {
        method: f.id ? "PATCH" : "POST",
        body: {
          petId: f.petId,
          serviceType: f.serviceType,
          dateDone: f.dateDone,
          nextDueDate: f.nextDueDate || null,
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
    <Modal open title={f.id ? "Editar higiene" : "Registrar higiene"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mascota">
            {(id) => <PetSelect id={id} pets={pets} value={f.petId} onChange={(v) => set("petId", v)} />}
          </Field>
          <Field label="Servicio">
            {(id) => (
              <Select
                id={id}
                value={f.serviceType}
                onChange={(e) => {
                  const st = e.target.value as GroomingServiceType;
                  setF((s) => ({
                    ...s,
                    serviceType: st,
                    nextDueDate: s.id ? s.nextDueDate : addDaysLocal(s.dateDone, DEFAULT_INTERVAL[st]),
                  }));
                }}
              >
                {GROOMING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha de realización">
            {(id) => (
              <Input id={id} type="date" value={f.dateDone} onChange={(e) => set("dateDone", e.target.value)} required />
            )}
          </Field>
          <Field label="Próximo turno (estimado)">
            {(id) => (
              <Input
                id={id}
                type="date"
                min={f.dateDone}
                value={f.nextDueDate}
                onChange={(e) => set("nextDueDate", e.target.value)}
              />
            )}
          </Field>
        </div>
        <div className="-mt-2 flex flex-wrap gap-2">
          {[7, 15, 30, 60].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => set("nextDueDate", addDaysLocal(f.dateDone || todayLocal(), days))}
              className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-primary hover:text-primary"
            >
              +{days} días
            </button>
          ))}
        </div>
        <Field label="Notas">
          {(id) => (
            <Textarea
              id={id}
              value={f.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Peluquería, producto usado…"
            />
          )}
        </Field>
        <FormError message={error} />
        <FormActions onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}

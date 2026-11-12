"use client";

import { useState } from "react";
import useSWR from "swr";
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
  Textarea,
  TrashIcon,
} from "@/components/ui";
import { WeightSection } from "@/components/weight-section";
import { api, fetcher } from "@/lib/api";
import { dateOnly, kg, todayLocal } from "@/lib/format";
import { qs, usePets } from "@/lib/hooks";
import type { VetVisit } from "@/lib/types";

interface FormState {
  id?: number;
  petId: number | "";
  date: string;
  reason: string;
  diagnosis: string;
  vetName: string;
  weightKg: string;
  notes: string;
}

export default function VisitasPage() {
  const { data: pets } = usePets();
  const [petId, setPetId] = useState<number | null>(null);
  const [tab, setTab] = useState<"visitas" | "peso">("visitas");
  const [form, setForm] = useState<FormState | null>(null);
  const { data, error, mutate } = useSWR<VetVisit[]>(`/vet-visits${qs({ petId })}`, fetcher);

  async function remove(v: VetVisit) {
    if (!confirm(`¿Eliminar la visita "${v.reason}" de ${v.pet.name}?`)) return;
    try {
      await api(`/vet-visits/${v.id}`, { method: "DELETE" });
      await mutate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  return (
    <>
      <PageHeader
        title="Visitas y peso"
        description="Historial médico y evolución del peso."
        action={
          tab === "visitas" && (
            <Button
              onClick={() =>
                setForm({
                  petId: petId ?? (pets?.length === 1 ? pets[0].id : ""),
                  date: todayLocal(),
                  reason: "",
                  diagnosis: "",
                  vetName: "",
                  weightKg: "",
                  notes: "",
                })
              }
            >
              <PlusIcon /> Nueva visita
            </Button>
          )
        }
      />
      <PetFilter pets={pets} value={petId} onChange={setPetId} />
      <div className="mb-4 inline-flex rounded-xl border border-line bg-surface p-1">
        {(
          [
            ["visitas", "🩺 Visitas"],
            ["peso", "⚖️ Peso"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cx(
              "rounded-lg px-4 py-1.5 text-sm font-medium",
              tab === value ? "bg-primary-soft text-primary-strong" : "text-muted hover:text-fg",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "peso" ? (
        <WeightSection pets={pets} petId={petId} />
      ) : (
        <>
          {error && <LoadError error={error} retry={() => mutate()} />}
          {!data && !error && <Loading />}
          {data?.length === 0 && (
            <EmptyState icon="🩺" title="Sin visitas registradas">
              Anota motivo, diagnóstico y peso de cada consulta.
            </EmptyState>
          )}
          <div className="flex flex-col gap-3">
            {data?.map((v) => (
              <Card key={v.id}>
                <div className="flex items-start gap-3">
                  <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-surface-2 py-1.5 text-center">
                    <span className="text-lg font-semibold leading-tight">{dateOnly(v.date).slice(8, 10)}</span>
                    <span className="text-[11px] uppercase text-muted">
                      {new Intl.DateTimeFormat("es", { month: "short", timeZone: "UTC" }).format(
                        new Date(`${dateOnly(v.date)}T00:00:00Z`),
                      )}{" "}
                      {dateOnly(v.date).slice(2, 4)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{v.reason}</p>
                    <p className="text-sm text-muted">
                      {v.pet.name}
                      {v.vetName ? ` · ${v.vetName}` : ""}
                      {v.weightKg ? ` · ${kg(v.weightKg)}` : ""}
                    </p>
                    {v.diagnosis && (
                      <p className="mt-2 whitespace-pre-line text-sm">
                        <span className="font-medium">Diagnóstico: </span>
                        {v.diagnosis}
                      </p>
                    )}
                    {v.notes && <p className="mt-1 whitespace-pre-line text-sm text-muted">{v.notes}</p>}
                  </div>
                  <div className="flex shrink-0">
                    <IconButton
                      label="Editar"
                      onClick={() =>
                        setForm({
                          id: v.id,
                          petId: v.petId,
                          date: dateOnly(v.date),
                          reason: v.reason,
                          diagnosis: v.diagnosis ?? "",
                          vetName: v.vetName ?? "",
                          weightKg: v.weightKg ? String(v.weightKg) : "",
                          notes: v.notes ?? "",
                        })
                      }
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton label="Eliminar" tone="danger" onClick={() => remove(v)}>
                      <TrashIcon />
                    </IconButton>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {form && (
        <VisitForm
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

function VisitForm({
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
      await api(f.id ? `/vet-visits/${f.id}` : "/vet-visits", {
        method: f.id ? "PATCH" : "POST",
        body: {
          petId: f.petId,
          date: f.date,
          reason: f.reason,
          diagnosis: f.diagnosis,
          vetName: f.vetName,
          weightKg: f.weightKg ? Number(f.weightKg.replace(",", ".")) : null,
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
    <Modal open title={f.id ? "Editar visita" : "Nueva visita al veterinario"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mascota">
            {(id) => <PetSelect id={id} pets={pets} value={f.petId} onChange={(v) => set("petId", v)} />}
          </Field>
          <Field label="Fecha">
            {(id) => <Input id={id} type="date" value={f.date} onChange={(e) => set("date", e.target.value)} required />}
          </Field>
        </div>
        <Field label="Motivo de la visita">
          {(id) => (
            <Input
              id={id}
              value={f.reason}
              onChange={(e) => set("reason", e.target.value)}
              placeholder="Control anual, vómitos, cojera…"
              required
            />
          )}
        </Field>
        <Field label="Diagnóstico">
          {(id) => <Textarea id={id} value={f.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Veterinario / clínica">
            {(id) => <Input id={id} value={f.vetName} onChange={(e) => set("vetName", e.target.value)} />}
          </Field>
          <Field label="Peso (kg)" hint="Se añade al historial de peso">
            {(id) => (
              <Input
                id={id}
                inputMode="decimal"
                pattern="[0-9]+([.,][0-9]{1,2})?"
                value={f.weightKg}
                onChange={(e) => set("weightKg", e.target.value)}
                placeholder="12,5"
              />
            )}
          </Field>
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

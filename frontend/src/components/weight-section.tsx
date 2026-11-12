"use client";

import { useState } from "react";
import useSWR from "swr";
import type { Pet, WeightRecord } from "@/lib/types";
import { api, fetcher } from "@/lib/api";
import { dateOnly, formatDate, kg, todayLocal } from "@/lib/format";
import { qs } from "@/lib/hooks";
import { PetSelect } from "./pet-filter";
import {
  Button,
  Card,
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
  PlusIcon,
  TrashIcon,
} from "./ui";
import { WeightChart, weightTrend } from "./weight-chart";

interface WeightForm {
  id?: number;
  petId: number | "";
  date: string;
  weightKg: string;
  notes: string;
}

/** Gráfico + lista (vista de tabla) del peso de una o varias mascotas. */
export function WeightSection({ pets, petId }: { pets: Pet[] | undefined; petId: number | null }) {
  const { data, error, mutate } = useSWR<WeightRecord[]>(`/weights${qs({ petId })}`, fetcher);
  const [form, setForm] = useState<WeightForm | null>(null);
  const shownPets = (pets ?? []).filter((p) => petId === null || p.id === petId);

  async function remove(w: WeightRecord) {
    if (!confirm(`¿Eliminar el registro de ${kg(w.weightKg)} del ${formatDate(w.date)}?`)) return;
    try {
      await api(`/weights/${w.id}`, { method: "DELETE" });
      await mutate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          variant="secondary"
          onClick={() => setForm({ petId: petId ?? "", date: todayLocal(), weightKg: "", notes: "" })}
        >
          <PlusIcon /> Registrar peso
        </Button>
      </div>
      {error && <LoadError error={error} retry={() => mutate()} />}
      {!data && !error && <Loading />}
      {data && data.length === 0 && (
        <EmptyState icon="⚖️" title="Sin registros de peso">
          Registra el peso en casa o desde una visita al veterinario.
        </EmptyState>
      )}

      {data &&
        shownPets.map((pet) => {
          const records = data.filter((w) => w.petId === pet.id);
          if (!records.length) return null;
          const trend = weightTrend(records);
          return (
            <Card key={pet.id}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">Peso de {pet.name}</h3>
                {trend && <p className="text-sm text-muted">{trend}</p>}
              </div>
              <WeightChart label={`Peso de ${pet.name}`} points={records} />
              <details className="mt-3 group">
                <summary className="cursor-pointer text-sm font-medium text-primary">
                  Ver registros ({records.length})
                </summary>
                <table className="mt-2 w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="py-1.5 font-medium">Fecha</th>
                      <th className="py-1.5 text-right font-medium">Peso</th>
                      <th className="hidden py-1.5 pl-4 font-medium sm:table-cell">Origen</th>
                      <th className="w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {[...records].reverse().map((w) => (
                      <tr key={w.id}>
                        <td className="py-1.5">{formatDate(w.date)}</td>
                        <td className="py-1.5 text-right tabular-nums">{kg(w.weightKg)}</td>
                        <td className="hidden py-1.5 pl-4 text-muted sm:table-cell">
                          {w.vetVisit ? `Visita: ${w.vetVisit.reason}` : w.notes || "Registro manual"}
                        </td>
                        <td className="py-0.5 text-right">
                          {!w.vetVisitId && (
                            <span className="inline-flex">
                              <IconButton
                                label="Editar"
                                onClick={() =>
                                  setForm({
                                    id: w.id,
                                    petId: w.petId,
                                    date: dateOnly(w.date),
                                    weightKg: String(w.weightKg),
                                    notes: w.notes ?? "",
                                  })
                                }
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton label="Eliminar" tone="danger" onClick={() => remove(w)}>
                                <TrashIcon />
                              </IconButton>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </Card>
          );
        })}

      {form && (
        <WeightFormModal
          initial={form}
          pets={pets}
          onClose={() => setForm(null)}
          onSaved={async () => {
            setForm(null);
            await mutate();
          }}
        />
      )}
    </div>
  );
}

function WeightFormModal({
  initial,
  pets,
  onClose,
  onSaved,
}: {
  initial: WeightForm;
  pets: Pet[] | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const weightKg = Number(f.weightKg.replace(",", "."));
      await api(f.id ? `/weights/${f.id}` : "/weights", {
        method: f.id ? "PATCH" : "POST",
        body: f.id
          ? { date: f.date, weightKg, notes: f.notes }
          : { petId: f.petId, date: f.date, weightKg, notes: f.notes },
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setSaving(false);
    }
  }

  return (
    <Modal open title={f.id ? "Editar peso" : "Registrar peso"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {!f.id && (
          <Field label="Mascota">
            {(id) => <PetSelect id={id} pets={pets} value={f.petId} onChange={(v) => setF({ ...f, petId: v })} />}
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha">
            {(id) => (
              <Input id={id} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required />
            )}
          </Field>
          <Field label="Peso (kg)">
            {(id) => (
              <Input
                id={id}
                inputMode="decimal"
                pattern="[0-9]+([.,][0-9]{1,2})?"
                value={f.weightKg}
                onChange={(e) => setF({ ...f, weightKg: e.target.value })}
                placeholder="12,5"
                required
              />
            )}
          </Field>
        </div>
        <Field label="Notas">
          {(id) => <Input id={id} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />}
        </Field>
        <FormError message={error} />
        <FormActions onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import useSWR from "swr";
import { AppointmentsSection } from "@/components/appointments-section";
import { PetFilter, PetSelect } from "@/components/pet-filter";
import { newTreatmentForm, TreatmentForm } from "@/components/treatment-form";
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
import { dateOnly, formatDate, kg, toLocalDateInput, todayLocal } from "@/lib/format";
import { qs, usePets } from "@/lib/hooks";
import type { VetAppointment, VetVisit } from "@/lib/types";

interface FormState {
  id?: number;
  appointmentId?: number;
  petId: number | "";
  date: string;
  reason: string;
  diagnosis: string;
  vetName: string;
  weightKg: string;
  notes: string;
}

type Tab = "citas" | "visitas" | "peso";

export default function VisitasPage() {
  return (
    <Suspense>
      <Veterinario />
    </Suspense>
  );
}

function Veterinario() {
  const params = useSearchParams();
  const highlightId = Number(params.get("cita")) || null;
  const { data: pets } = usePets();
  const [petId, setPetId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>(() =>
    highlightId || params.get("tab") === "citas" ? "citas" : params.get("tab") === "peso" ? "peso" : "visitas",
  );
  const [form, setForm] = useState<FormState | null>(null);
  const [prescription, setPrescription] = useState<{ petId: number; note: string } | null>(null);
  const [treatmentForm, setTreatmentForm] = useState<ReturnType<typeof newTreatmentForm> | null>(null);
  const { data, error, mutate } = useSWR<VetVisit[]>(`/vet-visits${qs({ petId })}`, fetcher);

  /** Registrar el resultado de una cita: abre la visita con los datos de la cita. */
  const registerResult = (a: VetAppointment) =>
    setForm({
      appointmentId: a.id,
      petId: a.petId,
      date: toLocalDateInput(new Date(a.scheduledAt)),
      reason: a.reason,
      diagnosis: "",
      vetName: a.vetName ?? "",
      weightKg: "",
      notes: "",
    });

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
        title="Veterinario"
        description="Citas, visitas y evolución del peso."
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
            ["citas", "📅 Citas"],
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

      {tab === "citas" ? (
        <AppointmentsSection pets={pets} petId={petId} highlightId={highlightId} onRegisterResult={registerResult} />
      ) : tab === "peso" ? (
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
            const fromAppointment = form.appointmentId ? form : null;
            setForm(null);
            await mutate();
            if (fromAppointment && fromAppointment.petId) {
              setPrescription({
                petId: fromAppointment.petId,
                note: `Recetado en la visita del ${formatDate(fromAppointment.date)}: ${fromAppointment.reason}`,
              });
            }
          }}
        />
      )}

      {prescription && (
        <Modal open title="Cita registrada ✓" onClose={() => setPrescription(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm">¿Le recetaron algún medicamento, gotas o limpieza?</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setPrescription(null)}>
                No, listo
              </Button>
              <Button
                onClick={() => {
                  setTreatmentForm({ ...newTreatmentForm(prescription.petId), notes: prescription.note });
                  setPrescription(null);
                }}
              >
                💊 Crear tratamiento
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {treatmentForm && (
        <TreatmentForm
          initial={treatmentForm}
          pets={pets}
          onClose={() => setTreatmentForm(null)}
          onSaved={() => setTreatmentForm(null)}
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
          appointmentId: f.id ? undefined : f.appointmentId,
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
    <Modal
      open
      title={f.id ? "Editar visita" : f.appointmentId ? "Resultado de la cita" : "Nueva visita al veterinario"}
      onClose={onClose}
    >
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

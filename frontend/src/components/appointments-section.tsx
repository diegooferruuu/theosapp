"use client";

import { useState } from "react";
import useSWR from "swr";
import { api, fetcher } from "@/lib/api";
import { formatDate, formatDateTime, formatTime, toDateTimeLocal } from "@/lib/format";
import { qs } from "@/lib/hooks";
import type { Pet, SymptomLog, VetAppointment } from "@/lib/types";
import { PetSelect } from "./pet-filter";
import { SymptomEntry } from "./symptom-entry";
import {
  Badge,
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
  PlusIcon,
  Textarea,
  TrashIcon,
} from "./ui";

interface FormState {
  id?: number;
  petId: number | "";
  scheduledAt: string;
  reason: string;
  vetName: string;
  location: string;
  notes: string;
}

const dayFmt = new Intl.DateTimeFormat("es", { day: "numeric" });
const monthFmt = new Intl.DateTimeFormat("es", { month: "short" });

function whenBadge(a: VetAppointment, now: number) {
  const t = new Date(a.scheduledAt).getTime();
  const diffH = (t - now) / 3_600_000;
  if (diffH < -1) return <Badge tone="danger">Pasada · registrar resultado</Badge>;
  if (diffH <= 0) return <Badge tone="warn">Ahora</Badge>;
  const today = new Date(now).toDateString() === new Date(t).toDateString();
  if (today) return <Badge tone="warn">Hoy {formatTime(a.scheduledAt)}</Badge>;
  const days = Math.ceil(diffH / 24);
  return <Badge tone={days <= 2 ? "warn" : "primary"}>{days === 1 ? "Mañana" : `En ${days} días`}</Badge>;
}

/** Citas con el veterinario: próximas (con preparación) e historial. */
export function AppointmentsSection({
  pets,
  petId,
  highlightId,
  onRegisterResult,
}: {
  pets: Pet[] | undefined;
  petId: number | null;
  highlightId: number | null;
  onRegisterResult: (a: VetAppointment) => void;
}) {
  const open = useSWR<VetAppointment[]>(`/appointments${qs({ petId, open: 1 })}`, fetcher);
  const all = useSWR<VetAppointment[]>(`/appointments${qs({ petId })}`, fetcher);
  const [form, setForm] = useState<FormState | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  // Momento de referencia para "mañana", "en 3 días"… (se fija al mostrar la sección).
  const [now] = useState(() => Date.now());
  const history = all.data?.filter((a) => a.status !== "SCHEDULED") ?? [];
  const refresh = () => Promise.all([open.mutate(), all.mutate()]);

  async function cancel(a: VetAppointment) {
    if (!confirm(`¿Cancelar la cita "${a.reason}" del ${formatDateTime(a.scheduledAt)}?`)) return;
    try {
      await api(`/appointments/${a.id}`, { method: "PATCH", body: { status: "CANCELLED" } });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo cancelar");
    }
  }

  async function remove(a: VetAppointment) {
    if (!confirm(`¿Eliminar la cita "${a.reason}"?`)) return;
    try {
      await api(`/appointments/${a.id}`, { method: "DELETE" });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  const edit = (a: VetAppointment) =>
    setForm({
      id: a.id,
      petId: a.petId,
      scheduledAt: toDateTimeLocal(a.scheduledAt),
      reason: a.reason,
      vetName: a.vetName ?? "",
      location: a.location ?? "",
      notes: a.notes ?? "",
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            const d = new Date(now + 24 * 3_600_000);
            d.setHours(10, 0, 0, 0);
            setForm({
              petId: petId ?? (pets?.length === 1 ? pets[0].id : ""),
              scheduledAt: toDateTimeLocal(d),
              reason: "",
              vetName: "",
              location: "",
              notes: "",
            });
          }}
        >
          <PlusIcon /> Agendar cita
        </Button>
      </div>

      {open.error && <LoadError error={open.error} retry={() => open.mutate()} />}
      {!open.data && !open.error && <Loading />}
      {open.data?.length === 0 && (
        <EmptyState icon="📅" title="No hay citas agendadas">
          Agenda la próxima y te avisaremos el día anterior y 2 horas antes.
        </EmptyState>
      )}

      {open.data?.map((a) => {
        const past = new Date(a.scheduledAt).getTime() < now - 3_600_000;
        return (
          <Card
            key={a.id}
            className={cx("flex flex-col gap-3", highlightId === a.id && "ring-2 ring-primary")}
          >
            <div className="flex items-start gap-3">
              <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-primary-soft py-1.5 text-center text-primary-strong">
                <span className="text-lg font-bold leading-tight">{dayFmt.format(new Date(a.scheduledAt))}</span>
                <span className="text-[11px] uppercase">{monthFmt.format(new Date(a.scheduledAt))}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{a.reason}</p>
                  {whenBadge(a, now)}
                </div>
                <p className="text-sm text-muted">
                  {formatDateTime(a.scheduledAt)}
                  {(pets?.length ?? 0) > 1 && ` · ${a.pet.name}`}
                </p>
                {(a.vetName || a.location) && (
                  <p className="text-sm text-muted">📍 {[a.vetName, a.location].filter(Boolean).join(" · ")}</p>
                )}
              </div>
            </div>
            {a.notes && <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">📝 {a.notes}</p>}
            {a.prep && <Prep appointment={a} />}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
              <Button size="sm" variant={past ? "primary" : "secondary"} onClick={() => onRegisterResult(a)}>
                🩺 Registrar resultado
              </Button>
              <div className="flex items-center">
                <Button size="sm" variant="ghost" onClick={() => cancel(a)}>
                  Cancelar
                </Button>
                <IconButton label="Editar o reprogramar" onClick={() => edit(a)}>
                  <EditIcon />
                </IconButton>
                <IconButton label="Eliminar" tone="danger" onClick={() => remove(a)}>
                  <TrashIcon />
                </IconButton>
              </div>
            </div>
          </Card>
        );
      })}

      {history.length > 0 && (
        <div>
          <button onClick={() => setShowHistory(!showHistory)} className="text-sm font-medium text-primary">
            {showHistory ? "Ocultar" : "Ver"} citas anteriores ({history.length})
          </button>
          {showHistory && (
            <Card className="mt-2 divide-y divide-line p-0">
              {history.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.reason}</p>
                    <p className="text-sm text-muted">
                      {formatDateTime(a.scheduledAt)}
                      {a.visit?.diagnosis && ` · ${a.visit.diagnosis}`}
                    </p>
                  </div>
                  {a.status === "COMPLETED" ? <Badge tone="ok">✓ Realizada</Badge> : <Badge>Cancelada</Badge>}
                  <IconButton label="Eliminar" tone="danger" onClick={() => remove(a)}>
                    <TrashIcon />
                  </IconButton>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {form && (
        <AppointmentForm
          initial={form}
          pets={pets}
          onClose={() => setForm(null)}
          onSaved={async () => {
            setForm(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

/** Síntomas anotados desde la última visita y acceso al PDF para llevar a la consulta. */
function Prep({ appointment: a }: { appointment: VetAppointment }) {
  const [open, setOpen] = useState(false);
  const since = a.prep?.lastVisitDate ?? null;
  const { data } = useSWR<SymptomLog[]>(
    open ? `/symptoms${qs({ petId: a.petId, since })}` : null,
    fetcher,
  );
  const count = a.prep?.symptomCount ?? 0;
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
      <p className="font-medium">Para llevar a la consulta</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
        {count > 0 ? (
          <button onClick={() => setOpen(!open)} className="text-left text-primary underline">
            🩺 {count} {count === 1 ? "síntoma anotado" : "síntomas anotados"}
            {since ? ` desde la visita del ${formatDate(since)}` : ""}
          </button>
        ) : (
          <span className="text-muted">Sin síntomas anotados desde la última visita</span>
        )}
        <a href={`/api/pets/${a.petId}/report.pdf?months=12`} target="_blank" rel="noopener" className="text-primary underline">
          📄 Historial en PDF
        </a>
      </div>
      {open && (
        <div className="mt-2 flex flex-col gap-3 border-t border-line pt-2">
          {!data && <Loading />}
          {data?.map((s) => (
            <div key={s.id}>
              <p className="mb-1 text-xs text-muted">{formatDate(s.occurredAt)}</p>
              <SymptomEntry s={s} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AppointmentForm({
  initial,
  pets,
  onClose,
  onSaved,
}: {
  initial: FormState;
  pets: Pet[] | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const suggestions = ["Control anual", "Vacunación", "Revisión", "Desparasitación", "Análisis de sangre", "Limpieza dental"];
  const prepSuggestions = ["Ir en ayunas", "Llevar muestra de heces", "Llevar carnet de vacunas", "Llevar radiografías"];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        petId: f.petId,
        scheduledAt: new Date(f.scheduledAt).toISOString(),
        reason: f.reason,
        vetName: f.vetName,
        location: f.location,
        notes: f.notes,
      };
      await api(f.id ? `/appointments/${f.id}` : "/appointments", {
        method: f.id ? "PATCH" : "POST",
        body: f.id ? { ...body, petId: undefined } : body,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setSaving(false);
    }
  }

  return (
    <Modal open title={f.id ? "Editar cita" : "Agendar cita"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {pets && pets.length > 1 && !f.id && (
          <Field label="Mascota">{(id) => <PetSelect id={id} pets={pets} value={f.petId} onChange={(v) => set("petId", v)} />}</Field>
        )}
        <Field label="Fecha y hora">
          {(id) => <Input id={id} type="datetime-local" value={f.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} required />}
        </Field>
        <Field label="Motivo">
          {(id) => (
            <>
              <Input id={id} value={f.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Ej. Control anual" required />
              <div className="mt-1 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("reason", s)}
                    className={cx(
                      "rounded-full border px-3 py-1 text-xs",
                      f.reason === s ? "border-primary bg-primary text-primary-fg" : "border-line text-muted hover:border-primary",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Veterinario">
            {(id) => <Input id={id} value={f.vetName} onChange={(e) => set("vetName", e.target.value)} placeholder="Ej. Dra. López" />}
          </Field>
          <Field label="Clínica o dirección">
            {(id) => <Input id={id} value={f.location} onChange={(e) => set("location", e.target.value)} />}
          </Field>
        </div>
        <Field label="Preparación / notas" hint="Te lo recordamos en los avisos">
          {(id) => (
            <>
              <Textarea id={id} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Ej. ir en ayunas" />
              <div className="mt-1 flex flex-wrap gap-2">
                {prepSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("notes", f.notes ? (f.notes.includes(s) ? f.notes : `${f.notes} · ${s}`) : s)}
                    className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-primary"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </>
          )}
        </Field>
        <FormError message={error} />
        <FormActions onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}

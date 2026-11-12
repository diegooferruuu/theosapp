"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { PetFilter, PetSelect } from "@/components/pet-filter";
import { SymptomEntry } from "@/components/symptom-entry";
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
import { api, fetcher } from "@/lib/api";
import { formatDayHeading, toDateTimeLocal } from "@/lib/format";
import { qs, usePets } from "@/lib/hooks";
import { symptomPhotoUrl, uploadSymptomPhotos } from "@/lib/images";
import { SEVERITIES, SYMPTOMS, symptomOf } from "@/lib/labels";
import type { Pet, Severity, SymptomCategory, SymptomLog } from "@/lib/types";

const RANGES = [
  { days: 7, label: "7 días" },
  { days: 30, label: "30 días" },
  { days: 90, label: "3 meses" },
  { days: 0, label: "Todo" },
];

interface FormState {
  id?: number;
  petId: number | "";
  category: SymptomCategory | "";
  severity: Severity;
  occurredAt: string;
  description: string;
  photos: { id: number }[];
}

export default function SintomasPage() {
  const { data: pets } = usePets();
  const [petId, setPetId] = useState<number | null>(null);
  const [days, setDays] = useState(30);
  const [form, setForm] = useState<FormState | null>(null);
  const { data, error, mutate } = useSWR<SymptomLog[]>(`/symptoms${qs({ petId, days: days || null })}`, fetcher);

  const byDay = useMemo(() => {
    const groups = new Map<string, SymptomLog[]>();
    for (const s of data ?? []) {
      const key = formatDayHeading(s.occurredAt);
      groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    return [...groups.entries()];
  }, [data]);

  async function remove(s: SymptomLog) {
    if (!confirm(`¿Eliminar el registro de ${symptomOf(s.category).label.toLowerCase()}? También se borran sus fotos.`)) return;
    try {
      await api(`/symptoms/${s.id}`, { method: "DELETE" });
      await mutate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  return (
    <>
      <PageHeader
        title="Diario de síntomas"
        description="Anota lo que notes, con fotos. Sirve para mostrarle al veterinario."
        action={
          <Button
            onClick={() =>
              setForm({
                petId: petId ?? (pets?.length === 1 ? pets[0].id : ""),
                category: "",
                severity: "MILD",
                occurredAt: toDateTimeLocal(new Date()),
                description: "",
                photos: [],
              })
            }
          >
            <PlusIcon /> Anotar
          </Button>
        }
      />
      <PetFilter pets={pets} value={petId} onChange={setPetId} />
      <div className="mb-4 grid grid-cols-4 rounded-xl border border-line bg-surface p-1 sm:inline-grid">
        {RANGES.map((r) => (
          <button
            key={r.days}
            onClick={() => setDays(r.days)}
            className={cx(
              "rounded-lg px-2 py-1.5 text-sm font-medium sm:px-3",
              days === r.days ? "bg-primary-soft text-primary-strong" : "text-muted hover:text-fg",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error && <LoadError error={error} retry={() => mutate()} />}
      {!data && !error && <Loading />}
      {data?.length === 0 && (
        <EmptyState icon="🩺" image="/brand/theo-sleeping.webp" title="Sin síntomas anotados">
          ¡Buenas noticias! Si notas algo raro, anótalo aquí.
        </EmptyState>
      )}

      <div className="flex flex-col gap-5">
        {byDay.map(([day, items]) => (
          <section key={day}>
            <h2 className="mb-2 text-sm font-semibold text-muted">{day}</h2>
            <Card className="divide-y divide-line p-0">
              {items.map((s) => (
                <div key={s.id} className="px-4 py-3">
                  <SymptomEntry
                    s={s}
                    showPet={(pets?.length ?? 0) > 1}
                    actions={
                      <div className="flex shrink-0">
                        <IconButton
                          label="Editar"
                          onClick={() =>
                            setForm({
                              id: s.id,
                              petId: s.petId,
                              category: s.category,
                              severity: s.severity,
                              occurredAt: toDateTimeLocal(s.occurredAt),
                              description: s.description ?? "",
                              photos: s.photos,
                            })
                          }
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton label="Eliminar" tone="danger" onClick={() => remove(s)}>
                          <TrashIcon />
                        </IconButton>
                      </div>
                    }
                  />
                </div>
              ))}
            </Card>
          </section>
        ))}
      </div>

      {form && (
        <SymptomForm
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

const MAX_PHOTOS = 4;

function SymptomForm({
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
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  const free = MAX_PHOTOS - f.photos.length - files.length;
  const hint = f.category ? symptomOf(f.category).hint : "¿Qué notaste?";

  async function removeExisting(photoId: number) {
    if (!confirm("¿Borrar esta foto?")) return;
    try {
      await api(`/symptoms/photos/${photoId}`, { method: "DELETE" });
      set("photos", f.photos.filter((p) => p.id !== photoId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo borrar");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.category) return setError("Elige qué síntoma notaste");
    setSaving(true);
    setError(null);
    try {
      const body = {
        petId: f.petId,
        category: f.category,
        severity: f.severity,
        occurredAt: new Date(f.occurredAt).toISOString(),
        description: f.description,
      };
      const saved = await api<SymptomLog>(f.id ? `/symptoms/${f.id}` : "/symptoms", {
        method: f.id ? "PATCH" : "POST",
        body: f.id ? { ...body, petId: undefined } : body,
      });
      await uploadSymptomPhotos(saved.id, files);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setSaving(false);
    }
  }

  return (
    <Modal open title={f.id ? "Editar síntoma" : "Anotar síntoma"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        {pets && pets.length > 1 && !f.id && (
          <Field label="Mascota">{(id) => <PetSelect id={id} pets={pets} value={f.petId} onChange={(v) => set("petId", v)} />}</Field>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">¿Qué notaste?</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {SYMPTOMS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => set("category", s.value)}
                className={cx(
                  "flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-xs font-medium transition-colors",
                  f.category === s.value ? "border-primary bg-primary-soft text-primary-strong" : "border-line text-muted hover:text-fg",
                )}
              >
                <span className="text-xl" aria-hidden>
                  {s.icon}
                </span>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Intensidad</p>
          <div className="grid grid-cols-3 rounded-xl border border-line bg-surface p-1">
            {SEVERITIES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => set("severity", s.value)}
                className={cx(
                  "rounded-lg py-2 text-sm font-medium",
                  f.severity === s.value
                    ? s.tone === "danger"
                      ? "bg-danger-soft text-danger"
                      : s.tone === "warn"
                        ? "bg-warn-soft text-warn"
                        : "bg-ok-soft text-ok"
                    : "text-muted hover:text-fg",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="¿Cuándo?">
          {(id) => (
            <Input
              id={id}
              type="datetime-local"
              value={f.occurredAt}
              max={toDateTimeLocal(new Date())}
              onChange={(e) => set("occurredAt", e.target.value)}
              required
            />
          )}
        </Field>

        <Field label="Detalles">
          {(id) => <Textarea id={id} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder={hint} />}
        </Field>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Fotos (opcional, hasta {MAX_PHOTOS})</p>
          <div className="flex flex-wrap gap-2">
            {f.photos.map((p) => (
              <div key={p.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={symptomPhotoUrl(p.id)} alt="" className="size-20 rounded-lg border border-line object-cover" />
                <button
                  type="button"
                  onClick={() => removeExisting(p.id)}
                  className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-danger text-xs text-white"
                  aria-label="Borrar foto"
                >
                  ✕
                </button>
              </div>
            ))}
            {previews.map((src, i) => (
              <div key={src} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="size-20 rounded-lg border border-line object-cover" />
                <button
                  type="button"
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-fg text-xs text-bg"
                  aria-label="Quitar foto"
                >
                  ✕
                </button>
              </div>
            ))}
            {free > 0 && (
              <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-xs text-muted hover:border-primary hover:text-primary">
                <span className="text-xl" aria-hidden>
                  📷
                </span>
                Agregar
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? []).slice(0, free);
                    setFiles([...files, ...picked]);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        </div>

        <FormError message={error} />
        <FormActions onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}

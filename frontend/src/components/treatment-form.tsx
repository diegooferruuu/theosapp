"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { describeDose, formatAmount, stockUnit, unitLabel } from "@/lib/dose-text";
import { dateOnly, toDateTimeLocal, todayLocal } from "@/lib/format";
import { FREQUENCIES } from "@/lib/labels";
import { kindOf, scheduleSummary, TREATMENT_KINDS } from "@/lib/treatment-kinds";
import type { FoodTiming, Pet, ScheduleType, Treatment, TreatmentType } from "@/lib/types";
import { PetSelect } from "./pet-filter";
import { Checkbox, cx, Field, FormActions, FormError, Input, Modal, Select, Textarea } from "./ui";

interface FormState {
  id?: number;
  petId: number | "";
  type: TreatmentType;
  medicineName: string;
  strength: string;
  amount: string;
  unit: string;
  site: string;
  foodTiming: FoodTiming | "";
  instructions: string;
  dosage: string;
  scheduleType: ScheduleType;
  times: string[];
  everyDays: string;
  startDate: string;
  startAt: string;
  frequencyHours: string;
  minIntervalHours: string;
  maxPerDay: string;
  continuous: boolean;
  durationDays: string;
  trackStock: boolean;
  stockQuantity: string;
  stockAlertAt: string;
  notifyDoses: boolean;
  notes: string;
}

const TIME_PRESETS: { label: string; times: string[] }[] = [
  { label: "1 vez", times: ["08:00"] },
  { label: "2 veces", times: ["08:00", "20:00"] },
  { label: "3 veces", times: ["08:00", "14:00", "20:00"] },
];

type TypeDefaults = Pick<FormState, "type" | "amount" | "unit" | "site" | "foodTiming" | "strength">;

function defaultsForType(type: TreatmentType): TypeDefaults {
  const kind = kindOf(type);
  return {
    type,
    amount: kind.amount ? String(kind.amount.defaultValue) : "",
    unit: kind.units?.[0] ?? (kind.quantityText ? kind.quantityText[0] : ""),
    site: "",
    foodTiming: "",
    strength: "",
  };
}

export function newTreatmentForm(petId: number | ""): FormState {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);
  return {
    ...defaultsForType("PILL"),
    petId,
    medicineName: "",
    instructions: "",
    dosage: "",
    scheduleType: "FIXED_TIMES",
    times: ["08:00", "20:00"],
    everyDays: "1",
    startDate: todayLocal(),
    startAt: toDateTimeLocal(now),
    frequencyHours: "8",
    minIntervalHours: "8",
    maxPerDay: "",
    continuous: false,
    durationDays: "7",
    trackStock: false,
    stockQuantity: "",
    stockAlertAt: "",
    notifyDoses: true,
    notes: "",
  };
}

export function editTreatmentForm(t: Treatment): FormState {
  return {
    id: t.id,
    petId: t.petId,
    type: t.type,
    medicineName: t.medicineName,
    strength: t.strength ?? "",
    amount: t.amount !== null ? String(t.amount) : "",
    unit: t.unit ?? "",
    site: t.site ?? "",
    foodTiming: t.foodTiming ?? "",
    instructions: t.instructions ?? "",
    dosage: t.dosage,
    scheduleType: t.scheduleType,
    times: t.times.length ? t.times : ["08:00"],
    everyDays: String(t.everyDays),
    startDate: dateOnly(toDateTimeLocal(t.startAt)),
    startAt: toDateTimeLocal(t.startAt),
    frequencyHours: String(t.frequencyHours ?? 8),
    minIntervalHours: t.minIntervalHours !== null ? String(t.minIntervalHours) : "",
    maxPerDay: t.maxPerDay !== null ? String(t.maxPerDay) : "",
    continuous: t.durationDays === null,
    durationDays: String(t.durationDays ?? 7),
    trackStock: t.stockQuantity !== null,
    stockQuantity: t.stockQuantity !== null ? String(t.stockQuantity) : "",
    stockAlertAt: t.stockAlertAt !== null ? String(t.stockAlertAt) : "",
    notifyDoses: t.notifyDoses,
    notes: t.notes ?? "",
  };
}

const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        active ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface text-fg hover:border-primary",
      )}
    >
      {children}
    </button>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid rounded-xl border border-line bg-surface p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-lg px-2 py-2 text-sm font-medium",
            value === o.value ? "bg-primary-soft text-primary-strong" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stepper({ value, step, onChange, suffix }: { value: string; step: number; onChange: (v: string) => void; suffix: string }) {
  const n = num(value) ?? 0;
  const set = (v: number) => onChange(String(Math.max(step, Math.round(v * 100) / 100)));
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => set(n - step)} className="size-11 shrink-0 rounded-xl border border-line text-lg font-semibold" aria-label="Menos">
        −
      </button>
      <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="text-center" aria-label={suffix} />
      <button type="button" onClick={() => set(n + step)} className="size-11 shrink-0 rounded-xl border border-line text-lg font-semibold" aria-label="Más">
        +
      </button>
      <span className="shrink-0 text-sm text-muted">{suffix}</span>
    </div>
  );
}

export function TreatmentForm({
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
  const kind = kindOf(f.type);

  const amount = num(f.amount);
  const preview = useMemo(
    () =>
      describeDose({
        type: f.type,
        amount: kind.amount ? amount : null,
        unit: f.unit || null,
        strength: f.strength || null,
        site: f.site || null,
        foodTiming: f.foodTiming || null,
        dosage: f.dosage,
      }),
    [f, kind, amount],
  );
  const summary = scheduleSummary({
    scheduleType: f.scheduleType,
    times: [...f.times].sort(),
    everyDays: Number(f.everyDays) || 1,
    frequencyHours: Number(f.frequencyHours) || null,
    minIntervalHours: num(f.minIntervalHours),
    maxPerDay: num(f.maxPerDay),
    durationDays: f.continuous ? null : Number(f.durationDays) || null,
  });
  const unitForStock = stockUnit({ type: f.type, unit: f.unit || null });
  const perDose = kind.amount && amount ? amount : 1;

  function changeType(type: TreatmentType) {
    setF((s) => ({ ...s, ...defaultsForType(type), dosage: s.dosage }));
  }

  function toggleSuggestion(text: string) {
    const parts = f.instructions.split(/\s*·\s*/).filter(Boolean);
    const next = parts.includes(text) ? parts.filter((p) => p !== text) : [...parts, text];
    set("instructions", next.join(" · "));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const startAt =
        f.scheduleType === "INTERVAL"
          ? new Date(f.startAt).toISOString()
          : new Date(`${f.startDate}T${f.scheduleType === "FIXED_TIMES" ? "12:00" : "00:00"}`).toISOString();
      const body = {
        petId: f.petId,
        type: f.type,
        medicineName: f.medicineName,
        strength: f.strength,
        amount: kind.amount ? amount : null,
        unit: f.unit,
        site: f.site,
        foodTiming: f.foodTiming || null,
        instructions: f.instructions,
        dosage: f.type === "OTHER" ? f.dosage : undefined,
        scheduleType: f.scheduleType,
        startAt,
        times: f.times,
        everyDays: Number(f.everyDays) || 1,
        frequencyHours: f.scheduleType === "INTERVAL" ? Number(f.frequencyHours) : null,
        minIntervalHours: f.scheduleType === "AS_NEEDED" ? num(f.minIntervalHours) : null,
        maxPerDay: f.scheduleType === "AS_NEEDED" ? num(f.maxPerDay) : null,
        durationDays: f.continuous ? null : Number(f.durationDays),
        stockQuantity: f.trackStock ? num(f.stockQuantity) : null,
        stockAlertAt: f.trackStock ? num(f.stockAlertAt) : null,
        notifyDoses: f.notifyDoses,
        notes: f.notes,
      };
      await api(f.id ? `/treatments/${f.id}` : "/treatments", { method: f.id ? "PATCH" : "POST", body });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setSaving(false);
    }
  }

  return (
    <Modal open title={f.id ? "Editar tratamiento" : "Nuevo tratamiento"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        {/* Tipo */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Tipo</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {TREATMENT_KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => changeType(k.value)}
                className={cx(
                  "flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-xs font-medium transition-colors",
                  f.type === k.value ? "border-primary bg-primary-soft text-primary-strong" : "border-line text-muted hover:text-fg",
                )}
              >
                <span className="text-xl" aria-hidden>
                  {k.icon}
                </span>
                {k.label}
              </button>
            ))}
          </div>
        </div>

        {pets && pets.length > 1 && (
          <Field label="Mascota">{(id) => <PetSelect id={id} pets={pets} value={f.petId} onChange={(v) => set("petId", v)} />}</Field>
        )}

        <Field label={kind.nameLabel}>
          {(id) => (
            <Input id={id} value={f.medicineName} onChange={(e) => set("medicineName", e.target.value)} placeholder={kind.namePlaceholder} required />
          )}
        </Field>

        {/* Dosis según el tipo */}
        {kind.freeDosage && (
          <Field label="Dosis o indicación">
            {(id) => <Input id={id} value={f.dosage} onChange={(e) => set("dosage", e.target.value)} placeholder="Ej. 10 minutos de ejercicios" required />}
          </Field>
        )}

        {kind.strength && (
          <Field label="Concentración">
            {(id) => <Input id={id} value={f.strength} onChange={(e) => set("strength", e.target.value)} placeholder={kind.strength} />}
          </Field>
        )}

        {kind.amount && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{kind.amount.label}</p>
            <div className="flex flex-wrap gap-2">
              {kind.amount.presets.map((p) => (
                <Chip key={p} active={amount === p} onClick={() => set("amount", String(p))}>
                  {formatAmount(p, kind.amount!.fractions)}
                </Chip>
              ))}
            </div>
            <Stepper
              value={f.amount}
              step={kind.amount.step}
              onChange={(v) => set("amount", v)}
              suffix={unitLabel(f.unit || unitForStock, amount ?? 2) || ""}
            />
          </div>
        )}

        {kind.units && kind.units.length > 1 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Unidad</p>
            <div className="flex flex-wrap gap-2">
              {kind.units.map((u) => (
                <Chip key={u} active={f.unit === u} onClick={() => set("unit", u)}>
                  {u}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {kind.quantityText && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Cantidad</p>
            <div className="flex flex-wrap gap-2">
              {kind.quantityText.map((q) => (
                <Chip key={q} active={f.unit === q} onClick={() => set("unit", q)}>
                  {q}
                </Chip>
              ))}
            </div>
            <Input value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="O escríbela" aria-label="Cantidad" />
          </div>
        )}

        {(kind.sites || kind.siteFree) && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{kind.siteLabel ?? "Zona"}</p>
            {kind.sites && (
              <div className="flex flex-wrap gap-2">
                {kind.sites.map((s) => (
                  <Chip key={s} active={f.site === s} onClick={() => set("site", s)}>
                    {s}
                  </Chip>
                ))}
              </div>
            )}
            {kind.siteFree && (
              <Input value={f.site} onChange={(e) => set("site", e.target.value)} placeholder="Ej. pata delantera izquierda" aria-label={kind.siteLabel ?? "Zona"} />
            )}
          </div>
        )}

        {kind.food && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Comida</p>
            <Segmented<FoodTiming | "">
              value={f.foodTiming}
              onChange={(v) => set("foodTiming", v)}
              options={[
                { value: "", label: "Indiferente" },
                { value: "WITH_FOOD", label: "Con comida" },
                { value: "FASTING", label: "En ayunas" },
              ]}
            />
          </div>
        )}

        <Field label="Indicaciones" hint="Se muestran al momento de darlo">
          {(id) => (
            <>
              <Input id={id} value={f.instructions} onChange={(e) => set("instructions", e.target.value)} placeholder="Ej. agitar antes" />
              {kind.suggestions && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {kind.suggestions.map((s) => (
                    <Chip key={s} active={f.instructions.split(/\s*·\s*/).includes(s)} onClick={() => toggleSuggestion(s)}>
                      {s}
                    </Chip>
                  ))}
                </div>
              )}
            </>
          )}
        </Field>

        {/* Frecuencia */}
        <div className="flex flex-col gap-3 rounded-2xl border border-line p-3">
          <p className="text-sm font-medium">¿Cuándo?</p>
          <Segmented<ScheduleType>
            value={f.scheduleType}
            onChange={(v) => set("scheduleType", v)}
            options={[
              { value: "FIXED_TIMES", label: "Horarios" },
              { value: "INTERVAL", label: "Cada X h" },
              { value: "AS_NEEDED", label: "Si hace falta" },
            ]}
          />

          {f.scheduleType === "FIXED_TIMES" && (
            <>
              <div className="flex flex-wrap gap-2">
                {TIME_PRESETS.map((p) => (
                  <Chip key={p.label} active={f.times.join() === p.times.join()} onClick={() => set("times", p.times)}>
                    {p.label} al día
                  </Chip>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {f.times.map((time, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => set("times", f.times.map((x, j) => (j === i ? e.target.value : x)))}
                      required
                      aria-label={`Hora ${i + 1}`}
                    />
                    {f.times.length > 1 && (
                      <button
                        type="button"
                        onClick={() => set("times", f.times.filter((_, j) => j !== i))}
                        className="size-11 shrink-0 rounded-xl border border-line text-muted hover:text-danger"
                        aria-label="Quitar hora"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {f.times.length < 8 && (
                  <button type="button" onClick={() => set("times", [...f.times, "12:00"])} className="self-start text-sm font-medium text-primary">
                    + Agregar hora
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Repetir">
                  {(id) => (
                    <Select id={id} value={f.everyDays} onChange={(e) => set("everyDays", e.target.value)}>
                      <option value="1">Todos los días</option>
                      {[2, 3, 4, 5, 7, 14, 30].map((d) => (
                        <option key={d} value={d}>
                          Cada {d} días
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Desde">
                  {(id) => <Input id={id} type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} required />}
                </Field>
              </div>
            </>
          )}

          {f.scheduleType === "INTERVAL" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cada">
                {(id) => (
                  <Select id={id} value={f.frequencyHours} onChange={(e) => set("frequencyHours", e.target.value)}>
                    {FREQUENCIES.map((h) => (
                      <option key={h} value={h}>
                        {h} horas
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Primera toma">
                {(id) => <Input id={id} type="datetime-local" value={f.startAt} onChange={(e) => set("startAt", e.target.value)} required />}
              </Field>
            </div>
          )}

          {f.scheduleType === "AS_NEEDED" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mínimo entre dosis (horas)" hint="Bloquea darla antes de tiempo">
                {(id) => <Input id={id} inputMode="decimal" value={f.minIntervalHours} onChange={(e) => set("minIntervalHours", e.target.value)} placeholder="Ej. 8" />}
              </Field>
              <Field label="Máximo al día" hint="Opcional">
                {(id) => <Input id={id} inputMode="numeric" value={f.maxPerDay} onChange={(e) => set("maxPerDay", e.target.value)} placeholder="Ej. 3" />}
              </Field>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Duración</p>
            <Segmented<"days" | "continuous">
              value={f.continuous ? "continuous" : "days"}
              onChange={(v) => set("continuous", v === "continuous")}
              options={[
                { value: "days", label: "Por días" },
                { value: "continuous", label: "Sin fecha de fin" },
              ]}
            />
            {!f.continuous && (
              <Stepper value={f.durationDays} step={1} onChange={(v) => set("durationDays", v)} suffix={Number(f.durationDays) === 1 ? "día" : "días"} />
            )}
          </div>
        </div>

        {/* Stock */}
        <div className="flex flex-col gap-3">
          <Checkbox
            label="Llevar control de stock"
            hint="Cada toma marcada descuenta y te avisa cuando quede poco"
            checked={f.trackStock}
            onChange={(v) => set("trackStock", v)}
          />
          {f.trackStock && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`Disponible (${unitLabel(unitForStock, 2)})`}>
                {(id) => <Input id={id} inputMode="decimal" value={f.stockQuantity} onChange={(e) => set("stockQuantity", e.target.value)} placeholder="Ej. 20" required />}
              </Field>
              <Field label="Avisar cuando queden">
                {(id) => (
                  <Input
                    id={id}
                    inputMode="decimal"
                    value={f.stockAlertAt}
                    onChange={(e) => set("stockAlertAt", e.target.value)}
                    placeholder={`${formatAmount(perDose * 3, unitForStock !== "ml")} (3 tomas)`}
                  />
                )}
              </Field>
            </div>
          )}
        </div>

        {f.scheduleType !== "AS_NEEDED" && (
          <Checkbox label="Avisar en cada toma" checked={f.notifyDoses} onChange={(v) => set("notifyDoses", v)} />
        )}

        <Field label="Notas">
          {(id) => <Textarea id={id} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Indicaciones del veterinario, motivo…" />}
        </Field>

        <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
          <p className="font-medium">
            {kind.icon} {f.medicineName || kind.label} — {preview}
          </p>
          <p className="text-muted">{summary}</p>
        </div>

        <FormError message={error} />
        <FormActions onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}

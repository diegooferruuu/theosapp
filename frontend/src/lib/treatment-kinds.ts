import type { TreatmentType } from "./types";

export interface KindConfig {
  value: TreatmentType;
  label: string;
  icon: string;
  /** Etiqueta del campo nombre. */
  nameLabel: string;
  namePlaceholder: string;
  /** Cantidad por toma. */
  amount?: { label: string; presets: number[]; step: number; fractions: boolean; defaultValue: number };
  /** Unidades elegibles (la primera es la predeterminada). */
  units?: string[];
  strength?: string;
  /** Zonas predefinidas (chips); con `siteFree` también se puede escribir. */
  sites?: string[];
  siteLabel?: string;
  siteFree?: boolean;
  /** Cantidad como texto (pomadas). */
  quantityText?: string[];
  food?: boolean;
  suggestions?: string[];
  freeDosage?: boolean;
}

export const TREATMENT_KINDS: KindConfig[] = [
  {
    value: "PILL",
    label: "Pastilla",
    icon: "💊",
    nameLabel: "Medicamento",
    namePlaceholder: "Ej. Meloxicam",
    amount: { label: "Cantidad por toma", presets: [0.25, 0.5, 0.75, 1, 1.5, 2], step: 0.25, fractions: true, defaultValue: 1 },
    strength: "Ej. 50 mg (por pastilla)",
    food: true,
    suggestions: ["Triturada", "Entera", "Envuelta en comida"],
  },
  {
    value: "CAPSULE",
    label: "Cápsula",
    icon: "💊",
    nameLabel: "Medicamento",
    namePlaceholder: "Ej. Omeprazol",
    amount: { label: "Cápsulas por toma", presets: [1, 2, 3], step: 1, fractions: false, defaultValue: 1 },
    strength: "Ej. 20 mg",
    food: true,
    suggestions: ["Abrir y mezclar con comida"],
  },
  {
    value: "LIQUID",
    label: "Jarabe",
    icon: "🧪",
    nameLabel: "Medicamento",
    namePlaceholder: "Ej. Amoxicilina suspensión",
    amount: { label: "ml por toma", presets: [0.5, 1, 2, 2.5, 5], step: 0.5, fractions: false, defaultValue: 1 },
    strength: "Ej. 50 mg/ml (opcional)",
    food: true,
    suggestions: ["Agitar antes", "Refrigerar", "Con jeringa por un costado de la boca"],
  },
  {
    value: "ORAL_DROPS",
    label: "Gotas orales",
    icon: "💧",
    nameLabel: "Medicamento",
    namePlaceholder: "Ej. Metamizol gotas",
    amount: { label: "Gotas por toma", presets: [1, 2, 3, 5, 10], step: 1, fractions: false, defaultValue: 1 },
    food: true,
  },
  {
    value: "EAR_DROPS",
    label: "Gotas oídos",
    icon: "👂",
    nameLabel: "Medicamento",
    namePlaceholder: "Ej. Otomax",
    amount: { label: "Gotas por oído", presets: [2, 3, 4, 5], step: 1, fractions: false, defaultValue: 4 },
    sites: ["Oído izquierdo", "Oído derecho", "Ambos oídos"],
    siteLabel: "¿Qué oído?",
    suggestions: ["Limpiar antes", "Masajear la base de la oreja"],
  },
  {
    value: "EYE_DROPS",
    label: "Ojos",
    icon: "👁️",
    nameLabel: "Medicamento",
    namePlaceholder: "Ej. Tobradex",
    amount: { label: "Cantidad por ojo", presets: [1, 2], step: 1, fractions: false, defaultValue: 1 },
    units: ["gota", "tira"],
    sites: ["Ojo izquierdo", "Ojo derecho", "Ambos ojos"],
    siteLabel: "¿Qué ojo?",
    suggestions: ["Limpiar legañas antes"],
  },
  {
    value: "OINTMENT",
    label: "Pomada",
    icon: "🧴",
    nameLabel: "Pomada o crema",
    namePlaceholder: "Ej. Dermaplus",
    quantityText: ["Capa fina", "Del tamaño de un guisante", "Una gota"],
    siteLabel: "Zona",
    siteFree: true,
    suggestions: ["Evitar que se lama 15 min", "Usar collar isabelino", "Con guantes"],
  },
  {
    value: "INJECTION",
    label: "Inyección",
    icon: "💉",
    nameLabel: "Medicamento",
    namePlaceholder: "Ej. Insulina",
    amount: { label: "Dosis", presets: [0.1, 0.2, 0.3, 0.5, 1], step: 0.1, fractions: false, defaultValue: 0.5 },
    units: ["ml", "UI"],
    strength: "Ej. 40 UI/ml (opcional)",
    suggestions: ["Subcutánea", "En la clínica", "Después de comer"],
  },
  {
    value: "CLEANING",
    label: "Limpieza",
    icon: "🧽",
    nameLabel: "Producto",
    namePlaceholder: "Ej. Otoclean, suero fisiológico",
    sites: ["Oídos", "Ojos", "Herida", "Dientes", "Patas", "Pliegues"],
    siteLabel: "¿Qué se limpia?",
    siteFree: true,
    suggestions: ["Llenar, masajear 30 s y secar", "Con gasa, sin algodón", "Secar bien al terminar"],
  },
  {
    value: "MEDICATED_BATH",
    label: "Baño medicado",
    icon: "🛁",
    nameLabel: "Champú",
    namePlaceholder: "Ej. Clorhexidina 2 %",
    suggestions: ["Dejar actuar 10 min", "Enjuagar bien", "Secar por completo"],
  },
  {
    value: "SUPPLEMENT",
    label: "Suplemento",
    icon: "🦴",
    nameLabel: "Suplemento",
    namePlaceholder: "Ej. Condroprotector, omega 3",
    amount: { label: "Cantidad", presets: [0.5, 1, 2], step: 0.5, fractions: true, defaultValue: 1 },
    units: ["unidad", "pastilla", "ml", "g", "cucharada", "sobre"],
    food: true,
  },
  {
    value: "OTHER",
    label: "Otro",
    icon: "✏️",
    nameLabel: "Nombre",
    namePlaceholder: "Ej. Fisioterapia",
    freeDosage: true,
  },
];

export const kindOf = (type: TreatmentType) => TREATMENT_KINDS.find((k) => k.value === type) ?? TREATMENT_KINDS[TREATMENT_KINDS.length - 1];

const TIMES_LABEL = (times: string[]) => times.join(", ");

/** "2 veces al día (08:00, 20:00) · 7 días" */
export function scheduleSummary(t: {
  scheduleType: string;
  times: string[];
  everyDays: number;
  frequencyHours: number | null;
  minIntervalHours: number | null;
  maxPerDay: number | null;
  durationDays: number | null;
}): string {
  let s: string;
  if (t.scheduleType === "FIXED_TIMES") {
    const n = t.times.length;
    s =
      t.everyDays > 1
        ? `Cada ${t.everyDays} días a las ${TIMES_LABEL(t.times)}`
        : n === 1
          ? `1 vez al día (${TIMES_LABEL(t.times)})`
          : `${n} veces al día (${TIMES_LABEL(t.times)})`;
  } else if (t.scheduleType === "AS_NEEDED") {
    s = "Según necesidad";
    if (t.minIntervalHours) s += ` · mínimo ${t.minIntervalHours} h entre dosis`;
    if (t.maxPerDay) s += ` · máx. ${t.maxPerDay} al día`;
  } else {
    s = `Cada ${t.frequencyHours} h`;
  }
  return `${s} · ${t.durationDays ? `${t.durationDays} ${t.durationDays === 1 ? "día" : "días"}` : "sin fecha de fin"}`;
}

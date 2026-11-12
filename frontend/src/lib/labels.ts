import type {
  GroomingServiceType,
  HealthRecordType,
  TreatmentStatus,
} from "./types";

export const HEALTH_TYPES: { value: HealthRecordType; label: string; icon: string }[] = [
  { value: "VACCINE", label: "Vacuna", icon: "💉" },
  { value: "DEWORMING_INTERNAL", label: "Desparasitación interna", icon: "🪱" },
  { value: "DEWORMING_EXTERNAL", label: "Desparasitación externa", icon: "🛡️" },
];

export const GROOMING_TYPES: { value: GroomingServiceType; label: string; icon: string }[] = [
  { value: "BATH", label: "Baño", icon: "🛁" },
  { value: "HAIRCUT", label: "Corte de pelo", icon: "✂️" },
  { value: "NAIL_TRIM", label: "Corte de uñas", icon: "💅" },
  { value: "DENTAL_CLEANING", label: "Limpieza dental", icon: "🦷" },
];

export const TREATMENT_STATUS: Record<TreatmentStatus, string> = {
  ACTIVE: "Activo",
  FINISHED: "Finalizado",
  CANCELLED: "Cancelado",
};

export const FREQUENCIES = [4, 6, 8, 12, 24, 48, 72];

export const healthLabel = (t: string) => HEALTH_TYPES.find((h) => h.value === t)?.label ?? t;
export const healthIcon = (t: string) => HEALTH_TYPES.find((h) => h.value === t)?.icon ?? "•";
export const groomingLabel = (t: string) => GROOMING_TYPES.find((g) => g.value === t)?.label ?? t;
export const groomingIcon = (t: string) => GROOMING_TYPES.find((g) => g.value === t)?.icon ?? "•";
export const itemIcon = (t: string) => healthIcon(t) !== "•" ? healthIcon(t) : groomingIcon(t);

export const SYMPTOMS: { value: import("./types").SymptomCategory; label: string; icon: string; hint: string }[] = [
  { value: "VOMIT", label: "Vómito", icon: "🤮", hint: "¿Comida, líquido, espuma? ¿Cuántas veces?" },
  { value: "DIARRHEA", label: "Diarrea", icon: "💩", hint: "Consistencia, color, ¿con sangre o moco?" },
  { value: "COUGH", label: "Tos", icon: "😮‍💨", hint: "¿Seca, con flema? ¿Al hacer ejercicio?" },
  { value: "SNEEZING", label: "Estornudos", icon: "🤧", hint: "¿Con secreción nasal?" },
  { value: "LIMPING", label: "Cojera", icon: "🦵", hint: "¿Qué pata? ¿Desde cuándo? ¿Se queja al tocar?" },
  { value: "ITCHING", label: "Picazón", icon: "🐾", hint: "¿Dónde se rasca o se lame?" },
  { value: "NO_APPETITE", label: "No come", icon: "🍽️", hint: "¿No comió nada o comió poco? ¿Toma agua?" },
  { value: "LETHARGY", label: "Decaído", icon: "😴", hint: "¿Duerme más? ¿No quiere pasear?" },
  { value: "SKIN", label: "Piel", icon: "🩹", hint: "Granos, heridas, caída de pelo, enrojecimiento" },
  { value: "EYES", label: "Ojos", icon: "👁️", hint: "Legañas, rojos, lagrimeo, entrecierra" },
  { value: "EARS", label: "Oídos", icon: "👂", hint: "Olor, cera, sacude la cabeza" },
  { value: "BREATHING", label: "Respiración", icon: "🫁", hint: "Agitada, ruidosa, con la boca abierta en reposo" },
  { value: "URINE", label: "Orina", icon: "💧", hint: "Frecuente, con sangre, accidentes en casa" },
  { value: "OTHER", label: "Otro", icon: "📝", hint: "Describe lo que notaste" },
];

export const symptomOf = (v: string) => SYMPTOMS.find((s) => s.value === v) ?? SYMPTOMS[SYMPTOMS.length - 1];

export const SEVERITIES: { value: import("./types").Severity; label: string; tone: "ok" | "warn" | "danger" }[] = [
  { value: "MILD", label: "Leve", tone: "ok" },
  { value: "MODERATE", label: "Moderado", tone: "warn" },
  { value: "SEVERE", label: "Grave", tone: "danger" },
];

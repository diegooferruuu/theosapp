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

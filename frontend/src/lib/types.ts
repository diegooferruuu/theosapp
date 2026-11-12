export type Role = "SUPERADMIN" | "USER";

export interface User {
  id: number;
  name: string;
  username: string;
  role: Role;
  active: boolean;
  notificationsEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count?: { pushSubscriptions: number };
}

export interface Pet {
  id: number;
  name: string;
  species: string | null;
  breed: string | null;
  birthDate: string | null;
  currentWeightKg: number | null;
  notes: string | null;
}

export interface PetRef {
  id: number;
  name: string;
}

export type DueStatus = "OVERDUE" | "TODAY" | "SOON" | "UPCOMING" | "DONE" | "NONE";

export interface Due {
  status: DueStatus;
  daysUntil: number | null;
}

export type HealthRecordType = "VACCINE" | "DEWORMING_INTERNAL" | "DEWORMING_EXTERNAL";

export interface HealthRecord {
  id: number;
  petId: number;
  type: HealthRecordType;
  name: string;
  dateGiven: string;
  nextDueDate: string | null;
  notes: string | null;
  pet: PetRef;
  createdBy: PetRef | null;
  due: Due;
}

export type GroomingServiceType = "BATH" | "HAIRCUT" | "NAIL_TRIM" | "DENTAL_CLEANING";

export interface GroomingLog {
  id: number;
  petId: number;
  serviceType: GroomingServiceType;
  dateDone: string;
  nextDueDate: string | null;
  notes: string | null;
  pet: PetRef;
  createdBy: PetRef | null;
  due: Due;
}

export type TreatmentStatus = "ACTIVE" | "FINISHED" | "CANCELLED";

export interface TreatmentProgress {
  totalDoses: number;
  dosesElapsed: number;
  nextDoseAt: string | null;
  nextDoseNumber: number | null;
  lastDoseAt: string;
  endAt: string;
}

export interface GivenDose {
  doseNumber: number;
  givenAt: string;
  notes: string | null;
  givenBy: { id: number; name: string } | null;
}

export interface Treatment {
  id: number;
  petId: number;
  medicineName: string;
  dosage: string;
  startAt: string;
  durationDays: number;
  frequencyHours: number;
  status: TreatmentStatus;
  notifyDoses: boolean;
  notes: string | null;
  pet: PetRef;
  progress: TreatmentProgress;
  givenCount: number;
  lastGiven: GivenDose | null;
  /** Toma que toca ahora (o la próxima si aún no llega). */
  current: { number: number; at: string; canGive: boolean; given: GivenDose | null };
}

export interface TreatmentSchedule extends Treatment {
  doses: { number: number; at: string; past: boolean; given: GivenDose | null }[];
}

export interface VetVisit {
  id: number;
  petId: number;
  date: string;
  reason: string;
  diagnosis: string | null;
  vetName: string | null;
  weightKg: number | null;
  notes: string | null;
  pet: PetRef;
}

export interface WeightRecord {
  id: number;
  petId: number;
  date: string;
  weightKg: number;
  notes: string | null;
  vetVisitId: number | null;
  pet: PetRef;
  vetVisit: { id: number; reason: string } | null;
}

export interface UpcomingItem {
  kind: "HEALTH" | "GROOMING";
  id: number;
  type: string;
  petId: number;
  petName: string;
  title: string;
  subtitle: string;
  dueDate: string;
  daysUntil: number;
  status: DueStatus;
}

export interface Dashboard {
  today: string;
  timezone: string;
  pets: Pet[];
  upcoming: UpcomingItem[];
  activeTreatments: Treatment[];
  lastVisits: VetVisit[];
}

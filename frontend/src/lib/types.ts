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

export type TreatmentType =
  | "PILL"
  | "CAPSULE"
  | "LIQUID"
  | "ORAL_DROPS"
  | "EAR_DROPS"
  | "EYE_DROPS"
  | "OINTMENT"
  | "INJECTION"
  | "CLEANING"
  | "MEDICATED_BATH"
  | "SUPPLEMENT"
  | "OTHER";

export type ScheduleType = "INTERVAL" | "FIXED_TIMES" | "AS_NEEDED";
export type FoodTiming = "WITH_FOOD" | "FASTING";

export interface TreatmentProgress {
  totalDoses: number | null;
  dosesElapsed: number;
  nextDoseAt: string | null;
  nextDoseNumber: number | null;
  endAt: string | null;
}

export interface GivenDose {
  doseNumber: number;
  givenAt: string;
  notes: string | null;
  givenBy: { id: number; name: string } | null;
}

export interface TreatmentStock {
  quantity: number;
  unit: string;
  label: string;
  perDose: number;
  alertAt: number;
  low: boolean;
  dosesLeft: number;
  daysLeft: number | null;
}

export interface Treatment {
  id: number;
  petId: number;
  type: TreatmentType;
  medicineName: string;
  dosage: string;
  strength: string | null;
  amount: number | null;
  unit: string | null;
  site: string | null;
  foodTiming: FoodTiming | null;
  instructions: string | null;
  scheduleType: ScheduleType;
  startAt: string;
  durationDays: number | null;
  frequencyHours: number | null;
  times: string[];
  everyDays: number;
  minIntervalHours: number | null;
  maxPerDay: number | null;
  stockQuantity: number | null;
  stockAlertAt: number | null;
  status: TreatmentStatus;
  notifyDoses: boolean;
  notes: string | null;
  pet: PetRef;
  progress: TreatmentProgress;
  givenCount: number;
  lastGiven: GivenDose | null;
  /** Toma que toca ahora (o la próxima). null en "según necesidad". */
  current: { number: number; at: string; canGive: boolean; given: GivenDose | null; nextAt: string | null } | null;
  asNeeded: { canGive: boolean; nextAllowedAt: string | null; reason: "interval" | "max" | null; last24h: number } | null;
  stock: TreatmentStock | null;
}

export interface TreatmentSchedule extends Treatment {
  partial: boolean;
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

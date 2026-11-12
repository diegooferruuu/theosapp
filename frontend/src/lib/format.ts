const dateFmt = new Intl.DateTimeFormat("es", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const shortDateFmt = new Intl.DateTimeFormat("es", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
const dateTimeFmt = new Intl.DateTimeFormat("es", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const timeFmt = new Intl.DateTimeFormat("es", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Fechas "solo día" que vienen del API como ISO a medianoche UTC. */
export const dateOnly = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dateFmt.format(new Date(`${dateOnly(iso)}T00:00:00Z`));
}

export function formatShortDate(iso: string): string {
  return shortDateFmt.format(new Date(`${dateOnly(iso)}T00:00:00Z`));
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return capitalize(dateTimeFmt.format(new Date(iso)));
}

export function formatLongDate(date: string): string {
  return capitalize(
    new Intl.DateTimeFormat("es", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(
      new Date(`${dateOnly(date)}T00:00:00Z`),
    ),
  );
}

export function formatDayHeading(iso: string): string {
  return capitalize(
    new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long" }).format(new Date(iso)),
  );
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function relativeDays(days: number | null): string {
  if (days === null) return "";
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days === -1) return "Ayer";
  return days > 0 ? `En ${days} días` : `Hace ${-days} días`;
}

/** Hoy en la zona horaria del navegador, 'YYYY-MM-DD'. */
export function todayLocal(): string {
  const d = new Date();
  return toLocalDateInput(d);
}

export function toLocalDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDaysLocal(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalDateInput(d);
}

/** ISO → valor para <input type="datetime-local"> en hora local. */
export function toDateTimeLocal(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${toLocalDateInput(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ageFrom(birth: string | null): string | null {
  if (!birth) return null;
  const b = new Date(`${dateOnly(birth)}T00:00:00`);
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + now.getMonth() - b.getMonth();
  if (now.getDate() < b.getDate()) months--;
  if (months < 0) return null;
  if (months < 12) return `${months} ${months === 1 ? "mes" : "meses"}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "año" : "años"}`;
}

export const kg = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${n.toLocaleString("es", { maximumFractionDigits: 2 })} kg`;

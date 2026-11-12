"use client";

import Link from "next/link";
import useSWR from "swr";
import { DoseStatus } from "@/components/dose-status";
import { DueBadge } from "@/components/due-badge";
import { SymptomEntry } from "@/components/symptom-entry";
import { PetAvatar } from "@/components/pet-avatar";
import { useSession } from "@/components/session";
import { ProgressBar } from "@/components/treatment-progress";
import { Card, EmptyState, LoadError, Loading } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { ageFrom, formatDate, formatDateTime, formatLongDate, kg } from "@/lib/format";
import { itemIcon } from "@/lib/labels";
import type { Dashboard, SymptomLog } from "@/lib/types";

export default function HomePage() {
  const me = useSession();
  const { data, error, mutate } = useSWR<Dashboard>("/dashboard", fetcher, {
    refreshInterval: 60_000,
  });
  const { data: symptoms } = useSWR<SymptomLog[]>("/symptoms?days=7", fetcher);

  const pending = data?.upcoming.filter((u) => u.daysUntil <= 7).length ?? 0;
  const treatments = data?.activeTreatments.length ?? 0;
  const subject = data?.pets.length === 1 ? data.pets[0].name : "Hay";
  const summary = !data
    ? " "
    : pending === 0 && treatments === 0
      ? "Todo al día. ¡A disfrutar! 🎉"
      : [
          pending > 0 && `${pending} ${pending === 1 ? "pendiente" : "pendientes"} esta semana`,
          treatments > 0 && `${treatments} ${treatments === 1 ? "tratamiento activo" : "tratamientos activos"}`,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <>
      <section className="relative mb-6 min-h-36 overflow-hidden rounded-3xl border border-line bg-primary-soft px-5 py-5 sm:min-h-44 sm:px-7 sm:py-7">
        <div className="relative z-10 max-w-[58%] sm:max-w-[60%]">
          <p className="text-sm font-medium text-primary-strong">{data ? formatLongDate(data.today) : " "}</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">Hola, {me.name.split(" ")[0]} 👋</h1>
          <p className="mt-1.5 text-sm text-fg/80">
            {data && subject !== "Hay" && summary !== "Todo al día. ¡A disfrutar! 🎉" ? `${subject}: ` : ""}
            {summary}
          </p>
        </div>
        <div className="illustration-halo pointer-events-none absolute bottom-1 right-1 top-3 flex w-[44%] items-end justify-end rounded-full sm:right-6 sm:w-[40%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/theo-burger.webp"
            alt="Theo comiendo una hamburguesa"
            width={524}
            height={375}
            className="max-h-full w-auto max-w-full object-contain object-bottom"
          />
        </div>
      </section>

      {error && <LoadError error={error} retry={() => mutate()} />}
      {!data && !error && <Loading />}

      {data && (
        <div className="flex flex-col gap-6">
          {(data.nextAppointments.length > 0 || data.pendingAppointments.length > 0) && (
            <section className="flex flex-col gap-2">
              {data.pendingAppointments.map((a) => (
                <Link
                  key={`p${a.id}`}
                  href={`/visitas?cita=${a.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-danger"
                >
                  <span className="text-xl" aria-hidden>
                    🩺
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    <b>¿Cómo fue la cita?</b> {a.reason} del {formatDate(a.scheduledAt)}. Toca para registrar el resultado.
                  </span>
                </Link>
              ))}
              {data.nextAppointments.map((a) => (
                <Link key={a.id} href={`/visitas?cita=${a.id}`}>
                  <Card className="flex items-center gap-3 transition-colors hover:border-primary/50">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-xl" aria-hidden>
                      📅
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-primary-strong">Próxima cita</p>
                      <p className="truncate font-semibold">{a.reason}</p>
                      <p className="truncate text-sm text-muted">
                        {formatDateTime(a.scheduledAt)}
                        {a.vetName ? ` · ${a.vetName}` : ""}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2">
            {data.pets.map((pet) => (
              <Link key={pet.id} href={`/mascotas/${pet.id}`}>
                <Card className="flex items-center gap-4 transition-colors hover:border-primary/50">
                  <PetAvatar pet={pet} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{pet.name}</p>
                    <p className="truncate text-sm text-muted">
                      {[pet.species, pet.breed, ageFrom(pet.birthDate)].filter(Boolean).join(" · ") ||
                        "Completa su ficha"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">Peso</p>
                    <p className="font-semibold tabular-nums">{kg(pet.currentWeightKg)}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Próximos 30 días</h2>
            {data.upcoming.length === 0 ? (
              <EmptyState icon="✅" image="/brand/theo-sleeping.webp" title="Todo al día">
                No hay vacunas, desparasitaciones ni turnos de higiene pendientes.
              </EmptyState>
            ) : (
              <Card className="divide-y divide-line p-0">
                {data.upcoming.map((item) => (
                  <Link
                    key={`${item.kind}-${item.id}`}
                    href={item.kind === "HEALTH" ? "/vacunas" : "/higiene"}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2"
                  >
                    <span className="text-xl" aria-hidden>
                      {itemIcon(item.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {item.petName} · {item.title}
                      </p>
                      <p className="text-sm text-muted">
                        {item.kind === "HEALTH" ? item.subtitle : "Higiene"} · {formatDate(item.dueDate)}
                      </p>
                    </div>
                    <DueBadge status={item.status} daysUntil={item.daysUntil} />
                  </Link>
                ))}
              </Card>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Tratamientos activos</h2>
            {data.activeTreatments.length === 0 ? (
              <EmptyState icon="💊" title="Sin tratamientos activos" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.activeTreatments.map((t) => (
                  <Card key={t.id} className="flex flex-col gap-3">
                    <Link href="/tratamientos" className="group">
                      <p className="font-semibold group-hover:text-primary">
                        {t.pet.name} · {t.medicineName}
                      </p>
                      <p className="text-sm text-muted">
                        {t.dosage} · cada {t.frequencyHours} h
                      </p>
                    </Link>
                    <ProgressBar value={t.givenCount} total={t.progress.totalDoses} />
                    <DoseStatus treatment={t} onChange={() => mutate()} />
                  </Card>
                ))}
              </div>
            )}
          </section>

          {symptoms && symptoms.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Síntomas esta semana</h2>
                <Link href="/sintomas" className="text-sm font-medium text-primary">
                  Ver diario
                </Link>
              </div>
              <Card className="divide-y divide-line p-0">
                {symptoms.slice(0, 3).map((s) => (
                  <div key={s.id} className="px-4 py-3">
                    <p className="mb-1 text-xs text-muted">{formatDate(s.occurredAt)}</p>
                    <SymptomEntry s={s} />
                  </div>
                ))}
              </Card>
            </section>
          )}

          {data.lastVisits.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Últimas visitas al veterinario</h2>
              <Card className="divide-y divide-line p-0">
                {data.lastVisits.map((v) => (
                  <Link key={v.id} href="/visitas" className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <span className="text-xl" aria-hidden>
                      🩺
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {v.pet.name} · {v.reason}
                      </p>
                      <p className="truncate text-sm text-muted">
                        {formatDate(v.date)}
                        {v.diagnosis ? ` · ${v.diagnosis}` : ""}
                      </p>
                    </div>
                    {v.weightKg && <span className="text-sm tabular-nums text-muted">{kg(v.weightKg)}</span>}
                  </Link>
                ))}
              </Card>
            </section>
          )}
        </div>
      )}
    </>
  );
}

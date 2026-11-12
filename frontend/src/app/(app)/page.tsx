"use client";

import Link from "next/link";
import useSWR from "swr";
import { DueBadge } from "@/components/due-badge";
import { useSession } from "@/components/session";
import { ProgressBar } from "@/components/treatment-progress";
import { Card, EmptyState, LoadError, Loading } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { ageFrom, formatDate, formatDateTime, formatLongDate, kg } from "@/lib/format";
import { itemIcon } from "@/lib/labels";
import type { Dashboard } from "@/lib/types";

export default function HomePage() {
  const me = useSession();
  const { data, error, mutate } = useSWR<Dashboard>("/dashboard", fetcher, {
    refreshInterval: 60_000,
  });

  return (
    <>
      <div className="mb-6">
        <p className="text-sm text-muted">
          {data ? formatLongDate(data.today) : " "}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Hola, {me.name.split(" ")[0]} 👋</h1>
      </div>

      {error && <LoadError error={error} retry={() => mutate()} />}
      {!data && !error && <Loading />}

      {data && (
        <div className="flex flex-col gap-6">
          <section className="grid gap-3 sm:grid-cols-2">
            {data.pets.map((pet) => (
              <Link key={pet.id} href={`/mascotas/${pet.id}`}>
                <Card className="flex items-center gap-4 transition-colors hover:border-primary/50">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-2xl">
                    🐾
                  </div>
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
              <EmptyState icon="✅" title="Todo al día">
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
                  <Link key={t.id} href="/tratamientos">
                    <Card className="flex flex-col gap-3 transition-colors hover:border-primary/50">
                      <div>
                        <p className="font-semibold">
                          {t.pet.name} · {t.medicineName}
                        </p>
                        <p className="text-sm text-muted">
                          {t.dosage} · cada {t.frequencyHours} h
                        </p>
                      </div>
                      <ProgressBar progress={t.progress} />
                      <p className="text-sm">
                        <span className="text-muted">Próxima toma: </span>
                        <span className="font-medium">
                          {t.progress.nextDoseAt ? formatDateTime(t.progress.nextDoseAt) : "—"}
                        </span>
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

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

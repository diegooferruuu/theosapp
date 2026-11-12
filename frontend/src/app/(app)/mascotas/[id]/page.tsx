"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { DueBadge } from "@/components/due-badge";
import { PetFormModal } from "@/components/pet-form";
import { useSession } from "@/components/session";
import { ProgressBar } from "@/components/treatment-progress";
import { Button, Card, EmptyState, LoadError, Loading } from "@/components/ui";
import { WeightChart, weightTrend } from "@/components/weight-chart";
import { api, fetcher } from "@/lib/api";
import { ageFrom, formatDate, formatDateTime, kg } from "@/lib/format";
import { groomingIcon, groomingLabel, healthIcon, healthLabel } from "@/lib/labels";
import type { GroomingLog, HealthRecord, Pet, Treatment, VetVisit, WeightRecord } from "@/lib/types";

export default function PetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const me = useSession();
  const [editing, setEditing] = useState(false);
  const { data: pet, error, mutate } = useSWR<Pet>(`/pets/${id}`, fetcher);
  const { data: health } = useSWR<HealthRecord[]>(`/health-records?petId=${id}`, fetcher);
  const { data: grooming } = useSWR<GroomingLog[]>(`/grooming?petId=${id}`, fetcher);
  const { data: treatments } = useSWR<Treatment[]>(`/treatments?petId=${id}&status=ACTIVE`, fetcher);
  const { data: visits } = useSWR<VetVisit[]>(`/vet-visits?petId=${id}`, fetcher);
  const { data: weights } = useSWR<WeightRecord[]>(`/weights?petId=${id}`, fetcher);

  if (error) return <LoadError error={error} retry={() => mutate()} />;
  if (!pet) return <Loading />;

  const currentHealth = health?.filter((h) => h.due.status !== "DONE") ?? [];
  const currentGrooming = grooming?.filter((g) => g.due.status !== "DONE") ?? [];
  const trend = weights ? weightTrend(weights) : null;

  async function removePet() {
    if (!pet) return;
    if (!confirm(`¿Eliminar a ${pet.name} y TODO su historial? Esta acción no se puede deshacer.`)) return;
    try {
      await api(`/pets/${pet.id}`, { method: "DELETE" });
      router.push("/mascotas");
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  return (
    <>
      <Link href="/mascotas" className="mb-3 inline-block text-sm text-muted hover:text-fg">
        ← Mascotas
      </Link>
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-4xl">🐾</div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{pet.name}</h1>
            <p className="text-sm text-muted">
              {[pet.species, pet.breed, ageFrom(pet.birthDate)].filter(Boolean).join(" · ") || "Completa su ficha"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Editar ficha
            </Button>
            {me.role === "SUPERADMIN" && (
              <Button variant="danger" onClick={removePet}>
                Eliminar
              </Button>
            )}
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted">Peso actual</dt>
            <dd className="font-semibold tabular-nums">{kg(pet.currentWeightKg)}</dd>
          </div>
          <div>
            <dt className="text-muted">Nacimiento</dt>
            <dd className="font-semibold">{formatDate(pet.birthDate)}</dd>
          </div>
          <div>
            <dt className="text-muted">Visitas</dt>
            <dd className="font-semibold">{visits?.length ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Tratamientos activos</dt>
            <dd className="font-semibold">{treatments?.length ?? "—"}</dd>
          </div>
        </dl>
        {pet.notes && <p className="mt-4 whitespace-pre-line rounded-xl bg-surface-2 p-3 text-sm">{pet.notes}</p>}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle title="Vacunas y desparasitación" href="/vacunas" />
          {currentHealth.length === 0 ? (
            <EmptyState icon="💉" title="Sin registros" />
          ) : (
            <Card className="divide-y divide-line p-0">
              {currentHealth.map((h) => (
                <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl">{healthIcon(h.type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{h.name}</p>
                    <p className="text-sm text-muted">
                      {healthLabel(h.type)} · próxima {formatDate(h.nextDueDate)}
                    </p>
                  </div>
                  <DueBadge status={h.due.status} daysUntil={h.due.daysUntil} />
                </div>
              ))}
            </Card>
          )}
        </section>

        <section>
          <SectionTitle title="Higiene" href="/higiene" />
          {currentGrooming.length === 0 ? (
            <EmptyState icon="🛁" title="Sin registros" />
          ) : (
            <Card className="divide-y divide-line p-0">
              {currentGrooming.map((g) => (
                <div key={g.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl">{groomingIcon(g.serviceType)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{groomingLabel(g.serviceType)}</p>
                    <p className="text-sm text-muted">
                      Último {formatDate(g.dateDone)} · próximo {formatDate(g.nextDueDate)}
                    </p>
                  </div>
                  <DueBadge status={g.due.status} daysUntil={g.due.daysUntil} />
                </div>
              ))}
            </Card>
          )}
        </section>

        <section>
          <SectionTitle title="Peso" href="/visitas" />
          <Card>
            {weights && weights.length > 0 ? (
              <>
                {trend && <p className="mb-2 text-sm text-muted">{trend}</p>}
                <WeightChart label={`Peso de ${pet.name}`} points={weights} height={180} />
              </>
            ) : (
              <p className="py-6 text-center text-sm text-muted">Sin registros de peso</p>
            )}
          </Card>
        </section>

        <section>
          <SectionTitle title="Tratamientos activos" href="/tratamientos" />
          {!treatments?.length ? (
            <EmptyState icon="💊" title="Sin tratamientos activos" />
          ) : (
            <div className="flex flex-col gap-3">
              {treatments.map((t) => (
                <Card key={t.id} className="flex flex-col gap-2">
                  <p className="font-medium">
                    {t.medicineName} · {t.dosage}
                  </p>
                  <ProgressBar progress={t.progress} />
                  <p className="text-sm text-muted">
                    Próxima toma:{" "}
                    <span>
                      {t.progress.nextDoseAt ? formatDateTime(t.progress.nextDoseAt) : "—"}
                    </span>
                  </p>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-2">
          <SectionTitle title="Historial de visitas" href="/visitas" />
          {!visits?.length ? (
            <EmptyState icon="🩺" title="Sin visitas" />
          ) : (
            <Card className="divide-y divide-line p-0">
              {visits.slice(0, 8).map((v) => (
                <div key={v.id} className="px-4 py-3">
                  <p className="font-medium">
                    {formatDate(v.date)} · {v.reason}
                  </p>
                  {(v.diagnosis || v.weightKg) && (
                    <p className="text-sm text-muted">
                      {[v.diagnosis, v.weightKg ? kg(v.weightKg) : null].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>

      {editing && (
        <PetFormModal
          pet={pet}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await mutate();
          }}
        />
      )}
    </>
  );
}

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Link href={href} className="text-sm font-medium text-primary">
        Ver todo
      </Link>
    </div>
  );
}

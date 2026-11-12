"use client";

import Link from "next/link";
import { useState } from "react";
import { PetFormModal } from "@/components/pet-form";
import { Button, Card, EmptyState, LoadError, Loading, PageHeader, PlusIcon } from "@/components/ui";
import { ageFrom, formatDate, kg } from "@/lib/format";
import { usePets } from "@/lib/hooks";

export default function MascotasPage() {
  const { data: pets, error, mutate } = usePets();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title="Mascotas"
        action={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon /> Nueva mascota
          </Button>
        }
      />
      {error && <LoadError error={error} retry={() => mutate()} />}
      {!pets && !error && <Loading />}
      {pets?.length === 0 && <EmptyState icon="🐾" title="Aún no hay mascotas" />}
      <div className="grid gap-3 sm:grid-cols-2">
        {pets?.map((p) => (
          <Link key={p.id} href={`/mascotas/${p.id}`}>
            <Card className="h-full transition-colors hover:border-primary/50">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-3xl">🐾</div>
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{p.name}</p>
                  <p className="truncate text-sm text-muted">
                    {[p.species, p.breed].filter(Boolean).join(" · ") || "Sin especie ni raza"}
                  </p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-muted">Edad</dt>
                  <dd className="font-medium">{ageFrom(p.birthDate) ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Nacimiento</dt>
                  <dd className="font-medium">{p.birthDate ? formatDate(p.birthDate) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Peso</dt>
                  <dd className="font-medium tabular-nums">{kg(p.currentWeightKg)}</dd>
                </div>
              </dl>
            </Card>
          </Link>
        ))}
      </div>
      {creating && (
        <PetFormModal
          pet={null}
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
            await mutate();
          }}
        />
      )}
    </>
  );
}

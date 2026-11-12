"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { dateOnly } from "@/lib/format";
import type { Pet } from "@/lib/types";
import { Field, FormActions, FormError, Input, Modal, Textarea } from "./ui";

export function PetFormModal({
  pet,
  onClose,
  onSaved,
}: {
  pet: Pet | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: pet?.name ?? "",
    species: pet?.species ?? "",
    breed: pet?.breed ?? "",
    birthDate: dateOnly(pet?.birthDate),
    notes: pet?.notes ?? "",
    weightKg: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: f.name,
        species: f.species,
        breed: f.breed,
        birthDate: f.birthDate || null,
        notes: f.notes,
      };
      if (!pet && f.weightKg) body.weightKg = Number(f.weightKg.replace(",", "."));
      await api(pet ? `/pets/${pet.id}` : "/pets", { method: pet ? "PATCH" : "POST", body });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setSaving(false);
    }
  }

  return (
    <Modal open title={pet ? `Editar a ${pet.name}` : "Nueva mascota"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nombre">
          {(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />}
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Especie">
            {(id) => (
              <>
                <Input
                  id={id}
                  list="species"
                  value={f.species}
                  onChange={(e) => setF({ ...f, species: e.target.value })}
                  placeholder="Perro, Gato…"
                />
                <datalist id="species">
                  <option value="Perro" />
                  <option value="Gato" />
                </datalist>
              </>
            )}
          </Field>
          <Field label="Raza">
            {(id) => <Input id={id} value={f.breed} onChange={(e) => setF({ ...f, breed: e.target.value })} />}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha de nacimiento">
            {(id) => (
              <Input id={id} type="date" value={f.birthDate} onChange={(e) => setF({ ...f, birthDate: e.target.value })} />
            )}
          </Field>
          {!pet && (
            <Field label="Peso actual (kg)">
              {(id) => (
                <Input
                  id={id}
                  inputMode="decimal"
                  pattern="[0-9]+([.,][0-9]{1,2})?"
                  value={f.weightKg}
                  onChange={(e) => setF({ ...f, weightKg: e.target.value })}
                />
              )}
            </Field>
          )}
        </div>
        <Field label="Notas" hint="Alergias, chip, carácter, alimentación…">
          {(id) => <Textarea id={id} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />}
        </Field>
        <FormError message={error} />
        <FormActions onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}

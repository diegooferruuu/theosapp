"use client";

import type { Pet } from "@/lib/types";
import { cx } from "./ui";

export function PetFilter({
  pets,
  value,
  onChange,
}: {
  pets: Pet[] | undefined;
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const options = [{ id: null, name: "Todas" }, ...(pets ?? [])];
  return (
    <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
      {options.map((p) => (
        <button
          key={p.id ?? "all"}
          onClick={() => onChange(p.id)}
          className={cx(
            "h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
            value === p.id
              ? "border-primary bg-primary text-primary-fg"
              : "border-line bg-surface text-muted hover:text-fg",
          )}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}

export function PetSelect({
  pets,
  value,
  onChange,
  id,
}: {
  pets: Pet[] | undefined;
  value: number | "";
  onChange: (id: number) => void;
  id?: string;
}) {
  return (
    <select
      id={id}
      required
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
    >
      <option value="" disabled>
        Elige una mascota
      </option>
      {pets?.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

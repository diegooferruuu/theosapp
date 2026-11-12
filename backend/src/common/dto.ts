import { Transform } from 'class-transformer';

/** Convierte '' en undefined y recorta espacios. */
export const Trim = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const v = value.trim();
    return v === '' ? undefined : v;
  });

/** Igual que Trim pero convierte '' en null (para poder borrar el campo). */
export const TrimOrNull = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const v = value.trim();
    return v === '' ? null : v;
  });

export const EmptyToNull = () =>
  Transform(({ value }) => (value === '' ? null : value));

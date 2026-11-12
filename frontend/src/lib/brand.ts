import type { Pet } from "./types";

export const APP_NAME = "Theo’s App";
export const APP_DESCRIPTION = "Salud, cuidados y recordatorios de Theo";

/** Foto/ilustración de la mascota. Por ahora solo Theo tiene la suya. */
export function petAvatar(pet: Pick<Pet, "name">): string | null {
  return pet.name.trim().toLowerCase() === "theo" ? "/icons/icon-192.png" : null;
}

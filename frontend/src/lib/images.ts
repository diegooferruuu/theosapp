"use client";

import { ApiError } from "./api";

/** Reduce la foto antes de subirla (máx. 1600 px, JPEG). Si no se puede, devuelve el original. */
export async function compressImage(file: File, max = 1600, quality = 0.82): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export async function uploadSymptomPhotos(symptomId: number, files: File[]): Promise<void> {
  if (!files.length) return;
  const form = new FormData();
  for (const f of files) {
    const blob = await compressImage(f);
    const name = blob === f ? f.name : f.name.replace(/\.[^.]+$/, "") + ".jpg";
    form.append("photos", blob, name);
  }
  const res = await fetch(`/api/symptoms/${symptomId}/photos`, {
    method: "POST",
    body: form,
    credentials: "same-origin",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.message ?? "No se pudieron subir las fotos");
  }
}

export const symptomPhotoUrl = (id: number) => `/api/symptoms/photos/${id}`;

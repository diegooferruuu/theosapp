"use client";

import useSWR from "swr";
import { fetcher } from "./api";
import type { Pet } from "./types";

export function usePets() {
  return useSWR<Pet[]>("/pets", fetcher);
}

/** Construye un query string ignorando valores vacíos. */
export function qs(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

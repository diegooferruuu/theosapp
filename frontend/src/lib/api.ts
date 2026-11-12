export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let redirecting = false;

async function handleUnauthorized() {
  if (redirecting || typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;
  redirecting = true;
  // Limpia la cookie inválida para que el proxy no nos devuelva a la app.
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `/login?next=${next}`;
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "same-origin",
  });

  if (res.status === 401 && !path.startsWith("/auth/login")) {
    void handleUnauthorized();
  }
  const data = res.headers.get("content-type")?.includes("json")
    ? await res.json()
    : null;
  if (!res.ok) {
    const raw = data?.message;
    const message = Array.isArray(raw) ? raw.join(". ") : raw || "Ocurrió un error inesperado";
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const fetcher = <T,>(path: string) => api<T>(path);

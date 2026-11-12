"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import useSWR from "swr";
import { api, fetcher } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";
import type { User } from "@/lib/types";
import { NavIcon } from "./nav-icons";
import { SessionProvider } from "./session";
import { cx, LoadError, Spinner } from "./ui";

interface NavItem {
  href: string;
  label: string;
  short?: string;
  icon: () => ReactNode;
  admin?: boolean;
}

const NAV: NavItem[] = [
  { href: "/", label: "Inicio", icon: NavIcon.home },
  { href: "/vacunas", label: "Vacunas y desparasitación", short: "Vacunas", icon: NavIcon.syringe },
  { href: "/tratamientos", label: "Tratamientos", short: "Medicinas", icon: NavIcon.pill },
  { href: "/higiene", label: "Higiene y estética", short: "Higiene", icon: NavIcon.bath },
  { href: "/visitas", label: "Veterinario", icon: NavIcon.stethoscope },
  { href: "/sintomas", label: "Diario de síntomas", icon: NavIcon.symptom },
  { href: "/mascotas", label: "Mascotas", icon: NavIcon.paw },
  { href: "/usuarios", label: "Usuarios", icon: NavIcon.users, admin: true },
  { href: "/perfil", label: "Mi perfil", icon: NavIcon.user },
];

const MOBILE_MAIN = ["/", "/vacunas", "/tratamientos", "/higiene"];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

async function logout() {
  await api("/auth/logout", { method: "POST" }).catch(() => undefined);
  // Recarga completa para descartar la caché de datos de la sesión anterior.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/login";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: me, error, mutate } = useSWR<User>("/auth/me", fetcher);
  const [moreOpen, setMoreOpen] = useState(false);

  if (error) {
    return (
      <div className="mx-auto max-w-md p-6">
        <LoadError error={error} retry={() => mutate()} />
      </div>
    );
  }
  if (!me) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        <Spinner />
      </div>
    );
  }

  const items = NAV.filter((n) => !n.admin || me.role === "SUPERADMIN");
  const mobileMore = items.filter((n) => !MOBILE_MAIN.includes(n.href));
  const moreActive = mobileMore.some((n) => isActive(pathname, n.href));

  return (
    <SessionProvider value={me}>
      <div className="min-h-dvh lg:flex">
        {/* Barra lateral (escritorio) */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 lg:flex">
          <Link href="/" className="mb-5 flex justify-center" aria-label={`${APP_NAME} · Inicio`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo.webp"
              alt={APP_NAME}
              width={534}
              height={640}
              className="h-32 w-auto drop-shadow-md transition-transform hover:-rotate-3"
            />
          </Link>
          <nav className="flex flex-1 flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(pathname, item.href)
                    ? "bg-primary-soft text-primary-strong"
                    : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <item.icon />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-line px-3 pt-4">
            <p className="truncate text-sm font-medium">{me.name}</p>
            <p className="mb-3 text-xs text-muted">
              @{me.username} · {me.role === "SUPERADMIN" ? "Superadmin" : "Usuario"}
            </p>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-sm text-muted hover:text-danger"
            >
              <NavIcon.logout /> Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
          {/* Cabecera compacta (móvil) */}
          <Link href="/" className="mb-4 flex items-center gap-2.5 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" width={192} height={192} className="size-9 rounded-xl ring-2 ring-surface" />
            <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
          </Link>
          {children}
        </main>

        {/* Barra inferior (móvil) */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5">
            {items
              .filter((n) => MOBILE_MAIN.includes(n.href))
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                    isActive(pathname, item.href) ? "text-primary" : "text-muted",
                  )}
                >
                  <item.icon />
                  {item.short ?? item.label}
                </Link>
              ))}
            <button
              onClick={() => setMoreOpen(true)}
              className={cx(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                moreActive ? "text-primary" : "text-muted",
              )}
            >
              <NavIcon.more />
              Más
            </button>
          </div>
        </nav>

        {moreOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMoreOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
              <p className="px-3 pb-2 text-xs text-muted">
                {me.name} · @{me.username}
              </p>
              {mobileMore.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cx(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium",
                    isActive(pathname, item.href) ? "bg-primary-soft text-primary-strong" : "text-fg",
                  )}
                >
                  <item.icon />
                  {item.label}
                </Link>
              ))}
              <button
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-danger"
              >
                <NavIcon.logout /> Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </SessionProvider>
  );
}

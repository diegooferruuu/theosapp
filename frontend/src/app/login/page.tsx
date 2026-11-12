import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/192" alt="" className="mb-4 size-16 rounded-2xl shadow-sm" />
          <h1 className="text-2xl font-semibold tracking-tight">Theo &amp; Jovero</h1>
          <p className="mt-1 text-sm text-muted">Salud y cuidados de la casa</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}

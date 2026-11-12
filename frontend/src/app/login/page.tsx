import type { Metadata } from "next";
import { Suspense } from "react";
import { APP_NAME } from "@/lib/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo.webp"
            alt={APP_NAME}
            width={534}
            height={640}
            className="mb-3 h-auto w-44 drop-shadow-md sm:w-52"
          />
          <p className="text-sm text-muted">Salud y cuidados de Theo</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button, Card, Field, FormError, Input } from "@/components/ui";

export function LoginForm() {
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/auth/login", { body: { username, password } });
      const next = params.get("next");
      // Solo rutas internas para evitar redirecciones abiertas.
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
      setLoading(false);
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Usuario">
          {(id) => (
            <Input
              id={id}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
        </Field>
        <Field label="Contraseña">
          {(id) => (
            <Input
              id={id}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
        </Field>
        <FormError message={error} />
        <Button type="submit" loading={loading} className="mt-1 w-full">
          Entrar
        </Button>
      </form>
    </Card>
  );
}

"use client";

import { useState, useSyncExternalStore } from "react";
import useSWR, { useSWRConfig } from "swr";
import { useSession } from "@/components/session";
import { Badge, Button, Card, Checkbox, Field, FormError, Input, PageHeader } from "@/components/ui";
import { api, fetcher } from "@/lib/api";
import { currentSubscription, disablePush, enablePush, pushSupport, type PushSupport } from "@/lib/push";

interface TelegramStatus {
  linked: boolean;
  botEnabled: boolean;
  botUsername: string | null;
}

export default function PerfilPage() {
  const me = useSession();
  const { mutate: globalMutate } = useSWRConfig();
  const refreshMe = () => globalMutate("/auth/me");

  return (
    <>
      <PageHeader title="Mi perfil" description={`@${me.username} · ${me.role === "SUPERADMIN" ? "Superadmin" : "Usuario"}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileCard onSaved={refreshMe} />
        <PushCard />
        <TelegramCard onChanged={refreshMe} />
        <PasswordCard />
      </div>
    </>
  );
}

function ProfileCard({ onSaved }: { onSaved: () => void }) {
  const me = useSession();
  const [name, setName] = useState(me.name);
  const [notifications, setNotifications] = useState(me.notificationsEnabled);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      await api("/profile", { method: "PATCH", body: { name, notificationsEnabled: notifications } });
      setMsg("Datos guardados");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-4 font-semibold">Datos</h2>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nombre">
          {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} required />}
        </Field>
        <Checkbox
          label="Recibir avisos por Telegram"
          hint="Vacunas, desparasitaciones, higiene y tomas de medicamentos"
          checked={notifications}
          onChange={setNotifications}
        />
        <FormError message={error} />
        {msg && <p className="text-sm text-ok">{msg}</p>}
        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Guardar
          </Button>
        </div>
      </form>
    </Card>
  );
}

const noopSubscribe = () => () => {};

interface PushConfig {
  enabled: boolean;
  publicKey: string | null;
  devices: number;
}

function PushCard() {
  const { data: config, mutate } = useSWR<PushConfig>("/push/config", fetcher);
  // Solo se puede saber en el navegador; en el render del servidor queda en null.
  const support = useSyncExternalStore<PushSupport | null>(noopSubscribe, pushSupport, () => null);
  const { data: subscribed = false, mutate: mutateSubscribed } = useSWR(
    support === "ok" ? "push-subscription" : null,
    async () => Boolean(await currentSubscription()),
  );
  const setSubscribed = (v: boolean) => mutateSubscribed(v, { revalidate: false });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-semibold">Notificaciones en este dispositivo</h2>
        {support === "ok" && (subscribed ? <Badge tone="ok">✓ Activadas</Badge> : <Badge>Desactivadas</Badge>)}
      </div>

      {support === null || !config ? null : support === "insecure" ? (
        <p className="text-sm text-muted">Las notificaciones solo funcionan cuando la app se abre por HTTPS.</p>
      ) : support === "ios-install" ? (
        <div className="flex flex-col gap-2 text-sm text-muted">
          <p>En iPhone primero hay que instalar la app:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Toca <b>Compartir</b> <span aria-hidden>⬆️</span> en Safari.
            </li>
            <li>
              Elige <b>Añadir a pantalla de inicio</b>.
            </li>
            <li>Abre Theo’s App desde el ícono y vuelve a esta pantalla.</li>
          </ol>
        </div>
      ) : support === "unsupported" || !config.enabled || !config.publicKey ? (
        <p className="text-sm text-muted">Este navegador no admite notificaciones push.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Recibe aquí los recordatorios de vacunas, higiene y cada toma de medicamento, aunque la app esté cerrada.
            {config.devices > 0 && ` Tienes ${config.devices} ${config.devices === 1 ? "dispositivo" : "dispositivos"} con avisos.`}
          </p>
          <div className="flex flex-wrap gap-2">
            {subscribed ? (
              <>
                <Button
                  variant="secondary"
                  loading={busy}
                  onClick={() =>
                    run(async () => {
                      await api("/push/test", { method: "POST" });
                      setMsg("Notificación de prueba enviada ✓");
                    })
                  }
                >
                  Enviar prueba
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    run(async () => {
                      await disablePush();
                      setSubscribed(false);
                      await mutate();
                    })
                  }
                >
                  Desactivar
                </Button>
              </>
            ) : (
              <Button
                loading={busy}
                onClick={() =>
                  run(async () => {
                    await enablePush(config.publicKey!);
                    setSubscribed(true);
                    await mutate();
                    setMsg("¡Listo! Este dispositivo recibirá los avisos.");
                  })
                }
              >
                Activar notificaciones
              </Button>
            )}
          </div>
        </div>
      )}
      <div className="mt-3">
        <FormError message={error} />
        {msg && <p className="text-sm text-ok">{msg}</p>}
      </div>
    </Card>
  );
}

function TelegramCard({ onChanged }: { onChanged: () => void }) {
  const { data, mutate } = useSWR<TelegramStatus>("/profile/telegram", fetcher);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const createLink = () =>
    action(async () => {
      const r = await api<{ url: string }>("/profile/telegram/link", { method: "POST" });
      setLink(r.url);
      window.open(r.url, "_blank", "noopener");
    });

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Telegram</h2>
        {data && (data.linked ? <Badge tone="ok">✓ Vinculado</Badge> : <Badge>Sin vincular</Badge>)}
      </div>
      {!data ? null : !data.botEnabled ? (
        <p className="text-sm text-muted">
          El bot aún no está configurado en el servidor. El administrador debe definir{" "}
          <code className="rounded bg-surface-2 px-1">TELEGRAM_BOT_TOKEN</code>.
        </p>
      ) : data.linked ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Recibes los avisos en el chat con <b>@{data.botUsername}</b>. Escríbele /proximos o /tratamientos para
            consultar.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              loading={busy}
              onClick={() =>
                action(async () => {
                  await api("/profile/telegram/test", { method: "POST" });
                  setMsg("Mensaje de prueba enviado ✓");
                })
              }
            >
              Enviar prueba
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                action(async () => {
                  if (!confirm("¿Desvincular Telegram? Dejarás de recibir avisos.")) return;
                  await api("/profile/telegram", { method: "DELETE" });
                  await mutate();
                  onChanged();
                })
              }
            >
              Desvincular
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Pulsa el botón, se abrirá Telegram con <b>@{data.botUsername}</b>: toca <b>Iniciar</b> y listo. El enlace
            vale 15 minutos.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button loading={busy} onClick={createLink}>
              Vincular Telegram
            </Button>
            {link && (
              <Button variant="secondary" onClick={() => mutate().then(onChanged)}>
                Ya lo hice
              </Button>
            )}
          </div>
          {link && (
            <p className="break-all text-xs text-muted">
              Si no se abrió: <a className="text-primary underline" href={link} target="_blank" rel="noopener noreferrer">{link}</a>
            </p>
          )}
        </div>
      )}
      <div className="mt-3">
        <FormError message={error} />
        {msg && <p className="text-sm text-ok">{msg}</p>}
      </div>
    </Card>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    if (next !== confirmPw) {
      setError("Las contraseñas nuevas no coinciden");
      return;
    }
    setSaving(true);
    try {
      await api("/profile/password", { body: { currentPassword: current, newPassword: next } });
      setMsg("Contraseña actualizada. Las demás sesiones se cerraron.");
      setCurrent("");
      setNext("");
      setConfirmPw("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-4 font-semibold">Cambiar contraseña</h2>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Contraseña actual">
          {(id) => (
            <Input
              id={id}
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nueva contraseña">
            {(id) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
              />
            )}
          </Field>
          <Field label="Repetir nueva">
            {(id) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
              />
            )}
          </Field>
        </div>
        <FormError message={error} />
        {msg && <p className="text-sm text-ok">{msg}</p>}
        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Cambiar contraseña
          </Button>
        </div>
      </form>
    </Card>
  );
}

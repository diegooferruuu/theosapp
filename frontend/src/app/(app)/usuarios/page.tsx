"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSession } from "@/components/session";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EditIcon,
  Field,
  FormActions,
  FormError,
  IconButton,
  Input,
  LoadError,
  Loading,
  Modal,
  PageHeader,
  PlusIcon,
  Select,
  TrashIcon,
} from "@/components/ui";
import { api, fetcher } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Role, User } from "@/lib/types";

interface FormState {
  id?: number;
  name: string;
  username: string;
  password: string;
  role: Role;
  active: boolean;
  notificationsEnabled: boolean;
  telegramChatId: string;
}

export default function UsuariosPage() {
  const me = useSession();
  const [form, setForm] = useState<FormState | null>(null);
  const { data, error, mutate } = useSWR<User[]>(me.role === "SUPERADMIN" ? "/users" : null, fetcher);

  if (me.role !== "SUPERADMIN") {
    return <LoadError error={new Error("Solo el superadmin puede gestionar usuarios.")} />;
  }

  async function remove(u: User) {
    if (!confirm(`¿Eliminar al usuario ${u.name} (@${u.username})?`)) return;
    try {
      await api(`/users/${u.id}`, { method: "DELETE" });
      await mutate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Quién puede entrar a la app y recibir avisos por Telegram."
        action={
          <Button
            onClick={() =>
              setForm({
                name: "",
                username: "",
                password: "",
                role: "USER",
                active: true,
                notificationsEnabled: true,
                telegramChatId: "",
              })
            }
          >
            <PlusIcon /> Nuevo usuario
          </Button>
        }
      />
      {error && <LoadError error={error} retry={() => mutate()} />}
      {!data && !error && <Loading />}
      <div className="flex flex-col gap-3">
        {data?.map((u) => (
          <Card key={u.id} className="flex flex-wrap items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary-strong">
              {u.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{u.name}</p>
                {u.id === me.id && <Badge>Tú</Badge>}
                {u.role === "SUPERADMIN" && <Badge tone="primary">Superadmin</Badge>}
                {!u.active && <Badge tone="danger">Inactivo</Badge>}
              </div>
              <p className="text-sm text-muted">
                @{u.username} · Telegram {u.telegramChatId ? "✓ vinculado" : "sin vincular"}
                {!u.notificationsEnabled && " · avisos apagados"}
              </p>
              <p className="text-xs text-muted">
                Último acceso: {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "nunca"}
              </p>
            </div>
            <div className="flex">
              <IconButton
                label="Editar"
                onClick={() =>
                  setForm({
                    id: u.id,
                    name: u.name,
                    username: u.username,
                    password: "",
                    role: u.role,
                    active: u.active,
                    notificationsEnabled: u.notificationsEnabled,
                    telegramChatId: u.telegramChatId ?? "",
                  })
                }
              >
                <EditIcon />
              </IconButton>
              {u.id !== me.id && (
                <IconButton label="Eliminar" tone="danger" onClick={() => remove(u)}>
                  <TrashIcon />
                </IconButton>
              )}
            </div>
          </Card>
        ))}
      </div>

      <NotificationsPanel />

      {form && (
        <UserForm
          initial={form}
          isSelf={form.id === me.id}
          onClose={() => setForm(null)}
          onSaved={async () => {
            setForm(null);
            await mutate();
          }}
        />
      )}
    </>
  );
}

function UserForm({
  initial,
  isSelf,
  onClose,
  onSaved,
}: {
  initial: FormState;
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: f.name,
        username: f.username,
        role: f.role,
        telegramChatId: f.telegramChatId,
      };
      if (f.password) body.password = f.password;
      if (f.id) {
        body.active = f.active;
        body.notificationsEnabled = f.notificationsEnabled;
      }
      await api(f.id ? `/users/${f.id}` : "/users", { method: f.id ? "PATCH" : "POST", body });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setSaving(false);
    }
  }

  return (
    <Modal open title={f.id ? `Editar a ${initial.name}` : "Nuevo usuario"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nombre">
          {(id) => <Input id={id} value={f.name} onChange={(e) => set("name", e.target.value)} required />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Usuario" hint="Minúsculas, números, punto o guion">
            {(id) => (
              <Input
                id={id}
                autoCapitalize="none"
                autoCorrect="off"
                value={f.username}
                onChange={(e) => set("username", e.target.value.toLowerCase())}
                required
              />
            )}
          </Field>
          <Field label={f.id ? "Nueva contraseña" : "Contraseña"} hint={f.id ? "Déjala vacía para no cambiarla" : "Mínimo 8 caracteres"}>
            {(id) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={f.password}
                onChange={(e) => set("password", e.target.value)}
                required={!f.id}
              />
            )}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rol">
            {(id) => (
              <Select id={id} value={f.role} disabled={isSelf} onChange={(e) => set("role", e.target.value as Role)}>
                <option value="USER">Usuario</option>
                <option value="SUPERADMIN">Superadmin</option>
              </Select>
            )}
          </Field>
          <Field label="Chat ID de Telegram" hint="Opcional: el usuario puede vincularse desde su perfil">
            {(id) => (
              <Input
                id={id}
                inputMode="numeric"
                value={f.telegramChatId}
                onChange={(e) => set("telegramChatId", e.target.value)}
              />
            )}
          </Field>
        </div>
        {f.id && (
          <div className="flex flex-col gap-2">
            {!isSelf && (
              <Checkbox
                label="Usuario activo"
                hint="Si lo desactivas se cierran sus sesiones"
                checked={f.active}
                onChange={(v) => set("active", v)}
              />
            )}
            <Checkbox
              label="Recibir avisos por Telegram"
              checked={f.notificationsEnabled}
              onChange={(v) => set("notificationsEnabled", v)}
            />
          </div>
        )}
        <FormError message={error} />
        <FormActions onCancel={onClose} saving={saving} submitLabel={f.id ? "Guardar" : "Crear usuario"} />
      </form>
    </Modal>
  );
}

interface NotificationLog {
  id: number;
  key: string;
  message: string;
  recipients: number;
  sentAt: string;
}

function NotificationsPanel() {
  const { data, mutate } = useSWR<NotificationLog[]>("/notifications/logs", fetcher);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const r = await api<{ sent: number; items: unknown[] }>("/notifications/run-daily", { method: "POST" });
      setResult(
        r.items.length
          ? `Se enviaron ${r.items.length} recordatorio(s) a ${r.sent} chat(s).`
          : "No había recordatorios pendientes.",
      );
      await mutate();
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Notificaciones</h2>
          <p className="text-sm text-muted">La revisión diaria corre sola; aquí puedes forzarla.</p>
        </div>
        <Button variant="secondary" loading={running} onClick={run}>
          Revisar alertas ahora
        </Button>
      </div>
      {result && <p className="mb-3 rounded-xl bg-primary-soft px-3 py-2 text-sm text-primary-strong">{result}</p>}
      <Card className="divide-y divide-line p-0">
        {!data?.length && <p className="px-4 py-6 text-center text-sm text-muted">Aún no se envió ningún aviso.</p>}
        {data?.slice(0, 15).map((log) => (
          <details key={log.id} className="px-4 py-2.5">
            <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span className="truncate font-mono text-xs text-muted">{log.key}</span>
              <span className="shrink-0 text-xs text-muted">
                {formatDateTime(log.sentAt)} · {log.recipients} chat(s)
              </span>
            </summary>
            <p
              className="mt-2 whitespace-pre-line rounded-lg bg-surface-2 p-2 text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeTelegramHtml(log.message) }}
            />
          </details>
        ))}
      </Card>
    </section>
  );
}

/** El mensaje guardado es HTML de Telegram (b/i/code); solo dejamos esas etiquetas. */
function sanitizeTelegramHtml(html: string): string {
  return html
    .replace(/&(?!(amp|lt|gt|quot);)/g, "&amp;")
    .replace(/<(?!\/?(b|i|code)>)/g, "&lt;");
}

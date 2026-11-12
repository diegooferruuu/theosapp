import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { setTimeout as sleep } from 'node:timers/promises';
import { appUrl } from '../common/config.js';
import { escapeHtml } from '../common/labels.js';
import { DashboardService } from '../dashboard/dashboard.service.js';
import {
  activeTreatmentsMessage,
  upcomingDigest,
} from '../notifications/messages.js';
import { PrismaService } from '../prisma/prisma.service.js';

interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number; type: string };
    from?: { first_name?: string };
  };
}

const COMMANDS = [
  {
    command: 'proximos',
    description: 'Próximas vacunas, desparasitaciones y baños',
  },
  {
    command: 'tratamientos',
    description: 'Tratamientos activos y próxima toma',
  },
  { command: 'id', description: 'Mostrar el ID de este chat' },
  { command: 'ayuda', description: 'Ver comandos disponibles' },
];

@Injectable()
export class TelegramService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger('Telegram');
  private readonly token = process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
  private readonly abort = new AbortController();
  private offset = 0;
  botUsername: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
  ) {}

  get enabled(): boolean {
    return Boolean(this.token);
  }

  async onApplicationBootstrap() {
    if (!this.token) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN no configurado: los mensajes solo se escribirán en el log',
      );
      return;
    }
    try {
      const me = await this.call<{ username: string }>('getMe');
      this.botUsername = me.username;
      this.logger.log(`Bot @${me.username} conectado`);
      await this.call('setMyCommands', { commands: COMMANDS });
    } catch (e) {
      this.logger.error(
        `No se pudo conectar con Telegram: ${(e as Error).message}`,
      );
    }
    if (process.env.TELEGRAM_POLLING !== 'false') void this.pollLoop();
  }

  onModuleDestroy() {
    this.abort.abort();
  }

  private async call<T = unknown>(
    method: string,
    body?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<T> {
    const res = await fetch(
      `https://api.telegram.org/bot${this.token}/${method}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body ?? {}),
        signal,
      },
    );
    const data = (await res.json()) as {
      ok: boolean;
      result: T;
      description?: string;
    };
    if (!data.ok)
      throw new Error(`${method}: ${data.description ?? res.status}`);
    return data.result;
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!this.token) {
      this.logger.log(`[simulado → ${chatId}]\n${text}`);
      return;
    }
    await this.call('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  }

  /** Envía el mensaje a todos los usuarios activos con Telegram vinculado. */
  async broadcast(text: string): Promise<number> {
    const users = await this.prisma.user.findMany({
      where: {
        active: true,
        notificationsEnabled: true,
        telegramChatId: { not: null },
      },
      select: { telegramChatId: true },
    });
    const chats = [...new Set(users.map((u) => u.telegramChatId as string))];
    if (!chats.length) {
      this.logger.debug(`[sin chats vinculados]\n${text}`);
      return 0;
    }
    let sent = 0;
    for (const chat of chats) {
      try {
        await this.sendMessage(chat, text);
        sent++;
      } catch (e) {
        this.logger.error(`Error enviando a ${chat}: ${(e as Error).message}`);
      }
    }
    return sent;
  }

  // ───────────────────────── Bot (long polling) ─────────────────────────

  private async pollLoop() {
    await this.call('deleteWebhook').catch(() => undefined);
    while (!this.abort.signal.aborted) {
      try {
        const updates = await this.call<TelegramUpdate[]>(
          'getUpdates',
          { offset: this.offset, timeout: 30, allowed_updates: ['message'] },
          this.abort.signal,
        );
        for (const update of updates) {
          this.offset = update.update_id + 1;
          await this.handleUpdate(update).catch((e: Error) =>
            this.logger.error(`Error procesando mensaje: ${e.message}`),
          );
        }
      } catch (e) {
        if (this.abort.signal.aborted) break;
        this.logger.warn(`Polling: ${(e as Error).message}`);
        await sleep(5_000, undefined, { signal: this.abort.signal }).catch(
          () => undefined,
        );
      }
    }
  }

  private async handleUpdate(update: TelegramUpdate) {
    const msg = update.message;
    if (!msg?.text) return;
    const chatId = String(msg.chat.id);
    const [rawCommand, ...args] = msg.text.trim().split(/\s+/);
    const command = rawCommand.split('@')[0].toLowerCase();

    if (command === '/start' && args[0])
      return this.linkAccount(chatId, args[0]);
    if (command === '/id') {
      return this.sendMessage(
        chatId,
        `🆔 El ID de este chat es <code>${chatId}</code>`,
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { telegramChatId: chatId, active: true },
      select: { name: true },
    });
    if (!user) {
      return this.sendMessage(
        chatId,
        [
          '🐾 <b>Theo’s App</b>',
          'Este chat aún no está vinculado a ninguna cuenta.',
          `Entra a ${escapeHtml(appUrl())} → <b>Mi perfil</b> → <b>Vincular Telegram</b>.`,
          `ID de este chat: <code>${chatId}</code>`,
        ].join('\n'),
      );
    }

    switch (command) {
      case '/proximos': {
        const items = await this.dashboard.upcoming(14);
        return this.sendMessage(
          chatId,
          items.length
            ? upcomingDigest(items).html
            : '✅ No hay vencimientos en los próximos 14 días.',
        );
      }
      case '/tratamientos':
        return this.sendMessage(
          chatId,
          activeTreatmentsMessage(await this.dashboard.activeTreatments()),
        );
      default:
        return this.sendMessage(
          chatId,
          [
            `🐾 ¡Hola ${escapeHtml(user.name)}!`,
            'Comandos disponibles:',
            ...COMMANDS.map((c) => `/${c.command} — ${c.description}`),
          ].join('\n'),
        );
    }
  }

  private async linkAccount(chatId: string, code: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        telegramLinkCode: code,
        telegramLinkExpiresAt: { gt: new Date() },
        active: true,
      },
    });
    if (!user) {
      return this.sendMessage(
        chatId,
        '⚠️ El enlace de vinculación no es válido o expiró. Genera uno nuevo desde tu perfil.',
      );
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        telegramChatId: chatId,
        telegramLinkCode: null,
        telegramLinkExpiresAt: null,
      },
    });
    this.logger.log(`Usuario ${user.username} vinculado a Telegram`);
    return this.sendMessage(
      chatId,
      `✅ ¡Listo ${escapeHtml(user.name)}! Recibirás aquí los recordatorios de Theo’s App.\nEscribe /ayuda para ver los comandos.`,
    );
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  generateVAPIDKeys,
  sendNotification,
  setVapidDetails,
  WebPushError,
} from 'web-push';
import type { Prisma } from '../generated/prisma/client.js';
import { appUrl } from '../common/config.js';
import type { AppNotification } from '../notifications/app-notification.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PushSubscribeDto } from './push.dto.js';

const VAPID_SETTING = 'vapid_keys';

/** Notificaciones Web Push para la PWA (Android, iPhone con la app instalada, escritorio). */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger('Push');
  publicKey: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  get enabled(): boolean {
    return this.publicKey !== null;
  }

  async onModuleInit() {
    try {
      const keys = await this.loadKeys();
      const subject =
        process.env.VAPID_SUBJECT ||
        (appUrl().startsWith('https://') ? appUrl() : 'mailto:avisos@theosapp.app');
      setVapidDetails(subject, keys.publicKey, keys.privateKey);
      this.publicKey = keys.publicKey;
    } catch (e) {
      this.logger.error(`Push desactivado: ${(e as Error).message}`);
    }
  }

  /** Claves VAPID: del entorno, o generadas una vez y guardadas en la base. */
  private async loadKeys(): Promise<{ publicKey: string; privateKey: string }> {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      return { publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY };
    }
    const stored = await this.prisma.appSetting.findUnique({
      where: { key: VAPID_SETTING },
    });
    if (stored) return JSON.parse(stored.value);
    const keys = generateVAPIDKeys();
    await this.prisma.appSetting.create({
      data: { key: VAPID_SETTING, value: JSON.stringify(keys) },
    });
    this.logger.log('Claves VAPID generadas');
    return keys;
  }

  async subscribe(userId: number, dto: PushSubscribeDto, userAgent?: string) {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      update: {
        userId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: userAgent?.slice(0, 300),
      },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: userAgent?.slice(0, 300),
      },
    });
    return { ok: true };
  }

  async unsubscribe(userId: number, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return { ok: true };
  }

  countForUser(userId: number) {
    return this.prisma.pushSubscription.count({ where: { userId } });
  }

  /** Envía a todos los dispositivos de los usuarios que aceptan avisos. */
  broadcast(n: AppNotification): Promise<number> {
    return this.sendWhere(
      { user: { active: true, notificationsEnabled: true } },
      n,
    );
  }

  sendToUser(userId: number, n: AppNotification): Promise<number> {
    return this.sendWhere({ userId }, n);
  }

  private async sendWhere(
    where: Prisma.PushSubscriptionWhereInput,
    n: AppNotification,
  ): Promise<number> {
    if (!this.enabled) return 0;
    const subs = await this.prisma.pushSubscription.findMany({ where });
    if (!subs.length) return 0;

    const payload = JSON.stringify({
      title: n.title,
      body: n.body,
      url: n.url,
      tag: n.tag,
    });
    const results = await Promise.allSettled(
      subs.map((s) =>
        sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: n.ttl ?? 12 * 3600, urgency: n.urgency ?? 'normal', timeout: 15_000 },
        ),
      ),
    );

    let delivered = 0;
    const expired: number[] = [];
    const ok: number[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        delivered++;
        ok.push(subs[i].id);
        return;
      }
      const err = r.reason as WebPushError;
      // 404/410: el dispositivo canceló la suscripción o desinstaló la app.
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        expired.push(subs[i].id);
      } else {
        this.logger.warn(
          `No se pudo enviar a la suscripción ${subs[i].id}: ${err?.statusCode ?? ''} ${err?.body || err?.message}`,
        );
      }
    });
    if (expired.length) {
      await this.prisma.pushSubscription.deleteMany({ where: { id: { in: expired } } });
      this.logger.log(`${expired.length} suscripción(es) vencida(s) eliminada(s)`);
    }
    if (ok.length) {
      await this.prisma.pushSubscription.updateMany({
        where: { id: { in: ok } },
        data: { lastUsedAt: new Date() },
      });
    }
    return delivered;
  }
}

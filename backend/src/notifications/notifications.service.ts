import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { appTimezone } from '../common/config.js';
import { hourIn } from '../common/dates.js';
import { DashboardService } from '../dashboard/dashboard.service.js';
import type { UpcomingItem } from '../dashboard/dashboard.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TelegramService } from '../telegram/telegram.service.js';
import { dueDoseIndex, doseTimes } from '../treatments/schedule.js';
import { TreatmentsService } from '../treatments/treatments.service.js';
import { groomingBucket, healthBucket } from './alerts.js';
import {
  doseMessage,
  treatmentFinishedMessage,
  upcomingDigest,
} from './messages.js';

@Injectable()
export class NotificationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Notificaciones');
  private dailyRunning = false;
  private dosesRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
    private readonly dashboard: DashboardService,
    private readonly treatments: TreatmentsService,
  ) {}

  private get alertHour(): number {
    return Number(process.env.DAILY_ALERT_HOUR ?? 9);
  }

  onApplicationBootstrap() {
    // Recupera avisos pendientes si el servidor estuvo apagado a la hora del cron.
    setTimeout(() => void this.dailyTick(), 15_000).unref();
  }

  /** Revisa cada 15 min; los avisos diarios salen en la primera pasada desde DAILY_ALERT_HOUR. */
  @Cron('0 */15 * * * *', { name: 'daily-alerts' })
  async dailyTick() {
    if (hourIn(appTimezone()) < this.alertHour) return;
    await this.runDailyAlerts();
  }

  /** Vacunas, desparasitaciones e higiene. Devuelve los elementos notificados. */
  async runDailyAlerts(): Promise<{ sent: number; items: UpcomingItem[] }> {
    if (this.dailyRunning) return { sent: 0, items: [] };
    this.dailyRunning = true;
    try {
      const upcoming = await this.dashboard.upcoming(7);
      const candidates = upcoming
        .map((item) => {
          const bucket =
            item.kind === 'HEALTH'
              ? healthBucket(item.daysUntil)
              : groomingBucket(item.daysUntil);
          return bucket
            ? {
                item,
                key: `${item.kind.toLowerCase()}:${item.id}:${item.dueDate}:${bucket}`,
              }
            : null;
        })
        .filter((c): c is { item: UpcomingItem; key: string } => c !== null);

      if (!candidates.length) return { sent: 0, items: [] };

      const already = await this.prisma.notificationLog.findMany({
        where: { key: { in: candidates.map((c) => c.key) } },
        select: { key: true },
      });
      const sentKeys = new Set(already.map((a) => a.key));
      const pending = candidates.filter((c) => !sentKeys.has(c.key));
      if (!pending.length) return { sent: 0, items: [] };

      const items = pending.map((p) => p.item);
      const message = upcomingDigest(items);
      const recipients = await this.telegram.broadcast(message);
      await this.markSent(
        pending.map((p) => p.key),
        message,
        recipients,
      );
      this.logger.log(
        `Recordatorio diario: ${items.length} elemento(s), ${recipients} destinatario(s)`,
      );
      return { sent: recipients, items };
    } finally {
      this.dailyRunning = false;
    }
  }

  /** Tomas de medicamentos: revisa cada minuto. */
  @Cron(CronExpression.EVERY_MINUTE, { name: 'medication-doses' })
  async dosesTick() {
    if (this.dosesRunning) return;
    this.dosesRunning = true;
    try {
      const now = new Date();
      const finished = await this.treatments.finishExpired(now);
      for (const t of finished) {
        const pet = await this.prisma.pet.findUnique({
          where: { id: t.petId },
        });
        const key = `treatment-finished:${t.id}`;
        if (!pet || (await this.wasSent(key))) continue;
        const message = treatmentFinishedMessage({ ...t, pet });
        await this.markSent(
          [key],
          message,
          await this.telegram.broadcast(message),
        );
      }

      const active = await this.prisma.medicationTreatment.findMany({
        where: { status: 'ACTIVE', notifyDoses: true },
        include: { pet: { select: { name: true } } },
      });
      for (const t of active) {
        const index = dueDoseIndex(t, now, 30);
        if (index === null) continue;
        const key = `dose:${t.id}:${t.startAt.getTime()}:${t.frequencyHours}:${index}`;
        if (await this.wasSent(key)) continue;
        const doses = doseTimes(t);
        const message = doseMessage({
          ...t,
          doseNumber: index + 1,
          totalDoses: doses.length,
          at: doses[index],
        });
        await this.markSent(
          [key],
          message,
          await this.telegram.broadcast(message),
        );
      }
    } catch (e) {
      this.logger.error(`Error revisando tomas: ${(e as Error).message}`);
    } finally {
      this.dosesRunning = false;
    }
  }

  private async wasSent(key: string) {
    return (await this.prisma.notificationLog.count({ where: { key } })) > 0;
  }

  /**
   * Registra los avisos como enviados. Si el bot está configurado pero nadie
   * recibió el mensaje (sin usuarios vinculados o error de red) no se marca,
   * para reintentarlo en la siguiente pasada.
   */
  private async markSent(keys: string[], message: string, recipients: number) {
    if (this.telegram.enabled && recipients === 0) return;
    await this.prisma.notificationLog.createMany({
      data: keys.map((key) => ({ key, message, recipients })),
      skipDuplicates: true,
    });
  }

  recentLogs() {
    return this.prisma.notificationLog.findMany({
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
  }
}

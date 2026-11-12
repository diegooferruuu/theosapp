import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { appTimezone } from '../common/config.js';
import { hourIn } from '../common/dates.js';
import { DashboardService } from '../dashboard/dashboard.service.js';
import type { UpcomingItem } from '../dashboard/dashboard.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  doseAt,
  doseNumberAtOrBefore,
  dueDoseNumber,
  totalDoses,
} from '../treatments/schedule.js';
import { TreatmentsService } from '../treatments/treatments.service.js';
import { appointmentBucket } from '../appointments/reminders.js';
import { groomingBucket, healthBucket } from './alerts.js';
import { NotifierService } from '../notifier/notifier.service.js';
import {
  appointmentReminderMessage,
  doseMessage,
  pendingDoseMessage,
  treatmentFinishedMessage,
  upcomingDigest,
} from './messages.js';

/** Minutos tras la hora de una toma para avisar que nadie la marcó. */
const PENDING_AFTER_MIN = 45;
const NOT_MEDICINE = ['CLEANING', 'MEDICATED_BATH'];

@Injectable()
export class NotificationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Notificaciones');
  private dailyRunning = false;
  private dosesRunning = false;
  private appointmentsRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: NotifierService,
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
      const recipients = await this.notifier.broadcast(message);
      await this.markSent(
        pending.map((p) => p.key),
        message.body,
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
          message.body,
          await this.notifier.broadcast(message),
        );
      }

      const active = await this.prisma.medicationTreatment.findMany({
        where: {
          status: 'ACTIVE',
          notifyDoses: true,
          scheduleType: { not: 'AS_NEEDED' },
        },
        include: { pet: { select: { name: true } } },
      });
      for (const t of active) {
        const number = dueDoseNumber(t, now, 30);
        if (number === null) continue;
        const signature = `${t.scheduleType}:${t.startAt.getTime()}:${t.frequencyHours ?? ''}:${t.times.join(',')}:${t.everyDays}`;
        const key = `dose:${t.id}:${signature}:${number}`;
        if (await this.wasSent(key)) continue;
        const alreadyGiven = await this.prisma.medicationDose.count({
          where: { treatmentId: t.id, doseNumber: number },
        });
        if (alreadyGiven) continue; // alguien ya la dio (p. ej. un poco antes)
        const at = doseAt(t, number);
        if (!at) continue;
        const message = doseMessage({
          ...t,
          doseNumber: number,
          totalDoses: totalDoses(t),
          at,
        });
        await this.markSent(
          [key],
          message.body,
          await this.notifier.broadcast(message),
        );
      }

      // Toma pendiente: nadie la marcó PENDING_AFTER_MIN minutos después (solo medicamentos).
      for (const t of active) {
        if (NOT_MEDICINE.includes(t.type)) continue;
        const pendingFrom = new Date(
          now.getTime() - PENDING_AFTER_MIN * 60_000,
        );
        const number = doseNumberAtOrBefore(t, pendingFrom);
        const at = doseAt(t, number);
        if (!at) continue;
        const late = now.getTime() - at.getTime();
        if (late > (PENDING_AFTER_MIN + 30) * 60_000) continue; // ventana de 30 min
        const next = doseAt(t, number + 1);
        if (next && next <= now) continue; // ya toca la siguiente
        const signature = `${t.scheduleType}:${t.startAt.getTime()}:${t.frequencyHours ?? ''}:${t.times.join(',')}:${t.everyDays}`;
        const key = `pending:${t.id}:${signature}:${number}`;
        if (await this.wasSent(key)) continue;
        const given = await this.prisma.medicationDose.count({
          where: { treatmentId: t.id, doseNumber: number },
        });
        if (given) continue;
        const message = pendingDoseMessage({
          ...t,
          doseNumber: number,
          totalDoses: totalDoses(t),
          at,
        });
        await this.markSent(
          [key],
          message.body,
          await this.notifier.broadcast(message),
        );
      }
    } catch (e) {
      this.logger.error(`Error revisando tomas: ${(e as Error).message}`);
    } finally {
      this.dosesRunning = false;
    }
  }

  /** Citas con el veterinario: el día anterior, 2 h antes y después (registrar resultado). */
  @Cron('0 */5 * * * *', { name: 'vet-appointments' })
  async appointmentsTick() {
    if (this.appointmentsRunning) return;
    this.appointmentsRunning = true;
    try {
      const now = new Date();
      const appointments = await this.prisma.vetAppointment.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: {
            gte: new Date(now.getTime() - 48 * 3_600_000),
            lte: new Date(now.getTime() + 24 * 3_600_000),
          },
        },
        include: { pet: { select: { name: true } } },
      });
      for (const a of appointments) {
        const bucket = appointmentBucket(a.scheduledAt, now);
        if (!bucket) continue;
        const key = `appt:${a.id}:${a.scheduledAt.getTime()}:${bucket}`;
        if (await this.wasSent(key)) continue;
        let symptomCount = 0;
        if (bucket !== 'after') {
          const lastVisit = await this.prisma.vetVisit.findFirst({
            where: { petId: a.petId, date: { lte: a.scheduledAt } },
            orderBy: { date: 'desc' },
            select: { date: true },
          });
          symptomCount = await this.prisma.symptomLog.count({
            where: {
              petId: a.petId,
              ...(lastVisit && { occurredAt: { gt: lastVisit.date } }),
            },
          });
        }
        const message = appointmentReminderMessage(a, bucket, symptomCount);
        await this.markSent(
          [key],
          message.body,
          await this.notifier.broadcast(message),
        );
      }
    } catch (e) {
      this.logger.error(`Error revisando citas: ${(e as Error).message}`);
    } finally {
      this.appointmentsRunning = false;
    }
  }

  private async wasSent(key: string) {
    return (await this.prisma.notificationLog.count({ where: { key } })) > 0;
  }

  /**
   * Registra los avisos como enviados. Si hay algún canal configurado pero
   * nadie recibió el mensaje (sin usuarios vinculados o error de red) no se
   * marca, para reintentarlo en la siguiente pasada.
   */
  private async markSent(keys: string[], message: string, recipients: number) {
    if (this.notifier.anyChannel && recipients === 0) return;
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

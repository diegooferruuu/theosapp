import { Injectable } from '@nestjs/common';
import { appTimezone } from '../common/config.js';
import { toDateOnly, todayIn } from '../common/dates.js';
import { computeDue, supersededIds } from '../common/due-status.js';
import type { DueStatus } from '../common/due-status.js';
import { GROOMING_TYPE_LABEL, HEALTH_TYPE_LABEL } from '../common/labels.js';
import { groomingGroupKey } from '../grooming/grooming.service.js';
import { healthGroupKey } from '../health-records/health-records.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TreatmentsService } from '../treatments/treatments.service.js';

export interface UpcomingItem {
  kind: 'HEALTH' | 'GROOMING';
  id: number;
  type: string;
  petId: number;
  petName: string;
  title: string;
  subtitle: string;
  dueDate: string;
  daysUntil: number;
  status: DueStatus;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly treatments: TreatmentsService,
  ) {}

  /** Próximos vencimientos (incluye vencidos) dentro de `days` días. */
  async upcoming(days = 30): Promise<UpcomingItem[]> {
    const today = todayIn(appTimezone());
    const [health, grooming] = await Promise.all([
      this.prisma.healthRecord.findMany({
        include: { pet: { select: { name: true } } },
      }),
      this.prisma.groomingLog.findMany({
        include: { pet: { select: { name: true } } },
      }),
    ]);

    const items: UpcomingItem[] = [];
    const healthDone = supersededIds(
      health,
      healthGroupKey,
      (r) => r.dateGiven,
    );
    for (const r of health) {
      if (!r.nextDueDate || healthDone.has(r.id)) continue;
      const due = computeDue(r.nextDueDate, today, false, 7);
      if (due.daysUntil === null || due.daysUntil > days) continue;
      items.push({
        kind: 'HEALTH',
        id: r.id,
        type: r.type,
        petId: r.petId,
        petName: r.pet.name,
        title: r.name,
        subtitle: HEALTH_TYPE_LABEL[r.type],
        dueDate: toDateOnly(r.nextDueDate),
        daysUntil: due.daysUntil,
        status: due.status,
      });
    }

    const groomingDone = supersededIds(
      grooming,
      groomingGroupKey,
      (g) => g.dateDone,
    );
    for (const g of grooming) {
      if (!g.nextDueDate || groomingDone.has(g.id)) continue;
      const due = computeDue(g.nextDueDate, today, false, 3);
      if (due.daysUntil === null || due.daysUntil > days) continue;
      items.push({
        kind: 'GROOMING',
        id: g.id,
        type: g.serviceType,
        petId: g.petId,
        petName: g.pet.name,
        title: GROOMING_TYPE_LABEL[g.serviceType],
        subtitle: 'Higiene',
        dueDate: toDateOnly(g.nextDueDate),
        daysUntil: due.daysUntil,
        status: due.status,
      });
    }

    return items.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  async activeTreatments() {
    const treatments = await this.treatments.list({ status: 'ACTIVE' });
    return treatments.sort(
      (a, b) =>
        (a.progress.nextDoseAt?.getTime() ?? Infinity) -
        (b.progress.nextDoseAt?.getTime() ?? Infinity),
    );
  }

  async summary() {
    const [pets, upcoming, activeTreatments, lastVisits] = await Promise.all([
      this.prisma.pet.findMany({ orderBy: { id: 'asc' } }),
      this.upcoming(30),
      this.activeTreatments(),
      this.prisma.vetVisit.findMany({
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        take: 5,
        include: { pet: { select: { id: true, name: true } } },
      }),
    ]);
    return {
      today: todayIn(appTimezone()),
      timezone: appTimezone(),
      pets,
      upcoming,
      activeTreatments,
      lastVisits,
    };
  }
}

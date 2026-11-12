import type { PrismaService } from '../prisma/prisma.service.js';

/** Recalcula el peso actual de la mascota a partir del registro más reciente. */
export async function refreshPetWeight(prisma: PrismaService, petId: number) {
  const latest = await prisma.weightRecord.findFirst({
    where: { petId },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
  });
  await prisma.pet.update({
    where: { id: petId },
    data: { currentWeightKg: latest?.weightKg ?? null },
  });
}

import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { normalizeClientPhone, penaltyEndsAt } from "./penalty-rules";

export { normalizeClientPhone, penaltyEndsAt } from "./penalty-rules";

type DbClient = Prisma.TransactionClient;

const penaltyInclude = {
  appointment: {
    select: {
      code: true,
      date: true,
      startMinute: true,
      clientName: true,
    },
  },
} as const;

export async function getActivePenalty(
  clientPhone: string,
  now = new Date(),
  db: DbClient = prisma,
) {
  return db.clientPenalty.findFirst({
    where: {
      clientPhone: normalizeClientPhone(clientPhone),
      liftedAt: null,
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
    orderBy: { endsAt: "desc" },
  });
}

export async function applyNoShowPenalty(
  db: Prisma.TransactionClient,
  appointment: { id: string; clientPhone: string },
  penaltyDays: number,
  now = new Date(),
) {
  if (penaltyDays <= 0) return null;

  const clientPhone = normalizeClientPhone(appointment.clientPhone);
  const endsAt = penaltyEndsAt(now, penaltyDays);

  return db.clientPenalty.upsert({
    where: { appointmentId: appointment.id },
    create: {
      clientPhone,
      appointmentId: appointment.id,
      reason: "NO_SHOW",
      startsAt: now,
      endsAt,
    },
    update: {
      clientPhone,
      reason: "NO_SHOW",
      startsAt: now,
      endsAt,
      liftedAt: null,
    },
  });
}

export async function getActivePenalties(now = new Date()) {
  return prisma.clientPenalty.findMany({
    where: {
      liftedAt: null,
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
    orderBy: { endsAt: "asc" },
    include: penaltyInclude,
  });
}

export async function getRecentPenalties(now = new Date(), take = 20) {
  return prisma.clientPenalty.findMany({
    where: {
      OR: [{ liftedAt: { not: null } }, { endsAt: { lte: now } }],
    },
    orderBy: { updatedAt: "desc" },
    take,
    include: penaltyInclude,
  });
}

export async function liftPenalty(id: string, now = new Date()) {
  return prisma.clientPenalty.updateMany({
    where: { id, liftedAt: null },
    data: { liftedAt: now },
  });
}

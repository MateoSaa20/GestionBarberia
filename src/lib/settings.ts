import "server-only";

import { prisma } from "./db";

export async function getSettings() {
  const existing = await prisma.settings.findUnique({ where: { id: 1 } });
  if (existing) return existing;

  return prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

export type Settings = Awaited<ReturnType<typeof getSettings>>;

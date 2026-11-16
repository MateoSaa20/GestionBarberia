import "server-only";

import { prisma } from "./db";

const serviceOrder = [
  { sortOrder: "asc" as const },
  { name: "asc" as const },
];

export async function getActiveServices() {
  return prisma.service.findMany({
    where: { active: true },
    orderBy: serviceOrder,
  });
}

export async function getAllServices() {
  return prisma.service.findMany({
    orderBy: [{ active: "desc" as const }, ...serviceOrder],
  });
}

export async function getServiceById(id: string) {
  return prisma.service.findUnique({ where: { id } });
}

export async function getFirstActiveService() {
  return prisma.service.findFirst({
    where: { active: true },
    orderBy: serviceOrder,
  });
}

export async function resolveBookingServices(serviceIds?: string[]) {
  if (serviceIds && serviceIds.length > 0) {
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, active: true },
    });

    const byId = new Map(services.map((service) => [service.id, service]));
    return serviceIds
      .map((id) => byId.get(id))
      .filter((service): service is (typeof services)[number] =>
        Boolean(service),
      );
  }

  const first = await getFirstActiveService();
  return first ? [first] : [];
}

export function summarizeServiceNames(
  services: Array<{ serviceName: string }>,
): string {
  return services.map((service) => service.serviceName).join(" + ");
}

export function combineServices(
  services: Array<{ priceCents: number; durationMin: number }>,
) {
  return services.reduce(
    (acc, service) => ({
      totalPriceCents: acc.totalPriceCents + service.priceCents,
      totalDurationMin: acc.totalDurationMin + service.durationMin,
    }),
    { totalPriceCents: 0, totalDurationMin: 0 },
  );
}

export type Service = Awaited<ReturnType<typeof getActiveServices>>[number];

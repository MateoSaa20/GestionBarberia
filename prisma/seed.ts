import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@barberia.local")
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "admin1234";
  const passwordHash = await hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash },
  });

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      businessName: "Barbería",
      serviceName: "Corte de cabello",
      servicePriceCents: 1200000,
      serviceDurationMin: 30,
      bufferMin: 10,
      minLeadTimeMin: 60,
      bookingWindowDays: 60,
      penaltyDays: 30,
      cancellationPolicy:
        "Si no podés asistir, avisanos con al menos 24 horas de anticipación.",
    },
  });

  const scheduleCount = await prisma.weeklySchedule.count();
  if (scheduleCount === 0) {
    await prisma.weeklySchedule.createMany({
      data: [
        ...[1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
          { dayOfWeek, startMinute: 9 * 60, endMinute: 13 * 60 },
          { dayOfWeek, startMinute: 15 * 60, endMinute: 19 * 60 },
        ]),
        { dayOfWeek: 6, startMinute: 9 * 60, endMinute: 13 * 60 },
      ],
    });
  }

  console.info(`Admin listo: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

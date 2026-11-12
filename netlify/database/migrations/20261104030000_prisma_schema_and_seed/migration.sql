-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OverrideType" AS ENUM ('CLOSED', 'CUSTOM_HOURS');

-- CreateEnum
CREATE TYPE "PenaltyReason" AS ENUM ('NO_SHOW');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('CONFIRMED', 'CANCELLED_CLIENT', 'CANCELLED_ADMIN', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('ONLINE', 'MANUAL');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "businessName" TEXT NOT NULL DEFAULT 'Barbería',
    "serviceName" TEXT NOT NULL DEFAULT 'Corte de cabello',
    "servicePriceCents" INTEGER NOT NULL DEFAULT 1200000,
    "serviceDurationMin" INTEGER NOT NULL DEFAULT 30,
    "bufferMin" INTEGER NOT NULL DEFAULT 10,
    "minLeadTimeMin" INTEGER NOT NULL DEFAULT 60,
    "bookingWindowDays" INTEGER NOT NULL DEFAULT 60,
    "penaltyDays" INTEGER NOT NULL DEFAULT 30,
    "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    "cancellationPolicy" TEXT NOT NULL DEFAULT 'Si no podés asistir, avisanos con al menos 24 horas de anticipación.',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklySchedule" (
    "id" SERIAL NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WeeklySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayOverride" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "type" "OverrideType" NOT NULL,
    "startMinute" INTEGER,
    "endMinute" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DayOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeBlock" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "source" "AppointmentSource" NOT NULL DEFAULT 'ONLINE',
    "priceCents" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPenalty" (
    "id" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "appointmentId" TEXT,
    "reason" "PenaltyReason" NOT NULL DEFAULT 'NO_SHOW',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "liftedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPenalty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "WeeklySchedule_dayOfWeek_idx" ON "WeeklySchedule"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "DayOverride_date_key" ON "DayOverride"("date");

-- CreateIndex
CREATE INDEX "TimeBlock_date_idx" ON "TimeBlock"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_code_key" ON "Appointment"("code");

-- CreateIndex
CREATE INDEX "Appointment_date_status_idx" ON "Appointment"("date", "status");

-- CreateIndex
CREATE INDEX "Appointment_clientEmail_idx" ON "Appointment"("clientEmail");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPenalty_appointmentId_key" ON "ClientPenalty"("appointmentId");

-- CreateIndex
CREATE INDEX "ClientPenalty_clientEmail_endsAt_idx" ON "ClientPenalty"("clientEmail", "endsAt");

-- CreateIndex
CREATE INDEX "ClientPenalty_endsAt_idx" ON "ClientPenalty"("endsAt");

-- AddForeignKey
ALTER TABLE "ClientPenalty" ADD CONSTRAINT "ClientPenalty_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: admin user
INSERT INTO "AdminUser" ("id", "email", "passwordHash", "createdAt")
VALUES ('seed_admin', 'admin@barberia.local', '$2b$12$Oup2y2fzStktgXBYyYFVUOv3KiHgynb.5CekZMZwqL825HiIkiXbS', CURRENT_TIMESTAMP)
ON CONFLICT ("email") DO NOTHING;

-- Seed: settings
INSERT INTO "Settings" (
  "id", "businessName", "serviceName", "servicePriceCents", "serviceDurationMin",
  "bufferMin", "minLeadTimeMin", "bookingWindowDays", "penaltyDays", "timezone",
  "cancellationPolicy", "updatedAt"
) VALUES (
  1, 'Barbería', 'Corte de cabello', 1200000, 30,
  10, 60, 60, 30, 'America/Argentina/Buenos_Aires',
  'Si no podés asistir, avisanos con al menos 24 horas de anticipación.', CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- Seed: weekly schedule (only if empty)
INSERT INTO "WeeklySchedule" ("dayOfWeek", "startMinute", "endMinute", "enabled")
SELECT v."dayOfWeek", v."startMinute", v."endMinute", true
FROM (VALUES
  (1, 540, 780), (1, 900, 1140),
  (2, 540, 780), (2, 900, 1140),
  (3, 540, 780), (3, 900, 1140),
  (4, 540, 780), (4, 900, 1140),
  (5, 540, 780), (5, 900, 1140),
  (6, 540, 780)
) AS v("dayOfWeek", "startMinute", "endMinute")
WHERE NOT EXISTS (SELECT 1 FROM "WeeklySchedule");

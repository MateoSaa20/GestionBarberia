-- CreateTable
CREATE TABLE "AppointmentService" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceName" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AppointmentService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppointmentService_appointmentId_idx" ON "AppointmentService"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentService_serviceId_idx" ON "AppointmentService"("serviceId");

-- AddForeignKey
ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: cada turno existente pasa a tener una fila con su servicio
INSERT INTO "AppointmentService" ("id", "appointmentId", "serviceId", "serviceName", "priceCents", "durationMin", "sortOrder")
SELECT gen_random_uuid()::text, a."id", a."serviceId", a."serviceName", a."priceCents", GREATEST(a."endMinute" - a."startMinute", 0), 0
FROM "Appointment" a
WHERE a."serviceName" <> '';

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_serviceId_fkey";

-- DropIndex
DROP INDEX "Appointment_serviceId_idx";

-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "serviceId",
DROP COLUMN "serviceName";

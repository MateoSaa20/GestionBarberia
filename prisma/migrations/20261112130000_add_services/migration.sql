-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Service_active_idx" ON "Service"("active");

-- Seed: el servicio único actual pasa a ser el primer registro de Service
INSERT INTO "Service" ("id", "name", "priceCents", "durationMin", "active", "sortOrder", "createdAt", "updatedAt")
SELECT 'seed_service', "serviceName", "servicePriceCents", "serviceDurationMin", true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Settings"
WHERE "id" = 1
ON CONFLICT ("id") DO NOTHING;

-- AlterTable: snapshot de servicio en los turnos
ALTER TABLE "Appointment" ADD COLUMN "serviceId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "serviceName" TEXT NOT NULL DEFAULT '';

-- Backfill: los turnos existentes quedan asociados al servicio migrado
UPDATE "Appointment"
SET "serviceId" = s."id",
    "serviceName" = s."name"
FROM "Service" s
WHERE s."id" = 'seed_service';

ALTER TABLE "Appointment" ALTER COLUMN "serviceName" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Appointment_serviceId_idx" ON "Appointment"("serviceId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: los datos del servicio dejan de vivir en Settings
ALTER TABLE "Settings" DROP COLUMN "serviceDurationMin",
DROP COLUMN "serviceName",
DROP COLUMN "servicePriceCents";

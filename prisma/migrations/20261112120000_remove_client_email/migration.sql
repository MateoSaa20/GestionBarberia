-- DropIndex
DROP INDEX "Appointment_clientEmail_idx";

-- DropIndex
DROP INDEX "ClientPenalty_clientEmail_endsAt_idx";

-- AlterTable: los turnos dejan de guardar el email del cliente
ALTER TABLE "Appointment" DROP COLUMN "clientEmail";

-- AlterTable: las penalizaciones pasan a identificarse por teléfono
ALTER TABLE "ClientPenalty" ADD COLUMN "clientPhone" TEXT NOT NULL DEFAULT '';

-- Backfill: recuperar el teléfono desde el turno asociado
UPDATE "ClientPenalty" AS p
SET "clientPhone" = COALESCE(a."clientPhone", '')
FROM "Appointment" AS a
WHERE p."appointmentId" = a."id";

ALTER TABLE "ClientPenalty" ALTER COLUMN "clientPhone" DROP DEFAULT;
ALTER TABLE "ClientPenalty" DROP COLUMN "clientEmail";

-- CreateIndex
CREATE INDEX "Appointment_clientPhone_idx" ON "Appointment"("clientPhone");

-- CreateIndex
CREATE INDEX "ClientPenalty_clientPhone_endsAt_idx" ON "ClientPenalty"("clientPhone", "endsAt");

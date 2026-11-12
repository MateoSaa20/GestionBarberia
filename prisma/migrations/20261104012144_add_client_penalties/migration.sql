-- CreateEnum
CREATE TYPE "PenaltyReason" AS ENUM ('NO_SHOW');

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "penaltyDays" INTEGER NOT NULL DEFAULT 30;

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
CREATE UNIQUE INDEX "ClientPenalty_appointmentId_key" ON "ClientPenalty"("appointmentId");

-- CreateIndex
CREATE INDEX "ClientPenalty_clientEmail_endsAt_idx" ON "ClientPenalty"("clientEmail", "endsAt");

-- CreateIndex
CREATE INDEX "ClientPenalty_endsAt_idx" ON "ClientPenalty"("endsAt");

-- AddForeignKey
ALTER TABLE "ClientPenalty" ADD CONSTRAINT "ClientPenalty_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data cleanup before removing payment-related enum values and columns
DELETE FROM "Payment";

UPDATE "Appointment"
SET "status" = 'CANCELLED_ADMIN'
WHERE "status" IN ('PENDING_PAYMENT', 'EXPIRED');

UPDATE "Settings"
SET "cancellationPolicy" = 'Si no podés asistir, avisanos con al menos 24 horas de anticipación.'
WHERE "cancellationPolicy" = 'La seña no es reembolsable. Si necesitás reprogramar, escribinos con al menos 24 horas de anticipación.';

-- Drop Payment table
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_appointmentId_fkey";
DROP INDEX IF EXISTS "Payment_appointmentId_key";
DROP INDEX IF EXISTS "Payment_preferenceId_key";
DROP INDEX IF EXISTS "Payment_paymentId_key";
DROP TABLE "Payment";

-- Drop deposit and hold columns
ALTER TABLE "Appointment" DROP COLUMN "depositCents", DROP COLUMN "holdExpiresAt";
ALTER TABLE "Settings" DROP COLUMN "depositPercent";

-- Remove payment-related appointment statuses
ALTER TYPE "AppointmentStatus" RENAME TO "AppointmentStatus_old";
CREATE TYPE "AppointmentStatus" AS ENUM ('CONFIRMED', 'CANCELLED_CLIENT', 'CANCELLED_ADMIN', 'COMPLETED', 'NO_SHOW');
ALTER TABLE "Appointment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Appointment" ALTER COLUMN "status" TYPE "AppointmentStatus" USING ("status"::text::"AppointmentStatus");
ALTER TABLE "Appointment" ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';
DROP TYPE "AppointmentStatus_old";

-- Update settings default
ALTER TABLE "Settings" ALTER COLUMN "cancellationPolicy" SET DEFAULT 'Si no podés asistir, avisanos con al menos 24 horas de anticipación.';

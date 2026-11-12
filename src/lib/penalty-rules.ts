import { formatDateTime } from "./time";

export function normalizeClientPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function penaltyEndsAt(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isPenaltyActive(
  penalty: {
    startsAt: Date;
    endsAt: Date;
    liftedAt: Date | null;
  },
  now = new Date(),
): boolean {
  return (
    penalty.liftedAt === null &&
    penalty.startsAt.getTime() <= now.getTime() &&
    penalty.endsAt.getTime() > now.getTime()
  );
}

export function penaltyBookingMessage(
  endsAt: Date,
  timeZone: string,
): string {
  return `No podés reservar hasta el ${formatDateTime(endsAt, timeZone)} porque no asististe a un turno previo.`;
}

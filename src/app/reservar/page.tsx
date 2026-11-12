import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getAvailability } from "@/lib/booking";
import { getSettings } from "@/lib/settings";
import {
  addDaysToKey,
  dateKeyToUtcDate,
  formatCurrency,
  todayKey,
} from "@/lib/time";
import { BookingFlow } from "./booking-flow";

export const metadata: Metadata = {
  title: "Reservar turno | Barbería",
  description: "Elegí el día y horario que más te convenga.",
};

export const dynamic = "force-dynamic";

const closedMessages: Record<string, string> = {
  PAST: "Ese día ya pasó. Elegí otra fecha.",
  CLOSED: "Ese día el local está cerrado.",
  NO_SCHEDULE: "No hay horarios de atención configurados para ese día.",
  OUT_OF_WINDOW: "Elegí una fecha dentro del período de reserva.",
};

function dayChipLabel(dateKey: string) {
  const date = dateKeyToUtcDate(dateKey);
  const weekday = new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    weekday: "short",
  })
    .format(date)
    .replace(".", "");
  const day = new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    day: "numeric",
  }).format(date);
  return { weekday, day };
}

export default async function ReservarPage() {
  const settings = await getSettings();
  const now = new Date();
  const today = todayKey(now, settings.timezone);
  const windowEnd = addDaysToKey(today, settings.bookingWindowDays);

  const availability = await getAvailability(today);

  const days: Array<{ key: string; weekday: string; day: string }> = [];
  for (let index = 0; index < 14; index += 1) {
    const key = addDaysToKey(today, index);
    if (key > windowEnd) break;
    days.push({ key, ...dayChipLabel(key) });
  }

  const initialMessage =
    availability.slots.length > 0
      ? null
      : (closedMessages[availability.closedReason ?? ""] ??
        "No quedan horarios libres para este día.");

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <SiteHeader businessName={settings.businessName} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Reservá tu turno
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {settings.serviceName} · {formatCurrency(settings.servicePriceCents)}{" "}
            · {settings.serviceDurationMin} min
          </p>
        </div>

        <BookingFlow
          days={days}
          initialDate={today}
          initialSlots={availability.slots}
          initialMessage={initialMessage}
          minDate={today}
          maxDate={windowEnd}
          durationLabel={`${settings.serviceDurationMin} min`}
          priceLabel={formatCurrency(settings.servicePriceCents)}
          penaltyDays={settings.penaltyDays}
        />

        <p className="mt-6 text-center text-sm text-stone-500">
          ¿Ya reservaste?{" "}
          <Link
            href="/turno"
            className="font-medium text-amber-700 hover:underline"
          >
            Consultá tu turno
          </Link>
        </p>
      </main>
    </div>
  );
}

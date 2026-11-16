import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Clock3, Scissors } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getActiveServices } from "@/lib/services";
import { getSettings } from "@/lib/settings";
import { formatCurrency } from "@/lib/time";

export const metadata: Metadata = {
  title: "Turnos de barbería",
  description: "Reservá tu turno online en pocos pasos.",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSettings();
  const services = await getActiveServices();

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <SiteHeader businessName={settings.businessName} />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center sm:p-8">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-amber-400">
            <Scissors className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900">
            {settings.businessName}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Reservá tu turno eligiendo día y horario.
          </p>

          {services.length > 0 ? (
            <ul className="mt-6 space-y-2 text-left">
              {services.map((service) => (
                <li
                  key={service.id}
                  className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5"
                >
                  <span className="text-sm font-semibold text-stone-900">
                    {service.name}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-stone-500">
                    <span className="font-medium text-stone-900">
                      {formatCurrency(service.priceCents)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {service.durationMin} min
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-stone-500">
              Por ahora no hay servicios disponibles.
            </p>
          )}

          <Link
            href="/reservar"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            <CalendarCheck className="h-4 w-4" />
            Reservar turno
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/turno"
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            Consultar mi turno
          </Link>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-stone-500">
          {settings.cancellationPolicy}
        </p>
      </main>
    </div>
  );
}

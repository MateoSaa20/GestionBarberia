import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Clock3, Scissors } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getSettings } from "@/lib/settings";
import { formatCurrency } from "@/lib/time";

export const metadata: Metadata = {
  title: "Turnos de barbería",
  description: "Reservá tu turno online en pocos pasos.",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSettings();

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

          <dl className="mt-6 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-xl bg-stone-50 px-3 py-2.5">
              <dt className="text-xs text-stone-500">Servicio</dt>
              <dd className="mt-0.5 text-sm font-semibold text-stone-900">
                {settings.serviceName}
              </dd>
            </div>
            <div className="rounded-xl bg-stone-50 px-3 py-2.5">
              <dt className="text-xs text-stone-500">Precio</dt>
              <dd className="mt-0.5 text-sm font-semibold text-stone-900">
                {formatCurrency(settings.servicePriceCents)}
              </dd>
            </div>
          </dl>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-stone-500">
            <Clock3 className="h-3.5 w-3.5" />
            {settings.serviceDurationMin} minutos por turno
          </p>

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

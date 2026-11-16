import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Scissors,
  XCircle,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Alert, StatusBadge } from "@/components/ui";
import { findAppointmentByCode } from "@/lib/booking";
import { summarizeServiceNames } from "@/lib/services";
import { firstParam } from "@/lib/search-params";
import { getSettings } from "@/lib/settings";
import {
  formatCurrency,
  formatDateLong,
  formatEndMinutes,
  formatMinutes,
  minutesNowInTz,
  todayKey,
} from "@/lib/time";
import { cancelAppointmentAction } from "../actions";

export const metadata: Metadata = {
  title: "Detalle del turno | Barbería",
};

export const dynamic = "force-dynamic";

export default async function TurnoPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{
    estado?: string | string[];
    ok?: string | string[];
    error?: string | string[];
  }>;
}) {
  const { code } = await params;
  const query = await searchParams;
  const status = firstParam(query.estado);
  const okMessage = firstParam(query.ok);
  const errorMessage = firstParam(query.error);

  const appointment = await findAppointmentByCode(code.toUpperCase());
  if (!appointment) notFound();

  const settings = await getSettings();
  const now = new Date();
  const today = todayKey(now, settings.timezone);
  const nowMinutes = minutesNowInTz(now, settings.timezone);

  const canCancel =
    appointment.status === "CONFIRMED" &&
    (appointment.date > today ||
      (appointment.date === today && appointment.startMinute > nowMinutes));

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <SiteHeader businessName={settings.businessName} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Turno
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">
              {appointment.clientName}
            </h1>
            <p className="mt-1 font-mono text-sm text-stone-500">
              {appointment.code}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={appointment.status} />
          </div>
        </div>

        {status === "confirmado" ? (
          <div className="mb-4">
            <Alert kind="ok">
              ¡Turno confirmado! Guardá el código para consultarlo después.
            </Alert>
          </div>
        ) : null}
        {okMessage ? (
          <div className="mb-4">
            <Alert kind="ok">{okMessage}</Alert>
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mb-4">
            <Alert kind="error">{errorMessage}</Alert>
          </div>
        ) : null}

        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <dl className="divide-y divide-stone-100 text-sm">
            <div className="flex items-center gap-3 py-3 first:pt-0">
              <Scissors className="h-4 w-4 text-amber-600" />
              <div className="flex-1">
                <dt className="text-stone-500">Servicio</dt>
                <dd className="font-medium text-stone-900">
                  {summarizeServiceNames(appointment.services)}
                </dd>
              </div>
              <span className="text-stone-900">
                {formatCurrency(appointment.priceCents)}
              </span>
            </div>

            <div className="flex items-center gap-3 py-3">
              <CalendarDays className="h-4 w-4 text-amber-600" />
              <div className="flex-1">
                <dt className="text-stone-500">Fecha</dt>
                <dd className="font-medium text-stone-900">
                  {formatDateLong(appointment.date)}
                </dd>
              </div>
            </div>

            <div className="flex items-center gap-3 py-3">
              <Clock3 className="h-4 w-4 text-amber-600" />
              <div className="flex-1">
                <dt className="text-stone-500">Hora</dt>
                <dd className="font-medium text-stone-900">
                  {formatMinutes(appointment.startMinute)} a{" "}
                  {formatEndMinutes(appointment.endMinute)} hs
                </dd>
              </div>
            </div>

            <div className="flex items-center gap-3 py-3 last:pb-0">
              <MapPin className="h-4 w-4 text-amber-600" />
              <div className="flex-1">
                <dt className="text-stone-500">Lugar</dt>
                <dd className="font-medium text-stone-900">
                  {settings.businessAddress || settings.businessName}
                </dd>
              </div>
            </div>
          </dl>
        </section>

        {appointment.notes ? (
          <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-stone-600 ring-1 ring-stone-200">
            <span className="font-medium text-stone-900">Notas: </span>
            {appointment.notes}
          </p>
        ) : null}

        {appointment.status === "CONFIRMED" ? (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            Te esperamos. Llegá unos minutos antes.
          </p>
        ) : null}

        {appointment.status === "CANCELLED_CLIENT" ||
        appointment.status === "CANCELLED_ADMIN" ? (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-600 ring-1 ring-stone-200">
            <XCircle className="h-4 w-4" />
            Este turno no está activo.
          </p>
        ) : null}

        <p className="mt-5 text-xs leading-relaxed text-stone-500">
          {settings.cancellationPolicy}
        </p>

        {canCancel ? (
          <form action={cancelAppointmentAction} className="mt-5">
            <input type="hidden" name="code" value={appointment.code} />
            <ConfirmSubmitButton
              message="¿Seguro que querés cancelar este turno?"
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Cancelar este turno
            </ConfirmSubmitButton>
          </form>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <Link
            href="/reservar"
            className="font-medium text-amber-700 hover:underline"
          >
            Reservar otro turno
          </Link>
          <Link
            href="/turno"
            className="font-medium text-stone-600 hover:underline"
          >
            Consultar otro código
          </Link>
        </div>
      </main>
    </div>
  );
}

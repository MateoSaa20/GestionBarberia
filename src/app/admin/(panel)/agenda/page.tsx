import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Phone,
  Plus,
  User,
} from "lucide-react";
import { getDayOverview } from "@/lib/booking";
import { getSettings } from "@/lib/settings";
import {
  addDaysToKey,
  formatCurrency,
  formatDateLong,
  formatMinutes,
  isValidDateKey,
  todayKey,
} from "@/lib/time";
import {
  createManualAppointmentAction,
  updateAppointmentStatusAction,
} from "../../actions";
import { firstParam } from "@/lib/search-params";
import {
  Alert,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

export const metadata: Metadata = {
  title: "Agenda | Panel de barbería",
};

export const dynamic = "force-dynamic";

type AgendaSearchParams = {
  date?: string | string[];
  ok?: string | string[];
  error?: string | string[];
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<AgendaSearchParams>;
}) {
  const params = await searchParams;
  const settings = await getSettings();
  const today = todayKey(new Date(), settings.timezone);
  const dateParam = firstParam(params.date);
  const date = dateParam && isValidDateKey(dateParam) ? dateParam : today;
  const okMessage = firstParam(params.ok);
  const errorMessage = firstParam(params.error);

  const overview = await getDayOverview(date);
  const { appointments, slots, override, blocks, closedReason } = overview;

  const activeAppointments = appointments.filter(
    (appointment) => appointment.status === "CONFIRMED",
  );

  const redirectTo = `/admin/agenda?date=${date}`;

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle={`${settings.serviceName} · ${formatDateLong(date)}`}
        actions={
          <Link
            href="/admin/disponibilidad"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            <Clock3 className="h-4 w-4" />
            Editar disponibilidad
          </Link>
        }
      />

      {okMessage ? <Alert kind="ok">{okMessage}</Alert> : null}
      {errorMessage ? (
        <div className="mt-3">
          <Alert kind="error">{errorMessage}</Alert>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/agenda?date=${addDaysToKey(date, -1)}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50"
            aria-label="Día anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href={`/admin/agenda?date=${addDaysToKey(date, 1)}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50"
            aria-label="Día siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/admin/agenda"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Hoy
          </Link>
        </div>

        <form className="flex items-center gap-2" method="get">
          <label htmlFor="date" className="sr-only">
            Elegir fecha
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={date}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            <CalendarDays className="h-4 w-4" />
            Ver
          </button>
        </form>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Turnos activos
          </p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">
            {activeAppointments.length}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Total del día
          </p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">
            {appointments.length}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Precio del servicio
          </p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">
            {formatCurrency(settings.servicePriceCents)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Turnos del día
          </h2>

          {appointments.length === 0 ? (
            <EmptyState
              title="No hay turnos para este día"
              description={
                closedReason === "CLOSED"
                  ? "El día está marcado como cerrado en la disponibilidad."
                  : closedReason === "NO_SCHEDULE"
                    ? "No hay horarios de atención configurados para este día."
                    : "Podés crear uno manualmente desde el panel lateral."
              }
            />
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => {
                const canCancel = appointment.status === "CONFIRMED";
                const canFinish = appointment.status === "CONFIRMED";

                return (
                  <article
                    key={appointment.id}
                    className="rounded-xl border border-stone-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-16 flex-col items-center justify-center rounded-lg bg-stone-900 text-white">
                          <span className="text-sm font-semibold">
                            {formatMinutes(appointment.startMinute)}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            {appointment.endMinute - appointment.startMinute} min
                          </span>
                        </div>
                        <div>
                          <p className="flex items-center gap-2 font-semibold text-stone-900">
                            <User className="h-4 w-4 text-stone-400" />
                            {appointment.clientName}
                          </p>
                          <div className="mt-1 flex flex-col gap-0.5 text-xs text-stone-500">
                            <span className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3" />
                              {appointment.clientPhone}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <StatusBadge status={appointment.status} />
                        <span className="font-mono text-[10px] text-stone-400">
                          {appointment.code}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-stone-100 pt-3 text-xs text-stone-500">
                      <span>
                        Precio: {formatCurrency(appointment.priceCents)}
                      </span>
                      <span>
                        {appointment.source === "ONLINE"
                          ? "Reserva online"
                          : "Carga manual"}
                      </span>
                    </div>

                    {appointment.notes ? (
                      <p className="mt-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">
                        {appointment.notes}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {canFinish ? (
                        <>
                          <form action={updateAppointmentStatusAction}>
                            <input
                              type="hidden"
                              name="id"
                              value={appointment.id}
                            />
                            <input
                              type="hidden"
                              name="status"
                              value="COMPLETED"
                            />
                            <input
                              type="hidden"
                              name="redirectTo"
                              value={redirectTo}
                            />
                            <button className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">
                              Completado
                            </button>
                          </form>
                          <form action={updateAppointmentStatusAction}>
                            <input
                              type="hidden"
                              name="id"
                              value={appointment.id}
                            />
                            <input type="hidden" name="status" value="NO_SHOW" />
                            <input
                              type="hidden"
                              name="redirectTo"
                              value={redirectTo}
                            />
                            <ConfirmSubmitButton
                              message={
                                settings.penaltyDays > 0
                                  ? `¿Marcar como no asistió? ${appointment.clientPhone} no podrá reservar durante ${settings.penaltyDays} días.`
                                  : "¿Marcar este turno como no asistió?"
                              }
                              className="rounded-lg border border-orange-200 px-2.5 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-50"
                            >
                              No asistió
                            </ConfirmSubmitButton>
                          </form>
                        </>
                      ) : null}

                      {canCancel ? (
                        <form action={updateAppointmentStatusAction}>
                          <input type="hidden" name="id" value={appointment.id} />
                          <input
                            type="hidden"
                            name="status"
                            value="CANCELLED_ADMIN"
                          />
                          <input
                            type="hidden"
                            name="redirectTo"
                            value={redirectTo}
                          />
                          <ConfirmSubmitButton
                            message="¿Cancelar este turno?"
                            className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Cancelar
                          </ConfirmSubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <Plus className="h-4 w-4 text-amber-600" />
              Turno manual
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              Para clientes que reservan por teléfono o en el local.
            </p>

            {slots.length === 0 ? (
              <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">
                {closedReason === "CLOSED"
                  ? "El día está cerrado."
                  : closedReason === "NO_SCHEDULE"
                    ? "No hay horarios de atención configurados para este día."
                    : "No quedan horarios disponibles para este día."}
              </p>
            ) : (
              <form
                action={createManualAppointmentAction}
                className="mt-3 space-y-3"
              >
                <input type="hidden" name="date" value={date} />

                <div>
                  <label
                    htmlFor="time"
                    className="mb-1 block text-xs font-medium text-stone-600"
                  >
                    Horario
                  </label>
                  <select
                    id="time"
                    name="time"
                    required
                    className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-amber-600"
                  >
                    {slots.map((slot) => (
                      <option key={slot.startMinute} value={slot.label}>
                        {slot.label} hs
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="clientName"
                    className="mb-1 block text-xs font-medium text-stone-600"
                  >
                    Nombre
                  </label>
                  <input
                    id="clientName"
                    name="clientName"
                    required
                    className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="clientPhone"
                    className="mb-1 block text-xs font-medium text-stone-600"
                  >
                    Teléfono
                  </label>
                  <input
                    id="clientPhone"
                    name="clientPhone"
                    required
                    className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="notes"
                    className="mb-1 block text-xs font-medium text-stone-600"
                  >
                    Notas (opcional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={2}
                    className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-amber-600"
                  />
                </div>

                <button className="w-full rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800">
                  Crear turno confirmado
                </button>
              </form>
            )}
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-stone-900">
              Estado del día
            </h2>
            <dl className="mt-2 space-y-1.5 text-xs text-stone-600">
              <div className="flex justify-between gap-2">
                <dt>Disponibilidad</dt>
                <dd className="font-medium text-stone-900">
                  {override?.type === "CLOSED"
                    ? "Cerrado"
                    : override?.type === "CUSTOM_HOURS"
                      ? "Horario especial"
                      : "Horario semanal"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Bloqueos</dt>
                <dd className="font-medium text-stone-900">{blocks.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Horarios libres</dt>
                <dd className="font-medium text-stone-900">{slots.length}</dd>
              </div>
            </dl>
            <Link
              href="/admin/disponibilidad"
              className="mt-3 inline-block text-xs font-medium text-amber-700 hover:underline"
            >
              Gestionar excepciones y bloqueos
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

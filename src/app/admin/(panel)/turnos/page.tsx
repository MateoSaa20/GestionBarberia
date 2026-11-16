import type { Metadata } from "next";
import Link from "next/link";
import type { AppointmentStatus, Prisma } from "@prisma/client";
import {
  CalendarDays,
  ListChecks,
  Phone,
  Search,
  User,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { summarizeServiceNames } from "@/lib/services";
import { getSettings } from "@/lib/settings";
import {
  formatCurrency,
  formatDateLong,
  formatEndMinutes,
  formatMinutes,
  todayKey,
} from "@/lib/time";
import { updateAppointmentStatusAction } from "../../actions";
import { firstParam } from "@/lib/search-params";
import {
  Alert,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

export const metadata: Metadata = {
  title: "Turnos | Panel de barbería",
};

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: Array<{ value: AppointmentStatus; label: string }> = [
  { value: "CONFIRMED", label: "Confirmado" },
  { value: "COMPLETED", label: "Completado" },
  { value: "CANCELLED_CLIENT", label: "Cancelado por cliente" },
  { value: "CANCELLED_ADMIN", label: "Cancelado por el barbero" },
  { value: "NO_SHOW", label: "No asistió" },
];

const STATUS_VALUES = STATUS_OPTIONS.map((option) => option.value);

type TurnosSearchParams = {
  q?: string | string[];
  status?: string | string[];
  range?: string | string[];
  ok?: string | string[];
  error?: string | string[];
};

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<TurnosSearchParams>;
}) {
  const params = await searchParams;
  const settings = await getSettings();
  const today = todayKey(new Date(), settings.timezone);

  const q = firstParam(params.q)?.trim() ?? "";
  const statusParam = firstParam(params.status);
  const rangeParam = firstParam(params.range);
  const okMessage = firstParam(params.ok);
  const errorMessage = firstParam(params.error);

  const status =
    statusParam && STATUS_VALUES.includes(statusParam as AppointmentStatus)
      ? (statusParam as AppointmentStatus)
      : null;
  const range =
    rangeParam === "past" || rangeParam === "all" ? rangeParam : "upcoming";

  const where: Prisma.AppointmentWhereInput = {};

  if (status) where.status = status;
  if (range === "upcoming") where.date = { gte: today };
  if (range === "past") where.date = { lt: today };
  if (q) {
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { clientName: { contains: q, mode: "insensitive" } },
      { clientPhone: { contains: q } },
    ];
  }

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy:
      range === "past"
        ? [{ date: "desc" }, { startMinute: "desc" }]
        : [{ date: "asc" }, { startMinute: "asc" }],
    take: 100,
    include: { services: { orderBy: { sortOrder: "asc" } } },
  });

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (status) query.set("status", status);
  if (range !== "upcoming") query.set("range", range);
  const redirectTo = `/admin/turnos${query.size > 0 ? `?${query}` : ""}`;

  return (
    <div>
      <PageHeader
        title="Turnos"
        subtitle="Buscá y gestioná todos los turnos del negocio."
        actions={
          <Link
            href="/admin/agenda"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            <CalendarDays className="h-4 w-4" />
            Ir a la agenda
          </Link>
        }
      />

      {okMessage ? <Alert kind="ok">{okMessage}</Alert> : null}
      {errorMessage ? (
        <div className="mt-3">
          <Alert kind="error">{errorMessage}</Alert>
        </div>
      ) : null}

      <form
        method="get"
        className="mt-4 grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
      >
        <div>
          <label
            htmlFor="q"
            className="mb-1 block text-xs font-medium text-stone-600"
          >
            Buscar
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Código, nombre o teléfono"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
          />
        </div>

        <div>
          <label
            htmlFor="status"
            className="mb-1 block text-xs font-medium text-stone-600"
          >
            Estado
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600"
          >
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="range"
            className="mb-1 block text-xs font-medium text-stone-600"
          >
            Período
          </label>
          <select
            id="range"
            name="range"
            defaultValue={range}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600"
          >
            <option value="upcoming">Próximos</option>
            <option value="past">Pasados</option>
            <option value="all">Todos</option>
          </select>
        </div>

        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800">
          <Search className="h-4 w-4" />
          Filtrar
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between gap-2 text-xs text-stone-500">
        <span>
          {appointments.length === 0
            ? "Sin resultados"
            : `${appointments.length} turno${appointments.length === 1 ? "" : "s"}`}
        </span>
        <Link
          href="/admin/turnos"
          className="font-medium text-amber-700 hover:underline"
        >
          Limpiar filtros
        </Link>
      </div>

      {appointments.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="No hay turnos para mostrar"
            description="Probá con otro estado, período o término de búsqueda."
          />
        </div>
      ) : (
        <div className="mt-3 space-y-3">
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
                    <div className="flex h-14 w-16 flex-col items-center justify-center rounded-lg bg-stone-900 text-white">
                      <span className="text-sm font-semibold">
                        {formatMinutes(appointment.startMinute)}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {formatEndMinutes(appointment.endMinute)}
                      </span>
                    </div>
                    <div>
                      <p className="flex items-center gap-2 font-semibold text-stone-900">
                        <User className="h-4 w-4 text-stone-400" />
                        {appointment.clientName}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-stone-600">
                        {formatDateLong(appointment.date)}
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
                  <span className="font-medium text-stone-700">
                    {summarizeServiceNames(appointment.services)}
                  </span>
                  <span>Precio: {formatCurrency(appointment.priceCents)}</span>
                  <span>
                    {appointment.source === "ONLINE"
                      ? "Reserva online"
                      : "Carga manual"}
                  </span>
                  <Link
                    href={`/admin/agenda?date=${appointment.date}`}
                    className="font-medium text-amber-700 hover:underline"
                  >
                    Ver en agenda
                  </Link>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {canFinish ? (
                    <>
                      <form action={updateAppointmentStatusAction}>
                        <input
                          type="hidden"
                          name="id"
                          value={appointment.id}
                        />
                        <input type="hidden" name="status" value="COMPLETED" />
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

                  {!canFinish && !canCancel ? (
                    <span className="inline-flex items-center gap-1 text-xs text-stone-400">
                      <ListChecks className="h-3 w-3" />
                      Sin acciones disponibles
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

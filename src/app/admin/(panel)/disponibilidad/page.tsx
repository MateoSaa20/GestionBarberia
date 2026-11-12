import type { Metadata } from "next";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import {
  formatDateLong,
  formatEndMinutes,
  formatMinutes,
  todayKey,
} from "@/lib/time";
import {
  addOverrideAction,
  addTimeBlockAction,
  deleteOverrideAction,
  deleteTimeBlockAction,
} from "../../actions";
import { firstParam } from "@/lib/search-params";
import { Alert, EmptyState, PageHeader } from "@/components/ui";
import { ScheduleEditor } from "./schedule-editor";

export const metadata: Metadata = {
  title: "Disponibilidad | Panel de barbería",
};

export const dynamic = "force-dynamic";

export default async function DisponibilidadPage({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string | string[];
    error?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const okMessage = firstParam(params.ok);
  const errorMessage = firstParam(params.error);
  const settings = await getSettings();
  const today = todayKey(new Date(), settings.timezone);

  const [weekly, overrides, blocks] = await Promise.all([
    prisma.weeklySchedule.findMany({ orderBy: { startMinute: "asc" } }),
    prisma.dayOverride.findMany({
      where: { date: { gte: today } },
      orderBy: { date: "asc" },
    }),
    prisma.timeBlock.findMany({
      where: { date: { gte: today } },
      orderBy: [{ date: "asc" }, { startMinute: "asc" }],
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Disponibilidad"
        subtitle="Definí tus días y horarios de atención, excepciones y bloqueos puntuales."
      />

      {okMessage ? <Alert kind="ok">{okMessage}</Alert> : null}
      {errorMessage ? (
        <div className="mt-3">
          <Alert kind="error">{errorMessage}</Alert>
        </div>
      ) : null}

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Horario semanal
        </h2>
        <ScheduleEditor
          initial={weekly.map((interval) => ({
            dayOfWeek: interval.dayOfWeek,
            startMinute: interval.startMinute,
            endMinute: interval.endMinute,
            enabled: interval.enabled,
          }))}
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Excepciones por fecha
          </h2>
          <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
            <form action={addOverrideAction} className="space-y-3">
              <p className="text-sm font-medium text-stone-900">Cerrar un día</p>
              <input type="hidden" name="type" value="CLOSED" />
              <div className="flex gap-2">
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={today}
                  className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-amber-600"
                />
                <button className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800">
                  <CalendarOff className="h-4 w-4" />
                  Cerrar
                </button>
              </div>
            </form>

            <div className="h-px bg-stone-100" />

            <form action={addOverrideAction} className="space-y-2">
              <p className="text-sm font-medium text-stone-900">
                Horario especial
              </p>
              <input type="hidden" name="type" value="CUSTOM_HOURS" />
              <input
                type="date"
                name="date"
                required
                defaultValue={today}
                className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-amber-600"
              />
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  name="startTime"
                  required
                  defaultValue="09:00"
                  className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-amber-600"
                />
                <span className="text-xs text-stone-400">a</span>
                <input
                  type="time"
                  name="endTime"
                  required
                  defaultValue="13:00"
                  className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-amber-600"
                />
              </div>
              <button className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
                <Plus className="h-4 w-4" />
                Guardar horario especial
              </button>
            </form>
          </div>

          <div className="mt-4 space-y-2">
            {overrides.length === 0 ? (
              <EmptyState title="Sin excepciones cargadas" />
            ) : (
              overrides.map((override) => (
                <div
                  key={override.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      {formatDateLong(override.date)}
                    </p>
                    <p className="text-xs text-stone-500">
                      {override.type === "CLOSED"
                        ? "Día cerrado"
                        : `Horario especial: ${formatMinutes(override.startMinute ?? 0)} a ${formatEndMinutes(override.endMinute ?? 0)}`}
                    </p>
                  </div>
                  <form action={deleteOverrideAction}>
                    <input type="hidden" name="id" value={override.id} />
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Eliminar excepción"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Bloqueos puntuales
          </h2>
          <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-sm text-stone-600">
              Usalos para almuerzos, trámites o descansos dentro de un día de
              atención.
            </p>
            <form action={addTimeBlockAction} className="space-y-2">
              <input
                type="date"
                name="date"
                required
                defaultValue={today}
                className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-amber-600"
              />
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  name="startTime"
                  required
                  defaultValue="13:00"
                  className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-amber-600"
                />
                <span className="text-xs text-stone-400">a</span>
                <input
                  type="time"
                  name="endTime"
                  required
                  defaultValue="14:00"
                  className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-amber-600"
                />
              </div>
              <input
                type="text"
                name="reason"
                placeholder="Motivo (opcional)"
                className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm outline-none focus:border-amber-600"
              />
              <button className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
                <Plus className="h-4 w-4" />
                Agregar bloqueo
              </button>
            </form>
          </div>

          <div className="mt-4 space-y-2">
            {blocks.length === 0 ? (
              <EmptyState title="Sin bloqueos cargados" />
            ) : (
              blocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      {formatDateLong(block.date)}
                    </p>
                    <p className="text-xs text-stone-500">
                      {formatMinutes(block.startMinute)} a{" "}
                      {formatEndMinutes(block.endMinute)}
                      {block.reason ? ` · ${block.reason}` : ""}
                    </p>
                  </div>
                  <form action={deleteTimeBlockAction}>
                    <input type="hidden" name="id" value={block.id} />
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Eliminar bloqueo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

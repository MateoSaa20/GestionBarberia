import type { Metadata } from "next";
import Link from "next/link";
import { Check, Phone, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { getActivePenalties, getRecentPenalties } from "@/lib/penalties";
import { getSettings } from "@/lib/settings";
import {
  formatDateLong,
  formatDateTime,
  formatMinutes,
} from "@/lib/time";
import { liftPenaltyAction } from "../../actions";
import { firstParam } from "@/lib/search-params";
import { Alert, EmptyState, PageHeader } from "@/components/ui";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

export const metadata: Metadata = {
  title: "Penalizaciones | Panel de barbería",
};

export const dynamic = "force-dynamic";

type PenalizacionesSearchParams = {
  ok?: string | string[];
  error?: string | string[];
};

export default async function PenalizacionesPage({
  searchParams,
}: {
  searchParams: Promise<PenalizacionesSearchParams>;
}) {
  const params = await searchParams;
  const okMessage = firstParam(params.ok);
  const errorMessage = firstParam(params.error);
  const settings = await getSettings();
  const now = new Date();

  const [activePenalties, recentPenalties] = await Promise.all([
    getActivePenalties(now),
    getRecentPenalties(now),
  ]);

  return (
    <div>
      <PageHeader
        title="Penalizaciones"
        subtitle={`Clientes que no pueden reservar por no asistir. Duración actual: ${
          settings.penaltyDays > 0
            ? `${settings.penaltyDays} días`
            : "desactivada"
        }.`}
        actions={
          <Link
            href="/admin/configuracion"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Editar duración
          </Link>
        }
      />

      {okMessage ? <Alert kind="ok">{okMessage}</Alert> : null}
      {errorMessage ? (
        <div className="mt-3">
          <Alert kind="error">{errorMessage}</Alert>
        </div>
      ) : null}

      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
          <ShieldAlert className="h-4 w-4 text-orange-600" />
          Activas ({activePenalties.length})
        </h2>

        {activePenalties.length === 0 ? (
          <EmptyState
            title="No hay clientes penalizados"
            description="Cuando marques un turno como “No asistió”, el cliente aparecerá acá hasta que venza la penalización."
          />
        ) : (
          <div className="space-y-3">
            {activePenalties.map((penalty) => (
              <article
                key={penalty.id}
                className="rounded-xl border border-orange-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-stone-900">
                        {penalty.appointment?.clientName ?? "Cliente"}
                      </p>
                      <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                        No asistió
                      </span>
                    </div>

                    <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
                      <Phone className="h-3 w-3" />
                      {penalty.clientPhone}
                    </p>

                    {penalty.appointment ? (
                      <p className="mt-2 text-sm text-stone-600">
                        Turno{" "}
                        <span className="font-mono text-xs">
                          {penalty.appointment.code}
                        </span>{" "}
                        del {formatDateLong(penalty.appointment.date)} a las{" "}
                        {formatMinutes(penalty.appointment.startMinute)} hs.
                      </p>
                    ) : null}

                    <p className="mt-2 text-sm font-medium text-orange-700">
                      Bloqueado hasta el{" "}
                      {formatDateTime(penalty.endsAt, settings.timezone)}.
                    </p>
                  </div>

                  <form action={liftPenaltyAction}>
                    <input type="hidden" name="id" value={penalty.id} />
                    <ConfirmSubmitButton
                      message={`¿Levantar la penalización de ${penalty.clientPhone}?`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Levantar
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Historial reciente
        </h2>

        {recentPenalties.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500">
            Todavía no hay penalizaciones vencidas ni levantadas.
          </p>
        ) : (
          <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
            {recentPenalties.map((penalty) => (
              <div
                key={penalty.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-stone-700">
                    {penalty.clientPhone}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {penalty.appointment
                      ? `Turno ${penalty.appointment.code} · `
                      : ""}
                    Venció el{" "}
                    {formatDateTime(penalty.endsAt, settings.timezone)}
                  </p>
                </div>
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                  {penalty.liftedAt ? "Levantada" : "Vencida"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import { Plus, Save, Scissors } from "lucide-react";
import { centsToAmount, formatCurrency } from "@/lib/time";
import { getAllServices } from "@/lib/services";
import {
  createServiceAction,
  toggleServiceAction,
  updateServiceAction,
} from "../../actions";
import { firstParam } from "@/lib/search-params";
import { Alert, EmptyState, PageHeader } from "@/components/ui";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

export const metadata: Metadata = {
  title: "Servicios | Panel de barbería",
};

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20";

export default async function ServiciosPage({
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
  const services = await getAllServices();

  return (
    <div>
      <PageHeader
        title="Servicios"
        subtitle="Creá, editá y activá o desactivá los servicios que ofrecés."
      />

      {okMessage ? <Alert kind="ok">{okMessage}</Alert> : null}
      {errorMessage ? (
        <div className="mt-3">
          <Alert kind="error">{errorMessage}</Alert>
        </div>
      ) : null}

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
          <Plus className="h-4 w-4 text-amber-600" />
          Agregar servicio
        </h2>

        <form
          action={createServiceAction}
          className="mt-3 grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Nombre
            </span>
            <input name="name" required className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Precio (ARS)
            </span>
            <input
              name="price"
              type="number"
              min={0}
              step={100}
              required
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Duración (min)
            </span>
            <input
              name="durationMin"
              type="number"
              min={5}
              max={480}
              step={5}
              required
              defaultValue={30}
              className={inputClass}
            />
          </label>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800">
            <Plus className="h-4 w-4" />
            Agregar
          </button>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Tus servicios
        </h2>

        {services.length === 0 ? (
          <EmptyState
            title="Todavía no hay servicios"
            description="Agregá el primero con el formulario de arriba."
          />
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <article
                key={service.id}
                className={`rounded-xl border bg-white p-4 ${
                  service.active ? "border-stone-200" : "border-stone-200 opacity-80"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Scissors className="h-4 w-4 text-amber-600" />
                    <span className="font-semibold text-stone-900">
                      {service.name}
                    </span>
                    {service.active ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                        Activo
                      </span>
                    ) : (
                      <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <form action={toggleServiceAction}>
                    <input type="hidden" name="id" value={service.id} />
                    {service.active ? (
                      <ConfirmSubmitButton
                        message={`¿Desactivar "${service.name}"? No aparecerá más para reservar, pero se conservan los turnos existentes.`}
                        className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                      >
                        Desactivar
                      </ConfirmSubmitButton>
                    ) : (
                      <button className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
                        Activar
                      </button>
                    )}
                  </form>
                </div>

                <form
                  action={updateServiceAction}
                  className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
                >
                  <input type="hidden" name="id" value={service.id} />
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Nombre
                    </span>
                    <input
                      name="name"
                      required
                      defaultValue={service.name}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Precio (ARS)
                    </span>
                    <input
                      name="price"
                      type="number"
                      min={0}
                      step={100}
                      required
                      defaultValue={centsToAmount(service.priceCents)}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-stone-600">
                      Duración (min)
                    </span>
                    <input
                      name="durationMin"
                      type="number"
                      min={5}
                      max={480}
                      step={5}
                      required
                      defaultValue={service.durationMin}
                      className={inputClass}
                    />
                  </label>
                  <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50">
                    <Save className="h-4 w-4" />
                    Guardar
                  </button>
                </form>

                <p className="mt-2 text-xs text-stone-500">
                  Actual: {formatCurrency(service.priceCents)} ·{" "}
                  {service.durationMin} min
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

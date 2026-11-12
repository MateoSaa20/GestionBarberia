import type { Metadata } from "next";
import { Save, Settings2 } from "lucide-react";
import { centsToAmount } from "@/lib/time";
import { getSettings } from "@/lib/settings";
import { saveSettingsAction } from "../../actions";
import { firstParam } from "@/lib/search-params";
import { Alert, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Configuración | Panel de barbería",
};

export const dynamic = "force-dynamic";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-700">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20";

export default async function ConfiguracionPage({
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

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle="Datos del negocio, precios y reglas de reserva."
      />

      {okMessage ? <Alert kind="ok">{okMessage}</Alert> : null}
      {errorMessage ? (
        <div className="mt-3">
          <Alert kind="error">{errorMessage}</Alert>
        </div>
      ) : null}

      <form
        action={saveSettingsAction}
        className="mt-6 space-y-6 rounded-xl border border-stone-200 bg-white p-5"
      >
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
            <Settings2 className="h-4 w-4 text-amber-600" />
            Negocio y servicio
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del negocio">
              <input
                name="businessName"
                required
                defaultValue={settings.businessName}
                className={inputClass}
              />
            </Field>
            <Field label="Nombre del servicio">
              <input
                name="serviceName"
                required
                defaultValue={settings.serviceName}
                className={inputClass}
              />
            </Field>
            <Field label="Precio del servicio (ARS)">
              <input
                name="servicePrice"
                type="number"
                min={0}
                step={100}
                required
                defaultValue={centsToAmount(settings.servicePriceCents)}
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        <div className="h-px bg-stone-100" />

        <section>
          <h2 className="text-sm font-semibold text-stone-900">
            Duración y disponibilidad
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field
              label="Duración del turno (min)"
              hint="Tiempo que ocupa cada servicio."
            >
              <input
                name="serviceDurationMin"
                type="number"
                min={5}
                max={480}
                step={5}
                required
                defaultValue={settings.serviceDurationMin}
                className={inputClass}
              />
            </Field>
            <Field
              label="Buffer entre turnos (min)"
              hint="Descanso o limpieza entre un turno y el siguiente."
            >
              <input
                name="bufferMin"
                type="number"
                min={0}
                max={120}
                step={5}
                required
                defaultValue={settings.bufferMin}
                className={inputClass}
              />
            </Field>
            <Field
              label="Anticipación mínima (min)"
              hint="Tiempo mínimo entre la reserva y el turno para el mismo día."
            >
              <input
                name="minLeadTimeMin"
                type="number"
                min={0}
                max={1440}
                step={15}
                required
                defaultValue={settings.minLeadTimeMin}
                className={inputClass}
              />
            </Field>
            <Field
              label="Ventana de reserva (días)"
              hint="Cuántos días hacia adelante se puede reservar."
            >
              <input
                name="bookingWindowDays"
                type="number"
                min={1}
                max={365}
                step={1}
                required
                defaultValue={settings.bookingWindowDays}
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        <div className="h-px bg-stone-100" />

        <section>
          <h2 className="text-sm font-semibold text-stone-900">
            Penalizaciones
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field
              label="Días de bloqueo por no asistir"
              hint="Días que el cliente no podrá reservar. Usá 0 para desactivar la penalización."
            >
              <input
                name="penaltyDays"
                type="number"
                min={0}
                max={365}
                step={1}
                required
                defaultValue={settings.penaltyDays}
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        <div className="h-px bg-stone-100" />

        <section>
          <h2 className="text-sm font-semibold text-stone-900">
            Política de cancelación
          </h2>
          <div className="mt-3">
            <Field label="Texto que ve el cliente">
              <textarea
                name="cancellationPolicy"
                rows={4}
                required
                defaultValue={settings.cancellationPolicy}
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
          <p className="text-xs text-stone-500">
            Zona horaria: <span className="font-medium">{settings.timezone}</span>
          </p>
          <button className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800">
            <Save className="h-4 w-4" />
            Guardar configuración
          </button>
        </div>
      </form>
    </div>
  );
}

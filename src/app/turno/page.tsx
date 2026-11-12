import type { Metadata } from "next";
import Link from "next/link";
import { Search, Ticket } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Alert } from "@/components/ui";
import { firstParam } from "@/lib/search-params";
import { getSettings } from "@/lib/settings";
import { lookupAppointmentAction } from "./actions";

export const metadata: Metadata = {
  title: "Mi turno | Barbería",
  description: "Consultá el estado de tu turno con el código de reserva.",
};

export const dynamic = "force-dynamic";

export default async function TurnoLookupPage({
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
    <div className="flex min-h-screen flex-col bg-stone-50">
      <SiteHeader businessName={settings.businessName} />

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-12 sm:px-6">
        <div className="text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-amber-400">
            <Ticket className="h-6 w-6" />
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900">
            Consultá tu turno
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Ingresá el código que te mostramos al reservar.
          </p>
        </div>

        {okMessage ? (
          <div className="mt-5">
            <Alert kind="ok">{okMessage}</Alert>
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mt-5">
            <Alert kind="error">{errorMessage}</Alert>
          </div>
        ) : null}

        <form
          action={lookupAppointmentAction}
          className="mt-6 space-y-4 rounded-2xl border border-stone-200 bg-white p-6"
        >
          <div>
            <label
              htmlFor="code"
              className="mb-1 block text-sm font-medium text-stone-700"
            >
              Código de turno
            </label>
            <input
              id="code"
              name="code"
              required
              placeholder="BT-XXXXXX"
              autoComplete="off"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm uppercase tracking-wider outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
            />
          </div>

          <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800">
            <Search className="h-4 w-4" />
            Buscar turno
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          ¿Todavía no reservaste?{" "}
          <Link
            href="/reservar"
            className="font-medium text-amber-700 hover:underline"
          >
            Sacá tu turno
          </Link>
        </p>
      </main>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";

export const metadata: Metadata = {
  title: "Página no encontrada | Barbería",
};

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-amber-400">
        <SearchX className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900">
        No encontramos esta página
      </h1>
      <p className="mt-2 max-w-md text-sm text-stone-500">
        El enlace puede estar vencido o el turno que buscás ya no existe.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
        <Link
          href="/"
          className="rounded-lg bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-stone-800"
        >
          Volver al inicio
        </Link>
        <Link
          href="/turno"
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-50"
        >
          Consultar un turno
        </Link>
      </div>
    </main>
  );
}

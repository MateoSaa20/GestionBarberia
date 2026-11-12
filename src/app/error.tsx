"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900">
        Algo salió mal
      </h1>
      <p className="mt-2 max-w-md text-sm text-stone-500">
        No pudimos cargar esta página. Probá de nuevo en unos segundos.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-stone-800"
        >
          <RotateCcw className="h-4 w-4" />
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-50"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}

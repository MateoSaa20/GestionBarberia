import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Scissors } from "lucide-react";
import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Ingresar | Panel de barbería",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/admin/agenda");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-amber-400">
            <Scissors className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Panel de administración
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Ingresá para gestionar tus turnos
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-sm text-stone-500">
          <Link href="/" className="font-medium text-amber-700 hover:underline">
            Volver al sitio
          </Link>
        </p>
      </div>
    </main>
  );
}

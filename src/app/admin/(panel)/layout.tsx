import type { ReactNode } from "react";
import Link from "next/link";
import { Scissors, LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { requireAdmin } from "@/lib/session";
import { logoutAction } from "../actions";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-stone-100">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin/agenda" className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-amber-400">
                <Scissors className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold tracking-tight text-stone-900">
                Panel de barbería
              </span>
            </Link>
            <div className="flex items-center gap-3 lg:hidden">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-100"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Salir
                </button>
              </form>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <AdminNav />
            <div className="hidden items-center gap-2 border-l border-stone-200 pl-3 lg:flex">
              <span className="max-w-40 truncate text-xs text-stone-500">
                {session.email}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-100"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Salir
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}

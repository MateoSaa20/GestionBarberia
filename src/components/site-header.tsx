import Link from "next/link";
import { CalendarDays, Scissors, Ticket } from "lucide-react";

export function SiteHeader({ businessName }: { businessName: string }) {
  return (
    <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-amber-400">
            <Scissors className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-stone-900">
            {businessName}
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium text-stone-600">
          <Link
            href="/reservar"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-stone-100 hover:text-stone-900"
          >
            <CalendarDays className="h-4 w-4" />
            Reservar
          </Link>
          <Link
            href="/turno"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-stone-100 hover:text-stone-900"
          >
            <Ticket className="h-4 w-4" />
            Mi turno
          </Link>
        </nav>
      </div>
    </header>
  );
}

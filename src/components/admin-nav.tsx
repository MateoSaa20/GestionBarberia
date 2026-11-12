"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  ListChecks,
  Settings,
  ShieldAlert,
} from "lucide-react";

const links = [
  { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/admin/turnos", label: "Turnos", icon: ListChecks },
  {
    href: "/admin/penalizaciones",
    label: "Penalizaciones",
    icon: ShieldAlert,
  },
  { href: "/admin/disponibilidad", label: "Disponibilidad", icon: Clock3 },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto">
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

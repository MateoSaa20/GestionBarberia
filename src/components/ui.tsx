import type { ReactNode } from "react";
import type { AppointmentStatus } from "@prisma/client";

const statusStyles: Record<AppointmentStatus, { label: string; className: string }> = {
  CONFIRMED: {
    label: "Confirmado",
    className: "bg-emerald-100 text-emerald-800",
  },
  CANCELLED_CLIENT: {
    label: "Cancelado por cliente",
    className: "bg-stone-200 text-stone-600",
  },
  CANCELLED_ADMIN: {
    label: "Cancelado",
    className: "bg-red-100 text-red-700",
  },
  COMPLETED: {
    label: "Completado",
    className: "bg-sky-100 text-sky-800",
  },
  NO_SHOW: {
    label: "No asistió",
    className: "bg-orange-100 text-orange-800",
  },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const config = statusStyles[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function Alert({
  kind,
  children,
}: {
  kind: "ok" | "error" | "info";
  children: ReactNode;
}) {
  const styles = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-amber-200 bg-amber-50 text-amber-800",
  } as const;

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles[kind]}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 px-6 py-10 text-center">
      <p className="text-sm font-medium text-stone-700">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-stone-500">{description}</p>
      ) : null}
    </div>
  );
}

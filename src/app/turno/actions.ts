"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { findAppointmentByCode } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { minutesNowInTz, todayKey } from "@/lib/time";

function messageUrl(path: string, key: "ok" | "error", message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${encodeURIComponent(message)}`;
}

function readCode(formData: FormData): string {
  return String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
}

export async function lookupAppointmentAction(
  formData: FormData,
): Promise<void> {
  const code = readCode(formData);

  if (!code) {
    redirect(messageUrl("/turno", "error", "Ingresá tu código de turno"));
  }

  const appointment = await findAppointmentByCode(code);
  if (!appointment) {
    redirect(
      messageUrl("/turno", "error", "No encontramos un turno con ese código"),
    );
  }

  redirect(`/turno/${appointment.code}`);
}

export async function cancelAppointmentAction(
  formData: FormData,
): Promise<void> {
  const code = readCode(formData);
  const appointment = await findAppointmentByCode(code);

  if (!appointment) {
    redirect(messageUrl("/turno", "error", "No encontramos ese turno"));
  }

  if (appointment.status !== "CONFIRMED") {
    redirect(
      messageUrl(
        `/turno/${code}`,
        "error",
        "Este turno ya no se puede cancelar",
      ),
    );
  }

  const settings = await getSettings();
  const now = new Date();
  const today = todayKey(now, settings.timezone);

  if (appointment.date < today) {
    redirect(
      messageUrl(
        `/turno/${code}`,
        "error",
        "No se puede cancelar un turno pasado",
      ),
    );
  }

  if (
    appointment.date === today &&
    appointment.startMinute <= minutesNowInTz(now, settings.timezone)
  ) {
    redirect(
      messageUrl(
        `/turno/${code}`,
        "error",
        "No se puede cancelar un turno que ya comenzó",
      ),
    );
  }

  const result = await prisma.appointment.updateMany({
    where: { id: appointment.id, status: "CONFIRMED" },
    data: { status: "CANCELLED_CLIENT" },
  });

  if (result.count === 0) {
    redirect(
      messageUrl(
        `/turno/${code}`,
        "error",
        "Este turno ya no se puede cancelar",
      ),
    );
  }

  revalidatePath("/admin/agenda");
  revalidatePath("/admin/turnos");
  redirect(messageUrl(`/turno/${code}`, "ok", "Tu turno fue cancelado"));
}

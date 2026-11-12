"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  BookingError,
  createOnlineAppointment,
  getAvailability,
} from "@/lib/booking";
import { sendNewAppointmentNotification } from "@/lib/email";
import { parseTimeToMinutes } from "@/lib/time";
import type { Slot } from "@/lib/availability";

export type BookingFormState = { error?: string } | undefined;

const bookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  time: z.string().min(1, "Elegí un horario"),
  clientName: z
    .string()
    .trim()
    .min(2, "Ingresá tu nombre")
    .max(80, "El nombre es demasiado largo"),
  clientPhone: z
    .string()
    .trim()
    .min(6, "Ingresá un teléfono de contacto")
    .max(30, "El teléfono es demasiado largo"),
  notes: z.string().trim().max(500, "Las notas son demasiado largas").optional(),
});

const closedMessages: Record<string, string> = {
  PAST: "Ese día ya pasó. Elegí otra fecha.",
  CLOSED: "Ese día el local está cerrado.",
  NO_SCHEDULE: "No hay horarios de atención configurados para ese día.",
  OUT_OF_WINDOW: "Elegí una fecha dentro del período de reserva.",
};

export type SlotsResult = {
  date: string;
  slots: Slot[];
  message: string | null;
};

export async function getSlotsAction(date: string): Promise<SlotsResult> {
  try {
    const availability = await getAvailability(date);
    return {
      date,
      slots: availability.slots,
      message: availability.slots.length
        ? null
        : (closedMessages[availability.closedReason ?? ""] ??
          "No quedan horarios libres para este día."),
    };
  } catch {
    return {
      date,
      slots: [],
      message: "No pudimos cargar los horarios. Probá con otro día.",
    };
  }
}

export async function createBookingAction(
  _state: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const parsed = bookingSchema.safeParse({
    date: formData.get("date"),
    time: formData.get("time"),
    clientName: formData.get("clientName"),
    clientPhone: formData.get("clientPhone"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos" };
  }

  const startMinute = parseTimeToMinutes(parsed.data.time);
  if (startMinute === null) {
    return { error: "Horario inválido" };
  }

  let appointment;
  let settings;

  try {
    const result = await createOnlineAppointment({
      date: parsed.data.date,
      startMinute,
      clientName: parsed.data.clientName,
      clientPhone: parsed.data.clientPhone,
      notes: parsed.data.notes,
    });
    appointment = result.appointment;
    settings = result.settings;
  } catch (error) {
    if (error instanceof BookingError) {
      return { error: error.message };
    }
    console.error("[reserva] No se pudo crear el turno:", error);
    return { error: "No pudimos crear la reserva. Probá de nuevo." };
  }

  await sendNewAppointmentNotification(appointment, settings).catch(
    () => undefined,
  );

  revalidatePath("/");
  revalidatePath("/reservar");
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/turnos");
  redirect(`/turno/${appointment.code}?estado=confirmado`);
}

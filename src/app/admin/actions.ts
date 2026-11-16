"use server";

import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  BookingError,
  createManualAppointment,
  findAppointmentByCode,
} from "@/lib/booking";
import { applyNoShowPenalty, liftPenalty } from "@/lib/penalties";
import { getSettings } from "@/lib/settings";
import {
  createSession,
  destroySession,
  requireAdmin,
} from "@/lib/session";
import { isValidDateKey, parseTimeToMinutes } from "@/lib/time";

export type LoginState = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.string().trim().email("Ingresá un email válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export async function loginAction(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;
  const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD;

  if (envEmail && envPassword) {
    if (email !== envEmail || password !== envPassword) {
      return { error: "Email o contraseña incorrectos" };
    }

    const existing = await prisma.adminUser.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (
      existing &&
      existing.email === email &&
      (await compare(password, existing.passwordHash))
    ) {
      await createSession({ sub: existing.id, email: existing.email });
      redirect("/admin/agenda");
    }

    const passwordHash = await hash(password, 12);
    const user = existing
      ? await prisma.adminUser.update({
          where: { id: existing.id },
          data: { email, passwordHash },
        })
      : await prisma.adminUser.create({ data: { email, passwordHash } });

    await createSession({ sub: user.id, email: user.email });
    redirect("/admin/agenda");
  }

  const user = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (!user) {
    return { error: "Email o contraseña incorrectos" };
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Email o contraseña incorrectos" };
  }

  await createSession({ sub: user.id, email: user.email });
  redirect("/admin/agenda");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

function refreshAll() {
  revalidatePath("/");
  revalidatePath("/reservar");
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/turnos");
  revalidatePath("/admin/disponibilidad");
  revalidatePath("/admin/servicios");
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/penalizaciones");
}

function withMessage(path: string, key: "ok" | "error", message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${encodeURIComponent(message)}`;
}

function safeAdminRedirect(path: string): string {
  if (
    !path.startsWith("/admin/") ||
    path.startsWith("//") ||
    path.includes("\\")
  ) {
    return "/admin/agenda";
  }
  return path;
}

export async function saveSettingsAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const buffer = Number(formData.get("bufferMin"));
  const lead = Number(formData.get("minLeadTimeMin"));
  const windowDays = Number(formData.get("bookingWindowDays"));
  const penaltyDays = Number(formData.get("penaltyDays"));
  const businessName = String(formData.get("businessName") ?? "").trim();
  const businessAddress = String(formData.get("businessAddress") ?? "").trim();
  const cancellationPolicy = String(
    formData.get("cancellationPolicy") ?? "",
  ).trim();

  const valid =
    businessName.length >= 2 &&
    businessAddress.length <= 200 &&
    Number.isInteger(buffer) &&
    buffer >= 0 &&
    buffer <= 120 &&
    Number.isInteger(lead) &&
    lead >= 0 &&
    lead <= 1440 &&
    Number.isInteger(windowDays) &&
    windowDays >= 1 &&
    windowDays <= 365 &&
    Number.isInteger(penaltyDays) &&
    penaltyDays >= 0 &&
    penaltyDays <= 365 &&
    cancellationPolicy.length > 0;

  if (!valid) {
    redirect(
      withMessage(
        "/admin/configuracion",
        "error",
        "Revisá los valores ingresados",
      ),
    );
  }

  await prisma.settings.update({
    where: { id: 1 },
    data: {
      businessName,
      businessAddress,
      bufferMin: buffer,
      minLeadTimeMin: lead,
      bookingWindowDays: windowDays,
      penaltyDays,
      cancellationPolicy,
    },
  });

  refreshAll();
  redirect(withMessage("/admin/configuracion", "ok", "Configuración guardada"));
}

const serviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresá un nombre de servicio")
    .max(80, "El nombre es demasiado largo"),
  priceCents: z
    .number()
    .int("Ingresá un precio válido")
    .min(0, "El precio no puede ser negativo")
    .max(100_000_000, "El precio es demasiado alto"),
  durationMin: z
    .number()
    .int("Ingresá una duración válida")
    .min(5, "La duración mínima es 5 minutos")
    .max(480, "La duración máxima es 8 horas"),
});

function parseServiceForm(formData: FormData) {
  return serviceSchema.safeParse({
    name: formData.get("name"),
    priceCents: Math.round(Number(formData.get("price") ?? "") * 100),
    durationMin: Number(formData.get("durationMin")),
  });
}

export async function createServiceAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = parseServiceForm(formData);
  if (!parsed.success) {
    redirect(
      withMessage(
        "/admin/servicios",
        "error",
        parsed.error.issues[0]?.message ?? "Revisá los datos del servicio",
      ),
    );
  }

  const last = await prisma.service.findFirst({
    orderBy: { sortOrder: "desc" },
  });

  await prisma.service.create({
    data: {
      name: parsed.data.name,
      priceCents: parsed.data.priceCents,
      durationMin: parsed.data.durationMin,
      active: true,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  refreshAll();
  redirect(withMessage("/admin/servicios", "ok", "Servicio agregado"));
}

export async function updateServiceAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const parsed = parseServiceForm(formData);
  if (!id || !parsed.success) {
    redirect(
      withMessage(
        "/admin/servicios",
        "error",
        parsed.success
          ? "Servicio inválido"
          : (parsed.error.issues[0]?.message ?? "Revisá los datos"),
      ),
    );
  }

  await prisma.service.update({
    where: { id },
    data: {
      name: parsed.data.name,
      priceCents: parsed.data.priceCents,
      durationMin: parsed.data.durationMin,
    },
  });

  refreshAll();
  redirect(withMessage("/admin/servicios", "ok", "Servicio actualizado"));
}

export async function toggleServiceAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect(withMessage("/admin/servicios", "error", "Servicio inválido"));
  }

  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) {
    redirect(withMessage("/admin/servicios", "error", "Servicio no encontrado"));
  }

  await prisma.service.update({
    where: { id },
    data: { active: !service.active },
  });

  refreshAll();
  redirect(
    withMessage(
      "/admin/servicios",
      "ok",
      service.active ? "Servicio desactivado" : "Servicio activado",
    ),
  );
}

const scheduleSchema = z.array(
  z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
    enabled: z.boolean(),
  }),
);

export async function saveScheduleAction(formData: FormData): Promise<void> {
  await requireAdmin();

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(String(formData.get("schedule") ?? "[]"));
  } catch {
    redirect(
      withMessage(
        "/admin/disponibilidad",
        "error",
        "No se pudo leer el horario",
      ),
    );
  }

  const parsed = scheduleSchema.safeParse(parsedJson);
  if (!parsed.success) {
    redirect(
      withMessage(
        "/admin/disponibilidad",
        "error",
        "El horario tiene datos inválidos",
      ),
    );
  }

  const byDay = new Map<number, Array<{ start: number; end: number }>>();
  for (const interval of parsed.data) {
    if (interval.endMinute <= interval.startMinute) {
      redirect(
        withMessage(
          "/admin/disponibilidad",
          "error",
          "La hora de fin debe ser mayor a la de inicio",
        ),
      );
    }

    const list = byDay.get(interval.dayOfWeek) ?? [];
    if (list.some((item) => interval.startMinute < item.end && item.start < interval.endMinute)) {
      redirect(
        withMessage(
          "/admin/disponibilidad",
          "error",
          "Hay intervalos superpuestos en un mismo día",
        ),
      );
    }
    list.push({ start: interval.startMinute, end: interval.endMinute });
    byDay.set(interval.dayOfWeek, list);
  }

  await prisma.$transaction(async (tx) => {
    await tx.weeklySchedule.deleteMany();
    if (parsed.data.length > 0) {
      await tx.weeklySchedule.createMany({ data: parsed.data });
    }
  });

  refreshAll();
  redirect(
    withMessage("/admin/disponibilidad", "ok", "Horario semanal actualizado"),
  );
}

export async function addOverrideAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const date = String(formData.get("date") ?? "");
  const type = String(formData.get("type") ?? "CLOSED");
  const start = parseTimeToMinutes(String(formData.get("startTime") ?? ""));
  const end = parseTimeToMinutes(String(formData.get("endTime") ?? ""));

  if (!isValidDateKey(date)) {
    redirect(
      withMessage("/admin/disponibilidad", "error", "Fecha inválida"),
    );
  }

  if (type === "CUSTOM_HOURS") {
    if (
      start === null ||
      end === null ||
      start < 0 ||
      end > 1440 ||
      end <= start
    ) {
      redirect(
        withMessage(
          "/admin/disponibilidad",
          "error",
          "Ingresá un rango horario válido",
        ),
      );
    }
  }

  await prisma.dayOverride.upsert({
    where: { date },
    update: {
      type: type === "CUSTOM_HOURS" ? "CUSTOM_HOURS" : "CLOSED",
      startMinute: type === "CUSTOM_HOURS" ? start : null,
      endMinute: type === "CUSTOM_HOURS" ? end : null,
    },
    create: {
      date,
      type: type === "CUSTOM_HOURS" ? "CUSTOM_HOURS" : "CLOSED",
      startMinute: type === "CUSTOM_HOURS" ? start : null,
      endMinute: type === "CUSTOM_HOURS" ? end : null,
    },
  });

  refreshAll();
  redirect(
    withMessage("/admin/disponibilidad", "ok", "Excepción guardada"),
  );
}

export async function deleteOverrideAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await prisma.dayOverride.delete({ where: { id } }).catch(() => undefined);
  }
  refreshAll();
  redirect(withMessage("/admin/disponibilidad", "ok", "Excepción eliminada"));
}

export async function addTimeBlockAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const date = String(formData.get("date") ?? "");
  const start = parseTimeToMinutes(String(formData.get("startTime") ?? ""));
  const end = parseTimeToMinutes(String(formData.get("endTime") ?? ""));
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (
    !isValidDateKey(date) ||
    start === null ||
    end === null ||
    end <= start
  ) {
    redirect(
      withMessage(
        "/admin/disponibilidad",
        "error",
        "Ingresá fecha y horario válidos",
      ),
    );
  }

  await prisma.timeBlock.create({
    data: { date, startMinute: start, endMinute: end, reason },
  });

  refreshAll();
  redirect(withMessage("/admin/disponibilidad", "ok", "Bloqueo agregado"));
}

export async function deleteTimeBlockAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await prisma.timeBlock.delete({ where: { id } }).catch(() => undefined);
  }
  refreshAll();
  redirect(withMessage("/admin/disponibilidad", "ok", "Bloqueo eliminado"));
}

export async function createManualAppointmentAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  const date = String(formData.get("date") ?? "");
  const start = parseTimeToMinutes(String(formData.get("time") ?? ""));
  const serviceId = String(formData.get("serviceId") ?? "");
  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientPhone = String(formData.get("clientPhone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  if (start === null) {
    redirect(
      withMessage(
        `/admin/agenda?date=${date}`,
        "error",
        "Horario inválido",
      ),
    );
  }

  if (
    !isValidDateKey(date) ||
    !serviceId ||
    clientName.length < 2 ||
    clientPhone.length < 6
  ) {
    redirect(
      withMessage(
        `/admin/agenda?date=${date}`,
        "error",
        "Revisá los datos del cliente",
      ),
    );
  }

  try {
    await createManualAppointment({
      date,
      startMinute: start,
      serviceIds: [serviceId],
      clientName,
      clientPhone,
      notes,
    });
  } catch (error) {
    const message =
      error instanceof BookingError
        ? error.message
        : "No se pudo crear el turno";
    redirect(withMessage(`/admin/agenda?date=${date}`, "error", message));
  }

  refreshAll();
  redirect(
    withMessage(
      `/admin/agenda?date=${date}`,
      "ok",
      "Turno manual creado",
    ),
  );
}

export async function updateAppointmentStatusAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const redirectTo = safeAdminRedirect(
    String(formData.get("redirectTo") ?? "/admin/agenda"),
  );

  const allowed = ["CANCELLED_ADMIN", "COMPLETED", "NO_SHOW"];
  if (!allowed.includes(status)) {
    redirect(withMessage(redirectTo, "error", "Estado inválido"));
  }

  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) {
    redirect(withMessage(redirectTo, "error", "Turno no encontrado"));
  }

  if (appointment.status !== "CONFIRMED") {
    redirect(
      withMessage(
        redirectTo,
        "error",
        "Solo se pueden modificar turnos confirmados",
      ),
    );
  }

  const settings = status === "NO_SHOW" ? await getSettings() : null;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.appointment.updateMany({
      where: { id, status: "CONFIRMED" },
      data: {
        status: status as "CANCELLED_ADMIN" | "COMPLETED" | "NO_SHOW",
      },
    });

    if (result.count === 0) return null;

    if (status === "NO_SHOW" && settings) {
      await applyNoShowPenalty(tx, appointment, settings.penaltyDays);
    }

    return tx.appointment.findUnique({ where: { id } });
  });

  if (!updated) {
    redirect(withMessage(redirectTo, "error", "El turno ya fue modificado"));
  }

  refreshAll();
  redirect(withMessage(redirectTo, "ok", "Turno actualizado"));
}

export async function liftPenaltyAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect(
      withMessage("/admin/penalizaciones", "error", "Penalización inválida"),
    );
  }

  const result = await liftPenalty(id);

  refreshAll();
  redirect(
    withMessage(
      "/admin/penalizaciones",
      "ok",
      result.count > 0
        ? "Penalización levantada"
        : "La penalización ya no estaba activa",
    ),
  );
}

export async function findAppointmentForLookup(code: string) {
  await requireAdmin();
  return findAppointmentByCode(code);
}

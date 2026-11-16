import "server-only";

import { Resend } from "resend";
import type { Appointment, AppointmentService } from "@prisma/client";
import type { Settings } from "./settings";
import { summarizeServiceNames } from "./services";
import {
  formatCurrency,
  formatDateLong,
  formatDateShort,
  formatMinutes,
} from "./time";

type AppointmentWithServices = Appointment & { services: AppointmentService[] };

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function envValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value) return undefined;

  const unquoted = value.replace(/^(["'])(.*)\1$/, "$2").trim();
  return unquoted || undefined;
}

function getFrom(): string {
  return envValue("EMAIL_FROM") ?? "Barbería <onboarding@resend.dev>";
}

function getAppUrl(): string {
  return (envValue("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function describeEmailError(error: unknown): string {
  if (!error || typeof error !== "object") return String(error);

  const record = error as Record<string, unknown>;
  const parts = ["name", "message", "statusCode"]
    .filter((key) => record[key] !== undefined)
    .map((key) => `${key}=${String(record[key])}`);

  return parts.length ? parts.join(" | ") : JSON.stringify(error);
}

async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const apiKey = envValue("RESEND_API_KEY");
  const from = getFrom();

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `[email] RESEND_API_KEY no configurada. Se omitió el email "${input.subject}".`,
      );
      return false;
    }

    console.info(
      `[email:dev] Para: ${input.to} | Asunto: ${input.subject}\n${input.text}`,
    );
    return true;
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (error) {
      console.error(
        `[email] Resend rechazó "${input.subject}" (from=${from}, to=${input.to}): ${describeEmailError(error)}`,
      );

      if (error.name === "validation_error" && /resend\.dev/i.test(from)) {
        console.error(
          "[email] Con onboarding@resend.dev solo se puede enviar al email dueño de la cuenta de Resend. Verificá un dominio o cambiá ADMIN_EMAIL.",
        );
      }

      return false;
    }

    console.info(
      `[email] Enviado "${input.subject}" a ${input.to} (from=${from}, id=${data?.id}).`,
    );
    return true;
  } catch (error) {
    console.error(
      `[email] Error inesperado al enviar "${input.subject}" (from=${from}, to=${input.to}): ${describeEmailError(error)}`,
    );
    return false;
  }
}

function buildHtml(input: {
  appointment: AppointmentWithServices;
  settings: Settings;
}): string {
  const { appointment, settings } = input;
  const turnoUrl = `${getAppUrl()}/turno/${appointment.code}`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1c1917;">
      <h1 style="font-size: 22px; margin-bottom: 8px;">Turno confirmado</h1>
      <p style="color: #57534e; line-height: 1.5;">${escapeHtml(appointment.clientName)} reservó un turno que quedó confirmado automáticamente.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px 0; color: #78716c;">Servicio</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${escapeHtml(summarizeServiceNames(appointment.services))}</td></tr>
        <tr><td style="padding: 8px 0; color: #78716c;">Fecha</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${escapeHtml(formatDateLong(appointment.date))}</td></tr>
        <tr><td style="padding: 8px 0; color: #78716c;">Hora</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatMinutes(appointment.startMinute)} hs</td></tr>
        <tr><td style="padding: 8px 0; color: #78716c;">Precio</td><td style="padding: 8px 0; text-align: right;">${formatCurrency(appointment.priceCents)}</td></tr>
        <tr><td style="padding: 8px 0; color: #78716c;">Teléfono</td><td style="padding: 8px 0; text-align: right;">${escapeHtml(appointment.clientPhone)}</td></tr>
        <tr><td style="padding: 8px 0; color: #78716c;">Código</td><td style="padding: 8px 0; text-align: right; font-family: monospace;">${escapeHtml(appointment.code)}</td></tr>
      </table>
      ${appointment.notes ? `<p style="color: #57534e; line-height: 1.5;">Notas: ${escapeHtml(appointment.notes)}</p>` : ""}
      <p style="margin-top: 24px;">
        <a href="${turnoUrl}" style="background: #b45309; color: #fff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ver turno</a>
      </p>
      <p style="color: #a8a29e; font-size: 12px; margin-top: 28px; line-height: 1.5;">${escapeHtml(settings.businessName)}</p>
    </div>
  `;
}

function buildText(input: {
  appointment: AppointmentWithServices;
  settings: Settings;
}): string {
  const { appointment, settings } = input;
  return [
    "Turno confirmado",
    "",
    `${appointment.clientName} reservó un turno que quedó confirmado automáticamente.`,
    "",
    `Cliente: ${appointment.clientName}`,
    `Teléfono: ${appointment.clientPhone}`,
    `Servicio: ${summarizeServiceNames(appointment.services)}`,
    `Fecha: ${formatDateLong(appointment.date)}`,
    `Hora: ${formatMinutes(appointment.startMinute)} hs`,
    `Precio: ${formatCurrency(appointment.priceCents)}`,
    `Código: ${appointment.code}`,
    appointment.notes ? `Notas: ${appointment.notes}` : "",
    "",
    `Ver turno: ${getAppUrl()}/turno/${appointment.code}`,
    "",
    settings.businessName,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendNewAppointmentNotification(
  appointment: AppointmentWithServices,
  settings: Settings,
): Promise<boolean> {
  const adminEmail = envValue("ADMIN_EMAIL");
  if (!adminEmail) {
    console.warn(
      "[email] ADMIN_EMAIL no configurada. Se omitió el aviso de turno confirmado.",
    );
    return false;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    console.error(
      `[email] ADMIN_EMAIL no parece un email válido ("${adminEmail}"). Revisá comillas o espacios en la variable de entorno.`,
    );
    return false;
  }

  return sendEmail({
    to: adminEmail,
    subject: `Turno confirmado - ${appointment.clientName} - ${formatDateShort(appointment.date)} ${formatMinutes(appointment.startMinute)} hs`,
    html: buildHtml({ appointment, settings }),
    text: buildText({ appointment, settings }),
  });
}

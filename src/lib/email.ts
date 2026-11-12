import "server-only";

import { Resend } from "resend";
import type { Appointment } from "@prisma/client";
import type { Settings } from "./settings";
import { formatCurrency, formatDateLong, formatMinutes } from "./time";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFrom(): string {
  return process.env.EMAIL_FROM ?? "Barbería <onboarding@resend.dev>";
}

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `[email] RESEND_API_KEY no configurada. Se omitió el email "${input.subject}".`,
      );
      return;
    }

    console.info(
      `[email:dev] Para: ${input.to} | Asunto: ${input.subject}\n${input.text}`,
    );
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: getFrom(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (error) {
      console.error("[email] No se pudo enviar:", error);
    }
  } catch (error) {
    console.error("[email] Error inesperado:", error);
  }
}

function buildHtml(input: {
  appointment: Appointment;
  settings: Settings;
}): string {
  const { appointment, settings } = input;
  const turnoUrl = `${getAppUrl()}/turno/${appointment.code}`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1c1917;">
      <h1 style="font-size: 22px; margin-bottom: 8px;">Nuevo turno</h1>
      <p style="color: #57534e; line-height: 1.5;">${escapeHtml(appointment.clientName)} reservó un turno.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px 0; color: #78716c;">Servicio</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${escapeHtml(settings.serviceName)}</td></tr>
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
  appointment: Appointment;
  settings: Settings;
}): string {
  const { appointment, settings } = input;
  return [
    "Nuevo turno",
    "",
    `Cliente: ${appointment.clientName}`,
    `Teléfono: ${appointment.clientPhone}`,
    `Servicio: ${settings.serviceName}`,
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
  appointment: Appointment,
  settings: Settings,
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  await sendEmail({
    to: adminEmail,
    subject: `Nuevo turno - ${appointment.clientName}`,
    html: buildHtml({ appointment, settings }),
    text: buildText({ appointment, settings }),
  });
}

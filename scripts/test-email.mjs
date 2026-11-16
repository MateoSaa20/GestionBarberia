import { existsSync } from "node:fs";
import path from "node:path";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    console.warn("[test-email] No se encontró .env; se usan variables del entorno.");
    return;
  }

  try {
    process.loadEnvFile(envPath);
    console.info("[test-email] Variables cargadas desde .env");
  } catch (error) {
    console.error("[test-email] No se pudo leer .env:", error);
  }
}

function envValue(name) {
  const value = process.env[name]?.trim();
  if (!value) return undefined;

  const unquoted = value.replace(/^(["'])(.*)\1$/, "$2").trim();
  return unquoted || undefined;
}

function mask(value) {
  if (!value) return "(vacío)";
  return `${value.slice(0, 5)}…${value.slice(-4)} (${value.length} chars)`;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function extractEmail(value) {
  const match = value.match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
}

function explainError(status, body) {
  const name = body?.name ?? body?.error?.name;
  const message = body?.message ?? body?.error?.message;

  if (status === 401) {
    return "La API key es inválida, está revocada o tiene permisos insuficientes.";
  }
  if (name === "validation_error") {
    return "Resend rechazó los datos. Si usás onboarding@resend.dev, el destino debe ser el email dueño de la cuenta de Resend. Para enviar a terceros, verificá un dominio y usalo en EMAIL_FROM.";
  }
  if (/domain/i.test(message ?? "")) {
    return "El dominio del remitente no está verificado en Resend.";
  }
  if (status === 429) {
    return "Superaste el límite de envíos de Resend.";
  }
  return "Revisá el detalle de la respuesta y el dashboard de Resend (Logs).";
}

async function main() {
  loadEnv();

  const apiKey = envValue("RESEND_API_KEY");
  const adminEmail = envValue("ADMIN_EMAIL");
  const from = envValue("EMAIL_FROM") ?? "Barbería <onboarding@resend.dev>";

  console.info("[test-email] Configuración detectada:");
  console.info(`  RESEND_API_KEY = ${mask(apiKey)}`);
  console.info(`  ADMIN_EMAIL    = ${adminEmail ?? "(vacío)"}`);
  console.info(`  EMAIL_FROM     = ${from}`);

  let hasError = false;

  if (!apiKey) {
    console.error("\n[test-email] Falta RESEND_API_KEY. Sin ella no se envía ningún email en producción.");
    hasError = true;
  }
  if (!adminEmail) {
    console.error("\n[test-email] Falta ADMIN_EMAIL. La app omite el aviso sin destinatario.");
    hasError = true;
  } else if (!isValidEmail(adminEmail)) {
    console.error(
      `\n[test-email] ADMIN_EMAIL no es válido ("${adminEmail}"). Quitá comillas o espacios en Netlify/.env.`,
    );
    hasError = true;
  }

  const fromEmail = extractEmail(from);
  if (!isValidEmail(fromEmail)) {
    console.error(`\n[test-email] EMAIL_FROM no contiene un email válido ("${from}").`);
    hasError = true;
  }
  if (/resend\.dev$/i.test(fromEmail) && adminEmail && fromEmail !== adminEmail) {
    console.warn(
      "\n[test-email] Aviso: con onboarding@resend.dev Resend solo entrega al email dueño de la cuenta. Si ADMIN_EMAIL no es ese email, el envío fallará.",
    );
  }

  if (hasError) {
    process.exitCode = 1;
    return;
  }

  console.info(`\n[test-email] Enviando prueba a ${adminEmail}...`);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: adminEmail,
      subject: "Prueba de configuración - Gestor de turnos",
      text: "Si recibiste este correo, la configuración de Resend funciona correctamente.",
      html: "<p>Si recibiste este correo, la configuración de Resend funciona correctamente.</p>",
    }),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    console.error(`\n[test-email] Falló con HTTP ${response.status}.`);
    console.error(`  Respuesta: ${JSON.stringify(body)}`);
    console.error(`  Causa probable: ${explainError(response.status, body)}`);
    process.exitCode = 1;
    return;
  }

  console.info(`\n[test-email] OK. Resend aceptó el envío (id=${body?.id ?? "?"}).`);
  console.info(
    "[test-email] Si no llega en unos minutos, revisá spam y el dashboard de Resend.",
  );
}

main().catch((error) => {
  console.error("[test-email] Error inesperado:", error);
  process.exitCode = 1;
});

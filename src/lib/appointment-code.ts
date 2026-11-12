import "server-only";

import { randomBytes } from "node:crypto";

export function generateAppointmentCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let code = "";
  for (const byte of bytes) {
    code += alphabet[byte % alphabet.length];
  }
  return `BT-${code}`;
}

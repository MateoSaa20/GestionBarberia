import { describe, expect, it } from "vitest";
import {
  isPenaltyActive,
  normalizeClientPhone,
  penaltyBookingMessage,
  penaltyEndsAt,
} from "./penalty-rules";

const NOW = new Date("2026-03-10T12:00:00Z");

describe("normalizeClientPhone", () => {
  it("deja solo los dígitos", () => {
    expect(normalizeClientPhone("  +54 11 5555-1234 ")).toBe("541155551234");
  });
});

describe("penaltyEndsAt", () => {
  it("suma los días indicados", () => {
    expect(penaltyEndsAt(NOW, 30)).toEqual(
      new Date("2026-04-09T12:00:00Z"),
    );
  });
});

describe("isPenaltyActive", () => {
  const base = {
    startsAt: new Date("2026-03-10T11:00:00Z"),
    endsAt: new Date("2026-03-11T12:00:00Z"),
    liftedAt: null,
  };

  it("está activa dentro del rango", () => {
    expect(isPenaltyActive(base, NOW)).toBe(true);
  });

  it("no está activa si fue levantada", () => {
    expect(
      isPenaltyActive({ ...base, liftedAt: new Date("2026-03-10T13:00:00Z") }, NOW),
    ).toBe(false);
  });

  it("no está activa si ya venció", () => {
    expect(
      isPenaltyActive(
        { ...base, endsAt: new Date("2026-03-10T12:00:00Z") },
        NOW,
      ),
    ).toBe(false);
  });

  it("no está activa si todavía no empezó", () => {
    expect(
      isPenaltyActive(
        { ...base, startsAt: new Date("2026-03-10T13:00:00Z") },
        NOW,
      ),
    ).toBe(false);
  });
});

describe("penaltyBookingMessage", () => {
  it("incluye la fecha de fin y el motivo", () => {
    const message = penaltyBookingMessage(
      new Date("2026-04-09T12:00:00Z"),
      "America/Argentina/Buenos_Aires",
    );

    expect(message).toContain("No podés reservar hasta el");
    expect(message).toContain("porque no asististe a un turno previo");
  });
});

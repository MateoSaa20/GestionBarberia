import { describe, expect, it } from "vitest";
import { computeAvailability, type AvailabilityInput } from "./availability";

const TUESDAY = "2026-03-10";

const baseInput: AvailabilityInput = {
  dateKey: TUESDAY,
  weeklySchedule: [
    { dayOfWeek: 2, startMinute: 540, endMinute: 660, enabled: true },
  ],
  override: null,
  timeBlocks: [],
  appointments: [],
  serviceDurationMin: 30,
  bufferMin: 10,
  minLeadTimeMin: 60,
  now: new Date("2026-03-01T12:00:00-03:00"),
  timeZone: "America/Argentina/Buenos_Aires",
};

function starts(result: ReturnType<typeof computeAvailability>) {
  return result.slots.map((slot) => slot.startMinute);
}

describe("computeAvailability", () => {
  it("genera slots con duración + buffer", () => {
    const result = computeAvailability(baseInput);
    expect(starts(result)).toEqual([540, 580, 620]);
  });

  it("no ofrece turnos si el día está cerrado", () => {
    const result = computeAvailability({
      ...baseInput,
      override: { type: "CLOSED", startMinute: null, endMinute: null },
    });
    expect(result.slots).toHaveLength(0);
    expect(result.closedReason).toBe("CLOSED");
  });

  it("usa el horario personalizado del override", () => {
    const result = computeAvailability({
      ...baseInput,
      override: { type: "CUSTOM_HOURS", startMinute: 600, endMinute: 700 },
    });
    expect(starts(result)).toEqual([600, 640]);
  });

  it("excluye turnos ocupados respetando el buffer", () => {
    const result = computeAvailability({
      ...baseInput,
      appointments: [
        {
          startMinute: 580,
          endMinute: 610,
          status: "CONFIRMED",
        },
      ],
    });
    expect(starts(result)).toEqual([540, 620]);
  });

  it("bloquea turnos completados", () => {
    const result = computeAvailability({
      ...baseInput,
      appointments: [
        {
          startMinute: 580,
          endMinute: 610,
          status: "COMPLETED",
        },
      ],
    });
    expect(starts(result)).toEqual([540, 620]);
  });

  it("respeta los bloqueos de horario", () => {
    const result = computeAvailability({
      ...baseInput,
      timeBlocks: [{ startMinute: 570, endMinute: 600 }],
    });
    expect(starts(result)).toEqual([540, 620]);
  });

  it("aplica el tiempo mínimo de anticipación para hoy", () => {
    const result = computeAvailability({
      ...baseInput,
      dateKey: "2026-03-10",
      now: new Date("2026-03-10T08:30:00-03:00"),
    });
    expect(starts(result)).toEqual([580, 620]);
  });

  it("devuelve PAST para fechas anteriores", () => {
    const result = computeAvailability({
      ...baseInput,
      dateKey: "2026-02-28",
    });
    expect(result.closedReason).toBe("PAST");
  });

  it("ignora franjas deshabilitadas", () => {
    const result = computeAvailability({
      ...baseInput,
      weeklySchedule: [
        { dayOfWeek: 2, startMinute: 540, endMinute: 660, enabled: false },
      ],
    });
    expect(result.slots).toHaveLength(0);
    expect(result.closedReason).toBe("NO_SCHEDULE");
  });

  it("genera turnos en varias franjas del mismo día", () => {
    const result = computeAvailability({
      ...baseInput,
      weeklySchedule: [
        { dayOfWeek: 2, startMinute: 540, endMinute: 620, enabled: true },
        { dayOfWeek: 2, startMinute: 900, endMinute: 980, enabled: true },
      ],
    });
    expect(starts(result)).toEqual([540, 580, 900, 940]);
  });

  it("no bloquea con turnos cancelados", () => {
    const result = computeAvailability({
      ...baseInput,
      appointments: [
        {
          startMinute: 580,
          endMinute: 610,
          status: "CANCELLED_CLIENT",
        },
      ],
    });
    expect(starts(result)).toEqual([540, 580, 620]);
  });

  it("incluye el turno justo en el límite de anticipación", () => {
    const result = computeAvailability({
      ...baseInput,
      now: new Date("2026-03-10T08:00:00-03:00"),
    });
    expect(starts(result)).toEqual([540, 580, 620]);
  });

  it("permite horarios pasados cuando allowPastSlots está activo", () => {
    const result = computeAvailability({
      ...baseInput,
      now: new Date("2026-03-10T18:00:00-03:00"),
      allowPastSlots: true,
    });
    expect(starts(result)).toEqual([540, 580, 620]);
  });

  it("respeta el borde de un bloqueo", () => {
    const result = computeAvailability({
      ...baseInput,
      timeBlocks: [{ startMinute: 540, endMinute: 570 }],
    });
    expect(starts(result)).toEqual([580, 620]);
  });
});

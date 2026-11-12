import { describe, expect, it } from "vitest";
import {
  addDaysToKey,
  dayOfWeekFromKey,
  formatEndMinutes,
  formatMinutes,
  isValidDateKey,
  minutesNowInTz,
  parseTimeToMinutes,
  toDateKey,
} from "./time";

describe("isValidDateKey", () => {
  it("acepta fechas ISO válidas", () => {
    expect(isValidDateKey("2026-03-10")).toBe(true);
    expect(isValidDateKey("2024-02-29")).toBe(true);
  });

  it("rechaza formatos y fechas imposibles", () => {
    expect(isValidDateKey("2026-3-10")).toBe(false);
    expect(isValidDateKey("10/03/2026")).toBe(false);
    expect(isValidDateKey("2026-02-30")).toBe(false);
    expect(isValidDateKey("2026-13-01")).toBe(false);
  });
});

describe("addDaysToKey", () => {
  it("suma y resta días cruzando mes y año", () => {
    expect(addDaysToKey("2026-03-31", 1)).toBe("2026-04-01");
    expect(addDaysToKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDaysToKey("2024-02-28", 1)).toBe("2024-02-29");
  });
});

describe("dayOfWeekFromKey", () => {
  it("devuelve el día de la semana en UTC", () => {
    expect(dayOfWeekFromKey("2026-03-10")).toBe(2);
    expect(dayOfWeekFromKey("2026-03-15")).toBe(0);
  });
});

describe("parseTimeToMinutes", () => {
  it("convierte horas válidas", () => {
    expect(parseTimeToMinutes("09:30")).toBe(570);
    expect(parseTimeToMinutes("9:05")).toBe(545);
    expect(parseTimeToMinutes("00:00")).toBe(0);
  });

  it("rechaza horarios inválidos", () => {
    expect(parseTimeToMinutes("24:00")).toBeNull();
    expect(parseTimeToMinutes("09:60")).toBeNull();
    expect(parseTimeToMinutes("abc")).toBeNull();
  });
});

describe("formatMinutes", () => {
  it("formatea y normaliza minutos", () => {
    expect(formatMinutes(0)).toBe("00:00");
    expect(formatMinutes(570)).toBe("09:30");
    expect(formatMinutes(1440)).toBe("00:00");
    expect(formatMinutes(-30)).toBe("23:30");
  });
});

describe("formatEndMinutes", () => {
  it("muestra el fin del día como 24:00", () => {
    expect(formatEndMinutes(570)).toBe("09:30");
    expect(formatEndMinutes(1440)).toBe("24:00");
  });
});

describe("zona horaria", () => {
  it("calcula la fecha local de Buenos Aires", () => {
    const lateNightUtc = new Date("2026-03-11T02:00:00Z");
    expect(toDateKey(lateNightUtc, "America/Argentina/Buenos_Aires")).toBe(
      "2026-03-10",
    );
  });

  it("calcula los minutos transcurridos del día local", () => {
    const lateNightUtc = new Date("2026-03-11T02:30:00Z");
    expect(minutesNowInTz(lateNightUtc, "America/Argentina/Buenos_Aires")).toBe(
      23 * 60 + 30,
    );
  });
});

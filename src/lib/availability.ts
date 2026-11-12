import {
  dayOfWeekFromKey,
  formatMinutes,
  minutesNowInTz,
  TIMEZONE,
  toDateKey,
} from "./time";

export type AppointmentStatusLike =
  | "CONFIRMED"
  | "CANCELLED_CLIENT"
  | "CANCELLED_ADMIN"
  | "COMPLETED"
  | "NO_SHOW";

export type Interval = {
  startMinute: number;
  endMinute: number;
};

export type BusyAppointment = Interval & {
  status: AppointmentStatusLike;
};

export type WeeklyScheduleInput = Interval & {
  dayOfWeek: number;
  enabled: boolean;
};

export type DayOverrideInput = {
  type: "CLOSED" | "CUSTOM_HOURS";
  startMinute: number | null;
  endMinute: number | null;
};

export type AvailabilityInput = {
  dateKey: string;
  weeklySchedule: WeeklyScheduleInput[];
  override?: DayOverrideInput | null;
  timeBlocks: Interval[];
  appointments: BusyAppointment[];
  serviceDurationMin: number;
  bufferMin: number;
  minLeadTimeMin: number;
  allowPastSlots?: boolean;
  now?: Date;
  timeZone?: string;
};

export type Slot = {
  startMinute: number;
  endMinute: number;
  label: string;
};

export type AvailabilityResult = {
  slots: Slot[];
  closedReason?: "CLOSED" | "NO_SCHEDULE" | "PAST" | "OUT_OF_WINDOW";
};

export function hasOverlap(a: Interval, b: Interval): boolean {
  return a.startMinute < b.endMinute && b.startMinute < a.endMinute;
}

export function isAppointmentActive(appointment: BusyAppointment): boolean {
  return (
    appointment.status === "CONFIRMED" || appointment.status === "COMPLETED"
  );
}

export function getBaseIntervals(input: {
  dateKey: string;
  weeklySchedule: WeeklyScheduleInput[];
  override?: DayOverrideInput | null;
}): Interval[] {
  if (input.override?.type === "CLOSED") return [];

  if (
    input.override?.type === "CUSTOM_HOURS" &&
    input.override.startMinute !== null &&
    input.override.endMinute !== null &&
    input.override.endMinute > input.override.startMinute
  ) {
    return [
      {
        startMinute: input.override.startMinute,
        endMinute: input.override.endMinute,
      },
    ];
  }

  const dayOfWeek = dayOfWeekFromKey(input.dateKey);
  return input.weeklySchedule
    .filter(
      (interval) =>
        interval.enabled &&
        interval.dayOfWeek === dayOfWeek &&
        interval.endMinute > interval.startMinute,
    )
    .map((interval) => ({
      startMinute: interval.startMinute,
      endMinute: interval.endMinute,
    }))
    .sort((a, b) => a.startMinute - b.startMinute);
}

export function computeAvailability(
  input: AvailabilityInput,
): AvailabilityResult {
  const timeZone = input.timeZone ?? TIMEZONE;
  const now = input.now ?? new Date();
  const today = toDateKey(now, timeZone);

  if (input.dateKey < today && !input.allowPastSlots) {
    return { slots: [], closedReason: "PAST" };
  }

  if (input.override?.type === "CLOSED") {
    return { slots: [], closedReason: "CLOSED" };
  }

  const intervals = getBaseIntervals(input);

  if (intervals.length === 0) {
    return { slots: [], closedReason: "NO_SCHEDULE" };
  }

  const step = Math.max(5, input.serviceDurationMin + input.bufferMin);
  const duration = Math.max(5, input.serviceDurationMin);
  const isToday = input.dateKey === today;
  const nowMinutes = minutesNowInTz(now, timeZone);
  const earliestStart =
    isToday && !input.allowPastSlots
      ? nowMinutes + input.minLeadTimeMin
      : -1;

  const busy: Interval[] = [
    ...input.timeBlocks,
    ...input.appointments
      .filter((appointment) => isAppointmentActive(appointment))
      .map((appointment) => ({
        startMinute: appointment.startMinute - input.bufferMin,
        endMinute: appointment.endMinute + input.bufferMin,
      })),
  ];

  const slots: Slot[] = [];
  const seen = new Set<number>();

  for (const interval of intervals) {
    for (
      let start = interval.startMinute;
      start + duration <= interval.endMinute;
      start += step
    ) {
      if (start < earliestStart) continue;

      const candidate: Interval = {
        startMinute: start,
        endMinute: start + duration,
      };

      if (busy.some((blocked) => hasOverlap(candidate, blocked))) continue;
      if (seen.has(start)) continue;

      seen.add(start);
      slots.push({
        startMinute: start,
        endMinute: start + duration,
        label: formatMinutes(start),
      });
    }
  }

  slots.sort((a, b) => a.startMinute - b.startMinute);
  return { slots };
}

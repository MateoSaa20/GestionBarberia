import "server-only";

import { Prisma, type AppointmentStatus } from "@prisma/client";
import { prisma } from "./db";
import { getSettings, type Settings } from "./settings";
import {
  computeAvailability,
  getBaseIntervals,
  hasOverlap,
  isAppointmentActive,
  type AvailabilityResult,
  type DayOverrideInput,
  type Interval,
  type WeeklyScheduleInput,
} from "./availability";
import { generateAppointmentCode } from "./appointment-code";
import { getActivePenalty, normalizeClientPhone } from "./penalties";
import { penaltyBookingMessage } from "./penalty-rules";
import {
  addDaysToKey,
  isValidDateKey,
  minutesNowInTz,
  todayKey,
} from "./time";

export type BookingErrorCode =
  | "INVALID_DATE"
  | "INVALID_TIME"
  | "OUTSIDE_HOURS"
  | "SLOT_TAKEN"
  | "PAST_DATE"
  | "TOO_SOON"
  | "OUT_OF_WINDOW"
  | "CLOSED"
  | "NOT_FOUND"
  | "INVALID_STATUS"
  | "PENALIZED";

export class BookingError extends Error {
  code: BookingErrorCode;

  constructor(code: BookingErrorCode, message: string) {
    super(message);
    this.name = "BookingError";
    this.code = code;
  }
}

export type DayContext = {
  settings: Settings;
  weeklySchedule: WeeklyScheduleInput[];
  override: DayOverrideInput | null;
  timeBlocks: Interval[];
  appointments: Array<
    Interval & {
      id: string;
      status: AppointmentStatus;
      clientName: string;
    }
  >;
};

export async function loadDayContext(dateKey: string): Promise<DayContext> {
  const settings = await getSettings();

  const [weekly, override, blocks, appointments] = await Promise.all([
    prisma.weeklySchedule.findMany({ orderBy: { startMinute: "asc" } }),
    prisma.dayOverride.findUnique({ where: { date: dateKey } }),
    prisma.timeBlock.findMany({ where: { date: dateKey } }),
    prisma.appointment.findMany({
      where: { date: dateKey },
      orderBy: { startMinute: "asc" },
      select: {
        id: true,
        startMinute: true,
        endMinute: true,
        status: true,
        clientName: true,
      },
    }),
  ]);

  return {
    settings,
    weeklySchedule: weekly,
    override: override
      ? {
          type: override.type,
          startMinute: override.startMinute,
          endMinute: override.endMinute,
        }
      : null,
    timeBlocks: blocks.map((block) => ({
      startMinute: block.startMinute,
      endMinute: block.endMinute,
    })),
    appointments,
  };
}

export async function getAvailability(
  dateKey: string,
  options: { forAdmin?: boolean } = {},
): Promise<AvailabilityResult & { settings: Settings }> {
  if (!isValidDateKey(dateKey)) {
    throw new BookingError("INVALID_DATE", "Fecha inválida");
  }

  const context = await loadDayContext(dateKey);
  const now = new Date();
  const today = todayKey(now, context.settings.timezone);

  if (
    !options.forAdmin &&
    dateKey > addDaysToKey(today, context.settings.bookingWindowDays)
  ) {
    return {
      slots: [],
      closedReason: "OUT_OF_WINDOW",
      settings: context.settings,
    };
  }

  const result = computeAvailability({
    dateKey,
    weeklySchedule: context.weeklySchedule,
    override: context.override,
    timeBlocks: context.timeBlocks,
    appointments: context.appointments,
    serviceDurationMin: context.settings.serviceDurationMin,
    bufferMin: context.settings.bufferMin,
    minLeadTimeMin: options.forAdmin ? 0 : context.settings.minLeadTimeMin,
    allowPastSlots: options.forAdmin,
    now,
    timeZone: context.settings.timezone,
  });

  return { ...result, settings: context.settings };
}

export async function getDayOverview(dateKey: string) {
  if (!isValidDateKey(dateKey)) {
    throw new BookingError("INVALID_DATE", "Fecha inválida");
  }

  const context = await loadDayContext(dateKey);
  const now = new Date();
  const availability = computeAvailability({
    dateKey,
    weeklySchedule: context.weeklySchedule,
    override: context.override,
    timeBlocks: context.timeBlocks,
    appointments: context.appointments,
    serviceDurationMin: context.settings.serviceDurationMin,
    bufferMin: context.settings.bufferMin,
    minLeadTimeMin: 0,
    allowPastSlots: true,
    now,
    timeZone: context.settings.timezone,
  });

  const [appointments, overrides, blocks] = await Promise.all([
    prisma.appointment.findMany({
      where: { date: dateKey },
      orderBy: { startMinute: "asc" },
    }),
    prisma.dayOverride.findUnique({ where: { date: dateKey } }),
    prisma.timeBlock.findMany({
      where: { date: dateKey },
      orderBy: { startMinute: "asc" },
    }),
  ]);

  return {
    settings: context.settings,
    appointments,
    override: overrides,
    blocks,
    slots: availability.slots,
    closedReason: availability.closedReason,
  };
}

type SlotCheckOptions = {
  allowPastSlots?: boolean;
};

async function assertSlotBookable(
  tx: Prisma.TransactionClient,
  input: {
    dateKey: string;
    startMinute: number;
    settings: Settings;
    now: Date;
    options: SlotCheckOptions;
  },
): Promise<number> {
  const { dateKey, startMinute, settings, now, options } = input;
  const duration = settings.serviceDurationMin;
  const endMinute = startMinute + duration;

  if (startMinute < 0 || endMinute > 1440) {
    throw new BookingError("INVALID_TIME", "Horario inválido");
  }

  const [weekly, override, blocks, appointments] = await Promise.all([
    tx.weeklySchedule.findMany(),
    tx.dayOverride.findUnique({ where: { date: dateKey } }),
    tx.timeBlock.findMany({ where: { date: dateKey } }),
    tx.appointment.findMany({
      where: { date: dateKey },
      select: {
        startMinute: true,
        endMinute: true,
        status: true,
      },
    }),
  ]);

  const baseIntervals = getBaseIntervals({
    dateKey,
    weeklySchedule: weekly,
    override: override
      ? {
          type: override.type,
          startMinute: override.startMinute,
          endMinute: override.endMinute,
        }
      : null,
  });

  if (baseIntervals.length === 0) {
    throw new BookingError("CLOSED", "Ese día no hay atención");
  }

  const withinHours = baseIntervals.some(
    (interval) =>
      startMinute >= interval.startMinute && endMinute <= interval.endMinute,
  );

  if (!withinHours) {
    throw new BookingError(
      "OUTSIDE_HOURS",
      "El horario elegido está fuera del horario de atención",
    );
  }

  if (!options.allowPastSlots) {
    const today = todayKey(now, settings.timezone);
    if (dateKey < today) {
      throw new BookingError("PAST_DATE", "No se puede reservar en el pasado");
    }

    if (dateKey > addDaysToKey(today, settings.bookingWindowDays)) {
      throw new BookingError(
        "OUT_OF_WINDOW",
        "La fecha está fuera del período de reserva",
      );
    }

    if (
      dateKey === today &&
      startMinute <
        minutesNowInTz(now, settings.timezone) + settings.minLeadTimeMin
    ) {
      throw new BookingError(
        "TOO_SOON",
        "Ese horario ya no está disponible",
      );
    }
  }

  const candidate = { startMinute, endMinute };
  const busy = [
    ...blocks,
    ...appointments
      .filter((appointment) => isAppointmentActive(appointment))
      .map((appointment) => ({
        startMinute: appointment.startMinute - settings.bufferMin,
        endMinute: appointment.endMinute + settings.bufferMin,
      })),
  ];

  const collides = busy.some((blocked) => hasOverlap(candidate, blocked));

  if (collides) {
    throw new BookingError("SLOT_TAKEN", "Ese horario ya fue reservado");
  }

  return endMinute;
}

async function assertClientNotPenalized(
  tx: Prisma.TransactionClient,
  clientPhone: string,
  now: Date,
  settings: Settings,
) {
  const penalty = await getActivePenalty(clientPhone, now, tx);
  if (penalty) {
    throw new BookingError(
      "PENALIZED",
      penaltyBookingMessage(penalty.endsAt, settings.timezone),
    );
  }
}

async function withDateLock<T>(
  dateKey: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${dateKey}))`;
    return fn(tx);
  });
}

export type OnlineBookingInput = {
  date: string;
  startMinute: number;
  clientName: string;
  clientPhone: string;
  notes?: string;
};

export async function createOnlineAppointment(input: OnlineBookingInput) {
  if (!isValidDateKey(input.date)) {
    throw new BookingError("INVALID_DATE", "Fecha inválida");
  }

  const settings = await getSettings();
  const now = new Date();
  const clientPhone = normalizeClientPhone(input.clientPhone);

  const appointment = await withDateLock(input.date, async (tx) => {
    await assertClientNotPenalized(tx, clientPhone, now, settings);

    const endMinute = await assertSlotBookable(tx, {
      dateKey: input.date,
      startMinute: input.startMinute,
      settings,
      now,
      options: { allowPastSlots: false },
    });

    let code = generateAppointmentCode();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const exists = await tx.appointment.findUnique({ where: { code } });
      if (!exists) break;
      code = generateAppointmentCode();
    }

    return tx.appointment.create({
      data: {
        code,
        clientName: input.clientName,
        clientPhone,
        date: input.date,
        startMinute: input.startMinute,
        endMinute,
        status: "CONFIRMED",
        source: "ONLINE",
        priceCents: settings.servicePriceCents,
        notes: input.notes,
      },
    });
  });

  return { appointment, settings };
}

export async function createManualAppointment(input: OnlineBookingInput) {
  if (!isValidDateKey(input.date)) {
    throw new BookingError("INVALID_DATE", "Fecha inválida");
  }

  const settings = await getSettings();
  const now = new Date();
  const clientPhone = normalizeClientPhone(input.clientPhone);

  return withDateLock(input.date, async (tx) => {
    await assertClientNotPenalized(tx, clientPhone, now, settings);

    const endMinute = await assertSlotBookable(tx, {
      dateKey: input.date,
      startMinute: input.startMinute,
      settings,
      now,
      options: { allowPastSlots: true },
    });

    let code = generateAppointmentCode();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const exists = await tx.appointment.findUnique({ where: { code } });
      if (!exists) break;
      code = generateAppointmentCode();
    }

    return tx.appointment.create({
      data: {
        code,
        clientName: input.clientName,
        clientPhone,
        date: input.date,
        startMinute: input.startMinute,
        endMinute,
        status: "CONFIRMED",
        source: "MANUAL",
        priceCents: settings.servicePriceCents,
        notes: input.notes,
      },
    });
  });
}

export async function findAppointmentByCode(code: string) {
  return prisma.appointment.findUnique({
    where: { code },
  });
}

"use client";

import { useActionState, useState, useTransition } from "react";
import {
  CalendarCheck,
  CalendarDays,
  Clock3,
  Loader2,
  Scissors,
} from "lucide-react";
import {
  createBookingAction,
  getSlotsAction,
  type BookingFormState,
} from "./actions";
import type { Slot } from "@/lib/availability";

type DayOption = { key: string; weekday: string; day: string };

type ServiceOption = {
  id: string;
  name: string;
  priceLabel: string;
  durationLabel: string;
};

export function BookingFlow({
  services,
  initialServiceId,
  days,
  initialDate,
  initialSlots,
  initialMessage,
  minDate,
  maxDate,
  penaltyDays,
}: {
  services: ServiceOption[];
  initialServiceId: string;
  days: DayOption[];
  initialDate: string;
  initialSlots: Slot[];
  initialMessage: string | null;
  minDate: string;
  maxDate: string;
  penaltyDays: number;
}) {
  const [state, formAction, pending] = useActionState<BookingFormState, FormData>(
    createBookingAction,
    undefined,
  );
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [message, setMessage] = useState<string | null>(initialMessage);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loadingSlots, startTransition] = useTransition();

  const selectedService =
    services.find((service) => service.id === serviceId) ?? services[0];

  function loadSlots(nextDate: string, nextServiceId: string) {
    setSlots([]);
    setMessage(null);
    setSelectedTime(null);
    startTransition(async () => {
      const result = await getSlotsAction(nextDate, nextServiceId);
      setSlots(result.slots);
      setMessage(result.message);
    });
  }

  function selectDate(next: string) {
    if (next === date) return;
    setDate(next);
    loadSlots(next, serviceId);
  }

  function selectService(next: string) {
    if (next === serviceId) return;
    setServiceId(next);
    loadSlots(date, next);
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="time" value={selectedTime ?? ""} />
      <input type="hidden" name="serviceId" value={serviceId} />

      {services.length > 1 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-stone-900">
              Elegí el servicio
            </h2>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {services.map((service) => {
              const active = service.id === serviceId;
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => selectService(service.id)}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${
                    active
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-700 hover:border-amber-400"
                  }`}
                >
                  <span className="text-sm font-medium">{service.name}</span>
                  <span
                    className={`text-xs ${
                      active ? "text-stone-300" : "text-stone-500"
                    }`}
                  >
                    {service.priceLabel} · {service.durationLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-stone-900">Elegí el día</h2>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {days.map((option) => {
            const active = option.key === date;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => selectDate(option.key)}
                className={`flex flex-col items-center rounded-xl border px-2 py-2 text-center transition ${
                  active
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white text-stone-700 hover:border-amber-400"
                }`}
              >
                <span
                  className={`text-[10px] uppercase ${
                    active ? "text-stone-300" : "text-stone-400"
                  }`}
                >
                  {option.weekday}
                </span>
                <span className="text-lg font-semibold">{option.day}</span>
              </button>
            );
          })}
        </div>

        <label className="mt-3 flex items-center gap-2">
          <span className="shrink-0 text-xs text-stone-500">Otra fecha</span>
          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={date}
            onChange={(event) => selectDate(event.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-stone-900">
            Elegí el horario
          </h2>
          {loadingSlots ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400" />
          ) : null}
        </div>

        {slots.length === 0 ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {loadingSlots
              ? "Buscando horarios..."
              : (message ?? "No quedan horarios libres para este día.")}
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              const active = selectedTime === slot.label;
              return (
                <button
                  key={slot.startMinute}
                  type="button"
                  onClick={() => setSelectedTime(slot.label)}
                  className={`rounded-lg border px-2 py-2 text-center text-sm font-medium transition ${
                    active
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-700 hover:border-amber-400"
                  }`}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-stone-900">Tus datos</h2>

        {selectedTime ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {selectedService?.name} ·{" "}
            <span className="font-semibold">{selectedTime} hs</span> ·{" "}
            {selectedService?.durationLabel} · {selectedService?.priceLabel}
          </p>
        ) : (
          <p className="mt-2 text-xs text-stone-500">
            Elegí un horario para completar tus datos.
          </p>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="clientName"
              className="mb-1 block text-sm font-medium text-stone-700"
            >
              Nombre y apellido
            </label>
            <input
              id="clientName"
              name="clientName"
              required
              autoComplete="name"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="clientPhone"
              className="mb-1 block text-sm font-medium text-stone-700"
            >
              Teléfono
            </label>
            <input
              id="clientPhone"
              name="clientPhone"
              required
              autoComplete="tel"
              inputMode="tel"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="notes"
              className="mb-1 block text-sm font-medium text-stone-700"
            >
              Notas (opcional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
              placeholder="Alguna preferencia"
            />
          </div>
        </div>

        {state?.error ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || !selectedTime}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarCheck className="h-4 w-4" />
          )}
          {pending ? "Reservando..." : "Confirmar reserva"}
        </button>

        {penaltyDays > 0 ? (
          <p className="mt-3 text-center text-xs text-orange-700">
            Si no asistís al turno, no podrás reservar durante {penaltyDays} días.
          </p>
        ) : null}
      </div>
    </form>
  );
}

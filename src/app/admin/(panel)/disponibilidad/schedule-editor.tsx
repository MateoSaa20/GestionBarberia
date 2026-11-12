"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Save, Trash2 } from "lucide-react";
import { formatMinutes, parseTimeToMinutes, WEEKDAY_NAMES } from "@/lib/time";
import { saveScheduleAction } from "../../actions";

type Interval = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  enabled: boolean;
};

const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
    >
      <Save className="h-4 w-4" />
      {pending ? "Guardando..." : "Guardar horario semanal"}
    </button>
  );
}

export function ScheduleEditor({ initial }: { initial: Interval[] }) {
  const [intervals, setIntervals] = useState<Interval[]>(initial);

  function intervalsForDay(dayOfWeek: number) {
    return intervals
      .filter((interval) => interval.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startMinute - b.startMinute);
  }

  function dayEnabled(dayOfWeek: number) {
    const list = intervalsForDay(dayOfWeek);
    return list.length > 0 && list.every((interval) => interval.enabled);
  }

  function toggleDay(dayOfWeek: number) {
    const list = intervalsForDay(dayOfWeek);
    if (list.length === 0) {
      setIntervals((current) => [
        ...current,
        {
          dayOfWeek,
          startMinute: 9 * 60,
          endMinute: 18 * 60,
          enabled: true,
        },
      ]);
      return;
    }

    const nextEnabled = !dayEnabled(dayOfWeek);
    setIntervals((current) =>
      current.map((interval) =>
        interval.dayOfWeek === dayOfWeek
          ? { ...interval, enabled: nextEnabled }
          : interval,
      ),
    );
  }

  function addInterval(dayOfWeek: number) {
    setIntervals((current) => [
      ...current,
      {
        dayOfWeek,
        startMinute: 9 * 60,
        endMinute: 13 * 60,
        enabled: true,
      },
    ]);
  }

  function sortedDayIntervals(intervals: Interval[], dayOfWeek: number) {
    return intervals
      .filter((interval) => interval.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startMinute - b.startMinute);
  }

  function removeInterval(dayOfWeek: number, index: number) {
    setIntervals((current) => {
      const target = sortedDayIntervals(current, dayOfWeek)[index];
      if (!target) return current;
      return current.filter((interval) => interval !== target);
    });
  }

  function updateInterval(
    dayOfWeek: number,
    index: number,
    field: "startMinute" | "endMinute",
    value: string,
  ) {
    const minutes = parseTimeToMinutes(value);
    if (minutes === null) return;

    setIntervals((current) => {
      const target = sortedDayIntervals(current, dayOfWeek)[index];
      if (!target) return current;
      return current.map((interval) =>
        interval === target ? { ...interval, [field]: minutes } : interval,
      );
    });
  }

  return (
    <form action={saveScheduleAction} className="space-y-4">
      <input type="hidden" name="schedule" value={JSON.stringify(intervals)} />

      <div className="grid gap-3 md:grid-cols-2">
        {ORDERED_DAYS.map((dayOfWeek) => {
          const list = intervalsForDay(dayOfWeek);
          const enabled = dayEnabled(dayOfWeek);

          return (
            <div
              key={dayOfWeek}
              className={`rounded-xl border p-4 ${
                enabled
                  ? "border-stone-200 bg-white"
                  : "border-stone-200 bg-stone-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleDay(dayOfWeek)}
                    className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-600"
                  />
                  {WEEKDAY_NAMES[dayOfWeek]}
                </label>
                <button
                  type="button"
                  onClick={() => addInterval(dayOfWeek)}
                  className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50"
                >
                  <Plus className="h-3 w-3" />
                  Franja
                </button>
              </div>

              {list.length === 0 ? (
                <p className="mt-3 text-xs text-stone-400">
                  Sin atención. Marcá el día para agregar una franja.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {list.map((interval, index) => (
                    <div
                      key={`${dayOfWeek}-${index}`}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="time"
                        value={formatMinutes(interval.startMinute)}
                        onChange={(event) =>
                          updateInterval(
                            dayOfWeek,
                            index,
                            "startMinute",
                            event.target.value,
                          )
                        }
                        className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm outline-none focus:border-amber-600"
                      />
                      <span className="text-xs text-stone-400">a</span>
                      <input
                        type="time"
                        value={formatMinutes(interval.endMinute)}
                        onChange={(event) =>
                          updateInterval(
                            dayOfWeek,
                            index,
                            "endMinute",
                            event.target.value,
                          )
                        }
                        className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm outline-none focus:border-amber-600"
                      />
                      <button
                        type="button"
                        onClick={() => removeInterval(dayOfWeek, index)}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Eliminar franja"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

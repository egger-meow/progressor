// Pure date math for the Weekly View. No Prisma access here — this is UI
// layer, so it only shapes dates for src/server/time-slots.ts to consume.

export const DAY_LABELS = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];

function toDateOnly(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ISO-style week: Monday is day 0.
export function startOfWeek(date: Date): Date {
  const d = toDateOnly(date);
  const day = d.getDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateParam(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

export function formatDateLabel(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function formatTimeLabel(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function combineDateAndTime(dateParam: string, timeParam: string): Date {
  const combined = new Date(`${dateParam}T${timeParam}:00`);
  if (Number.isNaN(combined.getTime())) {
    throw new Error(`Invalid date/time: ${dateParam} ${timeParam}`);
  }
  return combined;
}

export function parseHour(timeParam: string): number {
  return Number(timeParam.slice(0, 2));
}

export function formatHourParam(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export interface HourRow {
  hour: number;
  rowStart: Date;
  rowEnd: Date;
}

// One row per hour of `day`, spanning at least [windowStartHour,
// windowEndHour) (the Scheduler's daily window — see
// src/scheduler/constants.ts) but widened to include every hour in
// `extraHours` (a manually-created Time Slot isn't restricted to that
// window, and a Time Slot must never become invisible on the Weekly
// View's grid — ROADMAP.md's "Interactive Weekly Grid" exit condition).
export function buildHourRows(
  day: Date,
  windowStartHour: number,
  windowEndHour: number,
  extraHours: number[] = [],
): HourRow[] {
  const minHour = Math.min(windowStartHour, ...extraHours);
  const maxHourExclusive = Math.max(windowEndHour, ...extraHours.map((h) => h + 1));

  const rows: HourRow[] = [];
  for (let hour = minHour; hour < maxHourExclusive; hour++) {
    const rowStart = new Date(day);
    rowStart.setHours(hour, 0, 0, 0);
    const rowEnd = new Date(day);
    rowEnd.setHours(hour + 1, 0, 0, 0);
    rows.push({ hour, rowStart, rowEnd });
  }
  return rows;
}

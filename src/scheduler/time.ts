// Pure date/time helpers for the Scheduler. No Prisma, no I/O — see
// types.ts's header comment for why.

import { DAILY_WINDOW_START, DAILY_WINDOW_END } from "./constants";

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Monday 00:00 of the calendar week containing `date` — mirrors
// src/app/week.ts's startOfWeek (same Monday-first convention as
// SchedulerInput.weekStart); duplicated rather than imported because
// src/scheduler/ never depends on the UI layer (types.ts's header
// comment).
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diffToMonday);
  return result;
}

// FixedCommitment.dayOfWeek is 0 (Sunday) - 6 (Saturday); SchedulerInput's
// weekStart is always a Monday. Returns the day offset from weekStart to
// that weekday within the same week.
export function offsetFromMonday(dayOfWeek: number): number {
  return (dayOfWeek + 6) % 7;
}

// Combines a day (only its year/month/date are used) with an "HH:mm" time
// string into a concrete Date.
export function combineDateAndTime(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(day);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export interface Interval {
  start: Date;
  end: Date;
}

// Finds the first free `durationMs` window inside [windowStart, windowEnd),
// not overlapping any interval in `busy`, ending no later than `notAfter`
// (defaults to windowEnd). Shared by hard-constraints.ts and
// routine-placement.ts so "search this window for room" behaves the same
// way everywhere in the Scheduler.
export function findFreeInterval(
  windowStart: Date,
  windowEnd: Date,
  durationMs: number,
  busy: Interval[],
  notAfter: Date = windowEnd,
): Interval | null {
  const effectiveEnd = notAfter < windowEnd ? notAfter : windowEnd;
  const relevantBusy = busy
    .filter((interval) => overlaps(windowStart, windowEnd, interval.start, interval.end))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let candidateStart = windowStart;
  for (const interval of relevantBusy) {
    const candidateEnd = new Date(candidateStart.getTime() + durationMs);
    if (candidateEnd <= interval.start && candidateEnd <= effectiveEnd) {
      return { start: candidateStart, end: candidateEnd };
    }
    if (interval.end > candidateStart) {
      candidateStart = interval.end;
    }
  }

  const candidateEnd = new Date(candidateStart.getTime() + durationMs);
  if (candidateEnd <= effectiveEnd) {
    return { start: candidateStart, end: candidateEnd };
  }
  return null;
}

// How many ms wide `day`'s daily scheduling window is (DAILY_WINDOW_START/
// END). Shared by flexible-placement.ts and hard-constraints.ts, both of
// which cap how much of a day they'll fill.
export function dailyWindowMs(day: Date): number {
  return (
    combineDateAndTime(day, DAILY_WINDOW_END).getTime() -
    combineDateAndTime(day, DAILY_WINDOW_START).getTime()
  );
}

// Sums how much of `day`'s daily window is already claimed by `busy`
// (hard constraints, Routine occurrences, and flexible sessions already
// placed this run) — the budget findFreeInterval alone can't express,
// since a technically-free interval can still exist inside a day that's
// otherwise packed past the Slack minimum.
export function usedMsOnDay(day: Date, busy: Interval[]): number {
  const windowStart = combineDateAndTime(day, DAILY_WINDOW_START);
  const windowEnd = combineDateAndTime(day, DAILY_WINDOW_END);
  let total = 0;
  for (const interval of busy) {
    const clippedStart = interval.start > windowStart ? interval.start : windowStart;
    const clippedEnd = interval.end < windowEnd ? interval.end : windowEnd;
    if (clippedEnd > clippedStart) {
      total += clippedEnd.getTime() - clippedStart.getTime();
    }
  }
  return total;
}

// Shared "which day(s), which time window" search — extracted from
// routine-placement.ts because category-placement.ts needs the exact same
// algorithm (a CategoryItemSchedule is the same cadence/anchor/
// timeOfDayPreference/preferredStartTime shape as a Routine, just with a
// different "who fills the occurrence" resolution afterward). Pure
// functions of primitives, not SchedulerRoutine, so both callers can share
// them without depending on each other's types.

import { RoutineCadence, TimeOfDayPreference } from "./types";
import { addDays, combineDateAndTime, findFreeInterval, offsetFromMonday, type Interval } from "./time";
import { DAILY_WINDOW_START, DAILY_WINDOW_END } from "./constants";

// Sub-windows within the daily scheduling window (constants.ts) that a
// Time-of-Day Preference searches first. Inferred placeholders, not a user
// decision — same status as DEFAULT_WIP_LIMIT, adjustable here.
export const TIME_OF_DAY_WINDOWS: Record<TimeOfDayPreference, { start: string; end: string }> = {
  morning: { start: "08:00", end: "12:00" },
  afternoon: { start: "12:00", end: "17:00" },
  evening: { start: "17:00", end: "20:00" },
  night: { start: "20:00", end: "23:00" },
};

// Which day offsets (0 = weekStart's Monday .. 6 = Sunday) a cadence/anchor
// occurs on within the target week: daily = every day; weekly = anchor's
// weekdays; monthly = anchor's day(s)-of-month, only offsets whose calendar
// date matches (often none in a given week).
export function occurrenceDayOffsets(
  cadence: RoutineCadence,
  anchor: number[] | null,
  weekStart: Date,
): number[] {
  if (cadence === "daily") {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  if (cadence === "weekly") {
    return (anchor ?? []).map(offsetFromMonday);
  }
  return [0, 1, 2, 3, 4, 5, 6].filter((offset) => {
    const date = addDays(weekStart, offset);
    return (anchor ?? []).includes(date.getDate());
  });
}

export interface OccurrenceTimingPreference {
  preferredStartTime: string | null;
  timeOfDayPreference: TimeOfDayPreference | null;
}

// Tries a concrete preferredStartTime first (the exact window it names —
// only succeeds there if that precise slot is free); then the Time-of-Day
// Preference's narrower bucket window; then falls back to the full daily
// window rather than giving up the whole day if the narrower windows are
// busy.
export function findOccurrenceWindow(
  day: Date,
  durationMs: number,
  busy: Interval[],
  preference: OccurrenceTimingPreference,
): Interval | null {
  if (preference.preferredStartTime) {
    const preferredStart = combineDateAndTime(day, preference.preferredStartTime);
    const preferredEnd = new Date(preferredStart.getTime() + durationMs);
    const found = findFreeInterval(preferredStart, preferredEnd, durationMs, busy);
    if (found) {
      return found;
    }
  }
  if (preference.timeOfDayPreference) {
    const window = TIME_OF_DAY_WINDOWS[preference.timeOfDayPreference];
    const found = findFreeInterval(
      combineDateAndTime(day, window.start),
      combineDateAndTime(day, window.end),
      durationMs,
      busy,
    );
    if (found) {
      return found;
    }
  }
  return findFreeInterval(
    combineDateAndTime(day, DAILY_WINDOW_START),
    combineDateAndTime(day, DAILY_WINDOW_END),
    durationMs,
    busy,
  );
}

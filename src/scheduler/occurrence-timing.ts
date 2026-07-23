// Shared "which day(s), which time window" search — extracted from
// routine-placement.ts because category-placement.ts needs the exact same
// algorithm (a CategoryItemSchedule is the same cadence/anchor/
// timeOfDayPreferences/preferredStartTime shape as a Routine, just with a
// different "who fills the occurrence" resolution afterward). Pure
// functions of primitives, not SchedulerRoutine, so both callers can share
// them without depending on each other's types.

import { RoutineCadence, TimeOfDayPreference } from "./types";
import { addDays, combineDateAndTime, offsetFromMonday, type Interval } from "./time";
import { DAILY_WINDOW_START, DAILY_WINDOW_END } from "./constants";
import { pickBestGapInWindow } from "./objective";

// Sub-windows within the daily scheduling window (constants.ts) that a
// Time-of-Day Preference searches first. Inferred placeholders, not a user
// decision — same status as DEFAULT_WIP_LIMIT, adjustable here.
export const TIME_OF_DAY_WINDOWS: Record<TimeOfDayPreference, { start: string; end: string }> = {
  morning: { start: "08:00", end: "12:00" },
  afternoon: { start: "12:00", end: "17:00" },
  evening: { start: "17:00", end: "20:00" },
  night: { start: "20:00", end: "23:00" },
};

// Derived (not hand-copied) so it can never drift out of sync with
// TIME_OF_DAY_WINDOWS above — object key order is insertion order in JS.
const TIME_OF_DAY_ORDER = Object.keys(TIME_OF_DAY_WINDOWS) as TimeOfDayPreference[];

// Multi-select Time-of-Day Preference (2026-07-22): sorts the selected
// buckets into day order and merges any that are back-to-back (e.g.
// morning+afternoon, which are exactly adjacent in TIME_OF_DAY_WINDOWS)
// into one wider window, since TIME_OF_DAY_WINDOWS covers the daily window
// end-to-end with no gaps between consecutive buckets. Non-adjacent
// selections (e.g. morning+night, skipping afternoon/evening) stay as
// separate candidate windows, tried in order.
function buildCandidateWindows(
  prefs: TimeOfDayPreference[],
): { start: string; end: string }[] {
  const sorted = [...prefs].sort(
    (a, b) => TIME_OF_DAY_ORDER.indexOf(a) - TIME_OF_DAY_ORDER.indexOf(b),
  );
  const merged: { start: string; end: string }[] = [];
  for (const pref of sorted) {
    const window = TIME_OF_DAY_WINDOWS[pref];
    const last = merged[merged.length - 1];
    if (last && last.end === window.start) {
      last.end = window.end;
    } else {
      merged.push({ ...window });
    }
  }
  return merged;
}

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
  timeOfDayPreferences: TimeOfDayPreference[];
}

// Tries a concrete preferredStartTime first (the exact window it names —
// only succeeds there if that precise slot is free); then the Time-of-Day
// Preference's narrower bucket window; then falls back to the full daily
// window rather than giving up the whole day if the narrower windows are
// busy. WHICH window is tried, in what order, is unchanged by this;
// WITHIN whichever window is chosen, the actual gap returned comes from
// objective.ts's pickBestGapInWindow (2026-07-22, same `/goal` as
// flexible-placement.ts's scoring) rather than the first gap found — so a
// bucket with two candidate gaps prefers the one that avoids leaving a
// fragmenting sliver, without changing which bucket/day was searched.
export function findOccurrenceWindow(
  day: Date,
  durationMs: number,
  busy: Interval[],
  preference: OccurrenceTimingPreference,
): Interval | null {
  if (preference.preferredStartTime) {
    const preferredStart = combineDateAndTime(day, preference.preferredStartTime);
    const preferredEnd = new Date(preferredStart.getTime() + durationMs);
    const found = pickBestGapInWindow(preferredStart, preferredEnd, durationMs, busy);
    if (found) {
      return found;
    }
  }
  // Adjacent selected buckets (e.g. morning+afternoon) merge into one
  // continuous candidate window; non-adjacent ones (e.g. morning+night)
  // stay separate and are tried in day order. Only the *last* candidate is
  // allowed to run past its own natural end, up to DAILY_WINDOW_END — a
  // longer session (e.g. a book's 200-minute block vs. evening's
  // 180-minute bucket) can then still start as close to the preferred
  // bucket as possible instead of silently failing the bucket search and
  // falling through to the full-day search below, which starts from 08:00
  // and defeats the preference entirely (project owner, 2026-07-22: set
  // 傍晚/200min, got placed at 08:00 with the evening window sitting
  // empty). Earlier candidates stay strictly bounded to their own window
  // so a gap the user didn't select (e.g. the afternoon/evening gap in
  // morning+night) is never silently filled.
  const candidates = buildCandidateWindows(preference.timeOfDayPreferences);
  for (let index = 0; index < candidates.length; index += 1) {
    const window = candidates[index];
    const isLast = index === candidates.length - 1;
    const found = pickBestGapInWindow(
      combineDateAndTime(day, window.start),
      combineDateAndTime(day, isLast ? DAILY_WINDOW_END : window.end),
      durationMs,
      busy,
    );
    if (found) {
      return found;
    }
  }
  return pickBestGapInWindow(
    combineDateAndTime(day, DAILY_WINDOW_START),
    combineDateAndTime(day, DAILY_WINDOW_END),
    durationMs,
    busy,
  );
}

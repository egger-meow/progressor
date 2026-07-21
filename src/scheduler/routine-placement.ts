// Routine occurrence placement (ROADMAP.md Phase 2, PRIORITIES.md
// "Implement Routine occurrence placement"). Pure function of
// SchedulerInput — see types.ts's header comment.
//
// A Routine (gym, tutoring — docs/domain-model.md) is its own recurring
// commitment, not a field on Trackable Item. Unlike a Fixed Commitment
// ("never a schedulable-around preference"), a Routine's placement is a
// soft preference the Scheduler tries to honor and can nudge around
// (domain-model.md), so an occurrence that has no room this week is
// simply skipped — no SchedulerConflict entry. The charter's
// never-silently-drop guardrail is scoped to 固定期限事務 (Fixed
// Commitment / Deadline Task), not Routine.

import { SchedulerInput, ScheduledTimeSlot, SchedulerRoutine, TimeOfDayPreference } from "./types";
import { addDays, offsetFromMonday, combineDateAndTime, findFreeInterval, type Interval } from "./time";
import { DAILY_WINDOW_START, DAILY_WINDOW_END } from "./constants";
import { hasExistingOccurrence } from "./hard-constraints";

export interface RoutinePlacementResult {
  slots: ScheduledTimeSlot[];
}

// Sub-windows within the daily scheduling window (constants.ts) that a
// Routine's Time-of-Day Preference searches first. Inferred placeholders,
// not a user decision — same status as DEFAULT_WIP_LIMIT, adjustable here.
const TIME_OF_DAY_WINDOWS: Record<TimeOfDayPreference, { start: string; end: string }> = {
  morning: { start: "08:00", end: "12:00" },
  afternoon: { start: "12:00", end: "17:00" },
  evening: { start: "17:00", end: "20:00" },
  night: { start: "20:00", end: "23:00" },
};

// Which day offsets (0 = weekStart's Monday .. 6 = Sunday) this Routine
// occurs on within the target week, per its cadence/anchor.
function occurrenceDayOffsets(routine: SchedulerRoutine, weekStart: Date): number[] {
  if (routine.cadence === "daily") {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  if (routine.cadence === "weekly") {
    return (routine.anchor ?? []).map(offsetFromMonday);
  }
  // "monthly": anchor holds day(s)-of-month; only offsets whose calendar
  // date matches one of them occur this week (often none).
  return [0, 1, 2, 3, 4, 5, 6].filter((offset) => {
    const date = addDays(weekStart, offset);
    return (routine.anchor ?? []).includes(date.getDate());
  });
}

export function placeRoutines(input: SchedulerInput, busy: Interval[]): RoutinePlacementResult {
  const allBusy = [...busy];
  const slots: ScheduledTimeSlot[] = [];

  for (const routine of input.routines) {
    for (const offset of occurrenceDayOffsets(routine, input.weekStart)) {
      const day = addDays(input.weekStart, offset);

      // Re-run idempotency (see hard-constraints.ts's hasExistingOccurrence):
      // don't add a second occurrence Time Slot for a day that already has
      // one from a prior run.
      if (hasExistingOccurrence(input.existingSlots, "routine", routine.id, day)) {
        continue;
      }

      // Try a concrete preferredStartTime first (the exact window it
      // names — findFreeInterval only succeeds there if that precise
      // slot is free); then the Time-of-Day Preference's narrower bucket
      // window; then fall back to the full daily window rather than
      // giving up the whole day if the narrower windows are busy.
      const durationMs = routine.durationMinutes * 60 * 1000;
      let found: Interval | null = null;
      if (routine.preferredStartTime) {
        const preferredStart = combineDateAndTime(day, routine.preferredStartTime);
        const preferredEnd = new Date(preferredStart.getTime() + durationMs);
        found = findFreeInterval(preferredStart, preferredEnd, durationMs, allBusy);
      }
      if (!found && routine.timeOfDayPreference) {
        const preferred = TIME_OF_DAY_WINDOWS[routine.timeOfDayPreference];
        found = findFreeInterval(
          combineDateAndTime(day, preferred.start),
          combineDateAndTime(day, preferred.end),
          durationMs,
          allBusy,
        );
      }
      if (!found) {
        found = findFreeInterval(
          combineDateAndTime(day, DAILY_WINDOW_START),
          combineDateAndTime(day, DAILY_WINDOW_END),
          durationMs,
          allBusy,
        );
      }

      if (found) {
        slots.push({
          startAt: found.start,
          endAt: found.end,
          occupantType: "routine",
          occupantId: routine.id,
        });
        allBusy.push(found);
      }
    }
  }

  return { slots };
}

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

import { SchedulerInput, ScheduledTimeSlot } from "./types";
import { addDays, type Interval } from "./time";
import { hasExistingOccurrence } from "./hard-constraints";
import { occurrenceDayOffsets, findOccurrenceWindow } from "./occurrence-timing";

export interface RoutinePlacementResult {
  slots: ScheduledTimeSlot[];
}

export function placeRoutines(input: SchedulerInput, busy: Interval[]): RoutinePlacementResult {
  const allBusy = [...busy];
  const slots: ScheduledTimeSlot[] = [];

  for (const routine of input.routines) {
    for (const offset of occurrenceDayOffsets(routine.cadence, routine.anchor, input.weekStart)) {
      const day = addDays(input.weekStart, offset);

      // Re-run idempotency (see hard-constraints.ts's hasExistingOccurrence):
      // don't add a second occurrence Time Slot for a day that already has
      // one from a prior run.
      if (hasExistingOccurrence(input.existingSlots, "routine", routine.id, day)) {
        continue;
      }

      const durationMs = routine.durationMinutes * 60 * 1000;
      const found = findOccurrenceWindow(day, durationMs, allBusy, routine);

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

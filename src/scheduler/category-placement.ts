// CategoryItemSchedule placement (a recurring, Routine-shaped reservation
// for one Trackable Item type — see docs/domain-model.md). Pure function of
// SchedulerInput — see types.ts's header comment.
//
// Unlike a Routine occurrence (one occupant per occurrence), a
// CategoryItemSchedule occurrence's window is shared by every currently
// eligible item of that type at once — per the project owner's own
// clarification: "when assigning books to a time block, it means we watch
// all books in progress in that period... never watch specific book(s)
// only." So each occurrence places one Time Slot per eligible item, all
// sharing the identical [startAt, endAt) window (src/app/page.tsx's Weekly
// View grouping renders these as one merged block, not stacked duplicates).
//
// Like a Routine, this is a soft preference: no room this day is silently
// skipped, never a SchedulerConflict — the charter's never-silently-drop
// guardrail is scoped to Fixed Commitment/Deadline Task.
//
// A TrackableItemType with no configured CategoryItemSchedule is entirely
// untouched here (its items never appear in input.categoryItemSchedules'
// resolution) — additive/opt-in, see index.ts's computeSchedule for how a
// type is filtered out of placeFlexibleTrackableItems once scheduled here.

import { SchedulerInput, ScheduledTimeSlot } from "./types";
import { addDays, type Interval } from "./time";
import { hasExistingOccurrence } from "./hard-constraints";
import { occurrenceDayOffsets, findOccurrenceWindow } from "./occurrence-timing";
import { selectEligibleItems } from "./flexible-placement";

export interface CategoryPlacementResult {
  slots: ScheduledTimeSlot[];
}

export function placeCategoryItemSchedules(
  input: SchedulerInput,
  busy: Interval[],
): CategoryPlacementResult {
  const allBusy = [...busy];
  const slots: ScheduledTimeSlot[] = [];
  const allEligible = selectEligibleItems(input);

  for (const schedule of input.categoryItemSchedules) {
    const eligible = allEligible.filter((item) => item.type === schedule.type);
    if (eligible.length === 0) {
      continue;
    }

    for (const offset of occurrenceDayOffsets(schedule.cadence, schedule.anchor, input.weekStart)) {
      const day = addDays(input.weekStart, offset);

      // Only fill in items that don't already have a Time Slot this day —
      // handles re-runs (idempotency, same helper as Routine/Fixed
      // Commitment) and an item newly promoted into eligibility mid-week.
      const itemsNeedingSlot = eligible.filter(
        (item) => !hasExistingOccurrence(input.existingSlots, "trackable-item", item.id, day),
      );
      if (itemsNeedingSlot.length === 0) {
        continue;
      }

      const durationMs = schedule.durationMinutes * 60 * 1000;
      const found = findOccurrenceWindow(day, durationMs, allBusy, schedule);
      if (!found) {
        continue;
      }

      for (const item of itemsNeedingSlot) {
        slots.push({
          startAt: found.start,
          endAt: found.end,
          occupantType: "trackable-item",
          occupantId: item.id,
        });
      }
      // The shared window itself is reserved once, not once per item —
      // the items intentionally overlap each other, not the window itself.
      allBusy.push(found);
    }
  }

  return { slots };
}

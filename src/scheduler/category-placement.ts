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
import { computeRemainingSessions } from "./activity-planner";

export interface CategoryPlacementResult {
  slots: ScheduledTimeSlot[];
  // Running per-item session count after this call (seed count in, plus
  // whatever this call placed) — horizon.ts threads this into the next
  // week's call so a multi-week horizon stops each item at its own
  // remaining-chapter budget instead of every eligible day forever.
  scheduledCountByItemId: Record<string, number>;
}

// A CategoryItemSchedule occurrence fires every eligible day for as long
// as the item stays "in-progress" — unlike a Routine (which has no
// finish line), a Trackable Item has a finite unitCount. Without this
// cap, a book with e.g. 13 chapters left got a NEW session every single
// day all the way to the end of the horizon (project owner, 2026-07-23:
// found scheduling 157 sessions for a 13-chapter book — "她媽13天讀完喔"
// confusion traced back to this). Reuses activity-planner.ts's own
// remaining-sessions formula (unitCount/unitsCompleted/multiplier/
// overrides) so a shared-slot item runs out at the same place a
// non-shared-slot item would.
export function placeCategoryItemSchedules(
  input: SchedulerInput,
  busy: Interval[],
  alreadyScheduledSessionsByItemId: Record<string, number> = {},
): CategoryPlacementResult {
  const allBusy = [...busy];
  const slots: ScheduledTimeSlot[] = [];
  const allEligible = selectEligibleItems(input);
  const scheduledCount = new Map<string, number>(Object.entries(alreadyScheduledSessionsByItemId));

  for (const schedule of input.categoryItemSchedules) {
    const eligible = allEligible.filter((item) => item.type === schedule.type);
    if (eligible.length === 0) {
      continue;
    }

    for (const offset of occurrenceDayOffsets(schedule.cadence, schedule.anchor, input.weekStart)) {
      const day = addDays(input.weekStart, offset);

      // Only fill in items that don't already have a Time Slot this day —
      // handles re-runs (idempotency, same helper as Routine/Fixed
      // Commitment) and an item newly promoted into eligibility mid-week —
      // and that still have remaining chapters left to schedule.
      const itemsNeedingSlot = eligible.filter(
        (item) =>
          !hasExistingOccurrence(input.existingSlots, "trackable-item", item.id, day) &&
          computeRemainingSessions(item, scheduledCount.get(item.id) ?? 0) > 0,
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
        scheduledCount.set(item.id, (scheduledCount.get(item.id) ?? 0) + 1);
      }
      // The shared window itself is reserved once, not once per item —
      // the items intentionally overlap each other, not the window itself.
      allBusy.push(found);
    }
  }

  return { slots, scheduledCountByItemId: Object.fromEntries(scheduledCount) };
}

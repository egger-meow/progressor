// Priority-ordered flexible placement for Trackable Item work sessions
// (ROADMAP.md Phase 2, PRIORITIES.md "Implement priority-ordered flexible
// placement"). Pure function of SchedulerInput — see types.ts's header
// comment.
//
// Like a Routine occurrence, a Trackable Item session is soft: an item
// that can't fit anywhere this week simply gets no session, no
// SchedulerConflict — the charter's never-silently-drop guardrail is
// scoped to Fixed Commitment/Deadline Task (docs/domain-model.md), not to
// discretionary reading/study progress.

import { SchedulerInput, ScheduledTimeSlot, SchedulerTrackableItem, TrackableItemType } from "./types";
import { addDays, combineDateAndTime, findFreeInterval, type Interval } from "./time";
import {
  DAILY_WINDOW_START,
  DAILY_WINDOW_END,
  SESSION_DURATION_MS,
  MIN_SLACK_SHARE_PER_DAY,
} from "./constants";

export interface FlexiblePlacementResult {
  slots: ScheduledTimeSlot[];
}

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

// Which items get a session at all this run: every already-`in-progress`
// item (already inside its type's WIP Limit by definition), plus
// `not-started`/`paused` items promoted up to each type's remaining WIP
// Limit capacity, highest priority (lowest `priority` number) first. This
// does not persist a status change anywhere — the Scheduler never writes
// to the store (see types.ts) — it only decides who gets flexible time in
// the proposed Schedule.
export function selectEligibleItems(input: SchedulerInput): SchedulerTrackableItem[] {
  const itemsByType = new Map<TrackableItemType, SchedulerTrackableItem[]>();
  for (const item of input.trackableItems) {
    const list = itemsByType.get(item.type) ?? [];
    list.push(item);
    itemsByType.set(item.type, list);
  }

  const eligible: SchedulerTrackableItem[] = [];
  for (const [type, items] of itemsByType) {
    const inProgress = items.filter((item) => item.status === "in-progress");
    eligible.push(...inProgress);

    // A type absent from wipLimits has no known capacity — treated as 0
    // rather than unlimited, so incomplete input can't silently violate a
    // WIP Limit the caller forgot to supply.
    const limit = input.wipLimits.find((w) => w.type === type)?.maxInProgress ?? 0;
    let remainingCapacity = limit - inProgress.length;

    const promotable = items
      .filter((item) => item.status === "not-started" || item.status === "paused")
      .sort((a, b) => a.priority - b.priority);

    for (const candidate of promotable) {
      if (remainingCapacity <= 0) {
        break;
      }
      eligible.push(candidate);
      remainingCapacity--;
    }
  }

  return eligible.sort((a, b) => a.priority - b.priority);
}

// Re-run idempotency (see hard-constraints.ts's hasExistingOccurrence for
// the Fixed Commitment/Routine equivalent): an item that already has a
// session Time Slot this week from a prior run must not get a second one
// stacked on top of it.
function itemIdsWithSessionThisWeek(existingSlots: SchedulerInput["existingSlots"]): Set<string> {
  return new Set(
    existingSlots
      .filter((slot) => slot.occupantType === "trackable-item" && slot.occupantId)
      .map((slot) => slot.occupantId as string),
  );
}

export function placeFlexibleTrackableItems(
  input: SchedulerInput,
  busy: Interval[],
): FlexiblePlacementResult {
  const allBusy = [...busy];
  const slots: ScheduledTimeSlot[] = [];
  const alreadyScheduled = itemIdsWithSessionThisWeek(input.existingSlots);

  for (const item of selectEligibleItems(input)) {
    if (alreadyScheduled.has(item.id)) {
      continue;
    }
    for (let offset = 0; offset < 7; offset++) {
      const day = addDays(input.weekStart, offset);
      const slackBudget = dailyWindowMs(day) * (1 - MIN_SLACK_SHARE_PER_DAY);
      if (usedMsOnDay(day, allBusy) + SESSION_DURATION_MS > slackBudget) {
        continue;
      }

      const found = findFreeInterval(
        combineDateAndTime(day, DAILY_WINDOW_START),
        combineDateAndTime(day, DAILY_WINDOW_END),
        SESSION_DURATION_MS,
        allBusy,
      );
      if (found) {
        slots.push({
          startAt: found.start,
          endAt: found.end,
          occupantType: "trackable-item",
          occupantId: item.id,
        });
        allBusy.push(found);
        break;
      }
    }
  }

  return { slots };
}

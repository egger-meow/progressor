// Constraint Engine (RCPSP/WCSP formulation, docs/domain-model.md's
// Scheduler section) — the second stage of the Whole-Future Persisted
// Scheduling Engine (src/scheduler/horizon.ts). Builds and queries the
// horizon's feasibility state for the Optimization Engine
// (rcpsp-solver.ts): busy time (no-overlap + daily Slack budget) and
// per-type WIP pool capacity (the RCPSP renewable resource).
//
// This is mostly a thin adapter over existing primitives, not new
// scoring math — pickBestGapInWindow (objective.ts) already operates on
// arbitrary absolute Dates, so the actual "which gap is best" search is
// unchanged from what flexible-placement.ts/hard-constraints.ts already
// do per week.

import { combineDateAndTime, dailyWindowMs, usedMsOnDay, type Interval } from "./time";
import { DAILY_WINDOW_START, DAILY_WINDOW_END, MIN_SLACK_SHARE_PER_DAY } from "./constants";
import { pickBestGapInWindow } from "./objective";
import type { TrackableItemType } from "./types";

export interface ResourceCalendar {
  busy: Interval[];
  activeCountByPool: Map<TrackableItemType, number>;
  wipCapacityByPool: Map<TrackableItemType, number>;
}

export function createResourceCalendar(
  seedBusy: Interval[],
  wipLimits: { type: TrackableItemType; maxInProgress: number }[],
  // Pre-reserves one pool slot per currently `in-progress` item of that
  // type (excluding category-scheduled types) — mirrors
  // selectEligibleItems' unconditional "every in-progress item is
  // eligible" rule, generalized across the whole horizon instead of
  // recomputed fresh every week.
  initialActiveCountByPool: Map<TrackableItemType, number>,
): ResourceCalendar {
  const wipCapacityByPool = new Map<TrackableItemType, number>();
  for (const limit of wipLimits) {
    wipCapacityByPool.set(limit.type, limit.maxInProgress);
  }
  return {
    busy: [...seedBusy],
    activeCountByPool: new Map(initialActiveCountByPool),
    wipCapacityByPool,
  };
}

export function hasPoolCapacity(
  calendar: ResourceCalendar,
  pool: TrackableItemType | null,
): boolean {
  if (pool === null) {
    return true;
  }
  const capacity = calendar.wipCapacityByPool.get(pool) ?? 0;
  const active = calendar.activeCountByPool.get(pool) ?? 0;
  return active < capacity;
}

export function acquirePool(calendar: ResourceCalendar, pool: TrackableItemType | null): void {
  if (pool === null) {
    return;
  }
  calendar.activeCountByPool.set(pool, (calendar.activeCountByPool.get(pool) ?? 0) + 1);
}

export function releasePool(calendar: ResourceCalendar, pool: TrackableItemType | null): void {
  if (pool === null) {
    return;
  }
  calendar.activeCountByPool.set(pool, Math.max(0, (calendar.activeCountByPool.get(pool) ?? 0) - 1));
}

// Best feasible gap for `durationMs` on `day`, respecting the daily Slack
// budget (constants.ts) the same way flexible-placement.ts/
// hard-constraints.ts already do, or null if the day has no room.
// `notAfter` caps the gap's end (a Deadline Task chunk must not run past
// its actual deadline moment on the last usable day — same as
// hard-constraints.ts's findFreeSlot).
export function bestGapOnDay(
  calendar: ResourceCalendar,
  day: Date,
  durationMs: number,
  notAfter?: Date,
): Interval | null {
  const slackBudget = dailyWindowMs(day) * (1 - MIN_SLACK_SHARE_PER_DAY);
  if (usedMsOnDay(day, calendar.busy) + durationMs > slackBudget) {
    return null;
  }
  const windowStart = combineDateAndTime(day, DAILY_WINDOW_START);
  const windowEnd = combineDateAndTime(day, DAILY_WINDOW_END);
  return pickBestGapInWindow(windowStart, windowEnd, durationMs, calendar.busy, notAfter ?? windowEnd);
}

export function markBusy(calendar: ResourceCalendar, interval: Interval): void {
  calendar.busy.push(interval);
}

// Optimization Engine (RCPSP/WCSP formulation, docs/domain-model.md's
// Scheduler section) — the third stage of the Whole-Future Persisted
// Scheduling Engine (src/scheduler/horizon.ts). Solves the Activities the
// Task Planner (activity-planner.ts) produced against the Constraint
// Engine's ResourceCalendar (resource-calendar.ts) via a Serial Schedule
// Generation Scheme (SGS) — the standard practical heuristic for RCPSP
// (Kolisch & Hartmann): repeatedly pick the highest-priority activity
// whose precedence and resource constraints are currently satisfied, and
// place it at the earliest feasible day/gap. Not an exact solver — good
// schedules, not provably optimal ones — chosen deliberately (project
// owner, 2026-07-23) over spawning an external constraint solver (no
// maintained Node binding for CP-SAT exists) for this app's scale.
//
// Priority rule: activities with a hard dueDate (Deadline Task chunks) go
// first, ordered by dueDate ascending — same urgency-first spirit as the
// charter's "never silently drop a Deadline Task" guardrail. Activities
// with no dueDate (Trackable Item sessions) follow, ordered by
// itemPriority ascending (ties keep insertion order — lower number wins,
// same convention as selectEligibleItems).
//
// Resource (WIP pool) gating only ever applies to a not-started/paused
// item's chain-head (Activity.gatedByPoolCapacity) — every other
// Activity either has no pool (Deadline Task) or already holds its slot
// (an in-progress chain-head's slot is pre-reserved by horizon.ts before
// this runs, or a mid-chain Activity whose occupant is already active).
// A pool-blocked activity is retried on a later pass (capacity may free
// once some other chain of that pool finishes); a day-window-exhausted
// failure is permanent (the calendar only ever gains busy time, never
// loses it, so a failed day search can never later succeed) and is
// finalized immediately — as a single deduplicated SchedulerConflict for
// a Deadline Task (charter-guarded), or silently dropped for a Trackable
// Item (soft, discretionary work — same "no session, no conflict" rule
// flexible-placement.ts already documents).

import { addDays } from "./time";
import type { Activity } from "./activity-planner";
import {
  hasPoolCapacity,
  acquirePool,
  releasePool,
  bestGapOnDay,
  markBusy,
  type ResourceCalendar,
} from "./resource-calendar";
import type { ScheduledTimeSlot, SchedulerConflict } from "./types";

const HOUR_MS = 60 * 60 * 1000;

export interface RcpspSolveResult {
  slots: ScheduledTimeSlot[];
  conflicts: SchedulerConflict[];
}

function compareActivities(a: Activity, b: Activity): number {
  const aHasDue = a.dueDate !== null;
  const bHasDue = b.dueDate !== null;
  if (aHasDue && bHasDue) {
    return a.dueDate!.getTime() - b.dueDate!.getTime();
  }
  if (aHasDue !== bHasDue) {
    return aHasDue ? -1 : 1;
  }
  return (a.itemPriority ?? Number.POSITIVE_INFINITY) - (b.itemPriority ?? Number.POSITIVE_INFINITY);
}

export function solveRCPSP(
  activities: Activity[],
  calendar: ResourceCalendar,
  horizonStart: Date,
  horizonEnd: Date,
): RcpspSolveResult {
  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  const placedDayById = new Map<string, Date>();
  const placedIds = new Set<string>();
  const remaining = new Set(activities.map((activity) => activity.id));

  const slots: ScheduledTimeSlot[] = [];
  const conflicts: SchedulerConflict[] = [];
  const conflictedOccupantIds = new Set<string>();

  const totalMsByOccupant = new Map<string, number>();
  const placedMsByOccupant = new Map<string, number>();
  for (const activity of activities) {
    totalMsByOccupant.set(
      activity.occupantId,
      (totalMsByOccupant.get(activity.occupantId) ?? 0) + activity.durationMs,
    );
  }

  while (remaining.size > 0) {
    const eligible = [...remaining]
      .map((id) => byId.get(id) as Activity)
      .filter(
        (activity) =>
          activity.precedingActivityId === null || placedIds.has(activity.precedingActivityId),
      )
      .sort(compareActivities);

    if (eligible.length === 0) {
      // A predecessor was permanently dropped (day-window-exhausted)
      // without ever being placed — every remaining Activity behind it in
      // its chain is unreachable. Nothing left can ever become eligible.
      break;
    }

    let handledThisPass = false;

    for (const activity of eligible) {
      if (activity.gatedByPoolCapacity && !hasPoolCapacity(calendar, activity.resourcePool)) {
        continue; // retriable once some other chain of this pool completes
      }

      const predecessorDay = activity.precedingActivityId
        ? (placedDayById.get(activity.precedingActivityId) as Date)
        : null;
      const earliestDay = predecessorDay ? addDays(predecessorDay, 1) : activity.releaseDate;
      const latestDayExclusive = activity.dueDate ?? horizonEnd;

      let placedInterval: { start: Date; end: Date } | null = null;
      let placedDay: Date | null = null;
      for (
        let day = earliestDay;
        day < latestDayExclusive && day < horizonEnd;
        day = addDays(day, 1)
      ) {
        const gap = bestGapOnDay(calendar, day, activity.durationMs, activity.dueDate ?? undefined);
        if (gap) {
          placedInterval = gap;
          placedDay = day;
          break;
        }
      }

      if (placedInterval && placedDay) {
        markBusy(calendar, placedInterval);
        slots.push({
          startAt: placedInterval.start,
          endAt: placedInterval.end,
          occupantType: activity.occupantType,
          occupantId: activity.occupantId,
        });
        placedDayById.set(activity.id, placedDay);
        placedIds.add(activity.id);
        remaining.delete(activity.id);
        placedMsByOccupant.set(
          activity.occupantId,
          (placedMsByOccupant.get(activity.occupantId) ?? 0) + activity.durationMs,
        );

        if (activity.gatedByPoolCapacity) {
          acquirePool(calendar, activity.resourcePool);
        }
        if (activity.isLastInChain && activity.resourcePool) {
          releasePool(calendar, activity.resourcePool);
        }

        handledThisPass = true;
        break; // restart: freshly-eligible successors / freed pool capacity
      }

      // Day window exhausted — permanent for this Activity (busy time
      // only ever grows, so a failed search now can never succeed later).
      remaining.delete(activity.id);
      if (activity.occupantType === "deadline-task" && !conflictedOccupantIds.has(activity.occupantId)) {
        conflictedOccupantIds.add(activity.occupantId);
        const totalHours = (totalMsByOccupant.get(activity.occupantId) ?? 0) / HOUR_MS;
        const placedHours = (placedMsByOccupant.get(activity.occupantId) ?? 0) / HOUR_MS;
        conflicts.push({
          reason: "deadline-task-unplaceable",
          occupantType: "deadline-task",
          occupantId: activity.occupantId,
          message:
            placedHours > 0
              ? `Deadline Task needs ${totalHours}h but only ${placedHours}h fit before its deadline`
              : `Deadline Task has no free time before its deadline`,
        });
      }
      handledThisPass = true;
      break;
    }

    if (!handledThisPass) {
      // Every eligible Activity this pass was pool-blocked with no
      // possibility of progress — deadlock (permanently oversubscribed
      // WIP pool). Correctly leaves them unplaced with no conflict (soft
      // Trackable Item work, never charter-guarded).
      break;
    }
  }

  return { slots, conflicts };
}

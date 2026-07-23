// Orchestrator for the Whole-Future Persisted Scheduling Engine (project
// owner, 2026-07-23: 產生課表 should schedule the WHOLE future, not just
// one week, "use real algorithm, design the engine"). See
// docs/domain-model.md's Scheduler section for the full COP/WCSP/RCPSP
// formulation this composes:
//
//   Goals -> Task Planner -> Constraint Engine -> Optimization Engine
//
// Fixed Commitments, Routines, and Category Item Schedules have no real
// placement *choice* to optimize (cadence dictates the day; the existing
// Time-of-Day merge already picks the gap) — they're produced by simply
// looping the existing per-week placers unchanged across the horizon
// (confirmed safe: none of them hold cross-week state). Flexible
// Trackable Items and Deadline Tasks — the things with a genuine "which
// day, which order" decision — go through the new pipeline: Task Planner
// (activity-planner.ts) decomposes them into Activities, the Constraint
// Engine (resource-calendar.ts) tracks feasibility across the whole
// horizon in one pass, and the Optimization Engine (rcpsp-solver.ts)
// solves it via a priority-rule RCPSP heuristic (Serial SGS).
//
// Pure function of HorizonSchedulerInput — no @prisma/client import here
// or anywhere else under src/scheduler/, same rule as types.ts's header
// comment. computeSchedule (index.ts) and every existing placement layer
// are untouched; this is an additive new entry point.

import {
  SchedulerInput,
  ScheduledTimeSlot,
  SchedulerConflict,
  TrackableItemType,
} from "./types";
import { placeFixedCommitments } from "./hard-constraints";
import { placeRoutines } from "./routine-placement";
import { placeCategoryItemSchedules } from "./category-placement";
import { addDays, type Interval } from "./time";
import { planActivities } from "./activity-planner";
import { createResourceCalendar } from "./resource-calendar";
import { solveRCPSP } from "./rcpsp-solver";

export interface HorizonSchedulerInput
  extends Omit<SchedulerInput, "weekStart" | "weekEnd"> {
  horizonStart: Date;
  horizonWeeks: number;
  // Real Time Slots this occupant already has somewhere in the horizon —
  // idempotent re-entrancy for the Task Planner (same seed-map role
  // Design Decision 3 in the plan describes). Keyed by occupant id.
  alreadyScheduledSessionsByItemId: Record<string, number>;
  alreadyScheduledHoursByTaskId: Record<string, number>;
}

export interface HorizonSchedulerOutput {
  slots: ScheduledTimeSlot[];
  conflicts: SchedulerConflict[];
}

function toBusy(slots: { startAt: Date; endAt: Date }[]): Interval[] {
  return slots.map((slot) => ({ start: slot.startAt, end: slot.endAt }));
}

export function computeHorizonSchedule(input: HorizonSchedulerInput): HorizonSchedulerOutput {
  const horizonEnd = addDays(input.horizonStart, input.horizonWeeks * 7);

  const deterministicSlots: ScheduledTimeSlot[] = [];
  const deterministicConflicts: SchedulerConflict[] = [];
  // Threaded across weeks so a category-scheduled item (e.g. a shared
  // daily book slot) stops once it hits its own remaining-chapter budget
  // instead of getting a session every eligible day for the whole
  // horizon — see category-placement.ts's header comment.
  let categoryScheduledCounts = { ...input.alreadyScheduledSessionsByItemId };

  for (let week = 0; week < input.horizonWeeks; week++) {
    const weekStart = addDays(input.horizonStart, week * 7);
    const weekEnd = addDays(weekStart, 7);
    const weekInput: SchedulerInput = {
      ...input,
      weekStart,
      weekEnd,
      trackablePlanningStart: input.horizonStart,
      existingSlots: input.existingSlots.filter(
        (slot) => slot.startAt >= weekStart && slot.startAt < weekEnd,
      ),
    };

    const fixedResult = placeFixedCommitments(weekInput);
    const existingBusy = toBusy(weekInput.existingSlots);
    const fixedBusy = toBusy(fixedResult.slots);

    const routineResult = placeRoutines(weekInput, [...existingBusy, ...fixedBusy]);
    const routineBusy = toBusy(routineResult.slots);

    const categoryResult = placeCategoryItemSchedules(
      weekInput,
      [...existingBusy, ...fixedBusy, ...routineBusy],
      categoryScheduledCounts,
    );
    categoryScheduledCounts = categoryResult.scheduledCountByItemId;

    deterministicSlots.push(
      ...fixedResult.slots,
      ...routineResult.slots,
      ...categoryResult.slots,
    );
    deterministicConflicts.push(...fixedResult.conflicts);
  }

  const categoryScheduledTypes = new Set(input.categoryItemSchedules.map((s) => s.type));

  // Pre-reserve one pool slot per currently in-progress item — mirrors
  // selectEligibleItems' unconditional "every in-progress item is
  // eligible" rule (flexible-placement.ts), generalized across the whole
  // horizon (see resource-calendar.ts's createResourceCalendar).
  const inProgressCountByType = new Map<TrackableItemType, number>();
  for (const item of input.trackableItems) {
    if (item.status !== "in-progress" || categoryScheduledTypes.has(item.type)) {
      continue;
    }
    inProgressCountByType.set(item.type, (inProgressCountByType.get(item.type) ?? 0) + 1);
  }

  const activities = planActivities({
    trackableItems: input.trackableItems,
    deadlineTasks: input.deadlineTasks,
    categoryScheduledTypes,
    alreadyScheduledSessionsByItemId: input.alreadyScheduledSessionsByItemId,
    alreadyScheduledHoursByTaskId: input.alreadyScheduledHoursByTaskId,
    horizonStart: input.horizonStart,
  });

  const seedBusy = [...toBusy(input.existingSlots), ...toBusy(deterministicSlots)];
  const calendar = createResourceCalendar(seedBusy, input.wipLimits, inProgressCountByType);

  const { slots: optimizedSlots, conflicts: optimizedConflicts } = solveRCPSP(
    activities,
    calendar,
    input.horizonStart,
    horizonEnd,
  );

  return {
    slots: [...deterministicSlots, ...optimizedSlots],
    conflicts: [...deterministicConflicts, ...optimizedConflicts],
  };
}

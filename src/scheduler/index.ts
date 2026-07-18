// Public entry point for the Scheduler (ROADMAP.md Phase 2). Composes the
// three placement layers into one SchedulerOutput: hard constraints
// (Fixed Commitment / Deadline Task) first, then Routine occurrences, then
// flexible Trackable Item work — each layer's placements become part of
// the next layer's "busy" so nothing double-books an earlier layer's
// slot. Pure function of SchedulerInput; still never touches Prisma (see
// types.ts's header comment) — callers outside src/scheduler/ pass in a
// snapshot and get a proposed SchedulerOutput back, nothing more.

import { SchedulerInput, SchedulerOutput } from "./types";
import { placeHardConstraints } from "./hard-constraints";
import { placeRoutines } from "./routine-placement";
import { placeFlexibleTrackableItems } from "./flexible-placement";
import type { Interval } from "./time";

function toBusy(slots: { startAt: Date; endAt: Date }[]): Interval[] {
  return slots.map((slot) => ({ start: slot.startAt, end: slot.endAt }));
}

export function computeSchedule(input: SchedulerInput): SchedulerOutput {
  const existingBusy = toBusy(input.existingSlots);

  const hardResult = placeHardConstraints(input);
  const hardBusy = toBusy(hardResult.slots);

  const routineResult = placeRoutines(input, [...existingBusy, ...hardBusy]);
  const routineBusy = toBusy(routineResult.slots);

  const flexibleResult = placeFlexibleTrackableItems(input, [
    ...existingBusy,
    ...hardBusy,
    ...routineBusy,
  ]);

  return {
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
    slots: [...hardResult.slots, ...routineResult.slots, ...flexibleResult.slots],
    conflicts: hardResult.conflicts,
  };
}

export * from "./types";
export { placeHardConstraints, placeFixedCommitments, placeDeadlineTasks } from "./hard-constraints";
export { placeRoutines } from "./routine-placement";
export { placeFlexibleTrackableItems } from "./flexible-placement";
export { repairSchedule } from "./repair";

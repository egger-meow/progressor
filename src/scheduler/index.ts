// Public entry point for the Scheduler (ROADMAP.md Phase 2). Composes the
// placement layers into one SchedulerOutput: hard constraints (Fixed
// Commitment / Deadline Task) first, then Routine occurrences, then
// CategoryItemSchedule occurrences (opt-in, per Trackable Item type), then
// flexible Trackable Item work for whatever's left — each layer's
// placements become part of the next layer's "busy" so nothing double-books
// an earlier layer's slot. Pure function of SchedulerInput; still never
// touches Prisma (see types.ts's header comment) — callers outside
// src/scheduler/ pass in a snapshot and get a proposed SchedulerOutput back,
// nothing more.

import { SchedulerInput, SchedulerOutput } from "./types";
import { placeHardConstraints } from "./hard-constraints";
import { placeRoutines } from "./routine-placement";
import { placeCategoryItemSchedules } from "./category-placement";
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

  const categoryResult = placeCategoryItemSchedules(input, [
    ...existingBusy,
    ...hardBusy,
    ...routineBusy,
  ]);
  const categoryBusy = toBusy(categoryResult.slots);

  // A type with a configured CategoryItemSchedule is fully handled above —
  // filtering its items out of placeFlexibleTrackableItems's input is what
  // makes this additive/opt-in rather than a double-booking replacement. A
  // type with no configured schedule is untouched by placeCategoryItemSchedules
  // (nothing in its loop runs for it) and flows through unchanged below.
  const scheduledTypes = new Set(input.categoryItemSchedules.map((s) => s.type));
  const flexibleInput: SchedulerInput = {
    ...input,
    trackableItems: input.trackableItems.filter((item) => !scheduledTypes.has(item.type)),
  };
  const flexibleResult = placeFlexibleTrackableItems(flexibleInput, [
    ...existingBusy,
    ...hardBusy,
    ...routineBusy,
    ...categoryBusy,
  ]);

  return {
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
    slots: [
      ...hardResult.slots,
      ...routineResult.slots,
      ...categoryResult.slots,
      ...flexibleResult.slots,
    ],
    conflicts: hardResult.conflicts,
  };
}

export * from "./types";
export { placeHardConstraints, placeFixedCommitments, placeDeadlineTasks } from "./hard-constraints";
export { placeRoutines } from "./routine-placement";
export { placeCategoryItemSchedules } from "./category-placement";
export { placeFlexibleTrackableItems } from "./flexible-placement";
export { repairSchedule } from "./repair";

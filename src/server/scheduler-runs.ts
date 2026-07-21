// Wires the pure Scheduler (src/scheduler/) into the real store. This is
// service layer (imports Prisma-backed src/server/* functions and
// src/scheduler/'s pure compute function) — src/scheduler/ itself still
// never touches Prisma; see that directory's types.ts header comment.
//
// Re-run policy (explicit product decision, not inferred): the Scheduler
// only fills genuinely empty time. Every Time Slot already on the board
// for the target week — however it got there (manual edit, an Ad-hoc
// Event, a prior run) — is passed in as `existingSlots` and never
// modified or deleted here. This falls directly out of how
// src/scheduler/*'s placement layers already treat `existingSlots` as
// busy space they must not overlap, so no special-casing is needed beyond
// simply not issuing any delete/update calls in this file.

import { listTrackableItems, getWipLimit } from "./trackable-items";
import { listRoutines } from "./routines";
import { listFixedCommitments, listDeadlineTasks } from "./semester-commitments";
import { listAdHocEvents } from "./ad-hoc-events";
import { getSemester } from "./semester";
import { listTimeSlots, createTimeSlot, type OccupantType } from "./time-slots";
import {
  computeSchedule,
  type SchedulerInput,
  type SchedulerOutput,
  type TrackableItemType,
  type TrackableItemStatus,
  type RoutineCadence,
  type TimeOfDayPreference,
} from "../scheduler";

export interface RunSchedulerResult {
  output: SchedulerOutput;
  createdSlotIds: string[];
}

// Exported so src/server/scheduler-repair.ts (Phase 3) can snapshot the
// same shape without duplicating this mapping.
export async function buildSchedulerInput(weekStart: Date, weekEnd: Date): Promise<SchedulerInput> {
  const [
    trackableItems,
    routines,
    fixedCommitments,
    deadlineTasks,
    adHocEvents,
    existingSlots,
    bookLimit,
    courseLimit,
    semester,
  ] = await Promise.all([
    listTrackableItems(),
    listRoutines(),
    listFixedCommitments(),
    listDeadlineTasks(),
    listAdHocEvents(),
    listTimeSlots({ from: weekStart, to: weekEnd }),
    getWipLimit("book"),
    getWipLimit("course"),
    getSemester(),
  ]);

  return {
    weekStart,
    weekEnd,
    // Cast: these fields are plain `string` columns in Prisma (sqlite has
    // no native enum support — see prisma/schema.prisma), already
    // validated against these exact unions by src/server/*'s own
    // assertValid* helpers at write time.
    trackableItems: trackableItems.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type as TrackableItemType,
      priority: item.priority,
      status: item.status as TrackableItemStatus,
      unitCount: item.unitCount,
      unitsCompleted: item.unitsCompleted,
      estimatedDays: item.estimatedDays,
    })),
    routines: routines.map((routine) => ({
      id: routine.id,
      title: routine.title,
      category: routine.category,
      cadence: routine.cadence as RoutineCadence,
      anchor: routine.anchor,
      timeOfDayPreference: routine.timeOfDayPreference as TimeOfDayPreference | null,
      preferredStartTime: routine.preferredStartTime,
      durationMinutes: routine.durationMinutes,
    })),
    fixedCommitments,
    deadlineTasks,
    adHocEvents,
    wipLimits: [
      { type: "book", maxInProgress: bookLimit },
      { type: "course", maxInProgress: courseLimit },
    ],
    existingSlots: existingSlots.map((slot) => ({
      id: slot.id,
      startAt: slot.startAt,
      endAt: slot.endAt,
      occupantType: slot.occupantType as OccupantType,
      occupantId: slot.occupantId,
    })),
    semester,
  };
}

export async function runScheduler(weekStart: Date, weekEnd: Date): Promise<RunSchedulerResult> {
  const input = await buildSchedulerInput(weekStart, weekEnd);
  const output = computeSchedule(input);

  const createdSlotIds: string[] = [];
  for (const slot of output.slots) {
    const created = await createTimeSlot({
      startAt: slot.startAt,
      endAt: slot.endAt,
      occupantType: slot.occupantType,
      occupantId: slot.occupantId ?? undefined,
    });
    createdSlotIds.push(created.id);
  }

  return { output, createdSlotIds };
}

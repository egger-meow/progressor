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
import { listCategoryItemSchedules } from "./category-item-schedules";
import { listAdHocEvents } from "./ad-hoc-events";
import { getSemester } from "./semester";
import { listTimeSlots, createTimeSlot, type OccupantType } from "./time-slots";
import {
  computeSchedule,
  computeHorizonSchedule,
  DEFAULT_HORIZON_WEEKS,
  MAX_HORIZON_WEEKS,
  type SchedulerInput,
  type SchedulerOutput,
  type HorizonSchedulerInput,
  type HorizonSchedulerOutput,
  type SchedulerDeadlineTask,
  type SchedulerSemester,
  type TrackableItemType,
  type TrackableItemStatus,
  type RoutineCadence,
} from "../scheduler";

export interface RunSchedulerResult {
  output: SchedulerOutput;
  createdSlotIds: string[];
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Every entity mapping shared by both the single-week (buildSchedulerInput)
// and whole-horizon (buildHorizonSchedulerInput) builders — the two differ
// only in their weekStart/weekEnd-vs-horizon framing and existingSlots
// range, not in how each entity kind is fetched/shaped.
async function fetchSchedulerEntities() {
  const [
    trackableItems,
    routines,
    fixedCommitments,
    deadlineTasks,
    categoryItemSchedules,
    adHocEvents,
    bookLimit,
    courseLimit,
    semester,
  ] = await Promise.all([
    listTrackableItems(),
    listRoutines(),
    listFixedCommitments(),
    listDeadlineTasks(),
    listCategoryItemSchedules(),
    listAdHocEvents(),
    getWipLimit("book"),
    getWipLimit("course"),
    getSemester(),
  ]);

  return {
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
      targetDate: item.targetDate,
      unitWeightMultiplier: item.unitWeightMultiplier,
      unitWeightOverrides: item.unitWeightOverrides,
      currentUnitSessionsCompleted: item.currentUnitSessionsCompleted,
    })),
    routines: routines.map((routine) => ({
      id: routine.id,
      title: routine.title,
      category: routine.category,
      cadence: routine.cadence as RoutineCadence,
      anchor: routine.anchor,
      timeOfDayPreferences: routine.timeOfDayPreferences,
      preferredStartTime: routine.preferredStartTime,
      durationMinutes: routine.durationMinutes,
    })),
    fixedCommitments,
    deadlineTasks,
    categoryItemSchedules: categoryItemSchedules.map((schedule) => ({
      type: schedule.type as TrackableItemType,
      cadence: schedule.cadence as RoutineCadence,
      anchor: schedule.anchor,
      timeOfDayPreferences: schedule.timeOfDayPreferences,
      preferredStartTime: schedule.preferredStartTime,
      durationMinutes: schedule.durationMinutes,
    })),
    adHocEvents,
    wipLimits: [
      { type: "book" as TrackableItemType, maxInProgress: bookLimit },
      { type: "course" as TrackableItemType, maxInProgress: courseLimit },
    ],
    semester,
  };
}

// Exported so src/server/scheduler-repair.ts (Phase 3) can snapshot the
// same shape without duplicating this mapping.
export async function buildSchedulerInput(weekStart: Date, weekEnd: Date): Promise<SchedulerInput> {
  const [entities, existingSlots] = await Promise.all([
    fetchSchedulerEntities(),
    listTimeSlots({ from: weekStart, to: weekEnd }),
  ]);

  return {
    weekStart,
    weekEnd,
    ...entities,
    existingSlots: existingSlots.map((slot) => ({
      id: slot.id,
      startAt: slot.startAt,
      endAt: slot.endAt,
      occupantType: slot.occupantType as OccupantType,
      occupantId: slot.occupantId,
    })),
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

// Resolves the horizon's actual length (Design Decision 1, plan
// "Whole-Future Persisted Scheduling Engine"): DEFAULT_HORIZON_WEEKS,
// extended to cover the furthest Deadline Task due date or the configured
// Semester's end (both still need a real week to land in), capped at
// MAX_HORIZON_WEEKS so a mis-set due date years out can't trigger
// unbounded computation/storage.
export function computeHorizonWeeks(
  horizonStart: Date,
  deadlineTasks: SchedulerDeadlineTask[],
  semester: SchedulerSemester | null,
): number {
  let weeks = DEFAULT_HORIZON_WEEKS;

  for (const task of deadlineTasks) {
    const neededWeeks = Math.ceil((task.dueAt.getTime() - horizonStart.getTime()) / (7 * DAY_MS));
    weeks = Math.max(weeks, neededWeeks);
  }

  if (semester) {
    const semesterEnd = new Date(
      semester.startDate.getTime() + semester.weekCount * 7 * DAY_MS,
    );
    const neededWeeks = Math.ceil((semesterEnd.getTime() - horizonStart.getTime()) / (7 * DAY_MS));
    weeks = Math.max(weeks, neededWeeks);
  }

  return Math.min(Math.max(weeks, DEFAULT_HORIZON_WEEKS), MAX_HORIZON_WEEKS);
}

// Mirrors buildSchedulerInput, but queries real Time Slots across the
// *entire* horizon (not one week) and derives the two remaining-budget
// seed maps the Task Planner (activity-planner.ts) needs for idempotent
// re-entrancy — a session/hour already on the board anywhere in the
// horizon must count against what's left to place, so re-running 產生課表
// only fills genuinely missing work (same re-run policy as
// buildSchedulerInput above, extended to the whole horizon).
export async function buildHorizonSchedulerInput(
  horizonStart: Date,
): Promise<HorizonSchedulerInput> {
  const entities = await fetchSchedulerEntities();
  const horizonWeeks = computeHorizonWeeks(horizonStart, entities.deadlineTasks, entities.semester);
  const horizonEnd = new Date(horizonStart.getTime() + horizonWeeks * 7 * DAY_MS);

  const existingSlots = await listTimeSlots({ from: horizonStart, to: horizonEnd });

  const alreadyScheduledSessionsByItemId: Record<string, number> = {};
  const alreadyScheduledHoursByTaskId: Record<string, number> = {};
  for (const slot of existingSlots) {
    if (slot.occupantType === "trackable-item" && slot.occupantId) {
      alreadyScheduledSessionsByItemId[slot.occupantId] =
        (alreadyScheduledSessionsByItemId[slot.occupantId] ?? 0) + 1;
    } else if (slot.occupantType === "deadline-task" && slot.occupantId) {
      const hours = (slot.endAt.getTime() - slot.startAt.getTime()) / HOUR_MS;
      alreadyScheduledHoursByTaskId[slot.occupantId] =
        (alreadyScheduledHoursByTaskId[slot.occupantId] ?? 0) + hours;
    }
  }

  return {
    horizonStart,
    horizonWeeks,
    ...entities,
    existingSlots: existingSlots.map((slot) => ({
      id: slot.id,
      startAt: slot.startAt,
      endAt: slot.endAt,
      occupantType: slot.occupantType as OccupantType,
      occupantId: slot.occupantId,
    })),
    alreadyScheduledSessionsByItemId,
    alreadyScheduledHoursByTaskId,
  };
}

export interface RunSchedulerForHorizonResult {
  output: HorizonSchedulerOutput;
  createdSlotIds: string[];
}

// The whole-horizon counterpart to runScheduler — persists every slot
// computeHorizonSchedule proposes via the same createTimeSlot path (never
// modifying/deleting an existing one, same re-run policy as this file's
// header comment), just over the whole horizon instead of one week.
export async function runSchedulerForHorizon(
  horizonStart: Date,
): Promise<RunSchedulerForHorizonResult> {
  const input = await buildHorizonSchedulerInput(horizonStart);
  const output = computeHorizonSchedule(input);

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

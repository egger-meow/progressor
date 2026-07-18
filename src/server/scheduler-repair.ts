// Wires the pure Scheduler repair layer (src/scheduler/repair.ts, Phase 3
// "Elastic Re-Scheduling & Ad-hoc Events") into the real store. Service
// layer — src/scheduler/ itself still never touches Prisma (see that
// directory's types.ts header comment).
//
// Each exported function here: (1) applies whatever domain-data change the
// disruption itself represents (creating the Ad-hoc Event record, marking
// a Trackable Item done) via the existing src/server/* service functions,
// (2) snapshots current state into a SchedulerInput the same way
// scheduler-runs.ts does, (3) calls repairSchedule for the local diff, and
// (4) applies that diff — removing/creating Time Slots — via
// time-slots.ts. Nothing outside this file (or scheduler-runs.ts) ever
// reads the SchedulerRepairResult's diff without applying it; a caller
// only sees the final RepairOutcome.

import { getTrackableItem, updateTrackableItem } from "./trackable-items";
import { createAdHocEvent } from "./ad-hoc-events";
import { createTimeSlot, removeTimeSlot } from "./time-slots";
import { buildSchedulerInput } from "./scheduler-runs";
import { repairSchedule, type SchedulerRepairResult } from "../scheduler";

export interface RepairOutcome {
  removedSlotIds: string[];
  createdSlotIds: string[];
  conflicts: SchedulerRepairResult["conflicts"];
}

async function applyRepair(result: SchedulerRepairResult): Promise<RepairOutcome> {
  for (const id of result.removedSlotIds) {
    await removeTimeSlot(id);
  }
  const createdSlotIds: string[] = [];
  for (const slot of result.addedSlots) {
    const created = await createTimeSlot({
      startAt: slot.startAt,
      endAt: slot.endAt,
      occupantType: slot.occupantType,
      occupantId: slot.occupantId ?? undefined,
    });
    createdSlotIds.push(created.id);
  }
  return { removedSlotIds: result.removedSlotIds, createdSlotIds, conflicts: result.conflicts };
}

// Skip a flexible Trackable Item session that's already on the board —
// `slotId` must be one of that week's Time Slots (occupantType
// "trackable-item"); repairSchedule itself rejects anything else.
export async function skipSession(
  weekStart: Date,
  weekEnd: Date,
  slotId: string,
): Promise<RepairOutcome> {
  const input = await buildSchedulerInput(weekStart, weekEnd);
  const result = repairSchedule(input, { kind: "skip-session", slotId });
  return applyRepair(result);
}

export interface InsertAdHocEventInput {
  title: string;
  notes?: string;
  startAt: Date;
  endAt: Date;
}

// Declares a brand-new Ad-hoc Event (no creation UI existed for this
// record before Phase 3 — see docs/status.md's Known Limits) and places it
// via a repair, so any overlapping flexible session is evicted/relocated
// rather than left double-booked with no resolution.
export async function insertAdHocEvent(
  weekStart: Date,
  weekEnd: Date,
  input: InsertAdHocEventInput,
): Promise<RepairOutcome> {
  const event = await createAdHocEvent({ title: input.title, notes: input.notes });
  const schedulerInput = await buildSchedulerInput(weekStart, weekEnd);
  const result = repairSchedule(schedulerInput, {
    kind: "insert-ad-hoc-event",
    event: { id: event.id, title: event.title, notes: event.notes },
    startAt: input.startAt,
    endAt: input.endAt,
  });
  return applyRepair(result);
}

// Marks a Trackable Item done (unitsCompleted set to its full unitCount)
// before its this-week session was due, then repairs the Schedule to free
// that now-unnecessary future session. `now` defaults to the real current
// time here (the service-layer boundary, not src/scheduler/) — the
// Scheduler itself stays pure and never reads the clock.
export async function completeItemEarly(
  weekStart: Date,
  weekEnd: Date,
  itemId: string,
  now: Date = new Date(),
): Promise<RepairOutcome> {
  const item = await getTrackableItem(itemId);
  if (!item) {
    throw new Error(`TrackableItem not found: ${itemId}`);
  }
  await updateTrackableItem(itemId, { status: "done", unitsCompleted: item.unitCount });

  const schedulerInput = await buildSchedulerInput(weekStart, weekEnd);
  const result = repairSchedule(schedulerInput, { kind: "item-completed", itemId, now });
  return applyRepair(result);
}

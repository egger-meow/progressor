// Daily Check-In Gate (docs/domain-model.md): forces a same-day yes/no
// confirmation for every past Book/Course/Deadline Task Time Slot the user
// never marked resolved, instead of letting a missed session sit inert on
// the board forever. Scoped to occupantType "trackable-item"/
// "deadline-task" only — a Routine/Fixed Commitment occurrence is
// recurring/anchored, not "progress to catch up on."
//
// "Yes" timestamps confirmedAt (src/server/time-slots.ts) and, for a
// trackable-item occupant, advances its progress by one sitting via
// advanceTrackableItemProgress — added 2026-07-23 after the project owner
// found every session for a book/course showed the same chapter forever,
// because nothing anywhere ever advanced unitsCompleted per session (see
// docs/status.md). A deadline-task "yes" still only sets confirmedAt —
// estimatedHours stays entirely user-edited, there's no per-session unit
// concept to advance there. "No" deletes the Time Slot outright (never
// writes a "missed" value) and re-runs the existing runScheduler —
// deleting the stale slot is what makes the item eligible for a fresh
// placement again (see flexible-placement.ts's itemIdsWithSessionThisWeek),
// so this reuses 100% existing scheduling logic.

import { prisma } from "./db";
import { removeTimeSlot, resolveOccupantInfo, type OccupantType } from "./time-slots";
import { runScheduler, type RunSchedulerResult } from "./scheduler-runs";
import { advanceTrackableItemProgress } from "./trackable-items";

const CHECK_IN_OCCUPANT_TYPES: OccupantType[] = ["trackable-item", "deadline-task"];

export interface PendingCheckIn {
  id: string;
  startAt: Date;
  endAt: Date;
  occupantType: OccupantType;
  occupantId: string | null;
  occupantKind: string;
  occupantLabel: string;
  occupantProgress?: string;
}

export async function listPendingCheckIns(now: Date = new Date()): Promise<PendingCheckIn[]> {
  const slots = await prisma.timeSlot.findMany({
    where: {
      endAt: { lt: now },
      occupantType: { in: CHECK_IN_OCCUPANT_TYPES },
      confirmedAt: null,
    },
    orderBy: { startAt: "asc" },
  });

  return Promise.all(
    slots.map(async (slot) => {
      const info = await resolveOccupantInfo(slot.occupantType as OccupantType, slot.occupantId, {
        id: slot.id,
      });
      return {
        id: slot.id,
        startAt: slot.startAt,
        endAt: slot.endAt,
        occupantType: slot.occupantType as OccupantType,
        occupantId: slot.occupantId,
        occupantKind: info.kind,
        occupantLabel: info.label,
        occupantProgress: info.progress,
      };
    }),
  );
}

async function assertPendingCheckIn(slotId: string) {
  const slot = await prisma.timeSlot.findUnique({ where: { id: slotId } });
  if (!slot) {
    throw new Error(`TimeSlot not found: ${slotId}`);
  }
  if (!CHECK_IN_OCCUPANT_TYPES.includes(slot.occupantType as OccupantType)) {
    throw new Error(
      `TimeSlot "${slotId}" is occupantType "${slot.occupantType}" — not eligible for the daily check-in gate`,
    );
  }
  return slot;
}

export async function confirmCheckIn(slotId: string, now: Date = new Date()): Promise<void> {
  const slot = await assertPendingCheckIn(slotId);
  await prisma.timeSlot.update({ where: { id: slotId }, data: { confirmedAt: now } });
  if (slot.occupantType === "trackable-item" && slot.occupantId) {
    await advanceTrackableItemProgress(slot.occupantId);
  }
}

export interface DismissCheckInResult {
  removedSlotId: string;
  reschedule: RunSchedulerResult;
}

export async function dismissCheckInAsMissed(
  slotId: string,
  weekStart: Date,
  weekEnd: Date,
  now: Date = new Date(),
): Promise<DismissCheckInResult> {
  const target = await assertPendingCheckIn(slotId);
  await removeTimeSlot(slotId);
  const reschedule = await runScheduler(weekStart, weekEnd);

  // The Scheduler's day-loop (hard-constraints.ts/flexible-placement.ts)
  // searches the whole [weekStart, weekEnd) window with no "not before
  // today" bound — a pre-existing characteristic, unrelated to this
  // feature, that's otherwise invisible since nothing else re-checks a
  // slot once placed. Here it matters directly: deleting the missed slot
  // just made this item eligible again, and if the week's Monday/Tuesday
  // still has Slack room, the fresh placement can land on an already-
  // elapsed day — instantly stale again, defeating the entire point of
  // "reschedule starting today." Prune only the dismissed item's own new
  // slot(s) if that happened; every other item's placement is untouched.
  // Leaves the item with no session this week rather than a backdated
  // one — the same silent-skip precedent already used elsewhere in the
  // Scheduler for "no room this week."
  for (const createdId of reschedule.createdSlotIds) {
    const created = await prisma.timeSlot.findUnique({ where: { id: createdId } });
    if (created && created.occupantId === target.occupantId && created.endAt <= now) {
      await removeTimeSlot(createdId);
    }
  }

  return { removedSlotId: slotId, reschedule };
}

export interface CheckInAnswer {
  slotId: string;
  answer: "yes" | "no";
}

// The gate collects every answer client-side first (so a selection is
// visibly highlighted immediately, no round-trip needed to "react") and
// submits them all together via one 提交 button — project owner,
// 2026-07-22: instant per-row submission with no bottom submit button
// gave no visible confirmation of what was picked. Processed sequentially
// (not Promise.all) since "no" answers call runScheduler, and two
// overlapping runs for items sharing a Category Item Schedule occurrence
// could otherwise race on the same day's placement.
export async function submitCheckIns(
  answers: CheckInAnswer[],
  weekStart: Date,
  weekEnd: Date,
  now: Date = new Date(),
): Promise<void> {
  for (const { slotId, answer } of answers) {
    if (answer === "yes") {
      await confirmCheckIn(slotId, now);
    } else {
      await dismissCheckInAsMissed(slotId, weekStart, weekEnd, now);
    }
  }
}

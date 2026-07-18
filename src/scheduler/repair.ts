// Local repair of an already-computed Schedule (ROADMAP.md Phase 3,
// "Elastic Re-Scheduling & Ad-hoc Events"). Pure function of SchedulerInput
// plus a single SchedulerDisruption — see types.ts's header comment for why
// src/scheduler/ never touches Prisma. Unlike computeSchedule (a full
// week's proposed Schedule from scratch), repairSchedule returns a small
// diff meant to be applied on top of whatever's already on the board, so a
// disruption never triggers a full recompute — see docs/status.md for the
// documented time budget this buys.
//
// Backfill policy (project owner's explicit decision, 2026-07-18): when a
// repair frees up flexible time this week (a skipped session, or a
// Trackable Item finishing early), it immediately tries to fill that exact
// freed window with the next eligible item that doesn't already have a
// session this week, reusing the same priority/WIP-Limit-aware eligibility
// (selectEligibleItems) and Slack-budget (dailyWindowMs/usedMsOnDay) logic
// as ordinary flexible placement — not always leaving it as Slack until the
// next full "Generate Schedule" run.

import {
  SchedulerInput,
  ScheduledTimeSlot,
  SchedulerConflict,
  SchedulerDisruption,
  SchedulerRepairResult,
  SchedulerAdHocEvent,
  SchedulerTrackableItem,
} from "./types";
import { addDays, combineDateAndTime, findFreeInterval, overlaps, type Interval } from "./time";
import {
  DAILY_WINDOW_START,
  DAILY_WINDOW_END,
  SESSION_DURATION_MS,
  MIN_SLACK_SHARE_PER_DAY,
} from "./constants";
import { selectEligibleItems, dailyWindowMs, usedMsOnDay } from "./flexible-placement";

function toBusy(slots: { startAt: Date; endAt: Date }[]): Interval[] {
  return slots.map((slot) => ({ start: slot.startAt, end: slot.endAt }));
}

function itemIdsWithSessionThisWeek(slots: { occupantType: string; occupantId: string | null }[]): Set<string> {
  return new Set(
    slots
      .filter((slot) => slot.occupantType === "trackable-item" && slot.occupantId)
      .map((slot) => slot.occupantId as string),
  );
}

function findBackfillCandidate(
  input: SchedulerInput,
  alreadyPlaced: Set<string>,
): SchedulerTrackableItem | null {
  for (const item of selectEligibleItems(input)) {
    if (!alreadyPlaced.has(item.id)) {
      return item;
    }
  }
  return null;
}

// Reuses the exact freed window (same day/time) rather than searching the
// whole week — a repair is meant to be a small, local edit, not a second
// full flexible-placement pass. Only checks that day's Slack budget, since
// the window itself is guaranteed free (the caller just removed the slot
// that occupied it and hasn't added anything else there yet).
function attemptBackfill(
  input: SchedulerInput,
  freedWindow: Interval,
  busy: Interval[],
  alreadyPlaced: Set<string>,
): ScheduledTimeSlot | null {
  const slackBudget = dailyWindowMs(freedWindow.start) * (1 - MIN_SLACK_SHARE_PER_DAY);
  if (usedMsOnDay(freedWindow.start, busy) + SESSION_DURATION_MS > slackBudget) {
    return null;
  }
  const candidate = findBackfillCandidate(input, alreadyPlaced);
  if (!candidate) {
    return null;
  }
  return {
    startAt: freedWindow.start,
    endAt: freedWindow.end,
    occupantType: "trackable-item",
    occupantId: candidate.id,
  };
}

function repairSkipSession(input: SchedulerInput, slotId: string): SchedulerRepairResult {
  const target = input.existingSlots.find((slot) => slot.id === slotId);
  if (!target) {
    throw new Error(`skip-session: no existing Time Slot with id "${slotId}"`);
  }
  if (target.occupantType !== "trackable-item") {
    throw new Error(
      `skip-session: Time Slot "${slotId}" is occupantType "${target.occupantType}", not "trackable-item" — only a flexible Trackable Item session can be skipped through this repair`,
    );
  }

  const remaining = input.existingSlots.filter((slot) => slot.id !== slotId);
  const busy = toBusy(remaining);
  const alreadyPlaced = itemIdsWithSessionThisWeek(remaining);
  // The skipped item itself must not backfill its own freed window — it's
  // still otherwise eligible (e.g. still in-progress), but the whole point
  // of "skip" is that this item doesn't get today's session.
  if (target.occupantId) {
    alreadyPlaced.add(target.occupantId);
  }
  const freedWindow: Interval = { start: target.startAt, end: target.endAt };
  const backfill = attemptBackfill(input, freedWindow, busy, alreadyPlaced);

  return {
    removedSlotIds: [slotId],
    addedSlots: backfill ? [backfill] : [],
    conflicts: [],
  };
}

// Only a Trackable Item's *future* session(s) this week are removed
// (startAt >= now, passed in by the caller rather than read internally so
// this stays a pure function of its inputs) — a past Time Slot is a record
// of Schedule history, and the charter guardrail against losing already-
// tracked history means finishing a book early must not erase that a
// session already happened.
function repairItemCompleted(input: SchedulerInput, itemId: string, now: Date): SchedulerRepairResult {
  const targets = input.existingSlots.filter(
    (slot) => slot.occupantType === "trackable-item" && slot.occupantId === itemId && slot.startAt >= now,
  );
  if (targets.length === 0) {
    return { removedSlotIds: [], addedSlots: [], conflicts: [] };
  }

  const removedIds = new Set(targets.map((slot) => slot.id));
  const remaining = input.existingSlots.filter((slot) => !removedIds.has(slot.id));
  let busy = toBusy(remaining);
  const alreadyPlaced = itemIdsWithSessionThisWeek(remaining);
  const addedSlots: ScheduledTimeSlot[] = [];

  for (const target of targets) {
    const freedWindow: Interval = { start: target.startAt, end: target.endAt };
    const backfill = attemptBackfill(input, freedWindow, busy, alreadyPlaced);
    if (backfill) {
      addedSlots.push(backfill);
      busy = [...busy, freedWindow];
      alreadyPlaced.add(backfill.occupantId as string);
    }
  }

  return { removedSlotIds: [...removedIds], addedSlots, conflicts: [] };
}

// Unlike attemptBackfill, a session evicted by a newly-inserted Ad-hoc
// Event can't reuse its old window (the Ad-hoc Event now occupies it), so
// this searches the rest of the week the same way ordinary flexible
// placement does — bounded to 7 days, never a full recompute of every
// other item's placement.
function relocateSession(input: SchedulerInput, itemId: string, busy: Interval[]): ScheduledTimeSlot | null {
  for (let offset = 0; offset < 7; offset++) {
    const day = addDays(input.weekStart, offset);
    const slackBudget = dailyWindowMs(day) * (1 - MIN_SLACK_SHARE_PER_DAY);
    if (usedMsOnDay(day, busy) + SESSION_DURATION_MS > slackBudget) {
      continue;
    }
    const found = findFreeInterval(
      combineDateAndTime(day, DAILY_WINDOW_START),
      combineDateAndTime(day, DAILY_WINDOW_END),
      SESSION_DURATION_MS,
      busy,
    );
    if (found) {
      return { startAt: found.start, endAt: found.end, occupantType: "trackable-item", occupantId: itemId };
    }
  }
  return null;
}

// The Ad-hoc Event's Time Slot always places, exactly where declared —
// same "never refused" pattern as a Fixed Commitment occurrence
// (hard-constraints.ts). Per the charter's guardrail, only an overlapping
// flexible Trackable Item session yields (evicted, then relocated
// elsewhere this week); a Fixed Commitment or Deadline Task overlap is
// flagged as a SchedulerConflict instead, since neither is "flexible work"
// the charter lets an Ad-hoc Event bump. A Routine occurrence overlap is
// left alone entirely — a Routine is already a soft, nudge-around
// preference with no conflict-flagging precedent anywhere else in the
// Scheduler.
function repairInsertAdHocEvent(
  input: SchedulerInput,
  event: SchedulerAdHocEvent,
  startAt: Date,
  endAt: Date,
): SchedulerRepairResult {
  const addedSlots: ScheduledTimeSlot[] = [
    { startAt, endAt, occupantType: "ad-hoc-event", occupantId: event.id },
  ];
  const removedSlotIds: string[] = [];
  const conflicts: SchedulerConflict[] = [];

  const overlapping = input.existingSlots.filter((slot) => overlaps(startAt, endAt, slot.startAt, slot.endAt));
  const overlappingIds = new Set(overlapping.map((slot) => slot.id));

  let busy = toBusy(input.existingSlots.filter((slot) => !overlappingIds.has(slot.id)));
  busy.push({ start: startAt, end: endAt });

  for (const slot of overlapping) {
    if (slot.occupantType === "trackable-item") {
      removedSlotIds.push(slot.id);
      const relocated = slot.occupantId ? relocateSession(input, slot.occupantId, busy) : null;
      if (relocated) {
        addedSlots.push(relocated);
        busy = [...busy, { start: relocated.startAt, end: relocated.endAt }];
      }
      // No room anywhere else this week: the item simply gets no session,
      // same silent-skip precedent as ordinary flexible placement
      // (docs/status.md) — flexible Trackable Item work isn't covered by
      // the never-silently-drop guardrail.
    } else if (slot.occupantType === "fixed-commitment" || slot.occupantType === "deadline-task") {
      conflicts.push({
        reason: "ad-hoc-event-overlap",
        occupantType: "ad-hoc-event",
        occupantId: event.id,
        message: `Ad-hoc Event "${event.title}" overlaps an existing ${
          slot.occupantType === "fixed-commitment" ? "Fixed Commitment" : "Deadline Task"
        } Time Slot`,
      });
    }
  }

  return { removedSlotIds, addedSlots, conflicts };
}

export function repairSchedule(input: SchedulerInput, disruption: SchedulerDisruption): SchedulerRepairResult {
  switch (disruption.kind) {
    case "skip-session":
      return repairSkipSession(input, disruption.slotId);
    case "insert-ad-hoc-event":
      return repairInsertAdHocEvent(input, disruption.event, disruption.startAt, disruption.endAt);
    case "item-completed":
      return repairItemCompleted(input, disruption.itemId, disruption.now);
    default: {
      const exhaustive: never = disruption;
      throw new Error(`Unknown disruption: ${JSON.stringify(exhaustive)}`);
    }
  }
}

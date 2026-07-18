// Hard-constraint placement: Fixed Commitment occurrences and Deadline Task
// work sessions (ROADMAP.md Phase 2, PRIORITIES.md "Implement
// hard-constraint placement"). Pure function of SchedulerInput — see
// types.ts's header comment.

import {
  SchedulerInput,
  ScheduledTimeSlot,
  SchedulerConflict,
} from "./types";
import { addDays, offsetFromMonday, combineDateAndTime, overlaps } from "./time";
import {
  DAILY_WINDOW_START,
  DAILY_WINDOW_END,
  SESSION_DURATION_MS,
  SESSION_HOURS_PER_DAY,
} from "./constants";

export interface HardConstraintResult {
  slots: ScheduledTimeSlot[];
  conflicts: SchedulerConflict[];
}

interface Interval {
  start: Date;
  end: Date;
}

// Fixed Commitments are anchored (domain-model.md: "cannot move"), so
// placement is deterministic and never fails outright — overlapping Time
// Slots are allowed by design (see docs/status.md's Time Slot note). What
// this does detect is two Fixed Commitments, or a Fixed Commitment and an
// already-placed Ad-hoc Event, landing on the same time — a clash in the
// user's own data that should be visible, not silently rendered as an
// unexplained overlap (charter guardrail: never silently drop or hide a
// fixed-deadline affair).
export function placeFixedCommitments(input: SchedulerInput): HardConstraintResult {
  const occurrences = input.fixedCommitments.map((commitment) => {
    const day = addDays(input.weekStart, offsetFromMonday(commitment.dayOfWeek));
    return {
      commitment,
      startAt: combineDateAndTime(day, commitment.startTime),
      endAt: combineDateAndTime(day, commitment.endTime),
    };
  });

  const slots: ScheduledTimeSlot[] = occurrences.map((occurrence) => ({
    startAt: occurrence.startAt,
    endAt: occurrence.endAt,
    occupantType: "fixed-commitment",
    occupantId: occurrence.commitment.id,
  }));

  const conflicts: SchedulerConflict[] = [];

  for (let i = 0; i < occurrences.length; i++) {
    for (let j = i + 1; j < occurrences.length; j++) {
      const a = occurrences[i];
      const b = occurrences[j];
      if (overlaps(a.startAt, a.endAt, b.startAt, b.endAt)) {
        conflicts.push({
          reason: "fixed-commitment-unplaceable",
          occupantType: "fixed-commitment",
          occupantId: a.commitment.id,
          message: `Fixed Commitment "${a.commitment.title}" overlaps Fixed Commitment "${b.commitment.title}"`,
        });
        conflicts.push({
          reason: "fixed-commitment-unplaceable",
          occupantType: "fixed-commitment",
          occupantId: b.commitment.id,
          message: `Fixed Commitment "${b.commitment.title}" overlaps Fixed Commitment "${a.commitment.title}"`,
        });
      }
    }
  }

  for (const occurrence of occurrences) {
    for (const existing of input.existingSlots) {
      if (
        existing.occupantType === "ad-hoc-event" &&
        overlaps(occurrence.startAt, occurrence.endAt, existing.startAt, existing.endAt)
      ) {
        conflicts.push({
          reason: "fixed-commitment-unplaceable",
          occupantType: "fixed-commitment",
          occupantId: occurrence.commitment.id,
          message: `Fixed Commitment "${occurrence.commitment.title}" overlaps an existing Ad-hoc Event Time Slot`,
        });
      }
    }
  }

  return { slots, conflicts };
}

// Finds the first free `durationMs` window on `day` inside the daily
// scheduling window (constants.ts), not overlapping any interval in `busy`
// and ending no later than `notAfter`. Returns null if no such window
// exists on this day.
function findFreeSlot(
  day: Date,
  durationMs: number,
  busy: Interval[],
  notAfter: Date,
): Interval | null {
  const windowStart = combineDateAndTime(day, DAILY_WINDOW_START);
  const windowEnd = combineDateAndTime(day, DAILY_WINDOW_END);

  const dayBusy = busy
    .filter((interval) => overlaps(windowStart, windowEnd, interval.start, interval.end))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let candidateStart = windowStart;
  for (const interval of dayBusy) {
    const candidateEnd = new Date(candidateStart.getTime() + durationMs);
    if (candidateEnd <= interval.start && candidateEnd <= notAfter && candidateEnd <= windowEnd) {
      return { start: candidateStart, end: candidateEnd };
    }
    if (interval.end > candidateStart) {
      candidateStart = interval.end;
    }
  }

  const candidateEnd = new Date(candidateStart.getTime() + durationMs);
  if (candidateEnd <= windowEnd && candidateEnd <= notAfter) {
    return { start: candidateStart, end: candidateEnd };
  }
  return null;
}

// Deadline Task sessions are flexible (unlike a Fixed Commitment, they have
// no anchored time), so unlike placeFixedCommitments this genuinely can
// fail to find room — that's the one real "unplaceable" case in this file.
// `busy` seeds the search with time already claimed by Fixed Commitments
// and pre-existing Time Slots (e.g. Ad-hoc Events, prior manual
// placements); each task placed here also adds to `busy` so two Deadline
// Tasks never double-book each other.
//
// A task whose dueAt has already passed relative to the target week (or
// falls before weekStart entirely) is not special-cased: the day loop
// below simply finds no valid day before an already-past deadline and
// falls through to the conflict branch, which is the correct outcome
// (surfaced, not silently dropped) rather than something that needs a
// separate "is this overdue" check.
export function placeDeadlineTasks(
  input: SchedulerInput,
  busy: Interval[],
): HardConstraintResult {
  const allBusy = [...busy];
  const slots: ScheduledTimeSlot[] = [];
  const conflicts: SchedulerConflict[] = [];

  for (const task of input.deadlineTasks) {
    const deadline = task.dueAt < input.weekEnd ? task.dueAt : input.weekEnd;
    let placed = false;

    for (let offset = 0; offset < 7 && !placed; offset++) {
      const day = addDays(input.weekStart, offset);
      if (day >= deadline) {
        break;
      }
      const found = findFreeSlot(day, SESSION_DURATION_MS, allBusy, deadline);
      if (found) {
        slots.push({
          startAt: found.start,
          endAt: found.end,
          occupantType: "deadline-task",
          occupantId: task.id,
        });
        allBusy.push(found);
        placed = true;
      }
    }

    if (!placed) {
      conflicts.push({
        reason: "deadline-task-unplaceable",
        occupantType: "deadline-task",
        occupantId: task.id,
        message: `Deadline Task "${task.title}" (due ${task.dueAt.toISOString()}) has no free ${SESSION_HOURS_PER_DAY}-hour window before its deadline this week`,
      });
    }
  }

  return { slots, conflicts };
}

export function placeHardConstraints(input: SchedulerInput): HardConstraintResult {
  const fixedResult = placeFixedCommitments(input);
  const fixedBusy: Interval[] = fixedResult.slots.map((slot) => ({
    start: slot.startAt,
    end: slot.endAt,
  }));
  const existingBusy: Interval[] = input.existingSlots.map((slot) => ({
    start: slot.startAt,
    end: slot.endAt,
  }));
  const deadlineResult = placeDeadlineTasks(input, [...fixedBusy, ...existingBusy]);

  return {
    slots: [...fixedResult.slots, ...deadlineResult.slots],
    conflicts: [...fixedResult.conflicts, ...deadlineResult.conflicts],
  };
}

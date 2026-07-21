// Pure data contracts for the Scheduler (Phase 2 — "Constraint-Based
// Auto-Scheduler v1", see ../../ROADMAP.md). No @prisma/client import here
// or anywhere else under src/scheduler/: these types intentionally mirror
// (never import) the shapes in src/server/*, so the Scheduler stays a pure
// function of plain data and is fixture-testable without a real database,
// per docs/system-direction.md's layering rule.
//
// The service layer (src/server/*) is responsible for converting its
// Prisma-backed reads into these shapes before calling into the Scheduler,
// and for converting SchedulerOutput back into src/server/time-slots.ts
// calls to persist it. The Scheduler itself never reads or writes a store.

export type TrackableItemType = "book" | "course";
export type TrackableItemStatus =
  | "not-started"
  | "in-progress"
  | "paused"
  | "done";

export interface SchedulerTrackableItem {
  id: string;
  title: string;
  type: TrackableItemType;
  priority: number;
  status: TrackableItemStatus;
  unitCount: number;
  unitsCompleted: number;
  estimatedDays: number;
}

export type RoutineCadence = "daily" | "weekly" | "monthly";
export type TimeOfDayPreference = "morning" | "afternoon" | "evening" | "night";

export interface SchedulerRoutine {
  id: string;
  title: string;
  category: string;
  cadence: RoutineCadence;
  // Weekday(s) 0-6 for "weekly", day(s)-of-month 1-31 for "monthly", null
  // for "daily" — already parsed out of src/server/routines.ts's
  // JSON-encoded storage form.
  anchor: number[] | null;
  timeOfDayPreference: TimeOfDayPreference | null;
  // "HH:mm", 24h, or null. Tried before timeOfDayPreference's bucket
  // window — see routine-placement.ts.
  preferredStartTime: string | null;
}

export interface SchedulerFixedCommitment {
  id: string;
  title: string;
  dayOfWeek: number; // 0 (Sunday) - 6 (Saturday)
  startTime: string; // "HH:mm", 24h
  endTime: string;
  // When true, this commitment is placed every week regardless of
  // `SchedulerInput.semester` — see hard-constraints.ts's
  // placeFixedCommitments.
  ignoreSemesterBounds: boolean;
}

// A configured Semester (src/server/semester.ts) — a start date + week
// count that bounds a non-opted-out FixedCommitment's occurrences. null
// means no Semester has been configured, which must never make an
// existing commitment silently disappear (hard-constraints.ts treats
// null as "unbounded," not "outside every week").
export interface SchedulerSemester {
  startDate: Date;
  weekCount: number;
}

export interface SchedulerDeadlineTask {
  id: string;
  title: string;
  dueAt: Date;
  estimatedDays: number;
}

export interface SchedulerAdHocEvent {
  id: string;
  title: string;
  notes: string | null;
}

export interface SchedulerWipLimit {
  type: TrackableItemType;
  maxInProgress: number;
}

// The six occupant kinds from docs/domain-model.md's "Time Slot" — mirrors
// src/server/time-slots.ts's OccupantType.
export type SchedulerOccupantType =
  | "routine"
  | "fixed-commitment"
  | "deadline-task"
  | "trackable-item"
  | "ad-hoc-event"
  | "slack";

// A Time Slot already on the board for the target week before this run —
// most importantly, any Ad-hoc Event and any slot the user placed or edited
// by hand. The charter's guardrail that a user override can't break the
// system, and that an Ad-hoc Event always outranks flexible work, both
// mean the Scheduler must treat these as given, not as slots it's free to
// silently overwrite.
export interface SchedulerExistingTimeSlot {
  id: string;
  startAt: Date;
  endAt: Date;
  occupantType: SchedulerOccupantType;
  occupantId: string | null;
}

export interface SchedulerInput {
  // Monday 00:00 of the target week, and weekStart + 7 days — the half-open
  // [weekStart, weekEnd) range the computed Schedule covers.
  weekStart: Date;
  weekEnd: Date;
  trackableItems: SchedulerTrackableItem[];
  routines: SchedulerRoutine[];
  fixedCommitments: SchedulerFixedCommitment[];
  deadlineTasks: SchedulerDeadlineTask[];
  adHocEvents: SchedulerAdHocEvent[];
  wipLimits: SchedulerWipLimit[];
  existingSlots: SchedulerExistingTimeSlot[];
  semester: SchedulerSemester | null;
}

// A slot the Scheduler is proposing. occupantId is null only when
// occupantType is "slack".
export interface ScheduledTimeSlot {
  startAt: Date;
  endAt: Date;
  occupantType: SchedulerOccupantType;
  occupantId: string | null;
}

// Something the Scheduler could not place. Per the charter's guardrail
// against silently dropping a Fixed Commitment or Deadline Task, a
// Scheduler that can't fit one of these must report it here rather than
// omit it from `slots` with no explanation.
export type ConflictReason =
  | "fixed-commitment-unplaceable"
  | "deadline-task-unplaceable"
  // A newly-inserted Ad-hoc Event overlaps a Fixed Commitment or Deadline
  // Task occurrence. The Ad-hoc Event still places (see repair.ts) — this
  // flags the clash rather than silently hiding it, same pattern as two
  // overlapping Fixed Commitments.
  | "ad-hoc-event-overlap";

export interface SchedulerConflict {
  reason: ConflictReason;
  occupantType: "fixed-commitment" | "deadline-task" | "ad-hoc-event";
  occupantId: string;
  message: string;
}

export interface SchedulerOutput {
  weekStart: Date;
  weekEnd: Date;
  slots: ScheduledTimeSlot[];
  conflicts: SchedulerConflict[];
}

// A single, already-happened change that a repair (ROADMAP.md Phase 3,
// "Elastic Re-Scheduling & Ad-hoc Events") must locally absorb into an
// existing Schedule, without a full computeSchedule recompute. See
// repair.ts for how each kind is handled.
export type SchedulerDisruption =
  // The user skips a flexible Trackable Item work session that's already
  // on the board. `slotId` must reference an existingSlots entry whose
  // occupantType is "trackable-item" — a Fixed Commitment/Routine/Deadline
  // Task occurrence isn't "skippable" through this path (edit/delete the
  // Time Slot directly instead, per the existing Phase 1 manual-edit UI).
  | { kind: "skip-session"; slotId: string }
  // The user declares a new Ad-hoc Event occupying [startAt, endAt). Per
  // the charter's guardrail, this always outranks flexible Trackable Item
  // work but never a Fixed Commitment or Deadline Task (those are flagged,
  // not bumped).
  | { kind: "insert-ad-hoc-event"; event: SchedulerAdHocEvent; startAt: Date; endAt: Date }
  // A Trackable Item finished (its status/unitsCompleted update already
  // applied to `SchedulerInput.trackableItems` by the caller before this
  // runs, so it's no longer selectEligibleItems-eligible). `now` is passed
  // in rather than read internally so the Scheduler stays a pure function
  // of its inputs (see this file's header comment); it bounds removal to
  // only this item's *future* session(s) this week, never a past one, per
  // the charter's guardrail against losing already-tracked history.
  | { kind: "item-completed"; itemId: string; now: Date };

// The local edit a repair proposes: which existing Time Slots to remove,
// which new ones to add, and any conflicts the disruption surfaced. Unlike
// SchedulerOutput (a full week's proposed Schedule), this is a diff meant
// to be applied on top of what's already on the board.
export interface SchedulerRepairResult {
  removedSlotIds: string[];
  addedSlots: ScheduledTimeSlot[];
  conflicts: SchedulerConflict[];
}

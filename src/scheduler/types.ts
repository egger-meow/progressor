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
}

export interface SchedulerFixedCommitment {
  id: string;
  title: string;
  dayOfWeek: number; // 0 (Sunday) - 6 (Saturday)
  startTime: string; // "HH:mm", 24h
  endTime: string;
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
  | "deadline-task-unplaceable";

export interface SchedulerConflict {
  reason: ConflictReason;
  occupantType: "fixed-commitment" | "deadline-task";
  occupantId: string;
  message: string;
}

export interface SchedulerOutput {
  weekStart: Date;
  weekEnd: Date;
  slots: ScheduledTimeSlot[];
  conflicts: SchedulerConflict[];
}

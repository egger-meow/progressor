// Task Planner (RCPSP/WCSP formulation, docs/domain-model.md's Scheduler
// section) — the first stage of the Whole-Future Persisted Scheduling
// Engine (src/scheduler/horizon.ts). Decomposes the two Goal kinds that
// have a genuine placement *choice* — flexible Trackable Items (no
// CategoryItemSchedule for their type) and Deadline Tasks — into atomic
// Activity units the Optimization Engine (rcpsp-solver.ts) schedules.
//
// Fixed Commitments / Routines / CategoryItemSchedules are NOT
// represented as Activities: their placement is cadence-determined, not a
// decision to optimize, so horizon.ts still produces them via the
// existing per-week placement layers unchanged.

import { SESSION_DURATION_MS, MIN_DEADLINE_SESSION_MS } from "./constants";
import type {
  SchedulerTrackableItem,
  SchedulerDeadlineTask,
  TrackableItemType,
} from "./types";

const HOUR_MS = 60 * 60 * 1000;

export interface Activity {
  id: string;
  occupantId: string;
  occupantType: "trackable-item" | "deadline-task";
  durationMs: number;
  // Only set for a Trackable Item chain (its `type`) — the RCPSP
  // renewable resource a chain-head competes for. null for Deadline Task
  // chunks, which aren't WIP-limited.
  resourcePool: TrackableItemType | null;
  // True only for the first Activity of a not-started/paused item's
  // chain — an already-`in-progress` item's pool slot is pre-reserved by
  // horizon.ts before the solve starts (selectEligibleItems' own "every
  // in-progress item is unconditionally eligible" rule), so its chain-head
  // must NOT compete for capacity a second time.
  gatedByPoolCapacity: boolean;
  precedingActivityId: string | null;
  isLastInChain: boolean;
  releaseDate: Date;
  // Deadline Task chunks only; null for Trackable Item sessions (soft
  // work — no hard end to the search besides the horizon itself).
  dueDate: Date | null;
  // TrackableItem.priority (ascending = higher priority, same convention
  // as selectEligibleItems). null for Deadline Task chunks, which are
  // ordered purely by dueDate.
  itemPriority: number | null;
}

export interface ActivityPlannerInput {
  trackableItems: SchedulerTrackableItem[];
  deadlineTasks: SchedulerDeadlineTask[];
  // Types with a configured CategoryItemSchedule — their items are fully
  // handled by placeCategoryItemSchedules already and must not also get
  // an Activity chain here (same opt-in/additive rule as
  // src/scheduler/index.ts's computeSchedule).
  categoryScheduledTypes: Set<TrackableItemType>;
  // Sessions/hours this occupant already has real Time Slots for
  // somewhere in the horizon (idempotent re-entrancy) — subtracted from
  // the remaining work before chaining, so a repeat run never duplicates
  // what a prior run already placed.
  alreadyScheduledSessionsByItemId: Record<string, number>;
  alreadyScheduledHoursByTaskId: Record<string, number>;
  horizonStart: Date;
}

// Splits a Deadline Task's remaining budget into SESSION_DURATION_MS
// chunks (mirroring hard-constraints.ts's placeDeadlineTasks day-cap),
// folding a final sliver under MIN_DEADLINE_SESSION_MS into the
// second-to-last chunk instead of leaving a chunk not worth a day of its
// own — same intent as that constant's existing doc comment.
// The multiplier actually governing `unitIndex` (1-based) — its own
// unitWeightOverrides entry if one exists, otherwise the item's baseline
// unitWeightMultiplier. Scheduler-local mirror of
// src/server/trackable-items.ts's effectiveUnitWeightMultiplier — src/scheduler/
// never imports src/server/* (types.ts's header comment), and this side
// already receives the parsed `Record<number, number>` form, not raw JSON.
function effectiveMultiplier(item: SchedulerTrackableItem, unitIndex: number): number {
  return item.unitWeightOverrides[unitIndex] ?? item.unitWeightMultiplier;
}

// Total sessions still needed to reach unitCount: whatever's left of the
// CURRENT (partially-done) unit's own session budget, plus a full
// rounded-multiplier budget for every subsequent not-yet-started unit —
// each unit's OWN multiplier (override or baseline), not one flat count
// per remaining unit. `alreadyScheduled` (a horizon-wide count, not
// per-unit) is subtracted from the aggregate total, same simplification
// the original single-multiplier design used.
export function computeRemainingSessions(item: SchedulerTrackableItem, alreadyScheduled: number): number {
  if (item.unitsCompleted >= item.unitCount) {
    return 0;
  }
  const currentUnitIndex = item.unitsCompleted + 1;
  const sessionsForCurrentUnit = Math.max(1, Math.round(effectiveMultiplier(item, currentUnitIndex)));
  let total = Math.max(0, sessionsForCurrentUnit - item.currentUnitSessionsCompleted);

  for (let unitIndex = item.unitsCompleted + 2; unitIndex <= item.unitCount; unitIndex++) {
    total += Math.max(1, Math.round(effectiveMultiplier(item, unitIndex)));
  }

  return Math.max(0, total - alreadyScheduled);
}

function chunkDeadlineBudget(remainingMs: number): number[] {
  const chunks: number[] = [];
  let left = remainingMs;
  while (left > 0) {
    if (left <= SESSION_DURATION_MS) {
      chunks.push(left);
      left = 0;
    } else {
      chunks.push(SESSION_DURATION_MS);
      left -= SESSION_DURATION_MS;
    }
  }
  if (chunks.length > 1 && chunks[chunks.length - 1] < MIN_DEADLINE_SESSION_MS) {
    const last = chunks.pop() as number;
    chunks[chunks.length - 1] += last;
  }
  return chunks;
}

export function planActivities(input: ActivityPlannerInput): Activity[] {
  const activities: Activity[] = [];

  for (const item of input.trackableItems) {
    if (input.categoryScheduledTypes.has(item.type) || item.status === "done") {
      continue;
    }
    const alreadyScheduled = input.alreadyScheduledSessionsByItemId[item.id] ?? 0;
    const remainingSessions = computeRemainingSessions(item, alreadyScheduled);
    if (remainingSessions <= 0) {
      continue;
    }

    let previousId: string | null = null;
    for (let i = 0; i < remainingSessions; i++) {
      const id = `${item.id}:session:${i}`;
      const isChainHead = previousId === null;
      activities.push({
        id,
        occupantId: item.id,
        occupantType: "trackable-item",
        durationMs: SESSION_DURATION_MS,
        resourcePool: item.type,
        gatedByPoolCapacity:
          isChainHead && (item.status === "not-started" || item.status === "paused"),
        precedingActivityId: previousId,
        isLastInChain: i === remainingSessions - 1,
        releaseDate: input.horizonStart,
        dueDate: null,
        itemPriority: item.priority,
      });
      previousId = id;
    }
  }

  for (const task of input.deadlineTasks) {
    const alreadyScheduledMs = (input.alreadyScheduledHoursByTaskId[task.id] ?? 0) * HOUR_MS;
    const totalMs = Math.round(task.estimatedHours * HOUR_MS);
    const remainingMs = totalMs - alreadyScheduledMs;
    if (remainingMs <= 0) {
      continue;
    }

    const chunks = chunkDeadlineBudget(remainingMs);
    let previousId: string | null = null;
    for (let i = 0; i < chunks.length; i++) {
      const id = `${task.id}:chunk:${i}`;
      activities.push({
        id,
        occupantId: task.id,
        occupantType: "deadline-task",
        durationMs: chunks[i],
        resourcePool: null,
        gatedByPoolCapacity: false,
        precedingActivityId: previousId,
        isLastInChain: i === chunks.length - 1,
        releaseDate: input.horizonStart,
        dueDate: task.dueAt,
        itemPriority: null,
      });
      previousId = id;
    }
  }

  return activities;
}

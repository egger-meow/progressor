// Priority-ordered flexible placement for Trackable Item work sessions
// (ROADMAP.md Phase 2, PRIORITIES.md "Implement priority-ordered flexible
// placement"). Pure function of SchedulerInput — see types.ts's header
// comment.
//
// Like a Routine occurrence, a Trackable Item session is soft: an item
// that can't fit anywhere this week simply gets no session, no
// SchedulerConflict — the charter's never-silently-drop guardrail is
// scoped to Fixed Commitment/Deadline Task (docs/domain-model.md), not to
// discretionary reading/study progress.
//
// Placement itself is a Weighted Constraint Satisfaction search (project
// owner, 2026-07-22 /goal — "optimize for the best schedule, not just a
// valid one"): every feasible (day, gap) candidate across the whole week is
// enumerated first (hard constraints: no-overlap, daily window, per-day
// Slack budget), then objective.ts ranks them and the best-scoring one
// wins — not simply the first day with any room, which is what this used
// to do and is exactly the "simple priority scheduler" the goal said not
// to build.

import { SchedulerInput, ScheduledTimeSlot, SchedulerTrackableItem, TrackableItemType } from "./types";
import {
  addDays,
  combineDateAndTime,
  overlaps,
  dailyWindowMs,
  usedMsOnDay,
  type Interval,
} from "./time";
import {
  DAILY_WINDOW_START,
  DAILY_WINDOW_END,
  SESSION_DURATION_MS,
  MIN_SLACK_SHARE_PER_DAY,
} from "./constants";
import { pickBestCandidate, type KindedInterval, type PlacementCandidate } from "./objective";

export interface FlexiblePlacementResult {
  slots: ScheduledTimeSlot[];
}

export { dailyWindowMs, usedMsOnDay };

// Which items get a session at all this run: every already-`in-progress`
// item (already inside its type's WIP Limit by definition), plus
// `not-started`/`paused` items promoted up to each type's remaining WIP
// Limit capacity, highest priority (lowest `priority` number) first. This
// does not persist a status change anywhere — the Scheduler never writes
// to the store (see types.ts) — it only decides who gets flexible time in
// the proposed Schedule.
export function selectEligibleItems(input: SchedulerInput): SchedulerTrackableItem[] {
  const itemsByType = new Map<TrackableItemType, SchedulerTrackableItem[]>();
  for (const item of input.trackableItems) {
    const list = itemsByType.get(item.type) ?? [];
    list.push(item);
    itemsByType.set(item.type, list);
  }

  const eligible: SchedulerTrackableItem[] = [];
  for (const [type, items] of itemsByType) {
    const inProgress = items.filter((item) => item.status === "in-progress");
    eligible.push(...inProgress);

    // A type absent from wipLimits has no known capacity — treated as 0
    // rather than unlimited, so incomplete input can't silently violate a
    // WIP Limit the caller forgot to supply.
    const limit = input.wipLimits.find((w) => w.type === type)?.maxInProgress ?? 0;
    let remainingCapacity = limit - inProgress.length;

    const promotable = items
      .filter((item) => item.status === "not-started" || item.status === "paused")
      .sort((a, b) => a.priority - b.priority);

    for (const candidate of promotable) {
      if (remainingCapacity <= 0) {
        break;
      }
      eligible.push(candidate);
      remainingCapacity--;
    }
  }

  return eligible.sort((a, b) => a.priority - b.priority);
}

// Re-run idempotency (see hard-constraints.ts's hasExistingOccurrence for
// the Fixed Commitment/Routine equivalent): an item that already has a
// session Time Slot this week from a prior run must not get a second one
// stacked on top of it.
function itemIdsWithSessionThisWeek(existingSlots: SchedulerInput["existingSlots"]): Set<string> {
  return new Set(
    existingSlots
      .filter((slot) => slot.occupantType === "trackable-item" && slot.occupantId)
      .map((slot) => slot.occupantId as string),
  );
}

// Every structurally feasible placement for one `durationMs` session this
// week: one candidate per free gap (start-aligned — the earliest point in
// the gap; where exactly within a gap the session lands doesn't change
// which sub-block it leaves behind in size, only which side, so a single
// candidate per gap already covers the search space objective.ts's
// leftover-size scoring can distinguish) across every day whose Slack
// budget isn't already exhausted. Re-run per item (not once for the whole
// batch) because `busy` grows as earlier items in this same run get
// placed — the day-balance term in objective.ts needs each item's search
// to see what the previous item just claimed.
function enumerateWeekCandidates(
  weekStart: Date,
  durationMs: number,
  busy: Interval[],
): PlacementCandidate[] {
  const candidates: PlacementCandidate[] = [];

  for (let offset = 0; offset < 7; offset++) {
    const day = addDays(weekStart, offset);
    const slackBudget = dailyWindowMs(day) * (1 - MIN_SLACK_SHARE_PER_DAY);
    if (usedMsOnDay(day, busy) + durationMs > slackBudget) {
      continue;
    }

    const windowStart = combineDateAndTime(day, DAILY_WINDOW_START);
    const windowEnd = combineDateAndTime(day, DAILY_WINDOW_END);
    const dayBusy = busy
      .filter((interval) => overlaps(windowStart, windowEnd, interval.start, interval.end))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const gaps: Interval[] = [];
    let cursor = windowStart;
    for (const interval of dayBusy) {
      if (interval.start > cursor) {
        gaps.push({ start: cursor, end: interval.start });
      }
      if (interval.end > cursor) {
        cursor = interval.end;
      }
    }
    if (cursor < windowEnd) {
      gaps.push({ start: cursor, end: windowEnd });
    }

    for (const gap of gaps) {
      const gapMs = gap.end.getTime() - gap.start.getTime();
      if (gapMs < durationMs) {
        continue;
      }
      candidates.push({
        interval: { start: gap.start, end: new Date(gap.start.getTime() + durationMs) },
        day,
        leftoverMs: gapMs - durationMs,
      });
    }
  }

  return candidates;
}

export function placeFlexibleTrackableItems(
  input: SchedulerInput,
  busy: Interval[],
  // Occupant-kind-tagged version of `busy`, used only for objective.ts's
  // ContextSwitching term (a candidate touching a differently-kinded
  // neighbor is penalized; touching another Trackable Item session is
  // continuity, not a switch, and never penalized). Optional and defaults
  // to empty so this stays a purely additive parameter — a caller that
  // doesn't pass it just gets ContextSwitching scored as always-zero,
  // same as before this term existed.
  kindedBusy: KindedInterval[] = [],
): FlexiblePlacementResult {
  const allBusy = [...busy];
  const allKindedBusy = [...kindedBusy];
  const slots: ScheduledTimeSlot[] = [];
  const alreadyScheduled = itemIdsWithSessionThisWeek(input.existingSlots);

  for (const item of selectEligibleItems(input)) {
    if (alreadyScheduled.has(item.id)) {
      continue;
    }

    const candidates = enumerateWeekCandidates(input.weekStart, SESSION_DURATION_MS, allBusy);
    const best = pickBestCandidate(candidates, allBusy, allKindedBusy);
    if (best) {
      slots.push({
        startAt: best.interval.start,
        endAt: best.interval.end,
        occupantType: "trackable-item",
        occupantId: item.id,
      });
      allBusy.push(best.interval);
      allKindedBusy.push({ ...best.interval, occupantType: "trackable-item" });
    }
  }

  return { slots };
}

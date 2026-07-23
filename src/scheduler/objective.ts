// Multi-objective scoring for flexible-work placement candidates — the
// "which of several *valid* placements is *best*" layer the Scheduler was
// missing. Project owner, 2026-07-22 (/goal): "don't build a simple
// priority scheduler...optimize for the best schedule, not just a valid
// one," framed as Weighted Constraint Satisfaction (hard constraints filter
// what's feasible; soft constraints rank the survivors) — this module is
// the soft-constraint ranking half of that, and the suggested objective:
//
//   Score = +GoalCompletion +FreeBlockSize +EnergyAlignment +DeadlineSlack
//           -Fragmentation -ContextSwitching -Overtime
//
// Every term above is accounted for below — as a scoring term here, as a
// mechanism elsewhere in the Scheduler, or explicitly out of scope with a
// stated reason. None are silently dropped:
//
//   +GoalCompletion   — NOT a scoring term here. Handled upstream by
//                       selectEligibleItems' priority sort
//                       (flexible-placement.ts): higher-priority items are
//                       placed first in a run, so they get first pick of
//                       the best-scoring candidate before a lower-priority
//                       item's search even runs. Scoring goal-completion
//                       per-candidate would double-count what placement
//                       *order* already achieves.
//   +FreeBlockSize    — freeBlockScore() below. Also reused, via
//                       pickBestGapInWindow(), by Routine/
//                       CategoryItemSchedule (occurrence-timing.ts) and
//                       Deadline Task (hard-constraints.ts) placement — see
//                       pickBestGapInWindow()'s own header comment.
//   +EnergyAlignment  — energyAlignmentScore() below. A bare Trackable Item
//                       carries no per-item Time-of-Day Preference of its
//                       own (that concept exists only on Routine/
//                       CategoryItemSchedule, already honored by
//                       occurrence-timing.ts's bucket search) — there is no
//                       real per-item energy signal in the domain model to
//                       read. What's scored here is a generic, documented
//                       default (earlier-in-day is mildly preferred),
//                       weighted low precisely because it's a fallback
//                       heuristic, not a user preference — same "inferred
//                       placeholder" status as constants.ts's
//                       MIN_SLACK_SHARE_PER_DAY. A real per-item signal
//                       would need a new domain field the project owner
//                       hasn't asked for; this file does not invent one.
//   +DeadlineSlack    — NOT scored here. Belongs to Deadline Task
//                       placement (hard-constraints.ts's
//                       placeDeadlineTasks), a charter-guarded hard
//                       constraint ("never silently drop a Deadline Task")
//                       with its own day-by-day slack-budget accounting
//                       already. This module only scores
//                       placeFlexibleTrackableItems' candidates, which
//                       never carry a due date — there is no slack to
//                       measure for them.
//   -Fragmentation    — fragmentationPenalty() below. Also reused by
//                       pickBestGapInWindow() (see +FreeBlockSize above).
//   -ContextSwitching — contextSwitchPenalty() below.
//   -Overtime         — NOT a scoring term here. Every candidate reaching
//                       this module already passed the per-day Slack
//                       budget hard-constraint gate before being offered
//                       (see flexible-placement.ts's enumerateWeekCandidates)
//                       — "overtime" (packing a day past its Slack minimum)
//                       is structurally impossible among the candidates
//                       this module ever sees, so there is nothing left for
//                       a soft penalty to discourage.
//
// v1 scope, stated plainly rather than overclaimed: this scores the
// candidate search space placeFlexibleTrackableItems explores (one day x
// one gap-start per feasible gap, across the whole week) — it is not a
// general-purpose CP-SAT/RCPSP solver, and nothing here searches outside
// the caller's candidate set.

import type { Interval } from "./time";
import { combineDateAndTime, dailyWindowMs, overlaps, usedMsOnDay } from "./time";
import { DAILY_WINDOW_START, DAILY_WINDOW_END } from "./constants";
import type { SchedulerOccupantType } from "./types";

// One structurally feasible placement a caller found — already
// hard-constraint-clean (see this file's header). `leftoverMs` is the size
// of the single contiguous free sub-block this exact placement leaves
// behind inside the gap it was carved from.
export interface PlacementCandidate {
  interval: Interval;
  day: Date;
  leftoverMs: number;
}

export interface ScoredCandidate extends PlacementCandidate {
  score: number;
}

// A busy interval that also carries what kind of thing occupies it —
// ContextSwitching needs to know whether a candidate's neighbor is another
// Trackable Item session (continuity, no switch) or a different occupant
// kind (Routine/Fixed Commitment/Deadline Task/Ad-hoc Event — a genuine
// activity switch). Plain `Interval` (time.ts) deliberately carries no
// occupant identity — every other Scheduler search only ever needs
// start/end — so this is scoped to objective.ts rather than widening the
// shared primitive everywhere.
export interface KindedInterval extends Interval {
  occupantType: SchedulerOccupantType;
}

// Soft-constraint weights — relative magnitudes matter more than absolute
// values, tuned so no single objective can be starved to zero by another
// (a candidate can't win purely on day-balance while leaving a worthless
// sliver behind, and EnergyAlignment's generic-default status is reflected
// in its low weight relative to the grounded terms). Inferred starting
// points, same status as constants.ts's MIN_SLACK_SHARE_PER_DAY:
// adjustable here, not yet a user preference.
const WEIGHT_FREE_BLOCK = 1;
const WEIGHT_FRAGMENTATION_PENALTY = 3;
const WEIGHT_DAILY_BALANCE = 1;
const WEIGHT_ENERGY_ALIGNMENT = 0.5;
const WEIGHT_CONTEXT_SWITCH_PENALTY = 1;

// Below this, a leftover gap is "dead space" — too short to ever host
// another real session, so creating one is a cost rather than neutral.
// Same reasoning as constants.ts's MIN_DEADLINE_SESSION_MS: a sliver
// nobody can use is worse than not existing.
const FRAGMENTATION_THRESHOLD_MS = 30 * 60 * 1000;

// A leftover at or above this size scores as "fully good" — beyond it,
// more free space left behind doesn't add further score, so one huge empty
// afternoon can't single-handedly dominate every other candidate.
const MAX_USEFUL_LEFTOVER_MS = 4 * 60 * 60 * 1000;

// A neighboring occupant of a different kind counts as a "context switch"
// only when it's genuinely back-to-back (touching, or separated by a
// sliver under this threshold) — the cognitive cost this term models is a
// choppy transition between activities, not merely "something else exists
// somewhere else in the day."
const CONTEXT_SWITCH_ADJACENCY_MS = 15 * 60 * 1000;

// 0 for a dead sliver (creates fragmentation without being useable itself),
// otherwise normalized 0..1 by leftover size, capped at
// MAX_USEFUL_LEFTOVER_MS. A leftover of exactly 0 (the candidate fills the
// gap perfectly) is neutral, not penalized — it fragments nothing.
function freeBlockScore(leftoverMs: number): number {
  if (leftoverMs === 0) {
    return 0;
  }
  return Math.min(leftoverMs, MAX_USEFUL_LEFTOVER_MS) / MAX_USEFUL_LEFTOVER_MS;
}

function fragmentationPenalty(leftoverMs: number): number {
  return leftoverMs > 0 && leftoverMs < FRAGMENTATION_THRESHOLD_MS ? 1 : 0;
}

// Higher for emptier days — `busy` must already include every slot placed
// earlier in the same scheduling run (the caller re-scores from scratch per
// item), so this term actively spreads later items toward days earlier
// items left alone, not just toward whichever day looked emptiest at the
// very start of the run.
function dailyBalanceScore(day: Date, busy: Interval[]): number {
  const capacity = dailyWindowMs(day);
  if (capacity <= 0) {
    return 0;
  }
  const used = usedMsOnDay(day, busy);
  return 1 - Math.min(used / capacity, 1);
}

// Generic default: 1.0 at the daily window's start, tapering to 0.0 at its
// end. Deliberately weak (see WEIGHT_ENERGY_ALIGNMENT) — this is a
// fallback heuristic for the common case, not a read of any real user
// preference (see this file's header for why no per-item signal exists).
function energyAlignmentScore(candidate: PlacementCandidate): number {
  const windowStart = combineDateAndTime(candidate.day, DAILY_WINDOW_START).getTime();
  const windowEnd = combineDateAndTime(candidate.day, DAILY_WINDOW_END).getTime();
  const span = windowEnd - windowStart;
  if (span <= 0) {
    return 0.5;
  }
  const fraction = Math.min(Math.max((candidate.interval.start.getTime() - windowStart) / span, 0), 1);
  return 1 - fraction;
}

// Counts how many differently-kinded neighbors sit tightly adjacent to the
// candidate (before and after each count independently — sandwiched
// between two different activities is a worse switch than just one side).
// A neighbor whose occupantType is "trackable-item" is continuity, not a
// switch, and is skipped entirely regardless of distance.
function contextSwitchPenalty(candidate: PlacementCandidate, kindedBusy: KindedInterval[]): number {
  let penalty = 0;
  for (const other of kindedBusy) {
    if (other.occupantType === "trackable-item") {
      continue;
    }
    const gapBefore = candidate.interval.start.getTime() - other.end.getTime();
    const gapAfter = other.start.getTime() - candidate.interval.end.getTime();
    const adjacentBefore = gapBefore >= 0 && gapBefore < CONTEXT_SWITCH_ADJACENCY_MS;
    const adjacentAfter = gapAfter >= 0 && gapAfter < CONTEXT_SWITCH_ADJACENCY_MS;
    if (adjacentBefore || adjacentAfter) {
      penalty += 1;
    }
  }
  return penalty;
}

export function scoreCandidate(
  candidate: PlacementCandidate,
  busy: Interval[],
  kindedBusy: KindedInterval[] = [],
): number {
  return (
    WEIGHT_FREE_BLOCK * freeBlockScore(candidate.leftoverMs) -
    WEIGHT_FRAGMENTATION_PENALTY * fragmentationPenalty(candidate.leftoverMs) +
    WEIGHT_DAILY_BALANCE * dailyBalanceScore(candidate.day, busy) +
    WEIGHT_ENERGY_ALIGNMENT * energyAlignmentScore(candidate) -
    WEIGHT_CONTEXT_SWITCH_PENALTY * contextSwitchPenalty(candidate, kindedBusy)
  );
}

// Highest-scoring candidate, or null if none were offered (caller found no
// feasible placement at all this week). Ties keep the earliest candidate in
// `candidates`' own order (stable sort) — callers build that list in
// day-then-gap order, so a tie resolves to the earliest day/gap rather than
// an arbitrary one.
export function pickBestCandidate(
  candidates: PlacementCandidate[],
  busy: Interval[],
  kindedBusy: KindedInterval[] = [],
): ScoredCandidate | null {
  if (candidates.length === 0) {
    return null;
  }
  let best: ScoredCandidate | null = null;
  for (const candidate of candidates) {
    const score = scoreCandidate(candidate, busy, kindedBusy);
    if (!best || score > best.score) {
      best = { ...candidate, score };
    }
  }
  return best;
}

// Drop-in replacement for time.ts's findFreeInterval with the exact same
// signature and feasibility contract (returns null in precisely the same
// cases) — but where findFreeInterval returns the *first* gap it finds,
// this enumerates every gap in [windowStart, windowEnd) and returns the one
// FreeBlockSize/Fragmentation score best, same as
// placeFlexibleTrackableItems' own gap choice. Deliberately does NOT apply
// DailyBalance/EnergyAlignment/ContextSwitching — those are about *which
// day* a session lands on, and this function never chooses the day (that
// stays entirely the caller's own cadence/deadline-driven loop, e.g.
// occurrence-timing.ts's Time-of-Day Preference bucket order or
// hard-constraints.ts's deadline slack-budget day loop) — only which gap
// *within the window the caller already picked*.
//
// 2026-07-22, same `/goal`, project owner's explicit scope decision: extend
// the existing WCSP gap-scoring to Routine/CategoryItemSchedule/Deadline
// Task placement without inventing new domain concepts (resource/
// dependency modeling) — this is that extension. Used by
// occurrence-timing.ts's findOccurrenceWindow (Routine/CategoryItemSchedule)
// and hard-constraints.ts's placeDeadlineTasks (within an already-chosen
// day, before its deadline). Never changes which day/window is searched,
// nor placeDeadlineTasks' chunk-sizing/day-selection loop that guarantees
// the charter's never-silently-drop behavior — only which gap inside that
// window is returned.
export function pickBestGapInWindow(
  windowStart: Date,
  windowEnd: Date,
  durationMs: number,
  busy: Interval[],
  notAfter: Date = windowEnd,
): Interval | null {
  const effectiveEnd = notAfter < windowEnd ? notAfter : windowEnd;
  const relevantBusy = busy
    .filter((interval) => overlaps(windowStart, windowEnd, interval.start, interval.end))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const rawGaps: Interval[] = [];
  let cursor = windowStart;
  for (const interval of relevantBusy) {
    if (interval.start > cursor) {
      rawGaps.push({ start: cursor, end: interval.start });
    }
    if (interval.end > cursor) {
      cursor = interval.end;
    }
  }
  rawGaps.push({ start: cursor, end: windowEnd });

  let best: { interval: Interval; score: number } | null = null;
  for (const gap of rawGaps) {
    const clippedEnd = gap.end < effectiveEnd ? gap.end : effectiveEnd;
    const gapMs = clippedEnd.getTime() - gap.start.getTime();
    if (gapMs < durationMs) {
      continue;
    }
    const interval: Interval = { start: gap.start, end: new Date(gap.start.getTime() + durationMs) };
    const leftoverMs = gapMs - durationMs;
    const score = WEIGHT_FREE_BLOCK * freeBlockScore(leftoverMs) - WEIGHT_FRAGMENTATION_PENALTY * fragmentationPenalty(leftoverMs);
    if (!best || score > best.score) {
      best = { interval, score };
    }
  }
  return best?.interval ?? null;
}

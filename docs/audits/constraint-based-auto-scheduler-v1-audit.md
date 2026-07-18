# `Constraint-Based Auto-Scheduler v1` — Completion Audit

**Phase authorized:** written into `ROADMAP.md`'s "Authorized Phases"
during bootstrap (2026-07-18), activated as the Active Phase the same day
once Phase 1 closed (commit `7d817ef`).
**Audit written:** 2026-07-18
**Status:** Complete with noted exceptions

## Original Acceptance Gates

Verbatim from `ROADMAP.md`'s "Constraint-Based Auto-Scheduler v1" phase,
at the point this phase is being removed:

**Goal:** implement the `Scheduler` (see `docs/system-direction.md`'s
Scheduler layer) that takes every `Trackable Item`, `Routine`, `Semester
Commitment`, `Ad-hoc Event`, `Time-of-Day Preference`, and `WIP Limit`, and
produces a full weekly `Schedule` automatically — respecting priority
ordering and deliberately preserving `Slack` rather than packing every
`Time Slot`.

**Exit condition (phase gate):** given a realistic fixture data set (a mix
of books, courses, routines, and semester commitments), the scheduler
produces a weekly `Schedule` where every `Fixed Commitment` and
undischarged `Deadline Task` is honored, no `WIP Limit` is violated, no
two non-Slack items double-book the same `Time Slot`, and a documented
minimum share of each day is left as `Slack`; fixture-based tests plus a
written walkthrough both pass; audit written in `docs/audits/`.

## Evidence, Gate by Gate

### Gate: every `Fixed Commitment` and undischarged `Deadline Task` is honored

`src/scheduler/hard-constraints.ts`'s `placeFixedCommitments` places every
`Fixed Commitment` occurrence deterministically at its anchored day/time
— this cannot fail to place (overlapping `Time Slot`s are allowed by
design, `docs/status.md`), so "honored" is unconditional; what it does
additionally do is flag (not silently hide) a clash between two `Fixed
Commitment`s or against an existing `Ad-hoc Event` slot. `placeDeadlineTasks`
searches the week for a free session before each task's `dueAt` and
places it; when genuinely no room exists, it reports a `SchedulerConflict`
(`reason: "deadline-task-unplaceable"`) instead of a fabricated placement
— satisfying "honored or explicitly conflict-flagged," never a silent
drop, per the charter's guardrail against silently losing a fixed-deadline
affair.

Evidence: `src/scheduler/hard-constraints.test.ts` (10 tests) — a `Fixed
Commitment` placed at its exact anchored time; two overlapping `Fixed
Commitment`s both still placed with a conflict flagged for each; a `Fixed
Commitment` overlapping an existing `Ad-hoc Event` still placed but
flagged; a `Deadline Task` placed in the earliest free window; a
`Deadline Task` correctly skipping busy time within a day; an
already-past-deadline task producing a conflict with no fabricated
placement; two `Deadline Task`s never double-booking each other; and a
genuine capacity conflict when a `Fixed Commitment` fills the only
eligible day. `src/scheduler/index.test.ts`'s end-to-end fixture confirms
the same guarantee holds when composed with `Routine` and flexible
placement, including a dedicated test that an already-past-due `Deadline
Task` still produces a conflict through the full pipeline, not just the
isolated unit.

### Gate: no `WIP Limit` is violated

`src/scheduler/flexible-placement.ts`'s `selectEligibleItems` includes
every already-`in-progress` `Trackable Item` (already within its type's
limit by definition) plus `not-started`/`paused` items promoted strictly
up to each type's *remaining* `WIP Limit` capacity, highest priority
first; a `type` absent from the input's `wipLimits` is treated as zero
remaining capacity, not unlimited, so incomplete input can't silently
violate the limit.

Evidence: `src/scheduler/flexible-placement.test.ts` (8 tests), notably
"promotes only the highest-priority not-started item up to the WIP
Limit" and "gives book and course independent WIP Limit capacity."
`src/scheduler/index.test.ts`'s end-to-end fixture includes a `Book`
already at its type's cap and a second, lower-priority `Book` that must
NOT get a session — verified directly by counting placed sessions per
item, not by trusting the mechanism in isolation.

### Gate: no two non-Slack items double-book the same `Time Slot`

Each placement layer accumulates its own placements plus everything
upstream (hard constraints → `Routine` occurrences → flexible `Trackable
Item` work) into a shared `busy` list via `src/scheduler/time.ts`'s
`findFreeInterval`, so a later layer can never land on an earlier layer's
slot. Within a layer, each successful placement is immediately added to
that layer's own `busy` accumulator before the next candidate is
considered.

Evidence: `src/scheduler/index.test.ts`'s "never double-books two
non-Slack items into overlapping time" test performs an exhaustive
pairwise overlap check across every slot `computeSchedule` produced for
the mixed fixture (Fixed Commitment, Deadline Task, two Routine
occurrences, two Trackable Item sessions) — not a spot check on one pair.
`src/scheduler/routine-placement.test.ts` and
`flexible-placement.test.ts` each additionally prove no double-booking
within their own layer in isolation.

**Named exception, not a gap:** two `Fixed Commitment`s that genuinely
overlap each other in the user's own data are still *both* placed
(overlapping `Time Slot`s are allowed by design, a Phase 1 decision) —
the Scheduler flags this as a conflict rather than silently resolving or
hiding it, but does not refuse to place either one. This is the one
documented case where two non-`Slack` items can occupy the same time on
purpose.

### Gate: a documented minimum share of each day is left as `Slack`

`src/scheduler/constants.ts`'s `MIN_SLACK_SHARE_PER_DAY` (20% of the
daily scheduling window) bounds flexible `Trackable Item` placement only
— `flexible-placement.ts` checks a day's already-used time against this
budget *before* attempting to place a session there, so a day can't be
packed past that share even when a technically-free interval still
exists. This is an inferred placeholder, not a user decision, flagged the
same way as `DEFAULT_WIP_LIMIT` (`docs/status.md`).

Evidence: `flexible-placement.test.ts`'s "respects the daily Slack
minimum, skipping to the next day once a day is packed enough" test.
`src/scheduler/index.test.ts`'s "keeps every day's flexible Trackable
Item time within the Slack budget" test checks this holds after full
composition with hard constraints and `Routine`s sharing the day, and
confirms the check isn't vacuous (the per-day flexible-time map is
non-empty).

**Scope note, not a deviation:** the minimum-`Slack` guarantee is scoped
to flexible `Trackable Item` placement, per this phase's own framing
("respecting priority ordering and deliberately preserving Slack" in the
context of the priority-ordered flexible layer). A `Fixed Commitment` or
`Deadline Task` can legitimately fill more of a day than the `Slack`
budget would otherwise allow — that's correct, not a bug, since those are
hard/deadline-bound, not discretionary.

### Gate: fixture-based tests plus a written walkthrough both pass

Fixture tests: `src/scheduler/index.test.ts` (6 tests) is the dedicated
end-to-end suite named in this exit condition, run through
`computeSchedule` against one realistic mixed week. Combined with every
layer's own unit tests (`hard-constraints.test.ts`,
`routine-placement.test.ts`, `flexible-placement.test.ts`), the full
`src/scheduler/` test surface is 41 tests, all passing under the most
recent `npm run verify` run in this session (100 tests total across the
whole project — lint, typecheck, tests, and `next build` all clean).

Written walkthrough against the running app (not just fixtures — the
exit condition's own "given a realistic fixture data set" language covers
the automated suite; the phase gate in `docs/status.md` additionally
requires a walkthrough against the running app, mirroring Phase 1's
gate): executed today via the Browser tool against `http://localhost:3000`
using a temporary, since-deleted seed route (`src/app/api/dev-seed/`, no
creation UI exists yet for these entities). Seeded a `Book` (in-progress),
a weekly `Routine`, a `Fixed Commitment`, and one pre-existing manual
`Time Slot`. Clicking "Generate Schedule" once correctly placed the
`Fixed Commitment` (09:00–10:00), the `Routine` occurrence
(10:00–12:00), and a `Book` session (12:00–14:00) into empty time, and
the manual slot was untouched. A second click confirmed the manual slot
was *still* untouched (the re-run-safety guarantee holds), while also
surfacing a real, documented consequence of the "only fill empty time"
re-run policy the human explicitly chose: the `Fixed Commitment` and
`Routine` occurrence were both re-placed as duplicates, since nothing
tracks "the Scheduler already placed this" across runs. Recorded in
`docs/status.md`'s Known Limits, not treated as a defect — deduplication
was never part of this phase's exit condition.

## Exceptions / Deviations

- **Re-run duplication** (see above): clicking "Generate Schedule" twice
  for the same week duplicates any `Fixed Commitment`/`Routine` occurrence
  the Scheduler placed on the first run, because nothing tracks
  Scheduler-authorship of a `Time Slot` across runs. This follows directly
  from the human's explicit choice of the safest (not the most polished)
  of three offered re-run policies — see `docs/status.md` and
  `docs/build-status.md`'s 2026-07-18 "Wire the Scheduler" entry. Not
  fixed in this phase; flagged as a candidate for future work, not
  silently left undocumented.
- **No creation UI for `Trackable Item`/`Routine`/`Semester
  Commitment`/`Ad-hoc Event`** still exists (same exception already
  carried forward from the Phase 1 audit) — the Scheduler and its
  "Generate Schedule" trigger only became testable against real data via
  a temporary seed route, deleted before every commit in this phase, not
  shipped.
- `Time-of-Day Preference` is honored for `Routine` occurrences (searches
  its sub-window first, falls back to the full daily window) but has no
  effect on flexible `Trackable Item` placement, since `Trackable Item`
  has no `Time-of-Day Preference`/`Routine` reference in the schema — this
  phase's own decomposition caught and corrected a scoping error that had
  assumed otherwise (`PRIORITIES.md` history, commit `3a1b873`). The
  Scheduler's goal statement lists `Time-of-Day Preference` as an input it
  takes; it does, just scoped to where the domain model actually attaches
  it (`Routine`), not to `Trackable Item`.
- Two scheduling parameters the domain docs didn't specify — the daily
  window flexible work may be placed in (`08:00`–`23:00`) and how
  `estimatedDays` becomes session hours (one 2-hour session per scheduled
  day) — were asked of the human before implementation rather than
  silently inferred, since they shape every schedule produced. Recorded
  in `src/scheduler/constants.ts` and `docs/build-status.md`'s
  "Implement hard-constraint placement" entry.

## Follow-Up

- No new `ROADMAP.md` proposals came out of this phase. The re-run
  duplication behavior and the missing creation UI are both known,
  documented gaps rather than proposals — either could become a
  `PRIORITIES.md` item under a future phase if a human decides they're
  worth fixing before "Elastic Re-Scheduling & Ad-hoc Events" (next in
  `ROADMAP.md`'s Authorized Phases) needs them resolved as a
  prerequisite.
- `FRAMEWORK_FEEDBACK.md` gained no entries during this phase — nothing
  to harvest.

# `Elastic Re-Scheduling & Ad-hoc Events` — Completion Audit

**Phase authorized:** written into `ROADMAP.md`'s "Proposed — Not Yet
Authorized" section during bootstrap (2026-07-18), promoted straight to
Active Phase the same day once Phase 2 closed (commit `17947cd`).
**Audit written:** 2026-07-18
**Status:** Complete with noted exceptions

## Original Acceptance Gates

Verbatim from `ROADMAP.md`'s "Elastic Re-Scheduling & Ad-hoc Events"
phase, at the point this phase is being removed:

**Goal:** support fast, local repair of an existing `Schedule` when
something changes — a manual override, an item finished early, an
`Ad-hoc Event` injected at the last minute — without a full schedule
rebuild, and while keeping the charter's guardrail that `Ad-hoc Event`s
always outrank flexible `Trackable Item` work.

**Exit condition (phase gate):** a documented set of disruption scenarios
(skip today's reading session, insert a same-day `Ad-hoc Event`, mark a
`Chapter`/`Video` done early) each produce a correctly repaired `Schedule`
when re-run, verified against expected fixture output; the repair
operation has a documented, interactively-fast time budget; the existing
Phase-1 manual-edit guarantee (one edit never corrupts another `Time
Slot`) still holds; fixture-based tests plus a written walkthrough both
pass; audit written in `docs/audits/`.

## Evidence, Gate by Gate

### Gate: "skip today's reading session" produces a correctly repaired Schedule

`src/scheduler/repair.ts`'s `repairSchedule` with `{ kind: "skip-session",
slotId }` removes the named flexible `Trackable Item` `Time Slot` and, per
the project owner's explicit backfill decision (2026-07-18, recorded in
`PRIORITIES.md`'s decomposition and `docs/status.md`'s Repair section),
immediately offers the freed window to the next eligible item that
doesn't already have a session this week — reusing
`selectEligibleItems`/`dailyWindowMs`/`usedMsOnDay` from
`flexible-placement.ts` rather than duplicating that logic. The skipped
item itself is explicitly excluded from backfilling its own freed window.

Evidence: `src/scheduler/repair.test.ts`'s `skip-session` suite (4 tests)
— removes the slot and backfills from the next eligible item; never
backfills the skipped item with itself; leaves every unrelated `Time Slot`
untouched; throws rather than silently no-op-ing when the target isn't a
flexible `Trackable Item` session. Manually verified against the running
dev server: clicking "Skip" on a `Book`'s session removed exactly that
slot; in one run with the type at its `WIP Limit` cap the freed window
correctly stayed empty (no fabricated backfill), and in a follow-up run
(see the `item-completed` gate below) the equivalent freed-window backfill
mechanism was observed placing a different eligible item into the exact
freed window.

### Gate: "insert a same-day Ad-hoc Event" produces a correctly repaired Schedule

`repairSchedule` with `{ kind: "insert-ad-hoc-event", event, startAt,
endAt }` always places the `Ad-hoc Event`'s `Time Slot` exactly where
declared (same "never refused" pattern as a `Fixed Commitment`
occurrence, `hard-constraints.ts`). Per the charter's guardrail that an
`Ad-hoc Event` always outranks flexible `Trackable Item` work, an
overlapping flexible session is evicted and relocated elsewhere in the
week; an overlap with a `Fixed Commitment` or `Deadline Task` is flagged
as a new `"ad-hoc-event-overlap"` `SchedulerConflict` instead of evicted,
since neither is flexible work the charter lets an `Ad-hoc Event` bump; a
`Routine` occurrence overlap is left alone entirely (already a soft,
nudge-around preference with no conflict-flagging precedent elsewhere in
the Scheduler).

Evidence: `repair.test.ts`'s `insert-ad-hoc-event` suite (5 tests) —
places the event and relocates an evicted session without overlapping the
new event; flags (without evicting) an overlap with a `Fixed Commitment`;
flags (without evicting) an overlap with a `Deadline Task`; leaves a
`Routine` overlap alone entirely; leaves every unrelated `Time Slot`
untouched. Manually verified against the running dev server via the
Weekly View's new "Quick Ad-hoc Event" form: inserting an event
overlapping a `Book`'s session placed the event, removed the `Book`'s
original slot, and the `Book` reappeared the next day in a
non-overlapping window — every `Fixed Commitment`, `Routine` occurrence,
and other item's `Time Slot` on the board was unchanged before and after.

### Gate: "mark a Chapter/Video done early" produces a correctly repaired Schedule

`repairSchedule` with `{ kind: "item-completed", itemId, now }` removes
only the item's *future* flexible session(s) this week (`startAt >= now`,
passed in explicitly rather than read internally so the Scheduler stays a
pure function of its inputs) and backfills each freed window the same way
as the skip-session gate. A past session is never touched, per the
charter's guardrail against losing already-tracked history.

Evidence: `repair.test.ts`'s `item-completed` suite (3 tests) — removes
only the future session and backfills it from the next eligible item;
never removes a past session; is a no-op when the completed item has no
session scheduled this week. Manually verified against the running dev
server: `src/server/scheduler-repair.ts`'s `completeItemEarly` marks the
`Trackable Item` `"done"` (freeing its type's `WIP Limit` capacity) before
repairing; clicking "Mark done" on a `Book`'s future session removed that
slot and a different, previously-blocked `Book` was immediately placed
into the exact same freed window — confirming the backfill policy holds
end-to-end, not just in fixtures. (The first two manual attempts, against
sessions the local system clock had already passed, correctly produced no
change — direct confirmation the `startAt >= now` guard is live, not just
unit-tested.)

### Gate: documented, interactively-fast time budget

A repair only touches the disrupted slot(s) plus, for
`insert-ad-hoc-event`, a bounded per-item day-loop search over the rest of
the week (at most 7 iterations per evicted item) — never a
`computeSchedule`-style recompute of every other item's placement.
Documented in `src/scheduler/repair.ts`'s header comment and
`docs/status.md`'s Repair section.

Evidence: `repair.test.ts`'s "documented time budget" test measures
`repairSchedule` against an 8-slot busy-week fixture via
`performance.now()` and asserts completion under 50ms (a generous bound —
the point is evidence against a full recompute, not a tight benchmark);
it completes in single-digit milliseconds in practice. Manually observed
against the real app: every repair action (Skip / Mark done / Insert)
returned to the Weekly View with no perceptible delay.

### Gate: the Phase-1 manual-edit guarantee still holds

Every repair path only removes `Time Slot`s it explicitly identifies as
part of the disruption (the named skipped slot; slots overlapping the new
`Ad-hoc Event`; the completed item's own future slots) — nothing else in
`existingSlots` is ever touched, mirroring Phase 1's guarantee that
editing or removing one `Time Slot` never corrupts another.

Evidence: `repair.test.ts` includes a dedicated "leaves every unrelated
Time Slot untouched" test in both the `skip-session` and
`insert-ad-hoc-event` suites. Manually verified across all three
disruptions against the running dev server (see gates above): `Fixed
Commitment`, `Routine`, and other `Trackable Item`/`Course` `Time Slot`s
present before each repair action were confirmed present and unchanged
afterward, in every one of the three scenarios.

### Gate: fixture-based tests plus a written walkthrough both pass

Fixture tests: `src/scheduler/repair.test.ts` (13 tests, all passing) is
the dedicated suite for this phase, covering all three disruption
scenarios plus the time-budget evidence above. Combined with the rest of
the project's suite, `npm run verify` passes clean (lint, typecheck, 113
tests, `next build`) as of commit `f9ea23b`.

Written walkthrough against the running app: executed via the Browser
tool against `http://localhost:3000`, using a temporary, since-deleted
seed route (`src/app/api/dev-seed/`, same discipline as Phase 2 — no
creation UI exists yet for `Book`/`Course`/`Routine`/`Semester
Commitment`) to seed a realistic mixed week (two `Book`s, a `Course`, a
`Fixed Commitment`, plus leftover data from the Phase 2 walkthrough still
present in the local dev database). All three disruption scenarios were
exercised end-to-end through the real Weekly View UI, as detailed in the
gate sections above; the temporary route was deleted before committing
(confirmed via `git status --short`).

## Exceptions / Deviations

- **Real-clock interaction during the walkthrough:** the `item-completed`
  gate's `now >= startAt` guard is a real safety feature, but it meant the
  first two manual attempts (against sessions dated within "this week,"
  which had already fully elapsed on the host's system clock by the time
  of testing) correctly produced no removal — not a failure, but it meant
  demonstrating the *positive* removal+backfill path required placing a
  session dated in a future week instead. This is documented above as
  additional confirmation the guard works, not worked around.
- **No creation UI for `Book`/`Course`/`Routine`/`Semester Commitment`**
  still exists (same exception carried forward from Phases 1 and 2) — the
  repair actions were only testable against realistic data via a
  temporary seed route, deleted before committing. `Ad-hoc Event` gained
  its first creation UI this phase (the "Quick Ad-hoc Event" form), so
  this gap has narrowed but not closed.
- The backfill policy (freed flexible time is immediately offered to the
  next eligible item, rather than always left as `Slack` until the next
  full "Generate Schedule" run) was an explicit product decision the
  project owner made before implementation (2026-07-18), not silently
  inferred — see `PRIORITIES.md`'s decomposition history and
  `docs/status.md`'s Repair section.
- The exit condition's "insert a same-day `Ad-hoc Event`" wording is
  satisfied more generally: `repairSchedule` accepts any `startAt`/`endAt`
  for the new event, not only same-day ones — same-day was the disruption
  scenario asked for, but nothing in the implementation restricts it to
  same-day, and no fixture exercises a cross-day case differently.

## Follow-Up

- No new `ROADMAP.md` proposals came out of this phase. The narrowed (not
  closed) no-creation-UI gap for `Book`/`Course`/`Routine`/`Semester
  Commitment` remains a known, documented gap — a candidate for a future
  `PRIORITIES.md` item if a human decides it's worth fixing before the
  next phase needs it as a prerequisite.
- `FRAMEWORK_FEEDBACK.md` gained no entries during this phase — nothing to
  harvest.

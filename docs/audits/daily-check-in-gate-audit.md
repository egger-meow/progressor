# `Daily Check-In Gate for Missed Sessions` — Completion Audit

**Phase authorized:** by the project owner in chat, 2026-07-22: for
progress-tracked work — `Book`/`Course` (`Trackable Item`) sessions and
`Deadline Task` sessions — if a day passes and the user never marks it
done, nothing in the app asks about it; a past `Time Slot` just sits inert
on the board. The user wants the system to force a same-day check-in the
next time it's opened, and answering "no" to reschedule that item's
outstanding work starting today rather than leave it stuck behind a stale,
elapsed placeholder.
**Audit written:** 2026-07-22
**Status:** Complete

## Original Acceptance Gates

Verbatim from the approved plan, at the point this phase is being closed:

1. A same-day, mandatory gate blocks the whole app (every route) whenever
   a `Trackable Item`/`Deadline Task` `Time Slot` has already elapsed and
   was never confirmed. `Routine`/`Fixed Commitment` occurrences are out
   of scope.
2. Answering "yes, done" for a pending session only records the
   confirmation; it never changes `unitsCompleted`/`estimatedHours`.
3. Answering "no, not done" removes that session and triggers a real
   reschedule of the underlying item's outstanding work, without leaving
   a stale, already-elapsed replacement behind.
4. `npm run verify` passes, with new test coverage.
5. A written manual walkthrough, recorded in `docs/audits/`.

## Evidence, Gate by Gate

### Gate 1: whole-app blocking gate, correctly scoped

`TimeSlot.confirmedAt` (`DateTime?`, migration
`20260722151340_time_slot_confirmed_at`) is null until answered.
`src/server/check-ins.ts`'s `listPendingCheckIns(now)` queries `endAt <
now`, `occupantType in ("trackable-item", "deadline-task")`,
`confirmedAt: null`. `src/app/check-in-gate.tsx` renders a fixed,
full-viewport backdrop from `src/app/layout.tsx` (now `async`, calling
`listPendingCheckIns()` on every request) above `NavBar`/`{children}` —
every route is wrapped, not just the Weekly View.

Evidence: `check-ins.test.ts`'s `listPendingCheckIns` block (4 tests) —
a past `trackable-item` slot with `confirmedAt: null` is included; a
future one is excluded; one with `confirmedAt` already set is excluded;
a past `routine` occurrence is excluded even though it's past and
unconfirmed. Manually verified against the running dev server: seeded a
past `Book` session and a past `Deadline Task` session, loaded `/`, and
confirmed the gate blocked the page — screenshot showed the backdrop
covering the Weekly View entirely, listing both seeded items plus several
real, already-past `Category Item Schedule` occurrences (股票作手回憶錄/
交易聖經) that predate this migration, since every pre-existing slot
starts with `confirmedAt` null. Each entry showed the correct
`occupantKind` badge, title, `occupantProgress` (chapter/video count for
`Book`/`Course`), and date/time range.

### Gate 2: "yes" only confirms, never touches progress

`confirmCheckIn(slotId, now)` (`check-ins.ts`) does exactly one write:
`prisma.timeSlot.update({ data: { confirmedAt: now } })`. Nothing in
`confirmCheckInAction` (`src/app/check-in-actions.ts`) or the function it
calls references `unitsCompleted`/`estimatedHours`.

Evidence: `check-ins.test.ts`'s `confirmCheckIn` block (2 tests) — sets
`confirmedAt` and the slot disappears from a subsequent
`listPendingCheckIns` call; rejects a slot id whose `occupantType` isn't
in scope. Manually verified: confirmed the seeded `Deadline Task` session
as "是，已完成" via the real Server Action (see Exceptions on how this was
triggered) and confirmed directly against `prisma/dev.db` that only that
one slot's `confirmedAt` changed — the `DeadlineTask.estimatedHours` row
was untouched (still `4`).

### Gate 3: "no" reschedules without leaving a stale replacement

`dismissCheckInAsMissed(slotId, weekStart, weekEnd, now)` deletes the slot
via the existing `removeTimeSlot`, then calls the existing `runScheduler`
— reusing 100% pre-existing placement logic, no new placement math. This
surfaced a real, previously-invisible gap during manual testing: the
Scheduler's day-loop has no "not before today" bound, so the fresh
placement it finds can itself land on an already-elapsed day of the
target week, instantly re-qualifying as pending again and defeating the
whole point of answering "no" — reproduced live (seeded a `Book` session,
dismissed it as "no," and the newly-created replacement — placed by the
same real `Category Item Schedule` daily occurrence the project owner's
own books use — landed on a day/time already before the real current
system clock). Fixed within this phase: `dismissCheckInAsMissed` now
prunes only the dismissed item's own newly-created slot(s) if they're
still elapsed relative to `now`, leaving the item with no session this
week rather than a backdated one (the same silent-skip precedent already
used elsewhere in the Scheduler for "no room this week").

Evidence: `check-ins.test.ts`'s `dismissCheckInAsMissed` block (3 tests) —
the happy-path reschedule test pins `now` to `weekStart` (so nothing the
Scheduler places anywhere in the target week can appear "elapsed",
isolating the test from wall-clock timing) and confirms the old slot is
gone and a new one exists for the same item; a dedicated pruning test
pins `now` to `weekEnd` (forcing every possible placement to count as
elapsed) and confirms zero slots remain for that item afterward; a third
test confirms a `Deadline Task`'s dismissal leaves `estimatedHours`
untouched. Manually verified end-to-end against the running dev server
and `prisma/dev.db` directly (see Exceptions): dismissing the seeded
`Book` session as "no" removed it; the DB showed the underlying
`Category Item Schedule` reschedule correctly filled every day of the
week for that book except the one that had just been pruned, and a
follow-up dismissal of the very next stale entry confirmed the prune
step engaging correctly (the just-freed day produced no immediate
stale replacement).

### Gate 4: `npm run verify` + new test coverage

```
npm run verify
```

passes clean: lint, typecheck, 262 tests (up from 261 before this phase —
9 new in `check-ins.test.ts`), `next build`.

### Gate 5: written manual walkthrough

This document's Evidence sections above constitute the walkthrough,
exercised against the real running dev server (`http://localhost:3000`)
with seeded test data, plus direct `prisma/dev.db` inspection where the
Browser pane's click simulation proved unreliable (see Exceptions).

## Exceptions / Deviations

- **Click-simulation unreliable in this session:** `computer{action:
  "left_click", ref:...}` against the gate's 是/否 buttons did not
  reliably trigger the bound Server Action — no resulting network
  request in at least one attempt. Verification instead used
  `form.requestSubmit()` via `javascript_tool` (dispatches a real DOM
  form submission, still intercepted and handled by Next.js's Server
  Action client runtime — confirmed via the dev server's own request log
  naming the invoked action function each time), with the resulting
  mutation double-checked directly against `prisma/dev.db` rather than
  relying on the rendered page alone. Consistent with click-simulation
  flakiness already noted in this project's history (Phase 5's audit).
- **Real user data was in scope for observation, not action:** the
  project owner's own real `Category Item Schedule` occurrences
  (股票作手回憶錄/交易聖經) already had several past, unconfirmed sessions
  once this migration ran, and correctly appeared in the gate alongside
  the seeded test items. None of them were dismissed or confirmed during
  this walkthrough — only the two seeded test records (a throwaway `Book`
  and `Deadline Task`, both removed afterward along with every `Time
  Slot` they produced) were acted on, to avoid changing the real user's
  own tracked schedule as a side effect of testing.
- **Pre-existing `Deadline Task` re-run duplication, not addressed here:**
  confirmed live that `placeDeadlineTasks` recomputes its full
  `estimatedHours` budget from scratch on every `runScheduler` call
  rather than subtracting hours already placed in prior runs — multiple
  quick `runScheduler` calls during this phase's own testing produced
  several sessions for the same test `Deadline Task`. This is the same
  duplication caveat already documented in `docs/status.md` for `Fixed
  Commitment`/`Routine` re-runs; this phase's "no" path calls the same
  `runScheduler` the existing "產生課表" button already calls, so it
  doesn't introduce or worsen the limitation, but it's recorded here
  since this phase is what made it directly observable again.

## Follow-Up

- No new `ROADMAP.md` proposals came out of this phase.
- Recorded as a Known Limit in `docs/status.md`: the Scheduler's
  placement day-loops have no "not before today" bound at all (not
  specific to this feature) — `dismissCheckInAsMissed`'s pruning step
  works around the symptom for the one item it just freed, but a plain
  "產生課表" click mid-week can still, independently of this feature,
  place a newly-eligible item's session on an already-past day of the
  current week.
- `FRAMEWORK_FEEDBACK.md` gained no entries during this phase.

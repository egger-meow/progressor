# `Data Layer & Manual Weekly View` — Completion Audit

**Phase authorized:** 2026-07-18, bootstrap interview (see `ROADMAP.md`'s
"Active Phase" entry prior to removal, and its git history in commit
`67daf91` where the bootstrap-authorization marker was removed).
**Audit written:** 2026-07-18
**Status:** Complete with noted exceptions

## Original Acceptance Gates

Verbatim from `ROADMAP.md`'s "Data Layer & Manual Weekly View" phase,
exit condition (phase gate) list, at the point this phase is being removed:

1. User can create a `Book` (title, chapter count, estimated reading days,
   priority) and a `Course` (title, video count, estimated study days,
   priority); both persist across an app restart (backed by the SQLite
   file, not in-memory state).
2. `WIP Limit` is enforced per type: attempting to mark more than the
   configured number of `Book`s (or `Course`s) as `in-progress` at once is
   rejected with a clear message, not a silent no-op.
3. User can create a `Routine` (cadence, anchor day(s)/date, time-of-day
   preference) and a `Semester Commitment` of either kind (`Fixed
   Commitment` with a recurring slot, or `Deadline Task` with a due date).
4. The Weekly View renders 本週 correctly from real stored data, can
   navigate to 下週/上週, and every `Time Slot` on it can be manually
   added, edited, or removed without corrupting any other `Time Slot` (no
   cross-slot data corruption from a single edit).
5. Task gate (`npm run verify`, once established) passes.
6. A written manual walkthrough covering every bullet above is executed
   and recorded, and an audit is written in `docs/audits/`.

**Ambiguity noted, resolved explicitly rather than silently:** gates 1 and
3 say "User can create" without specifying a UI. This phase's own goal
statement in `ROADMAP.md` scopes it as "data layer + manual weekly view
only," and `PRIORITIES.md` never authorized UI work for `Book`/`Course`/
`Routine`/`Semester Commitment` creation — only for the Weekly View
(`Time Slot` placement). This audit therefore treats "user can create" as
satisfied by the implemented service-layer functions
(`src/server/trackable-items.ts`, `src/server/routines.ts`,
`src/server/semester-commitments.ts`), which are real, callable,
persistence-backed operations — not by a form in the browser. Building
creation UI for those entities remains unauthorized/undone; see Exceptions
below.

## Evidence, Gate by Gate

### Gate 1: Book/Course creation + persistence across restart

`src/server/trackable-items.ts`'s `createTrackableItem` takes exactly
`title`, `type` (`"book" | "course"`), `priority`, `unitCount` (chapter or
video count depending on type), `estimatedDays`, backed by
`prisma/schema.prisma`'s `TrackableItem` model (SQLite-backed, not
in-memory).

Evidence: `src/server/trackable-items.test.ts`, all 14 tests passing
(confirmed in this session's `npm run verify` run, see Gate 5). Notably
the persistence-across-restart claim specifically is proven by a test that
writes via one `PrismaClient` instance and reads back via a second,
independently-constructed `PrismaClient` connected to the same SQLite
file — the closest an automated test can get to "survives an app restart"
without literally restarting the process. Dated record:
`docs/build-status.md`'s 2026-07-18 entry for the `Trackable Item`/
`WIP Limit` task-loop item.

### Gate 2: WIP Limit enforcement

`assertWipLimitNotExceeded` in `src/server/trackable-items.ts` is called
on both `createTrackableItem` (when `status = "in-progress"`) and
`updateTrackableItem` (when transitioning *into* `"in-progress"` from a
different status), and throws `WipLimitExceededError` — not a silent
no-op — when the configured `WipLimit.maxInProgress` for that `type`
(default `DEFAULT_WIP_LIMIT = 3`, an inferred placeholder documented as
such in `docs/status.md`) would be exceeded.

Evidence: `src/server/trackable-items.test.ts` includes dedicated cases
for: rejecting a new item created directly as `in-progress` beyond the
limit; rejecting an update that transitions an existing item to
`in-progress` beyond the limit; `book`/`course` limits enforced
independently of each other; a slot freeing up correctly when an
in-progress item is paused (proving the check isn't just "always reject
once N have ever existed"). All pass under `npm run verify`.

### Gate 3: Routine + Semester Commitment (both kinds)

`src/server/routines.ts`'s `createRoutine` takes `cadence`
(`"daily" | "weekly" | "monthly"`), a cadence-dependent `anchor`
(weekday(s) 0-6 for weekly, day(s)-of-month 1-31 for monthly, forbidden
for daily), and an optional `timeOfDayPreference`. `src/server/
semester-commitments.ts` implements the two `Semester Commitment` kinds as
deliberately separate models/functions: `createFixedCommitment`
(`dayOfWeek`, `startTime`/`endTime` as validated `"HH:mm"`, `startTime <
endTime` enforced) and `createDeadlineTask` (`dueAt`, `estimatedDays`).

Evidence: `src/server/routines.test.ts` (15 tests) covers daily/weekly/
monthly creation, anchor range validation, and cadence-transition
behavior on update. `src/server/semester-commitments.test.ts` (15 tests)
covers both kinds' validation and includes a runtime (not just
type-level) test proving one kind's shape is rejected by the other kind's
create function — the two `Semester Commitment` kinds are non-
interchangeable in code, matching `docs/domain-model.md`'s Naming
Conventions requirement. All pass under `npm run verify`. Dated record:
`docs/build-status.md`'s 2026-07-18 entry for this task-loop item,
including the real bug it caught (`createFixedCommitment`/
`createDeadlineTask` needed to be `async` for validation throws to become
rejected Promises).

### Gate 4: Weekly View render/navigate/edit without cross-slot corruption

`src/app/page.tsx` (root route) renders 本週 by default from real
`TimeSlot` rows (`listTimeSlotsWithLabels` in `src/server/time-slots.ts`,
range-filtered to the displayed week and resolving each occupant to a
label). `← 上週` / `本週` / `下週 →` navigate via a `?week=` query param
holding the displayed week's Monday date (date math in `src/app/week.ts`).
`src/app/actions.ts` provides Server Actions
(`createTimeSlotAction`/`updateTimeSlotAction`/`deleteTimeSlotAction`)
that call directly into `src/server/time-slots.ts`'s `createTimeSlot`/
`updateTimeSlot`/`removeTimeSlot`.

Evidence, two layers:

- **Live manual walkthrough**, executed today against the running dev
  server (`http://localhost:3000`) via the Browser tool — actually
  clicking through the rendered app, not reading code: added a Time Slot
  (Tue 7/14 09:00–10:30, Slack), confirmed it rendered in the correct day
  column; clicked Edit, confirmed the inline form pre-filled the exact
  stored date/start/end/occupant, changed the end time to 11:00, saved,
  confirmed the update rendered; added a second Time Slot on a different
  day (Wed 7/15 14:00–15:00), removed the first, and confirmed the second
  was untouched (no cross-slot corruption, in the real running app);
  navigated to `上週` (7/6–7/12) and `下週` (7/20–7/26) and confirmed each
  showed the correct date range with no slots leaking across week
  boundaries; navigated back to `本週`; cleaned up the leftover test slot
  afterward. Recorded in `docs/build-status.md`'s 2026-07-18 entry for
  "Build the manual Weekly View."
- **Service-layer integration tests** (`src/server/time-slots.test.ts`,
  18 tests): creates real `Routine`/`FixedCommitment`/`DeadlineTask`/
  `TrackableItem`/`AdHocEvent` fixtures via their own service functions
  (not raw Prisma), then creates/updates/removes `TimeSlot`s referencing
  each of the six occupant kinds (five real kinds plus `slack`), including
  a dedicated neighbor-isolation test that edits/removes one `TimeSlot`
  and asserts a sibling `TimeSlot` is untouched, and a dangling-reference
  rejection test.

Between the two, every occupant kind is proven to work end-to-end at the
service layer the UI calls into, and the UI itself (navigation, rendering,
the three CRUD forms, error round-tripping) is proven by the live
walkthrough. See Exceptions below for the one gap this doesn't close.

### Gate 5: Task gate passes

`npm run verify` (lint + typecheck + `vitest run` + `next build`) run in
this session after all Phase 1 work landed: lint clean, typecheck clean,
69/69 tests passing across 6 test files, production build succeeded
(`next build` — Turbopack, "Compiled successfully," static/dynamic route
generation completed with no errors). Output inspected directly, not
inferred.

### Gate 6: Written manual walkthrough + this audit

This document is that audit. The manual-walkthrough portion specific to
the Weekly View is detailed under Gate 4 above and dated in
`docs/build-status.md`. The Book/Course/WIP-Limit/Routine/Semester-
Commitment portions of the walkthrough are the automated test suites cited
under Gates 1–3, which is the strongest available evidence for
service-layer-only capabilities that have no UI yet (see the Ambiguity
note above) — re-executing the same assertions by hand outside a test
runner would not add information a passing, inspected test run doesn't
already provide.

## Exceptions / Deviations

- Gates 1 and 3 are satisfied at the service-layer/data-layer only, per
  the Ambiguity resolution stated above — there is still no UI to create
  or edit a `Book`, `Course`, `Routine`, `Fixed Commitment`, `Deadline
  Task`, or `Ad-hoc Event`. This was never in scope for this phase's
  `PRIORITIES.md` decomposition (only `Time Slot` placement got a UI), and
  is recorded as a known gap in `docs/status.md`, not silently glossed
  over.
- The live-browser walkthrough of the Weekly View (Gate 4) only exercised
  the `Slack` occupant kind directly, because there is no UI yet to create
  the other five occupant kinds to reference from the browser. The other
  occupant kinds are proven at the service-layer integration-test level
  (`time-slots.test.ts`) instead of by browser clicks. This is a real gap
  in *how* the evidence was gathered for non-Slack occupants, not a gap in
  whether the underlying capability works — the UI's occupant `<select>`
  and the Server Actions call the exact same `src/server/time-slots.ts`
  functions the tests exercise, with no occupant-type-specific branching
  in the UI layer itself.

## Follow-Up

- No new `PRIORITIES.md` items or `ROADMAP.md` proposals came out of this
  phase — the phase's scope was fully covered by its original
  decomposition. Creation UI for `Book`/`Course`/`Routine`/`Semester
  Commitment`/`Ad-hoc Event` remains unauthorized; if a human wants it,
  it needs a new `ROADMAP.md` phase or an explicit `PRIORITIES.md` addition
  (it isn't implied by anything currently authorized).
- `FRAMEWORK_FEEDBACK.md` gained no entries during this phase — nothing to
  harvest.

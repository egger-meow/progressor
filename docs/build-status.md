# Build Status

This file tracks build status at a coarse, whole-project level. Update it
when a capability moves from planned to partial or complete — not for every
commit. For fine-grained current behavior, see `status.md`.

## Status Legend

- **Built**: implemented and usable as-is.
- **Partial**: implemented enough to inspect or prototype, but not complete.
- **Planned**: direction is documented but implementation is missing.
- **Blocked**: intentionally held until a prerequisite (safety, architecture,
  external dependency) exists.

## Current Status

| Area | Status | Notes |
| --- | --- | --- |
| Item Tracking | Partial | `Trackable Item` (`Book`/`Course`) + `WIP Limit` implemented at the data layer (`src/server/trackable-items.ts`); no UI yet. |
| Routine & Commitment Management | Partial | `Routine`, `FixedCommitment`, `DeadlineTask` implemented at the data layer (`src/server/routines.ts`, `src/server/semester-commitments.ts`); no UI yet. |
| Preference & Constraint Capture | Planned | `Time-of-Day Preference` and `WIP Limit` documented; enforcement not implemented. |
| Auto-Scheduling Engine | Built | Phase 2 active (`../ROADMAP.md`). `computeSchedule` composes all three placement layers, wired into the running app via `src/server/scheduler-runs.ts` and a "Generate Schedule" button on the Weekly View; manually verified against real seeded data. Only remaining Phase 2 item is the walkthrough/audit. |
| Schedule View / Export | Partial | `Time Slot`/`Ad-hoc Event` storage implemented plus the manual Weekly View UI (`src/app/page.tsx`, `src/app/actions.ts`); no UI yet to create the records a `Time Slot` can reference. Calendar export is Proposed, not authorized. |

## Next Build Milestones

Phase 1 ("Data Layer & Manual Weekly View") is closed — see
`docs/audits/data-layer-manual-weekly-view-audit.md`. Active phase is now
Phase 2, "Constraint-Based Auto-Scheduler v1": a pure, fixture-testable
`Scheduler` (`src/scheduler/`) that produces a full weekly `Schedule` from
every `Trackable Item`, `Routine`, `Semester Commitment`, `Ad-hoc Event`,
`Time-of-Day Preference`, and `WIP Limit` — honoring hard constraints,
never silently dropping a `Fixed Commitment`/`Deadline Task`, respecting
`WIP Limit`s, and preserving a documented minimum `Slack` share. See
`PRIORITIES.md` for the decomposition.

## Verification Evidence

Append-only. Every entry is a dated, specific record of how something was
actually verified — not "looks good," but what was run, what the result was,
and what (if anything) is still unverified as a result. Never edit or delete
a past entry; if something it describes later turns out to be wrong, add a
new entry correcting it and say so explicitly.

- 2026-07-18: bootstrap interview completed (docs language, guardrails,
  platform, Phase 1 scope decided by the human — see
  `../docs/project-charter.md` and `../ROADMAP.md`); `docs/project-charter.md`,
  `docs/domain-model.md`, `docs/system-direction.md`, `ROADMAP.md`,
  `docs/status.md`, `docs/build-status.md`, `docs/release.md`, `CLAUDE.md`,
  `AGENTS.md`, `PRIORITIES.md`, `README.md` drafted. No application code
  exists yet, so nothing beyond the docs themselves has been verified. Next
  verification: `./scripts/check-templates.sh` must report only the
  `ROADMAP.md` bootstrap-authorization marker before this can move to Stage
  4 (human authorization).
- 2026-07-18: bootstrap authorized by the human; `ROADMAP.md`'s marker
  removed (commit `67daf91`). `PRIORITIES.md` item 1 ("Establish the
  project scaffold and the task gate") completed: scaffolded Next.js 16 +
  TypeScript (App Router, `src/` layout) + Prisma 6 (SQLite datasource,
  no models yet) + Vitest 3 + ESLint per `docs/system-direction.md`'s
  layering (`src/server/` holds the Prisma client singleton in `db.ts`;
  `src/scheduler/` intentionally not created — Phase 2+). Ran
  `npm run verify` (lint + typecheck + test + build) — all four steps
  passed clean, output inspected directly, not inferred. `docs/status.md`'s
  Task Gate section updated from "not established" to the real command.
  Unverified: no actual domain data yet — that's items 1-5 remaining in
  `PRIORITIES.md`.
- 2026-07-18: `PRIORITIES.md` item 1 ("Implement the `Trackable Item` data
  model with `WIP Limit` enforcement") completed. Added `TrackableItem` and
  `WipLimit` to `prisma/schema.prisma` (migration
  `20260718033101_trackable_item_wip_limit`) and
  `src/server/trackable-items.ts` (create/read/update + `getWipLimit`/
  `setWipLimit`). Ran `npm run verify` — 15 tests pass, including: WIP limit
  rejects both a new in-progress item and an update-to-in-progress beyond
  the configured max (not a silent no-op); book/course limits enforced
  independently; a slot frees up correctly when an item is paused;
  persistence verified by connecting a second, independent `PrismaClient` to
  the same SQLite file after writing (proxy for "survives an app restart,"
  since an automated test can't restart the process). Output inspected
  directly. Note: `DEFAULT_WIP_LIMIT = 3` is an inferred placeholder, not a
  value the human chose — flagged in `src/server/trackable-items.ts` and
  `docs/status.md`.
- 2026-07-18: `PRIORITIES.md`'s `Routine`/`Semester Commitment` item
  completed. Added `Routine`, `FixedCommitment`, `DeadlineTask` to
  `prisma/schema.prisma` (migration
  `20260718033624_routine_semester_commitment`) plus
  `src/server/routines.ts` and `src/server/semester-commitments.ts`. Ran
  `npm run verify` — 45 tests pass total (30 new), including
  cadence-dependent anchor validation (weekly/monthly require a
  non-empty, range-checked anchor; daily forbids one and clears it on a
  cadence change) and, for the two Semester Commitment kinds, both a
  type-level and a runtime check that one kind's fields are rejected by
  the other's create function. Worth recording: the first `npm run
  verify` run caught a real bug via 6 failing tests —
  `createFixedCommitment`/`createDeadlineTask` were initially plain
  (non-`async`) functions, so their synchronous validation threw
  immediately instead of producing a rejected `Promise`, which
  `expect(...).rejects.toThrow()` cannot observe; fixed by marking both
  `async`. Output inspected directly.
- 2026-07-18: `PRIORITIES.md`'s `Ad-hoc Event`/`Time Slot` item completed.
  Added `AdHocEvent` and `TimeSlot` to `prisma/schema.prisma` (migration
  `20260718034135_ad_hoc_event_time_slot`) plus `src/server/
  ad-hoc-events.ts` and `src/server/time-slots.ts`. `TimeSlot.occupantId`
  is not a foreign key (no polymorphic relations in Prisma/sqlite);
  existence is checked directly against the matching table instead —
  tested for all five real occupant kinds plus a dangling-id rejection.
  A dedicated neighbor-isolation test proves editing or removing one
  `TimeSlot` never touches another (blocker #4). Two real bugs were caught
  by the first `npm run verify` run and fixed before this was called
  done: (1) 5 failures traced to Vitest running test files in parallel
  against the single shared `prisma/test.db`, so one file's `afterEach`
  cleanup was deleting rows another file's still-running test depended on
  — fixed by setting `fileParallelism: false` in `vitest.config.ts`
  (files now run sequentially; see that file's comment); (2)
  `updateTimeSlot` silently reused the previous `occupantId` when
  `occupantType` changed without a new id being supplied, which is wrong
  — an id from the old occupant type has no meaning under the new one —
  fixed to require a fresh `occupantId` whenever `occupantType` changes.
  69 tests pass total (24 new). Output inspected directly.
- 2026-07-18: `PRIORITIES.md`'s "Build the manual Weekly View" item
  completed. Added the root route `src/app/page.tsx` (renders 本週 from
  real `TimeSlot` data via a new service-layer helper,
  `listTimeSlotsWithLabels` in `src/server/time-slots.ts`, which resolves
  each occupant to a display label), `src/app/actions.ts` (Server Actions
  `createTimeSlotAction`/`updateTimeSlotAction`/`deleteTimeSlotAction`
  calling directly into `src/server/time-slots.ts`), and `src/app/week.ts`
  (pure week-boundary date math, no Prisma access — `?week=` query param
  holds the Monday date of the displayed week). `npm run verify` passed
  clean (still 69 tests — this item added no new service-layer logic, only
  UI/actions, so no new automated tests were written for it; verification
  is the manual walkthrough below). Manually exercised via the dev server
  in the Browser tool at `http://localhost:3000`, actually clicking through
  the running app, not just reading code: (1) added a `Time Slot` (Tue
  7/14 09:00-10:30, occupant Slack) via the Add form and confirmed it
  rendered in the correct day column; (2) clicked Edit, confirmed the
  inline form pre-filled the exact stored date/start/end/occupant, changed
  the end time to 11:00, saved, and confirmed the displayed slot updated;
  (3) added a second `Time Slot` on a different day (Wed 7/15
  14:00-15:00), removed the first one, and confirmed the second was
  untouched — neighbor isolation (blocker #4) holds in the real UI, not
  just in the unit test; (4) navigated `← 上週` (7/6-7/12) and `下週 →`
  (7/20-7/26) and confirmed each showed the correct date range with no
  slots leaking across week boundaries, then navigated back to `本週`.
  Cleaned up the test slot afterward so the dev database was left empty.
  Known gap, not a regression: there is still no UI to create the
  `Routine`/`FixedCommitment`/`DeadlineTask`/`TrackableItem`/`AdHocEvent`
  records a `Time Slot` can reference — the occupant `<select>` is
  populated from whatever already exists via the service layer, so this
  walkthrough only exercised the `Slack` occupant kind. That gap is
  captured in `docs/status.md`, not treated as done.
- 2026-07-18: `PRIORITIES.md`'s "Define the Scheduler's data contracts"
  item completed (Phase 2, `../ROADMAP.md`). Added `src/scheduler/types.ts`
  with `SchedulerInput` (snapshot of `Trackable Item`s, `Routine`s, `Fixed
  Commitment`s, `Deadline Task`s, `Ad-hoc Event`s, `WIP Limit`s, and
  already-placed `Time Slot`s for a target week) and `SchedulerOutput`
  (`ScheduledTimeSlot[]` plus a `SchedulerConflict[]` for anything that
  can't be placed). Confirmed no `@prisma/client` import anywhere under
  `src/scheduler/` (`grep -rn "@prisma/client" src/scheduler/` matches only
  an explanatory comment, not an actual import). `npm run verify` passes
  clean (still 69 tests — this item is types only, no runtime logic to
  test yet). No manual walkthrough needed for a types-only change.
- 2026-07-18: `PRIORITIES.md`'s "Implement hard-constraint placement"
  item completed (Phase 2). Before writing placement logic, stopped and
  asked the human two scheduling-parameter questions that no doc answered
  and that would have shaped every future schedule if guessed silently
  (unlike `DEFAULT_WIP_LIMIT`): the daily window the Scheduler may place
  flexible work in, and how `estimatedDays` becomes actual session hours.
  Answers (`08:00`–`23:00`; one 2-hour session per scheduled day) recorded
  in `src/scheduler/constants.ts`. Added `src/scheduler/time.ts` (pure
  date helpers) and `src/scheduler/hard-constraints.ts`
  (`placeFixedCommitments`, `placeDeadlineTasks`, `placeHardConstraints`).
  `src/scheduler/hard-constraints.test.ts` (10 tests) covers: a `Fixed
  Commitment` placed at its exact anchored time; two overlapping `Fixed
  Commitment`s both still placed with a conflict flagged for each; a
  `Fixed Commitment` overlapping an existing `Ad-hoc Event` slot still
  placed but flagged; non-overlapping commitments producing no false-
  positive conflict; a `Deadline Task` placed in the earliest free window;
  a `Deadline Task` correctly skipping already-busy time within a day; an
  already-past-deadline task producing a conflict with no fabricated
  placement; two `Deadline Task`s never double-booking each other; and,
  via `placeHardConstraints`, a genuine capacity conflict (a `Fixed
  Commitment` filling the only day a `Deadline Task` could have used) and
  a combined no-overlap placement. `npm run verify` passes clean — 79
  tests total (10 new), lint/typecheck/build all clean.
- 2026-07-18: `PRIORITIES.md`'s "Implement `Routine` occurrence placement"
  item completed (Phase 2). This item's own earlier text had a scoping
  error — it assumed `Trackable Item` referenced a `Routine`/`Time-of-Day
  Preference`, which the schema doesn't support — caught and corrected in
  `PRIORITIES.md` before writing any code. Added
  `src/scheduler/routine-placement.ts` (`placeRoutines`): expands each
  `Routine`'s occurrences for the target week from its `cadence`/`anchor`
  (daily/weekly/monthly), searches its `timeOfDayPreference` sub-window
  first and falls back to the full daily window, and silently skips an
  occurrence with no room anywhere (a soft preference, not a
  guardrail-covered fixed-deadline affair — no `SchedulerConflict`
  raised). Refactored the free-window search shared by
  `hard-constraints.ts` and this file into `src/scheduler/time.ts`'s
  `findFreeInterval`, removing the duplicate copy that was in
  `hard-constraints.ts` (behavior-preserving — its existing 10 tests still
  pass unchanged). `src/scheduler/routine-placement.test.ts` (7 tests)
  covers daily/weekly/monthly occurrence expansion (including a monthly
  anchor date that does and doesn't fall in the target week), Time-of-Day
  Preference sub-window placement, fallback to the full window when the
  sub-window is busy, silent skip when the whole day is busy, and no
  double-booking between two Routines competing for the same window.
  `npm run verify` passes clean — 86 tests total (7 new), lint/typecheck/
  build all clean.
- 2026-07-18: `PRIORITIES.md`'s "Implement priority-ordered flexible
  placement for Trackable Item work sessions" item completed (Phase 2).
  Added `src/scheduler/flexible-placement.ts`
  (`placeFlexibleTrackableItems`): selects eligible items (already
  `in-progress`, plus `not-started`/`paused` items promoted up to each
  type's remaining `WIP Limit` capacity, highest priority first — a type
  missing from `wipLimits` is treated as zero capacity, not unlimited),
  places one session per eligible item in priority order, and enforces a
  new `MIN_SLACK_SHARE_PER_DAY` constant (20%, `src/scheduler/
  constants.ts`) that stops a day from being packed past that share even
  when a technically-free interval still exists. `src/scheduler/
  flexible-placement.test.ts` (8 tests) covers: an in-progress item always
  getting a session; WIP-Limit promotion picking only the highest-priority
  `not-started` item; `book`/`course` capacity being independent; already
  in-progress items still getting sessions even if that exceeds a since-
  lowered limit; priority order determining which item gets the earlier
  slot; the Slack minimum pushing a session to the next day once a day is
  packed enough; no double-booking against pre-existing busy time; and a
  silent (no-conflict) skip when an item has no room anywhere in the week.
  `npm run verify` passes clean — 94 tests total (8 new), lint/typecheck/
  build all clean. Noted gap for the next item: there is still no single
  `computeSchedule` function combining hard-constraint, Routine, and
  flexible placement into one `SchedulerOutput` — each layer is tested and
  callable independently, but nothing composes them yet.
- 2026-07-18: `PRIORITIES.md`'s "Add a `computeSchedule` entry point and a
  fixture-based end-to-end scheduler test suite" item completed (Phase 2).
  Added `src/scheduler/index.ts` (`computeSchedule`): runs hard-constraint
  → `Routine` → flexible `Trackable Item` placement in order, threading
  each layer's output forward as the next layer's `busy`, and merges
  everything into one `SchedulerOutput`; also re-exports the individual
  layer functions and all of `types.ts` as the package's public surface.
  `src/scheduler/index.test.ts` (6 tests) runs one realistic mixed weekly
  fixture — an in-progress `Book`, a second `Book` blocked because its
  type's `WIP Limit` is already at cap, a promotable `Course`, a `Fixed
  Commitment`, a `Deadline Task`, and a weekly `Routine` — through
  `computeSchedule` and checks it against every bullet in `ROADMAP.md`'s
  Phase 2 exit condition in one place: no `WIP Limit` violated (verified
  by counting placed sessions per item, not just trusting the mechanism);
  no two of the six resulting slots overlap; the `Fixed Commitment` lands
  exactly at its anchored time and the `Deadline Task` lands before its
  due date, with an empty conflict list; both `Routine` occurrences land
  without colliding with the `Fixed Commitment`; and each day's flexible
  `Trackable Item` time stays inside the `Slack` budget (with the map of
  per-day flexible time confirmed non-empty, so the check is exercising
  something real, not vacuously passing on an empty result). A sixth test
  reruns the fixture with an already-past-due `Deadline Task` and confirms
  the full composed pipeline still reports a conflict rather than a
  fabricated placement — the same guarantee `hard-constraints.test.ts`
  proves in isolation, now proven end-to-end. Traced every intermediate
  placement by hand before running (fixed commitment, then deadline
  session immediately after it, then both routine occurrences, then both
  flexible sessions) to predict exact expected slot times; the actual run
  matched the prediction exactly on the first attempt. `npm run verify`
  passes clean — 100 tests total (6 new), lint/typecheck/build all clean.
- 2026-07-18: `PRIORITIES.md`'s "Wire the Scheduler into the running app"
  item completed (Phase 2). Before implementing, stopped and asked the
  human what should happen to a `Time Slot` already on the board when the
  Scheduler re-runs, since the charter's highest-priority guardrail is
  never losing already-tracked data — the human chose the safest of three
  offered options: only fill genuinely empty time, never modify or delete
  an existing slot. Added `src/server/scheduler-runs.ts`
  (`runScheduler`): snapshots current domain data (including the target
  week's existing `Time Slot`s) via existing `src/server/*` functions,
  calls `computeSchedule`, and persists every proposed slot via
  `createTimeSlot` — this policy required no new logic in
  `src/scheduler/`, since every placement layer already treated
  `existingSlots` as busy space. Added a `generateScheduleAction` Server
  Action (`src/app/actions.ts`) and a "Generate Schedule" button on the
  Weekly View (`src/app/page.tsx`), joining any `SchedulerConflict`
  messages into the existing `?error=` banner. `npm run verify` passes
  clean — no new automated tests (this item is wiring, not new
  service-layer logic; `computeSchedule`'s correctness is already proven
  by `src/scheduler/index.test.ts`). Manually verified against the running
  dev server via a temporary seed route (deleted before committing, not
  shipped): seeded a `Book`, a weekly `Routine`, a `Fixed Commitment`, and
  a pre-existing manual `Time Slot`; one click correctly placed the `Fixed
  Commitment` (09:00-10:00), the `Routine` occurrence (10:00-12:00), and
  a `Book` session (12:00-14:00) into the empty time, leaving the manual
  slot completely untouched; a second click confirmed the manual slot was
  *still* untouched, but also surfaced a real, worth-documenting
  consequence of the chosen policy — the `Fixed Commitment` and `Routine`
  occurrence were both re-placed as duplicate `Time Slot`s, since nothing
  tracks "the Scheduler already placed this occurrence" across runs.
  Recorded as a Known Limit in `docs/status.md` rather than treated as a
  bug — deduplication was not part of this item's scope and the human
  chose the simplest of the three re-run policies knowing it was the
  safest, not the most polished.
- 2026-07-20: two task-level items from `INBOX.md` ("books and course
  different kind, sorted books only books and course are course... a
  block on time table should also have book detail (which chapter)")
  completed directly (small enough not to need a `ROADMAP.md` phase).
  (1) `/items` (`src/app/items/priority-list.tsx`) now renders separate
  drag-and-drop lists for `Book` and `Course`, each with its own rank
  badge; a new pure helper, `reorderWithinType`
  (`src/app/items/priority-order.ts`, 2 new unit tests), splices only the
  dragged type's subsequence back into the full priority order so the
  other type's items and the Scheduler's existing cross-type interleave
  are untouched — no Scheduler change needed. (2) `occupantLabel`
  (`src/server/time-slots.ts`) now includes which `Chapter`/`Video` a
  `Trackable Item` session is for (`unitsCompleted + 1` capped at
  `unitCount`), and, closing a leftover Phase 5 gap, is fully Traditional
  Chinese for every occupant kind (it was still English before this).
  `npm run verify` passes — 131 tests (2 new), lint/typecheck/build all
  clean. Manually verified against the running dev server: added a `Book`
  and a `Course`, confirmed each ranked independently at 1 in its own
  section; generated the schedule and confirmed the resulting blocks read
  `書籍：Deep Work（第 1 章／共 12 章）` and `課程：Algorithms
  Course（第 1 支影片／共 30 支影片）`. Test/seed data cleared from
  `prisma/dev.db` afterward.
- 2026-07-21: `ROADMAP.md`'s "Interactive Weekly Grid & Click-to-Create"
  phase completed and closed, authorized in chat: the Weekly View's day
  columns collapsed to "沒有時段" when empty and adding a slot required
  scrolling to a separate form. Added `buildHourRows`/`parseHour`/
  `formatHourParam` (`src/app/week.ts`, 6 new tests in `week.test.ts`)
  and rebuilt `src/app/page.tsx`'s day-column rendering around them: each
  day always shows one row per hour across the Scheduler's daily window
  (08:00–23:00), widened per-day to include any `Time Slot` outside that
  window; a row shows the slot(s) starting there, a non-interactive
  continuation bar for hours a slot already covers, or a "＋ 新增" link
  for a genuinely empty hour. Clicking that link navigates to
  `/?week=...&add=<date>T<hour>` (mirroring the existing `?edit=`
  pattern), revealing an inline form pre-filled with that hour that
  posts straight to the existing `createTimeSlotAction` — no new Server
  Action, no new client-side JavaScript. `npm run verify` passes — 137
  tests (6 new), lint/typecheck/build all clean. Manually verified
  against the running dev server (`javascript_tool`'s `requestSubmit()`
  used in place of `computer` clicks, which timed out again this session
  independent of the app — server logs and console stayed clean): an
  empty week showed the full grid on every day, every cell clickable;
  clicked an empty cell, changed the pre-filled end time to make a
  2-hour slot, and confirmed it rendered a card in its starting hour and
  a continuation bar (no add link) in the hour it also covered; edited
  the slot down to 1 hour and confirmed the freed hour regained its own
  "＋ 新增" link; removed it and confirmed the day returned to fully
  empty; created a slot at 06:00 (outside the default window) and
  confirmed only that day's grid widened down to 06:00, other days
  unaffected. Test data cleared from `prisma/dev.db` afterward.
- 2026-07-21: same-day follow-up to the grid above, from a screenshot the
  project owner shared in chat: the empty-cell "＋ 新增" buttons (dashed
  border, visible label, ~105 of them across a week) read as visual
  clutter ("密集恐懼症"), and the occupant `<select>` in the inline
  add form appeared to only offer "留白（不指定）". Restyled
  `.hourAddButton` (`src/app/page.module.css`) to a quiet, low-opacity
  "＋" (no border) that only reaches full color on hover/focus, and
  shortened the link text from "＋ 新增" to "＋" with an
  `aria-label="在 HH:00 新增時段"` added for accessibility. The dropdown
  was not a bug: `prisma/dev.db` had zero `Trackable Item`/`Routine`/etc.
  rows at the time of the screenshot (cleared during the previous
  session), so `loadOccupantOptions` correctly had nothing else to list
  — confirmed by creating a `Book` via `/items` and reloading the Weekly
  View, which then showed `書籍：Deep Work` as a second option, then
  removed the `Book`. `npm run verify` passes — still 137 tests (styling/
  copy only, no logic change), lint/typecheck/build all clean. Manually
  verified via screenshot and hover simulation against the running dev
  server. Test data cleared from `prisma/dev.db` afterward.

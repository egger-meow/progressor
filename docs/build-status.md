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
| Auto-Scheduling Engine | Planned | Phase 2 active (`../ROADMAP.md`). Pure data contracts defined (`src/scheduler/types.ts`); no placement logic yet. |
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

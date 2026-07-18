# Changelog

All notable changes to this project are documented here.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/), and
this project's versioning is defined in [`docs/release.md`](docs/release.md).

## [Unreleased]

### Added

- Bootstrap: drafted all canonical docs (`docs/project-charter.md`,
  `docs/domain-model.md`, `docs/system-direction.md`, `ROADMAP.md`,
  `docs/status.md`, `docs/build-status.md`, `docs/release.md`, `CLAUDE.md`,
  `AGENTS.md`, `PRIORITIES.md`, `README.md`) from the human's project idea,
  per `BOOTSTRAP.md`.
- Project scaffold: Next.js 16 + TypeScript + Prisma 6 (SQLite) + Vitest 3 +
  ESLint, following `docs/system-direction.md`'s layering. `npm run verify`
  (lint + typecheck + test + build) is now the established task gate.
- `Trackable Item` (`Book`/`Course`) data model and `WIP Limit` enforcement
  (`prisma/schema.prisma`, `src/server/trackable-items.ts`), enforced
  independently per type on both creation and status updates.
- `Routine` (`src/server/routines.ts`) and `Semester Commitment`'s two
  kinds, `FixedCommitment` and `DeadlineTask` (`src/server/
  semester-commitments.ts`), as deliberately separate, non-interchangeable
  models and service functions.
- `Ad-hoc Event` (`src/server/ad-hoc-events.ts`) and `Time Slot`
  (`src/server/time-slots.ts`), with occupant-existence validation across
  all five referenceable occupant kinds plus `slack`.
- Manual Weekly View (`src/app/page.tsx`, `src/app/actions.ts`,
  `src/app/week.ts`): renders 本週 from real `Time Slot` data, navigates
  上週/本週/下週 via a `?week=` query param, and supports adding, editing,
  and removing `Time Slot`s by hand through Server Actions that call
  straight into `src/server/time-slots.ts`.
- Phase 1 ("Data Layer & Manual Weekly View") closed: completion audit at
  `docs/audits/data-layer-manual-weekly-view-audit.md`; removed from
  `ROADMAP.md`. Phase 2 ("Constraint-Based Auto-Scheduler v1") activated
  and decomposed into `PRIORITIES.md`.
- Scheduler data contracts (`src/scheduler/types.ts`): `SchedulerInput`
  (snapshot of domain data for a target week) and `SchedulerOutput`
  (proposed `Time Slot`s plus an explicit conflict list), with no
  `@prisma/client` import anywhere under `src/scheduler/` — the first piece
  of Phase 2's Scheduler layer.
- Scheduler hard-constraint placement (`src/scheduler/hard-constraints.ts`):
  `Fixed Commitment` occurrences always place at their anchored time and
  flag (never hide) a clash with another `Fixed Commitment` or an existing
  `Ad-hoc Event` slot; `Deadline Task` sessions search for free time before
  their deadline and report an explicit conflict, with nothing fabricated,
  when none exists. Daily scheduling window (`08:00`–`23:00`) and session
  length (2h/day) are configured in `src/scheduler/constants.ts` per the
  project owner's explicit decision, not inferred.
- Scheduler Routine occurrence placement
  (`src/scheduler/routine-placement.ts`): expands each `Routine`'s
  occurrences for the target week from its cadence/anchor, prefers its
  Time-of-Day Preference sub-window and falls back to the full daily
  window, and silently skips an occurrence with no room (a soft
  preference, unlike `Fixed Commitment`/`Deadline Task`). Corrects an
  earlier `PRIORITIES.md` scoping error that assumed `Trackable Item`
  referenced a `Routine`, which the schema doesn't support.
- Scheduler flexible Trackable Item placement
  (`src/scheduler/flexible-placement.ts`): one session per eligible item
  in `priority` order, WIP-Limit-aware promotion of `not-started`/`paused`
  items, and a new `MIN_SLACK_SHARE_PER_DAY` (20%, an inferred default) so
  flexible placement never packs a day solid.
- `computeSchedule` (`src/scheduler/index.ts`): composes hard-constraint,
  `Routine`, and flexible placement into one `SchedulerOutput` — the
  Scheduler's public entry point. `src/scheduler/index.test.ts` adds a
  fixture-based end-to-end suite verifying every bullet in `ROADMAP.md`'s
  Phase 2 exit condition against one realistic mixed week.
- Scheduler wired into the running app: `src/server/scheduler-runs.ts`'s
  `runScheduler` snapshots current domain data, calls `computeSchedule`,
  and persists every proposed `Time Slot`; a "Generate Schedule" button on
  the Weekly View triggers it. Re-run policy (only fill empty time, never
  touch an existing `Time Slot`) was an explicit product decision, not
  inferred — see `docs/status.md` for the tradeoff it accepts (repeated
  runs can duplicate a `Fixed Commitment`/`Routine` occurrence).
- Phase 2 ("Constraint-Based Auto-Scheduler v1") closed: completion audit
  at `docs/audits/constraint-based-auto-scheduler-v1-audit.md`; removed
  from `ROADMAP.md`. Phase 3 ("Elastic Re-Scheduling & Ad-hoc Events")
  activated; not yet decomposed into `PRIORITIES.md`.
- Scheduler repair layer (`src/scheduler/repair.ts`'s `repairSchedule`,
  Phase 3): locally repairs an existing `Schedule` for one of three
  disruptions without a full recompute — skipping a flexible `Trackable
  Item` session, inserting a same-day `Ad-hoc Event`, or marking an item
  done early — each backed by fixture tests in `repair.test.ts` plus
  evidence for a documented, interactively-fast time budget. Backfill
  policy (freeing scheduled time immediately offers it to the next
  eligible priority item, never left as `Slack` until the next full
  "Generate Schedule" run) was the project owner's explicit decision
  (2026-07-18), not inferred.
- Scheduler repair wired into the real store
  (`src/server/scheduler-repair.ts`: `skipSession`, `insertAdHocEvent`,
  `completeItemEarly`) and exposed on the Weekly View as a "Skip" and
  "Mark done" control on every flexible `Trackable Item` `Time Slot`, plus
  a "Quick Ad-hoc Event" form — the latter is also the first creation UI
  for the `Ad-hoc Event` record itself. Manually verified against the
  running dev server across all three disruptions, confirming the
  Phase-1 manual-edit guarantee (one edit never corrupts another `Time
  Slot`) still holds.

### Changed

### Fixed

- Vitest test files raced on the shared SQLite test database when run in
  parallel, corrupting other files' in-progress assertions; disabled
  `fileParallelism` in `vitest.config.ts`.
- `updateTimeSlot` silently reused a `Time Slot`'s previous `occupantId`
  when `occupantType` changed without a new id — now requires a fresh
  `occupantId` whenever the type changes.

### Removed

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

### Changed

### Fixed

- Vitest test files raced on the shared SQLite test database when run in
  parallel, corrupting other files' in-progress assertions; disabled
  `fileParallelism` in `vitest.config.ts`.
- `updateTimeSlot` silently reused a `Time Slot`'s previous `occupantId`
  when `occupantType` changed without a new id — now requires a fresh
  `occupantId` whenever the type changes.

### Removed

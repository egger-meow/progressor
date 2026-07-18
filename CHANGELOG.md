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

### Changed

### Fixed

- Vitest test files raced on the shared SQLite test database when run in
  parallel, corrupting other files' in-progress assertions; disabled
  `fileParallelism` in `vitest.config.ts`.
- `updateTimeSlot` silently reused a `Time Slot`'s previous `occupantId`
  when `occupantType` changed without a new id — now requires a fresh
  `occupantId` whenever the type changes.

### Removed

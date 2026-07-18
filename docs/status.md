# Status

Source of truth for current, actually-implemented behavior. If this doc and
the running code disagree, the code wins and this doc is out of date — fix
the doc as part of whatever change you're making, don't leave the drift for
later.

**Bootstrap state:** the Phase 1 scaffold (Next.js + TypeScript + Prisma/
SQLite + Vitest + ESLint) exists and the task gate passes on it. No domain
data model beyond the Prisma client wiring exists yet — the remaining
`PRIORITIES.md` items build that up area by area.

## Verification Gates

### Task Gate

Established. From the repo root:

```bash
npm run lint
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build
```

bundled as `npm run verify`. No task in the task loop may be claimed done
without this command passing clean (see `../LOOP_ENGINEERING.md`, "Two
verification gates").

### Phase Gate

For the active phase ("Data Layer & Manual Weekly View," see
`../ROADMAP.md`), the phase gate is:

1. `npm run verify` passes.
2. A written manual walkthrough, executed and recorded in a
   `docs/audits/` entry, that exercises every bullet in the phase's exit
   condition: create a `Book`/`Course`, restart the app and confirm the data
   persisted, exceed a `WIP Limit` and confirm it's rejected (not silently
   allowed), create a `Routine` and a `Semester Commitment` of both kinds,
   navigate the Weekly View across 上週/本週/下週, and manually add/edit/
   remove a `Time Slot` without corrupting a neighboring one.

Later phases (Constraint-Based Auto-Scheduler v1, Elastic Re-Scheduling)
will each add fixture-replay tests to this section when they're activated —
see their exit conditions in `../ROADMAP.md`.

## Current Behavior

The Next.js app scaffold exists (`src/app/`, default starter page, no
Progressor-specific UI yet). Prisma is wired to a local SQLite file via
`src/server/db.ts` (a cached client singleton, safe under Next.js dev-mode
hot reload), but `prisma/schema.prisma` declares no models yet — only the
`sqlite` datasource and `prisma-client-js` generator. No `Trackable Item`,
`Routine`, `Semester Commitment`, `Ad-hoc Event`, or `Schedule` exists in
code — only their definitions in `domain-model.md`. The remaining
`PRIORITIES.md` items exist to change this section from "just the scaffold"
to a real, area-by-area account.

## Known Limits

- No `Scheduler` exists — Phase 1 has no auto-scheduling; every `Time Slot`
  is placed by hand. This is intentional (see `../ROADMAP.md`'s Active
  Phase), not a bug.
- No calendar export/sync, no notifications, no mobile view — all
  intentionally out of scope; see `../ROADMAP.md`'s Proposed section.
- Single-user only; no auth, no multi-device sync beyond the local SQLite
  file.

## Configuration / Environment Notes

- Node: v24 (tested with v24.13.1); no lower bound enforced yet.
- `DATABASE_URL` (`.env`, gitignored) points at the local SQLite file —
  default `file:./dev.db`. See `.env.example` for the variable name.
- The dev database file itself (`prisma/*.db`) is gitignored — it's local
  state, not source, and Phase 1's "persists across a restart" exit
  condition only requires the file to survive an app restart, not a git
  clone.

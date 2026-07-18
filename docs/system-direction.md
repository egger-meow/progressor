# System Direction

## Target Architecture

Progressor is a **local web app**: a single process the user runs on their
own machine (`npm run dev`), browser UI, no multi-user auth, no external
deployment target for now. Proposed stack (default chosen during bootstrap —
see the authorization summary for this as a flagged default; revisit here if
it stops fitting):

- **Next.js (App Router) + TypeScript** — one process serves both the UI and
  the data API; no separate backend service to keep in sync for a
  single-user local tool.
- **SQLite via Prisma** — file-based persistence (`prisma/dev.db`), enough
  for single-user local data, no server to run or configure. Prisma's schema
  file becomes the executable version of `domain-model.md`'s concepts.
- **Vitest** for unit/integration tests, ESLint + `tsc --noEmit` for
  lint/typecheck.

Layering (three layers, each only calls the one below it):

1. **Domain / Service layer** (`src/server/*`) — owns all reads and writes to
   the Prisma-backed store, implements `WIP Limit` enforcement and any other
   invariant from `domain-model.md`. This is the only layer allowed to touch
   Prisma directly.
2. **Scheduler layer** (`src/scheduler/*`, introduced Phase 2) — pure
   functions that take a snapshot of domain data (via the service layer's
   query functions) and return a computed/repaired `Schedule`. Never writes
   to the store directly and never calls Prisma — this boundary is what
   keeps the scheduler fixture-testable in isolation (see the Phase 2 exit
   condition in `../ROADMAP.md`) and keeps a scheduling bug from ever being
   able to corrupt tracked progress, per the charter's data-loss guardrail.
3. **UI layer** (`src/app/*`, Next.js routes/components) — calls the service
   layer (and, from Phase 2, the scheduler layer) through typed server
   functions/route handlers; never queries Prisma directly from a component.

## Current Fit

No code exists yet (bootstrap only) — there is no current-fit gap to report.
This section starts real once Phase 1 scaffolding lands; keep it honest from
the first entry rather than leaving it as an unfilled placeholder.

## Refactor Priorities

None yet — there's no code to accumulate debt in. The one standing bias to
carry forward from day one: keep the Scheduler layer pure (no direct
persistence access) even under time pressure in Phase 2, since that boundary
is what makes "elastic re-scheduling" (Phase 3) tractable to test against
fixtures instead of a live database.

## Retiring Legacy Paths

Once a new implementation covers a legacy path's behavior completely, remove
the superseded code, config, tests, docs, and references outright. Do not
keep parallel implementations as permanent compatibility fallbacks — this is
a single-user local tool with no external consumers depending on an old
path staying available.

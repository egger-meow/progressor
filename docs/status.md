# Status

Source of truth for current, actually-implemented behavior. If this doc and
the running code disagree, the code wins and this doc is out of date — fix
the doc as part of whatever change you're making, don't leave the drift for
later.

**Bootstrap state:** no code exists yet. Everything below describes what
Phase 1's first `PRIORITIES.md` item must establish, not what's built today.
Update this doc for real the moment the scaffold lands — don't leave it
describing intent once there's actual behavior to describe.

## Verification Gates

### Task Gate

Not established yet — establishing it is the first `PRIORITIES.md` item.
Once the Next.js/TypeScript/Prisma scaffold from `docs/system-direction.md`
exists, this section must be updated to the real bundled command, expected
to be:

```bash
npm run lint
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build
```

bundled as a single `npm run verify`. No task in the task loop may be
claimed done without running this command (see `../LOOP_ENGINEERING.md`,
"Two verification gates") — until it exists, that itself is the blocker.

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

Nothing is implemented yet. No `Trackable Item`, `Routine`, `Semester
Commitment`, `Ad-hoc Event`, or `Schedule` exists in code — only their
definitions in `domain-model.md`. The first `PRIORITIES.md` items exist to
change this section from "nothing" to a real, area-by-area account.

## Known Limits

- No `Scheduler` exists — Phase 1 has no auto-scheduling; every `Time Slot`
  is placed by hand. This is intentional (see `../ROADMAP.md`'s Active
  Phase), not a bug.
- No calendar export/sync, no notifications, no mobile view — all
  intentionally out of scope; see `../ROADMAP.md`'s Proposed section.
- Single-user only; no auth, no multi-device sync beyond the local SQLite
  file.

## Configuration / Environment Notes

To be filled in once the scaffold lands (expected: SQLite file path,
required Node version, any `.env` variables). Nothing to configure yet.

# CLAUDE.md

This file provides guidance to Claude Code (or any agent reading this
repo's conventions) when working with code in this repository.

## What this is

Progressor is a personal, single-user life-scheduling system: it tracks
long-running items (books by chapter, online courses by video), recurring
routines (gym, tutoring), semester-driven fixed/deadline commitments (class,
meetings, homework, exams), and ad-hoc events, and turns them into one
continuously-updated weekly timetable (課表). It is not a multi-user/team
calendar tool and not a generic project-management app. Phase 1 (current) is
data layer + manual weekly view only — no auto-scheduling yet. See
`docs/project-charter.md` for the full mission and guardrails.

## Before you change anything

**Not initialized yet?** If the files below still carry `TEMPLATE:`
markers (`.loop-engine/scripts/check-templates.sh` lists them), there is
nothing to loop on — this project hasn't been through init. Don't
improvise: follow the agent procedure in
[`BOOTSTRAP.md`](.loop-engine/BOOTSTRAP.md); if the human has
already described their project in chat, that's your intake — start from
it. If a bootstrap was already underway, use that file's "Locating
yourself" table. Everything below applies once init is complete.

Read, in this order, if you haven't already this session:

1. [`INBOX.md`](INBOX.md) — pending human input; process it per that file's
   protocol before taking new work.
2. [`PRIORITIES.md`](PRIORITIES.md) — the task you're authorized to work on
   next.
3. [`ROADMAP.md`](ROADMAP.md) — which phase that task belongs to, and what
   phase comes next when the queue drains.
4. [`docs/project-charter.md`](docs/project-charter.md) — mission, safety
   principles, and the documentation contract.
5. [`docs/domain-model.md`](docs/domain-model.md) — shared names; don't
   invent new vocabulary for concepts that already have one.
6. [`docs/status.md`](docs/status.md) and
   [`docs/build-status.md`](docs/build-status.md) — what currently exists.

Do **not** add `CHANGELOG.md`, `docs/audits/`, or
`.loop-engine/FRAMEWORK_FEEDBACK.md` to this routine orientation read.
They're append-only history — read on demand only (a specific audit via
its index, the `[Unreleased]` section when adding an entry), never as a
blanket read for context. See `.loop-engine/LOOP_ENGINEERING.md`,
"Reading discipline." `.loop-engine/FRAMEWORK_FEEDBACK.md` is write-only
during loops: when the framework itself misleads you or wastes tokens,
append a short entry per that file's header and move on — nothing in it
licenses work.

Full procedure (the two loops, the inbox protocol, both verification gates):
[`LOOP_ENGINEERING.md`](.loop-engine/LOOP_ENGINEERING.md).

## Commands

```bash
npm install
npm run dev      # Next.js dev server
npm run verify   # task gate: lint + typecheck + test + build
```

See `docs/status.md`'s Task Gate section for the individual commands
`verify` bundles, and `AGENTS.md` for the full command/config reference.

## Architecture

Three layers, each calling only the one below it: Domain/Service layer (all
Prisma access) → Scheduler layer (pure functions, introduced Phase 2, never
touches Prisma directly) → UI layer (Next.js routes/components, never
queries Prisma directly). See `docs/system-direction.md` for the full
boundary rules and `docs/domain-model.md` for the shared concepts
(`Trackable Item`, `Book`, `Course`, `Routine`, `Semester Commitment`,
`Ad-hoc Event`, `Time Slot`, `Schedule`) that cross those boundaries.

## Key references

- [`AGENTS.md`](AGENTS.md) — repo conventions (structure, style, testing,
  commit conventions).
- [`PRIORITIES.md`](PRIORITIES.md) — the active, ordered priority contract.
  Treat it as authorization, not a backlog to reorder at will.
- [`ROADMAP.md`](ROADMAP.md) — the pre-authorized phase queue. The agent
  activates and removes phases; only a human adds or reorders them.
- [`INBOX.md`](INBOX.md) — the human checkpoint. Check at every loop
  boundary; translate-then-clear in the same commit.
- [`docs/README.md`](docs/README.md) — index of all canonical docs.
- [`docs/status.md`](docs/status.md) — source of truth for current behavior.

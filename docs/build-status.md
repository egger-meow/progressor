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
| Item Tracking | Planned | Data model documented (`domain-model.md`); no code yet. First `PRIORITIES.md` items. |
| Routine & Commitment Management | Planned | Same — `Routine` and `Semester Commitment` concepts documented, not implemented. |
| Preference & Constraint Capture | Planned | `Time-of-Day Preference` and `WIP Limit` documented; enforcement not implemented. |
| Auto-Scheduling Engine | Blocked | Intentionally deferred to Phase 2 (`../ROADMAP.md`) until the data layer is proven in Phase 1. |
| Schedule View / Export | Planned | Manual Weekly View is Phase 1 scope; calendar export is Proposed, not authorized. |

## Next Build Milestones

Close Phase 1 ("Data Layer & Manual Weekly View"): a working local scaffold
(Next.js + TypeScript + Prisma/SQLite per `system-direction.md`) with every
domain concept persisted, WIP limits enforced, and a manually-editable
Weekly View — proving the data layer is correct before any scheduling logic
is built on top of it.

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

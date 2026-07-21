# Phase Audits

An audit is written when a major build phase — the kind of thing a human
authorized in `../../ROADMAP.md` with a written exit condition — is
completely finished. It exists so "did we actually finish X" never needs to
be relitigated from memory or re-verified by a human reading code: the
evidence is written down once, permanently.

## When to write one

Write an audit when the active phase's exit condition has passed the phase
gate (see `../status.md`) and the phase's items have been removed from
`../../PRIORITIES.md`. The audit is what licenses removing the phase from
`../../ROADMAP.md` — no audit, no removal. Don't write one for routine
features or bug fixes — `docs/build-status.md`'s Verification Evidence log
covers those. An audit is for the bigger unit: the thing that was worth a
human explicitly authorizing as a phase in the first place.

This folder is append-only history, not routine reading — see
`../../LOOP_ENGINEERING.md`, "Reading discipline." When you need evidence
for a specific phase, open only that phase's file via the Index below;
don't read every audit in this folder to "get context."

## How to write one

Copy [`TEMPLATE.md`](TEMPLATE.md) to `<phase-name>-audit.md` in this folder
and fill it in. Go requirement by requirement against the phase's original
exit condition (pull it from `ROADMAP.md` — or its git history, since the
phase gets removed on completion). Each requirement gets a specific piece of
evidence: a command and its result, a manual verification with what was
checked, a link to a test. "It should work" is not evidence; re-read
`LOOP_ENGINEERING.md`, "Two verification gates," if that's tempting.

Audits are append-only history, like `CHANGELOG.md` — once written, don't
edit an audit to reflect later changes. If something the audit certified
later breaks or turns out incomplete, that's a new `PRIORITIES.md` item and,
once fixed, either a new audit or a correction note added to
`docs/build-status.md`, not a silent edit to the original audit.

## Index

- [`data-layer-manual-weekly-view-audit.md`](data-layer-manual-weekly-view-audit.md)
  — Phase 1, "Data Layer & Manual Weekly View." Complete with noted
  exceptions (no creation UI yet for `Book`/`Course`/`Routine`/`Semester
  Commitment`/`Ad-hoc Event` — was never in this phase's scope).
- [`constraint-based-auto-scheduler-v1-audit.md`](constraint-based-auto-scheduler-v1-audit.md)
  — Phase 2, "Constraint-Based Auto-Scheduler v1." Complete with noted
  exceptions (re-run duplication of Scheduler-placed `Fixed
  Commitment`/`Routine` occurrences; same no-creation-UI gap carried over
  from Phase 1).
- [`elastic-re-scheduling-and-ad-hoc-events-audit.md`](elastic-re-scheduling-and-ad-hoc-events-audit.md)
  — Phase 3, "Elastic Re-Scheduling & Ad-hoc Events." Complete with noted
  exceptions (no-creation-UI gap narrowed but not closed — `Ad-hoc Event`
  gained its first creation UI this phase).
- [`core-entity-creation-ui-audit.md`](core-entity-creation-ui-audit.md)
  — Phase 4, "Core Entity Creation UI." Complete with noted exceptions
  (`Routine` anchor input is a simple comma-separated field, not a
  picker grid; no UI yet to configure a `WIP Limit`).
- [`ui-ux-overhaul-and-live-priority-reordering-audit.md`](ui-ux-overhaul-and-live-priority-reordering-audit.md)
  — Phase 5, "UI/UX Overhaul & Live Priority Reordering." Complete with
  noted exceptions (service-layer error messages remain English; no
  touch/mobile drag fallback; native drag gesture verified via a
  permanent integration test rather than a live pointer simulation, due
  to Browser-pane tooling timeouts that session).
- [`interactive-weekly-grid-and-click-to-create-audit.md`](interactive-weekly-grid-and-click-to-create-audit.md)
  — Phase 6, "Interactive Weekly Grid & Click-to-Create." Complete with
  noted exceptions (hourly-only click-to-create granularity;
  `computer` click simulation timed out again this session, worked
  around with `javascript_tool`'s `requestSubmit()`).
- [`semester-scoping-and-concrete-routine-times-audit.md`](semester-scoping-and-concrete-routine-times-audit.md)
  — Phase 7, "Semester Scoping for Fixed Commitments & Concrete Routine
  Times." Complete, no exceptions from the exit condition's wording;
  verification used the project owner's own real `Fixed Commitment`
  rather than fabricated data, cross-checking `Time Slot` timestamps
  before cleanup since the owner was using the app concurrently.

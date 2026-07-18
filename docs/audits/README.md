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

<!-- TEMPLATE: list audits as they're written, newest first:
- `<phase-name>-audit.md` — <one-line summary of what phase this certifies>
-->

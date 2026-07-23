# Docs

Start here when changing product behavior, architecture, or user-facing
workflows. This is an index — each doc below is the single source of truth
for its topic; don't duplicate their content elsewhere, including in chat
responses that will outlive their usefulness.

## Canonical Docs

- [`project-charter.md`](project-charter.md): mission, core principles,
  safety/guardrail rules, and the documentation contract.
- [`domain-model.md`](domain-model.md): shared names for this project's core
  concepts and how they relate.
- [`system-direction.md`](system-direction.md): architecture direction,
  current fit, and refactor priorities.
- [`status.md`](status.md): currently implemented behavior — the source of
  truth for what actually works right now.
- [`build-status.md`](build-status.md): coarse Built/Partial/Planned/Blocked
  map across the whole project, plus a dated verification-evidence log.
- [`release.md`](release.md): versioning scheme and release checklist.
- [`scheduler-constraint-formulation.md`](scheduler-constraint-formulation.md):
  the Scheduler's formal COP/WCSP definition (decision variables, domain,
  hard/soft constraints) and its honest relationship to RCPSP/CP-SAT — for
  readers connecting the code to the constraint-programming literature,
  not a restatement of `domain-model.md`'s product-facing Scheduler
  section.

No project-specific docs beyond the standard set yet (e.g. a future
`api-spec.md` if the Scheduler grows an external API). Add a line here only
for a doc that will actually be kept current.

## Phase Audits

[`audits/`](audits/README.md) holds one file per completed major build
phase: requirement-by-requirement evidence that the phase's written exit
condition was actually met. Write one when a `../ROADMAP.md` phase passes
the phase gate and closes out completely — see `audits/README.md`.


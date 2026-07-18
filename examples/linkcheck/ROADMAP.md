# Roadmap

The pre-authorized phase queue for linkcheck. Where `PRIORITIES.md` answers
"what *task* is the agent authorized to do next," this file answers "what
*phase* is the agent authorized to plan next." The phase loop in
`../../LOOP_ENGINEERING.md` reads this file whenever the task queue drains.

## How This File Works

- Only a human adds a phase, reorders phases, or promotes a phase out of
  "Proposed." Writing a phase here **is** the authorization. (One
  exception, at project start only: during bootstrap an agent may draft
  the initial phases under the explicit awaiting-authorization marker
  `../../BOOTSTRAP.md` prescribes — removed here long ago, once the human
  approved.)
- The agent may do exactly two things to this file: **activate** the next
  phase in order (move it to "Active Phase" and decompose it into
  `PRIORITIES.md` items), and **remove** a completed phase — but only after
  its exit condition passed the phase gate and an audit exists in
  `docs/audits/`.
- Every phase needs an **exit condition** written like an acceptance gate.
- Shrinking queue: completed phases are removed, not annotated. Their record
  lives in `docs/audits/` and `CHANGELOG.md`.
- No active phase **and** no authorized phase left means everything
  pre-authorized is done — stop and wait for a human.

## Active Phase

### Validation Hardening

**Goal:** eliminate the two known false-negative risks in Validation —
duplicate-heading anchors flagged as broken (inviting users to "fix" valid
links into broken ones), and nightly `--check-external` runs that time out
and risk reporting a partial scan as complete.

**Exit condition (phase gate):** duplicate-heading anchor resolution matches
GitHub's disambiguation-suffix behavior with 2- and 3-way fixture coverage;
the external-URL cache persists to `.linkcheck-cache.json` with a documented
TTL and a truncated run fails loudly; the full phase gate in
`docs/status.md` passes end to end; audit written in `docs/audits/`.

**Decomposition:** `PRIORITIES.md` "Current Priorities" (2 items).

## Authorized Phases (in order)

### Autofix Regression Harness

**Goal:** replace the per-change manual diff review of Autofix (the
`autofix-phase-1-audit.md` Follow-Up) with an automated fixture-replay
harness, so Autofix correctness is regression-guarded instead of
human-attention-guarded.

**Exit condition (phase gate):** the harness replays every fixture tree
under `test/fixtures/` through `--fix` in an isolated worktree and asserts
byte-exact expected output; `npm run verify` includes the replay; the
manual-diff requirement is removed from `AGENTS.md`, `docs/status.md`, and
the PR checklist; audit written.

## Proposed — Not Yet Authorized

- **VS Code extension** surfacing broken links inline while editing.
  Phase-sized; needs a human-written goal and exit condition before it can
  enter the authorized queue.
- **Multi-format Discovery** (reStructuredText, AsciiDoc) behind the
  existing Discovery interface. The pipeline boundary was built for this
  (see `docs/system-direction.md`), but no consumer has asked yet —
  authorizing it now would be speculative.

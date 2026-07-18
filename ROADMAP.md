<!-- TEMPLATE: Fill in the phase queue once docs/project-charter.md and
docs/system-direction.md exist — phases should be recognizable milestones
toward the charter's mission, not a re-listing of PRIORITIES.md items. The
"How This File Works" section is meant to be adopted as-is, like
PRIORITIES.md's Priority Rules. Delete this comment once the file is live. -->

# Roadmap

The pre-authorized phase queue. Where [`PRIORITIES.md`](PRIORITIES.md)
answers "what *task* is the agent authorized to do next," this file answers
"what *phase* is the agent authorized to plan next." The phase loop in
[`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md) reads this file whenever the
task queue drains.

## How This File Works

- Only a human adds a phase, reorders phases, or promotes a phase out of
  "Proposed." Writing a phase here **is** the authorization — that's the
  point: authorize once, in writing, instead of being asked phase by phase
  later. (One exception, at project start only: during bootstrap an agent
  may draft the initial phases from the human's interview answers, under
  the explicit awaiting-authorization marker `BOOTSTRAP.md` prescribes —
  and nothing here licenses any work until the human approves and that
  marker is removed.)
- The agent may do exactly two things to this file: **activate** the next
  phase in order (move it to "Active Phase" and decompose it into
  `PRIORITIES.md` items), and **remove** a completed phase — but only after
  its exit condition passed the phase gate and an audit exists in
  `docs/audits/`.
- Every phase needs an **exit condition**: the observable proof that the
  whole phase is done. Vague exit conditions ("X works well") produce phases
  that never close — write them like acceptance gates.
- Shrinking queue, same as `PRIORITIES.md`: completed phases are removed,
  not annotated. Their record lives in `docs/audits/` and `CHANGELOG.md`.
- No active phase **and** no authorized phase left means everything
  pre-authorized is done — the agent stops and waits for a human. That's the
  correct end state, not a failure.

## Active Phase

<!-- TEMPLATE: At most one phase at a time: name, goal (a short paragraph),
exit condition (specific enough to verify via the phase gate in
docs/status.md), and a pointer noting that its task-level decomposition
lives in PRIORITIES.md "Current Priorities." Empty is valid before init
completes. -->

_(none yet)_

## Authorized Phases (in order)

<!-- TEMPLATE: The queue of phases a human has already signed off on, in
execution order. Same shape as Active Phase: name, goal, exit condition.
Order is a decision — the phase loop always takes the first one. -->

_(none yet)_

## Proposed — Not Yet Authorized

<!-- TEMPLATE: Phase-sized ideas that need a human decision before they may
be activated. The agent may append proposals here (with a suggested goal and
exit condition) but never promote them. Ideas smaller than a phase belong in
PRIORITIES.md "Non-Blocking / Later" instead. -->

_(none yet)_

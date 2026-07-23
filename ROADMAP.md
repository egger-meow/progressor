# Roadmap

The pre-authorized phase queue. Where [`PRIORITIES.md`](PRIORITIES.md)
answers "what *task* is the agent authorized to do next," this file answers
"what *phase* is the agent authorized to plan next." The phase loop in
[`LOOP_ENGINEERING.md`](.loop-engine/LOOP_ENGINEERING.md) reads this file whenever the
task queue drains.

## How This File Works

- Only a human adds a phase, reorders phases, or promotes a phase out of
  "Proposed." Writing a phase here **is** the authorization — that's the
  point: authorize once, in writing, instead of being asked phase by phase
  later. (One exception, at project start only: during bootstrap an agent
  may draft the initial phases from the human's interview answers, under
  the explicit awaiting-authorization marker `.loop-engine/BOOTSTRAP.md` prescribes —
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

No active phase — see "Proposed — Not Yet Authorized" below. A human
needs to authorize the next phase (write a goal and exit condition, or
promote one of the proposals below) before the phase loop can continue.

## Proposed — Not Yet Authorized

- **Calendar export/sync** (ICS export, or sync to Google/Apple Calendar).
  Phase-sized; needs a human-written goal and exit condition — not scoped
  during bootstrap since it wasn't part of the interview answers.
- **Notifications/reminders** (e.g. a reminder before a `Routine` or a
  `Deadline Task`'s due date). Phase-sized; not yet authorized.
- **Mobile companion view.** Deferred by the bootstrap platform decision
  (local web app first); would need its own goal and exit condition if
  authorized later.

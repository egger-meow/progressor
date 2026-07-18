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

### Core Entity Creation UI

**Goal:** give the user real, persistent UI — reachable through the
running app alone, no direct DB access, no temporary seed route — to
create, edit, and delete `Trackable Item` (`Book`/`Course`), `Routine`,
and `Semester Commitment` (`Fixed Commitment`/`Deadline Task`) records.
Every prior phase's manual walkthrough has had to fall back on a
throwaway `src/app/api/dev-seed/` route (deleted before each commit)
specifically because this UI didn't exist; closing that gap is what
finally lets the product be tested as itself, not through a debug
backdoor.

**Exit condition (phase gate):** through the running app alone, a human
can create, edit, and delete a `Book`, a `Course`, a `Routine`, a `Fixed
Commitment`, and a `Deadline Task` — each with its service layer's
existing validation (e.g. `WIP Limit` enforcement, cadence-specific
anchor ranges, `startTime < endTime`) surfaced as a visible error instead
of a crash; deleting a record still referenced by an existing `Time Slot`
does not corrupt or crash the Weekly View (the slot's occupant label
degrades gracefully, per `time-slots.ts`'s existing `occupantLabel`
fallback); `npm run verify` passes; a written manual walkthrough exercising
all of the above is recorded in `docs/audits/`.

## Proposed — Not Yet Authorized

- **Calendar export/sync** (ICS export, or sync to Google/Apple Calendar).
  Phase-sized; needs a human-written goal and exit condition — not scoped
  during bootstrap since it wasn't part of the interview answers.
- **Notifications/reminders** (e.g. a reminder before a `Routine` or a
  `Deadline Task`'s due date). Phase-sized; not yet authorized.
- **Mobile companion view.** Deferred by the bootstrap platform decision
  (local web app first); would need its own goal and exit condition if
  authorized later.

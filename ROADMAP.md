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

### Data Layer & Manual Weekly View

**Goal:** build the persistent data model for every concept in
`docs/domain-model.md` (`Trackable Item`/`Book`/`Course`, `WIP Limit`,
`Routine`, `Semester Commitment` [`Fixed Commitment` + `Deadline Task`],
`Ad-hoc Event`) and a manual `Schedule` / Weekly View where the user places,
views, and edits `Time Slot`s by hand for 本週/下週 — no `Scheduler` yet.
This phase exists to prove the data layer and its invariants (WIP limits,
no silent data loss) are right before any auto-scheduling logic is built on
top of them.

**Exit condition (phase gate):**

- User can create a `Book` (title, chapter count, estimated reading days,
  priority) and a `Course` (title, video count, estimated study days,
  priority); both persist across an app restart (backed by the SQLite file,
  not in-memory state).
- `WIP Limit` is enforced per type: attempting to mark more than the
  configured number of `Book`s (or `Course`s) as `in-progress` at once is
  rejected with a clear message, not a silent no-op.
- User can create a `Routine` (cadence, anchor day(s)/date, time-of-day
  preference) and a `Semester Commitment` of either kind (`Fixed Commitment`
  with a recurring slot, or `Deadline Task` with a due date).
- The Weekly View renders 本週 correctly from real stored data, can navigate
  to 下週/上週, and every `Time Slot` on it can be manually added, edited, or
  removed without corrupting any other `Time Slot` (no cross-slot data
  corruption from a single edit).
- Task gate (`npm run verify`, once established — see `docs/status.md`)
  passes.
- A written manual walkthrough covering every bullet above is executed and
  recorded, and an audit is written in `docs/audits/`.

**Decomposition:** see `PRIORITIES.md` "Current Priorities."

## Authorized Phases (in order)

### Constraint-Based Auto-Scheduler v1

**Goal:** implement the `Scheduler` (see `docs/system-direction.md`'s
Scheduler layer) that takes every `Trackable Item`, `Routine`, `Semester
Commitment`, `Ad-hoc Event`, `Time-of-Day Preference`, and `WIP Limit`, and
produces a full weekly `Schedule` automatically — respecting priority
ordering and deliberately preserving `Slack` rather than packing every
`Time Slot`.

**Exit condition (phase gate):** given a realistic fixture data set (a mix
of books, courses, routines, and semester commitments), the scheduler
produces a weekly `Schedule` where every `Fixed Commitment` and undischarged
`Deadline Task` is honored, no `WIP Limit` is violated, no two non-Slack
items double-book the same `Time Slot`, and a documented minimum share of
each day is left as `Slack`; fixture-based tests plus a written walkthrough
both pass; audit written in `docs/audits/`.

### Elastic Re-Scheduling & Ad-hoc Events

**Goal:** support fast, local repair of an existing `Schedule` when
something changes — a manual override, an item finished early, an
`Ad-hoc Event` injected at the last minute — without a full schedule
rebuild, and while keeping the charter's guardrail that `Ad-hoc Event`s
always outrank flexible `Trackable Item` work.

**Exit condition (phase gate):** a documented set of disruption scenarios
(skip today's reading session, insert a same-day `Ad-hoc Event`, mark a
`Chapter`/`Video` done early) each produce a correctly repaired `Schedule`
when re-run, verified against expected fixture output; the repair operation
has a documented, interactively-fast time budget; the existing Phase-1
manual-edit guarantee (one edit never corrupts another `Time Slot`) still
holds; fixture-based tests plus a written walkthrough both pass; audit
written in `docs/audits/`.

## Proposed — Not Yet Authorized

- **Calendar export/sync** (ICS export, or sync to Google/Apple Calendar).
  Phase-sized; needs a human-written goal and exit condition — not scoped
  during bootstrap since it wasn't part of the interview answers.
- **Notifications/reminders** (e.g. a reminder before a `Routine` or a
  `Deadline Task`'s due date). Phase-sized; not yet authorized.
- **Mobile companion view.** Deferred by the bootstrap platform decision
  (local web app first); would need its own goal and exit condition if
  authorized later.

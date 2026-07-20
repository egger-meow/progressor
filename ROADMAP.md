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

### UI/UX Overhaul & Live Priority Reordering

Authorized by the project owner via `INBOX.md`, 2026-07-20, overriding
Phase 1's earlier "correct, not pretty" styling deferral now that the
data layer, Scheduler, and creation UI all exist and can be tested.

**Goal:** the app should feel like something the user actually wants to
open daily — warm, motivated, highly interactive — not the plain
default-browser-form look it has now, and it should read in Traditional
Chinese (the language of every other project doc) instead of English.
Common flows (add a `Book`, add a `Course`, adjust a `Routine`) should
feel fast and easy, and reordering a `Trackable Item`'s priority should
be a direct drag-and-drop interaction that instantly reschedules the
week — not a numeric field edited blind.

**Exit condition (phase gate):**

1. Every page's UI copy (labels, buttons, headings, error/validation
   messages) — Weekly View, `/items`, `/routines`, `/commitments` — is
   Traditional Chinese.
2. A cohesive warm, high-interactivity visual design (palette,
   typography, spacing, hover/active states) is applied consistently
   across all four pages, replacing the current unstyled/all-black look.
3. The add/edit flows for `Book`, `Course`, and `Routine` are visibly
   streamlined (clear primary action, less visual noise) within the new
   design, without removing any existing validation.
4. `/items` supports drag-and-drop reordering of `Trackable Item`
   `priority`; on drop, the new priority persists via the existing
   service layer and the current week's `Schedule` is **instantly
   regenerated** and reflected in the Weekly View (project owner's
   explicit decision, 2026-07-20 — not deferred to a manual "Generate
   Schedule" click).
5. Re-running schedule generation (via drag-drop or the existing
   "Generate Schedule" button) no longer creates duplicate `Time Slot`s
   for an already-placed `Fixed Commitment`/`Routine` occurrence this
   week — fixed as a prerequisite for #4 to be safely usable at all,
   since instant regeneration would otherwise duplicate on every drag.
6. `npm run verify` passes.
7. A written manual walkthrough, recorded in `docs/audits/`, exercising:
   every page in Traditional Chinese, adding a `Book`/`Course`/`Routine`
   via the streamlined flow, dragging to reorder priority and observing
   the Weekly View update live with no duplicate slots.

## Proposed — Not Yet Authorized

- **Calendar export/sync** (ICS export, or sync to Google/Apple Calendar).
  Phase-sized; needs a human-written goal and exit condition — not scoped
  during bootstrap since it wasn't part of the interview answers.
- **Notifications/reminders** (e.g. a reminder before a `Routine` or a
  `Deadline Task`'s due date). Phase-sized; not yet authorized.
- **Mobile companion view.** Deferred by the bootstrap platform decision
  (local web app first); would need its own goal and exit condition if
  authorized later.

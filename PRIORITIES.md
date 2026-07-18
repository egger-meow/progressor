# Priorities

This file is the active, ordered priority contract for this project. An
agent picks the **first** item under "Current Priorities" as its next unit
of work — not the most interesting one, not the easiest one. Order is a
safety and sequencing decision, not a suggestion.

This file is a priority contract, not a feature wishlist and not a running
log. Once written, an earlier item is always higher priority than a later
item, until a human explicitly reorders them.

Items land under "Current Priorities" two ways: the phase loop decomposes
the active [`ROADMAP.md`](ROADMAP.md) phase into tasks, or a human adds one
directly (often via [`INBOX.md`](INBOX.md)). Either way, being written here
is what authorizes the work.

## What Counts as a Blocker

An item is necessary only if leaving it unfixed could cause one or more of:

1. Loss of already-tracked progress or history (a `Book`/`Course`'s
   `unitsCompleted`, a past `Schedule`) — the charter's data-loss guardrail
   is the highest-authority rule in this project.
2. A `Fixed Commitment` or `Deadline Task` silently missing from the data or
   the Weekly View instead of being surfaced — a false negative here means
   the user misses an exam or a class, which defeats the whole point of the
   system.
3. A `WIP Limit` silently not enforced (more `in-progress` `Book`s/`Course`s
   than configured, with no rejection).
4. A crash, or a manual edit to one `Time Slot` corrupting or deleting a
   different `Time Slot`'s data.
5. (once the `Scheduler` exists, from Phase 2 on) An `Ad-hoc Event` failing
   to take priority over flexible `Trackable Item` work, violating the
   charter's guardrail.

Everything else that's real work but doesn't meet this bar belongs under
"Non-Blocking / Later," not "Current Priorities."

## Priority Rules

1. Add an item only if it is a concrete correctness, safety, or
   user/operator-control blocker per the definition above, or it belongs to
   the decomposition of the active `ROADMAP.md` phase — a phase a human
   already authorized with a written exit condition.
2. Do not add general cleanup, speculative features, refactors, or
   nice-to-have work here — that goes under "Non-Blocking / Later."
3. If a new item is more dangerous/urgent than an existing item, explicitly
   reorder the list instead of appending it casually. Reordering on a real
   danger judgment call is a human decision (see `LOOP_ENGINEERING.md`,
   "When the agent must stop and ask a human") — an agent should flag the
   conflict and propose an order, not silently resequence the file.
4. Keep priority items in strict order from most urgent to least urgent.
5. Remove an item when it is completed **and verified** — see
   `docs/status.md` / `docs/build-status.md` for what "verified" means for
   this project. Do not automatically add a replacement item. Close the gap,
   renumber the remaining items, and only add new work if it independently
   qualifies under the definition above.
6. If an item is neither necessary nor part of the active `ROADMAP.md`
   phase, it goes under "Non-Blocking / Later" (or, if it's phase-sized,
   under `ROADMAP.md` "Proposed — Not Yet Authorized").
7. Treat every checklist here as a shrinking queue. Once a step or
   acceptance gate is verified, remove it instead of appending a progress
   narrative ("done ✓", "in progress", "80% complete"). Do not replace
   removed work with speculative follow-up work just to keep the list full.
8. Keep historical implementation evidence in `CHANGELOG.md`, git commits,
   and `docs/audits/`. This file is not a changelog and is not a status
   report — see `docs/status.md` and `docs/build-status.md` for that.

## Current Priorities

Decomposition of `ROADMAP.md`'s Active Phase, "Core Entity Creation UI"
(authorized by the project owner in chat, 2026-07-18, choosing it over
the three pre-existing "Proposed" phases specifically to unblock manual
testing of the product itself).

1. Add `removeTrackableItem`/`removeRoutine`/`removeFixedCommitment`/
   `removeDeadlineTask` to the relevant `src/server/*.ts` files (mirroring
   `time-slots.ts`'s existing `removeTimeSlot`), each throwing on an
   unknown id rather than silently no-op-ing. Add tests for each,
   including deleting a record that still has a `Time Slot` referencing
   it (must not throw — `occupantLabel`'s existing "(deleted X)" fallback
   is what keeps the Weekly View from corrupting or crashing).
2. Run `npm run verify`, fix failures.
3. Build `/items` (Trackable Items — `Book` and `Course`): list existing
   records, a create form, and per-record edit/delete, mirroring the
   Weekly View's inline-edit-via-`?edit=`-query-param pattern
   (`src/app/page.tsx`). Server Actions in a new `src/app/items/actions.ts`
   call directly into `src/server/trackable-items.ts`.
4. Build `/routines` (`Routine`): same pattern, calling
   `src/server/routines.ts`. The create/edit form must adapt its anchor
   input to the selected cadence (no anchor for `daily`, weekday picker
   for `weekly`, day-of-month picker for `monthly`).
5. Build `/commitments` (`Semester Commitment` — `Fixed Commitment` and
   `Deadline Task`): same pattern, calling
   `src/server/semester-commitments.ts`, kept as two clearly separate
   sections/forms per `docs/domain-model.md`'s "deliberately non-
   interchangeable" framing.
6. Add navigation links between the Weekly View and the three new pages.
7. Run `npm run verify`, fix failures.
8. Manually test full create/edit/delete for all five record kinds in the
   browser via the dev server, including: a `WIP Limit` violation
   surfacing as a visible error (not a crash); an invalid `Routine`
   anchor for its cadence surfacing as a visible error; deleting a record
   that still has a `Time Slot` referencing it and confirming the Weekly
   View still renders that slot (as "(deleted X)") without corrupting or
   crashing.
9. Update `docs/status.md` (Current Behavior, Phase Gate section) and
   `CHANGELOG.md`; commit.
10. Write the Phase completion audit; remove the phase from `ROADMAP.md`;
    update `CHANGELOG.md`; commit.

## Non-Blocking / Later

Items here may be useful, but they must not interrupt "Current Priorities."
Add work here only when it is outside the active `ROADMAP.md` phase and
doesn't meet the blocker definition above.

- Visual polish/styling of the Weekly View beyond function (Phase 1 only
  needs it correct, not pretty).
- Dark mode / theming.

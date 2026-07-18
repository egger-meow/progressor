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

This is the decomposition of `ROADMAP.md`'s Active Phase, "Data Layer &
Manual Weekly View."

1. **Implement `Ad-hoc Event` and `Time Slot` storage.** Done = a `Time
   Slot` can reference any occupant kind from `domain-model.md`; manual
   create/edit/remove of a `Time Slot` works without touching unrelated
   `Time Slot`s (blocker #4).
2. **Build the manual Weekly View.** Done = renders 本週 from real stored
   data, navigates to 上週/下週, and every `Time Slot` on it can be added,
   edited, or removed by hand per `ROADMAP.md`'s exit condition.
3. **Write the Phase 1 walkthrough and close the phase gate.** Done = a
   `docs/audits/` entry recording actual verification of every bullet in
   `ROADMAP.md`'s Active Phase exit condition, per `docs/status.md`'s Phase
   Gate section.

## Non-Blocking / Later

Items here may be useful, but they must not interrupt "Current Priorities."
Add work here only when it is outside the active `ROADMAP.md` phase and
doesn't meet the blocker definition above.

- Visual polish/styling of the Weekly View beyond function (Phase 1 only
  needs it correct, not pretty).
- Dark mode / theming.

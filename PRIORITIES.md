<!-- TEMPLATE: Fill in "What Counts as a Blocker" for this project, then
populate "Current Priorities" with the actual first items. The "Priority
Rules" section below is meant to be adopted as-is — it's the mechanism that
makes this file work as an authorization contract instead of a wishlist.
Change it only if you have a specific reason to; if you do, make sure the
change still satisfies the goal in LOOP_ENGINEERING.md ("What is the agent
authorized to work on next?" must always have an unambiguous answer). Delete
this comment once the file is live. -->

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

<!-- TEMPLATE: Replace this with a concrete, project-specific definition of
"necessary" — the kind of thing that justifies interrupting whatever else is
in progress. Model (from a trading-system project):

  An item is necessary only if leaving it unfixed could cause one or more of:
  1. Uncontrolled [core-action] behavior.
  2. Loss beyond configured limits.
  3. Behavior that differs from operator/user expectation.
  4. Incorrect state after [key lifecycle events].
  5. Missing or stale information that prevents fluent control.
  6. A hidden safety threat that could become dangerous in real operation.

Your definition should name this project's actual failure modes — what does
"dangerous," "uncontrolled," or "silently wrong" mean here? A data pipeline,
a CLI tool, and a trading system have different answers. Write yours below. -->

An item is necessary only if leaving it unfixed could cause one or more of:

1. `TEMPLATE: <failure mode 1>`
2. `TEMPLATE: <failure mode 2>`
3. `TEMPLATE: <failure mode 3>`

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

<!-- TEMPLATE: List the actual first items here, most urgent first, one
short paragraph each: what it is, why it qualifies as a blocker per the
definition above, and (once work starts) what "done" looks like. Delete this
placeholder once real items exist. An empty list here is a valid state — it
means the current phase's queue has drained and the agent should return to
the phase loop (close the phase, or activate the next authorized one from
ROADMAP.md), not invent work. See LOOP_ENGINEERING.md. -->

_(none yet — fill in during project init, or leave empty and let the human
supply the first item)_

## Non-Blocking / Later

Items here may be useful, but they must not interrupt "Current Priorities."
Add work here only when it is outside the active `ROADMAP.md` phase and
doesn't meet the blocker definition above.

<!-- TEMPLATE: seed with known nice-to-haves, or leave empty. -->

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

Decomposition of `ROADMAP.md`'s Active Phase, "Elastic Re-Scheduling &
Ad-hoc Events." Design decided with the project owner on 2026-07-18: a
repair that frees up already-scheduled flexible time (skipping a session,
or a `Trackable Item` finishing early) immediately backfills that time
from the next eligible priority item, reusing the existing WIP-Limit-aware
eligibility logic, rather than always leaving it as `Slack` until the next
full "Generate Schedule" run.

1. Define repair data contracts in `src/scheduler/types.ts`
   (`SchedulerDisruption`, `SchedulerRepairResult`; extend `ConflictReason`
   and `SchedulerConflict.occupantType` to cover an `Ad-hoc Event`
   overlap). Export `selectEligibleItems`/`dailyWindowMs`/`usedMsOnDay`
   from `flexible-placement.ts` so `repair.ts` can reuse them instead of
   duplicating eligibility/Slack-budget logic.
2. Implement the "skip a flexible session" repair in
   `src/scheduler/repair.ts`: remove the named `Trackable Item` `Time
   Slot`, then backfill the freed window from the next eligible item that
   doesn't already have a session this week (per the owner's backfill
   decision above).
3. Implement the "insert a same-day `Ad-hoc Event`" repair: the event's
   `Time Slot` is always added; any overlapping flexible `Trackable Item`
   session is evicted and relocated elsewhere in the week (searching all
   7 days, respecting the `Slack` budget) rather than silently dropped, per
   the charter's guardrail that an `Ad-hoc Event` always outranks flexible
   work; an overlap with a `Fixed Commitment` or `Deadline Task` is flagged
   as a `SchedulerConflict`, not evicted (neither one is "flexible work"
   the charter lets an `Ad-hoc Event` bump).
4. Implement the "mark a `Trackable Item` done early" repair: remove only
   its *future* (`startAt >= now`, an explicit input so the Scheduler stays
   pure) flexible `Time Slot`(s) this week — never a past one, per the
   charter's no-history-loss guardrail — and backfill the freed window the
   same way as item 2.
5. Write a fixture-based end-to-end repair test suite
   (`src/scheduler/repair.test.ts`) covering all three disruption
   scenarios against `ROADMAP.md`'s exit condition, plus a test
   demonstrating the repair operation's time budget (documented reasoning:
   it only touches the disrupted slot(s) plus a bounded per-week search,
   never a full recompute).
6. Run `npm run verify`, fix failures.
7. Wire repair into the real store: `src/server/scheduler-repair.ts`
   (`skipSession`, `insertAdHocEvent`, `completeItemEarly`), applying the
   returned diff via the existing `time-slots.ts`/`trackable-items.ts`/
   `ad-hoc-events.ts` service functions — `src/scheduler/` itself still
   never touches Prisma.
8. Add minimal Weekly View UI: a "Skip" and "Mark done" control on each
   flexible `Trackable Item` `Time Slot`, and a small "Quick Ad-hoc Event"
   insertion form, wired through new Server Actions in `src/app/actions.ts`.
9. Run `npm run verify`, fix failures.
10. Manually test all three disruption scenarios in the browser via the
    dev server; confirm the Phase-1 manual-edit guarantee still holds (a
    repair never touches a `Time Slot` unrelated to the disruption).
11. Update `docs/status.md` (repair section, documented time budget, Phase
    3 Phase Gate subsection); update `CHANGELOG.md`; commit.
12. Write the Phase 3 completion audit; remove the phase from
    `ROADMAP.md`; update `CHANGELOG.md`; commit.

## Non-Blocking / Later

Items here may be useful, but they must not interrupt "Current Priorities."
Add work here only when it is outside the active `ROADMAP.md` phase and
doesn't meet the blocker definition above.

- Visual polish/styling of the Weekly View beyond function (Phase 1 only
  needs it correct, not pretty).
- Dark mode / theming.

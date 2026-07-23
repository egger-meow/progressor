# Priorities

This file is the active, ordered priority contract for linkcheck. An agent
picks the **first** item under "Current Priorities" as its next unit of
work — not the most interesting one, not the easiest one.

The items below are the decomposition of the active `ROADMAP.md` phase
(Validation Hardening); a human can also insert items directly (usually via
`INBOX.md`). Either way, being written here is what authorizes the work.

## What Counts as a Blocker

An item is necessary only if leaving it unfixed could cause one or more of:

1. A real broken link going unreported (a false negative) — this is the
   single most dangerous failure mode per `docs/project-charter.md`'s
   Guardrails, since it defeats the tool's entire purpose silently.
2. Autofix modifying anything other than a link target, or applying a fix
   outside its two verified patterns (see `docs/status.md`).
3. A crash or nonzero-but-silent failure on a valid, well-formed doc tree
   (CI relies on linkcheck's exit code being meaningful).

Everything else that's real work but doesn't meet this bar belongs under
"Non-Blocking / Later."

## Priority Rules

1. Add an item only if it is a concrete correctness, safety, or
   user/operator-control blocker per the definition above, or it belongs to
   the decomposition of the active `ROADMAP.md` phase — a phase a human
   already authorized with a written exit condition.
2. Do not add general cleanup, speculative features, refactors, or
   nice-to-have work here — that goes under "Non-Blocking / Later."
3. If a new item is more dangerous/urgent than an existing item, explicitly
   reorder the list instead of appending it casually.
4. Keep priority items in strict order from most urgent to least urgent.
5. Remove an item when it is completed **and verified**. Do not
   automatically add a replacement item.
6. If an item is neither necessary nor part of the active `ROADMAP.md`
   phase, it goes under "Non-Blocking / Later" (or, if it's phase-sized,
   under `ROADMAP.md` "Proposed — Not Yet Authorized").
7. Treat every checklist here as a shrinking queue — remove steps as they're
   verified instead of narrating progress in place.
8. Keep historical implementation evidence in `CHANGELOG.md`, git commits,
   and `docs/audits/`. This file is not a changelog.

## Current Priorities

1. **Anchor validation doesn't disambiguate duplicate headings** (`#setup-1`,
   `#setup-2`). This is a false-negative risk per the blocker definition: a
   valid link to the second occurrence of a heading is currently flagged as
   broken, and a project could "fix" it into an actually-broken link to
   quiet the false alarm. Done = matches GitHub's disambiguation-suffix
   behavior, with fixture coverage for 2- and 3-way duplicate headings, and
   `npm run verify` green.
2. **External-URL cache doesn't persist across runs.** Not itself a
   correctness blocker, but the nightly `--check-external` job has started
   timing out before completing a full scan of a growing doc tree, which
   risks silently truncating the run (a partial scan reported as if it were
   complete is a false-negative risk). Done = cache persisted to
   `.linkcheck-cache.json`, keyed by URL + timestamp, with a documented TTL,
   and a fixture test proving a truncated run fails loudly rather than
   reporting partial results as final.

## Non-Blocking / Later

- HTML `<a href>` parsing inside Markdown files.
- `--watch` mode for local editing.

Phase-sized work lives in `ROADMAP.md` instead: the Autofix fixture-replay
harness is the next authorized phase there, and the VS Code extension sits
under "Proposed — Not Yet Authorized."

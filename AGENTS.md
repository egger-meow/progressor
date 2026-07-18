<!-- TEMPLATE: This is the generic agent-conventions entry point (read by
agent tools that look for AGENTS.md rather than CLAUDE.md). Keep this and
CLAUDE.md in sync in substance — CLAUDE.md is the short orientation +
pointer, this is the fuller conventions doc. If you're only using one agent
tool, it's fine for the other file to just say "see AGENTS.md" / "see
CLAUDE.md". Delete this comment once filled in. -->

# Repository Guidelines

## Project Structure & Module Organization

<!-- TEMPLATE: Where does code live, by responsibility, not just by folder
name. Model: "X/ for <responsibility>, Y/ for <responsibility>." Keep this
current — a stale structure section is worse than none, because an agent
will trust it. -->

## Build, Test, and Development Commands

<!-- TEMPLATE: The actual commands, with one line each on what they do.
Prefer copy-pasteable commands over prose. -->

## Coding Style & Naming Conventions

<!-- TEMPLATE: Indentation, naming conventions, formatting/lint tooling,
anything a linter doesn't already enforce automatically (things a linter
enforces don't need to be written here — that's what the linter is for). -->

## Testing Guidelines

<!-- TEMPLATE: Test framework, naming convention for test files, what needs
a test and what doesn't, how to run a single test. -->

## Commit & Pull Request Guidelines

<!-- TEMPLATE: Commit message convention (if any), what a PR description
must include, whether screenshots are required for UI changes. -->

## Security & Configuration Tips

<!-- TEMPLATE: Where secrets/config live, what must never be committed, what
data is sensitive enough to require extra care when touched. -->

## Agent Operating Notes

**Not initialized yet?** If this repo's files still carry `TEMPLATE:`
markers (`./scripts/check-templates.sh` lists them), don't improvise and
don't try to loop — follow the agent procedure in
[`BOOTSTRAP.md`](BOOTSTRAP.md), treating anything the human has already
said about their project in chat as the intake. If a bootstrap was
already underway, use that file's "Locating yourself" table. The notes
below apply once init is complete.

Before changing behavior, read [`INBOX.md`](INBOX.md) (process pending human
input per its protocol first), [`PRIORITIES.md`](PRIORITIES.md),
[`ROADMAP.md`](ROADMAP.md),
[`docs/project-charter.md`](docs/project-charter.md),
[`docs/domain-model.md`](docs/domain-model.md),
[`docs/system-direction.md`](docs/system-direction.md),
[`docs/status.md`](docs/status.md), and
[`docs/build-status.md`](docs/build-status.md).
<!-- TEMPLATE: add any subsystem-specific docs an agent must read before
touching that subsystem, e.g. "also read docs/api-spec.md for API work." -->

Do **not** add `CHANGELOG.md`, `docs/audits/`, or `FRAMEWORK_FEEDBACK.md`
to that routine read. They're append-only history — open one only for a
specific reason (adding an entry, preparing a release, checking a specific
past claim), and read narrowly even then (the relevant audit via its
index, not the whole folder). See `LOOP_ENGINEERING.md`, "Reading
discipline." `FRAMEWORK_FEEDBACK.md` is write-only during loops: when the
framework itself misleads you or wastes tokens, append a short entry per
that file's header and move on — nothing in it licenses work.

Keep [`PRIORITIES.md`](PRIORITIES.md) current per its own internal rules.
When you complete or deprioritize an item, follow that file's removal rule
instead of leaving it struck through or annotated in place. The same
shrinking-queue rule applies to completed phases in [`ROADMAP.md`](ROADMAP.md)
— close them per the phase-loop procedure in `LOOP_ENGINEERING.md` (phase
gate, then audit, then removal), never by annotation.

Check [`INBOX.md`](INBOX.md) at every loop boundary. Translate each item
into its canonical home and delete it **in the same commit** — the diff is
the human's receipt. Never truncate the whole file; delete only what you
processed.

<!-- TEMPLATE: Add any project-specific standing rule here, in the same
spirit as this example from a prior project:
"When the new implementation of X fully covers the legacy path, remove the
superseded code, config, tests, docs, and references outright — do not keep
parallel implementations as permanent compatibility fallbacks." -->

For subsystems with their own gotchas (a breaking-change dependency version,
an unusual local convention), add a nested `AGENTS.md` in that subdirectory
rather than growing this file indefinitely. Reference it from here.

Full procedure for how priority, current-state, and direction docs relate to
each other, and when to stop and ask a human instead of proceeding: see
[`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md).

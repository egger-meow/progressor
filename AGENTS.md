# Repository Guidelines

## Project Structure & Module Organization

No code exists yet. Once the Phase 1 scaffold lands (see `ROADMAP.md`'s
Active Phase), it must follow `docs/system-direction.md`'s layering:
`src/server/` for the Domain/Service layer (all Prisma access), `src/
scheduler/` for the Scheduler layer (Phase 2+, pure functions only), `src/
app/` for the Next.js UI layer, `prisma/` for the schema and migrations.
Update this section for real once the scaffold exists — a stale structure
section is worse than none, because an agent will trust it.

## Build, Test, and Development Commands

Not established yet — see `docs/status.md`'s Task Gate section, which is
the source of truth until this section is filled in for real.

## Coding Style & Naming Conventions

TypeScript, standard 2-space indentation. Domain identifiers must match
`docs/domain-model.md` exactly (e.g. `unitsCompleted`, not a synonym) —
that doc is the canonical vocabulary, not a suggestion. Formatting/lint
tooling choice (ESLint config, Prettier or not) is decided when the scaffold
lands; update this section then instead of leaving it silent.

## Testing Guidelines

Vitest, per `docs/system-direction.md`. Test file naming convention and
what requires a test vs. what doesn't will be decided alongside the scaffold
in Phase 1's first `PRIORITIES.md` item — update this section then.

## Commit & Pull Request Guidelines

Single-user local project with no PR workflow today — commit directly to
`main` with descriptive messages. Revisit this section if that changes
(e.g. if the project ever grows a remote/collaborator).

## Security & Configuration Tips

No secrets exist yet — the only persisted data is the local SQLite file
(single user, local machine, no auth). If a future phase adds an external
integration (e.g. calendar sync — currently only Proposed, not authorized
in `ROADMAP.md`) with credentials, this section must be updated before that
phase starts.

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

Once a new implementation fully covers a legacy path's behavior (e.g. the
`Scheduler` superseding manual-only placement once Phase 2 lands), remove
the superseded code, config, tests, docs, and references outright — this is
a single-user local tool with no external consumer depending on an old path
staying available (see `docs/system-direction.md`, "Retiring Legacy Paths").

For subsystems with their own gotchas (a breaking-change dependency version,
an unusual local convention), add a nested `AGENTS.md` in that subdirectory
rather than growing this file indefinitely. Reference it from here.

Full procedure for how priority, current-state, and direction docs relate to
each other, and when to stop and ask a human instead of proceeding: see
[`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md).

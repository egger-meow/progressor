# Repository Guidelines

## Project Structure & Module Organization

Follows `docs/system-direction.md`'s layering: `src/server/` is the
Domain/Service layer (the only place that may import `@prisma/client` —
`src/server/db.ts` holds the cached Prisma client singleton); `src/
scheduler/` will be the Scheduler layer (Phase 2+, pure functions only, no
Prisma access — doesn't exist yet, nothing to build there in Phase 1); `src/
app/` is the Next.js App Router UI layer, which must call into `src/server/`
rather than querying Prisma directly; `prisma/schema.prisma` holds the
schema (SQLite datasource, no models yet).

## Build, Test, and Development Commands

```bash
npm install
npm run dev         # Next.js dev server
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run build        # next build
npm run verify        # all four of the above, bundled — the task gate
```

`DATABASE_URL` must be set (see `.env.example`); copy it to `.env` (gitignored)
before running anything that touches Prisma.

## Coding Style & Naming Conventions

TypeScript, standard 2-space indentation, enforced via `eslint.config.mjs`
(Next.js's default flat config, no Prettier). Domain identifiers must match
`docs/domain-model.md` exactly (e.g. `unitsCompleted`, not a synonym) —
that doc is the canonical vocabulary, not a suggestion.

## Testing Guidelines

Vitest, per `docs/system-direction.md`. Tests are colocated with the code
they cover as `<name>.test.ts` (e.g. `src/server/db.test.ts`), not in a
separate `__tests__/` tree. Every Domain/Service-layer function that
enforces an invariant from `docs/domain-model.md` (a `WIP Limit`, a
`Fixed Commitment`/`Deadline Task` validation difference, etc.) needs a
test — see `PRIORITIES.md`'s "What Counts as a Blocker" for which
invariants are non-negotiable. Pure UI rendering doesn't need one in
Phase 1.

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
markers (`.loop-engine/scripts/check-templates.sh` lists them), don't
improvise and don't try to loop — follow the agent procedure in
[`BOOTSTRAP.md`](.loop-engine/BOOTSTRAP.md), treating anything the human has already
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

Do **not** add `CHANGELOG.md`, `docs/audits/`, or
`.loop-engine/FRAMEWORK_FEEDBACK.md` to that routine read. They're
append-only history — open one only for a specific reason (adding an
entry, preparing a release, checking a specific past claim), and read
narrowly even then (the relevant audit via its index, not the whole folder). See
`.loop-engine/LOOP_ENGINEERING.md`, "Reading discipline."
`.loop-engine/FRAMEWORK_FEEDBACK.md` is write-only during loops: when the
framework itself misleads you or wastes tokens, append a short entry per
that file's header and move on — nothing in it licenses work.

Keep [`PRIORITIES.md`](PRIORITIES.md) current per its own internal rules.
When you complete or deprioritize an item, follow that file's removal rule
instead of leaving it struck through or annotated in place. The same
shrinking-queue rule applies to completed phases in [`ROADMAP.md`](ROADMAP.md)
— close them per the phase-loop procedure in `.loop-engine/LOOP_ENGINEERING.md`
(phase gate, then audit, then removal), never by annotation.

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
[`LOOP_ENGINEERING.md`](.loop-engine/LOOP_ENGINEERING.md).

# Repository Guidelines

## Project Structure & Module Organization

`src/discovery/` parses source files into `Link[]` (currently only
`markdown.ts`). `src/validation/` resolves `Link[]` against filesystem,
headings, and (opt-in) network, producing `ValidatedLink[]`. `src/reporting/`
renders a `ScanReport` to terminal or JSON. `src/autofix/` consumes
`ValidatedLink[]` + `ScanReport` and performs the two verified fix patterns.
`src/cli.ts` wires flags to the pipeline. Tests live in `test/`, mirroring
`src/`'s structure; fixture doc trees live in `test/fixtures/`.

## Build, Test, and Development Commands

```bash
npm install
npm run build       # tsc -> dist/
npm test            # vitest run
npm run lint         # eslint src test
npm run typecheck    # tsc --noEmit
npm run verify       # lint + typecheck + test + build, in order
```

## Coding Style & Naming Conventions

TypeScript, strict mode. 2-space indent. Files `kebab-case.ts`, types/
interfaces `PascalCase`, functions/variables `camelCase`. Domain types
(`Link`, `Target`, `BrokenLink`, `AutofixCandidate`, `ScanReport`) live in
`src/types.ts` and must match the field names in `docs/domain-model.md`
exactly — do not introduce local synonyms.

## Testing Guidelines

Vitest, `test/**/*.test.ts`. Every Validation reason (`file-not-found`,
`anchor-not-found`, `external-4xx`, `external-5xx`, `external-timeout`,
`ambiguous`) needs at least one fixture-backed test. Autofix changes
currently also require a manual diff review against `test/fixtures/` per
`docs/status.md` — there's no automated fixture-replay harness yet (it's the
next authorized `ROADMAP.md` phase).

## Commit & Pull Request Guidelines

Conventional Commits (`feat:`, `fix:`, `docs:`). PRs touching Autofix must
include the manual diff review output in the description until the
fixture-replay harness lands.

## Security & Configuration Tips

`--check-external` makes real HTTP requests to URLs found in the scanned
docs — never run it against untrusted doc trees without reviewing the links
first, since it will leak the requesting IP/timing to whatever hosts those
links point at.

## Agent Operating Notes

**Not initialized yet?** If this repo's files still carry `TEMPLATE:`
markers (`./scripts/check-templates.sh` lists them), don't improvise and
don't try to loop — follow the agent procedure in `../../BOOTSTRAP.md`.
(Inert here: linkcheck finished init long ago; the paragraph stays as
part of the standard entry-point shape.)

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
index, not the whole folder). See `../../LOOP_ENGINEERING.md`, "Reading
discipline." `FRAMEWORK_FEEDBACK.md` is write-only during loops: when the
framework itself misleads you or wastes tokens, append a short entry per
that file's header and move on — nothing in it licenses work.

Keep [`PRIORITIES.md`](PRIORITIES.md) current per its own internal rules.
When you complete or deprioritize an item, follow that file's removal rule
instead of leaving it struck through or annotated in place. The same
shrinking-queue rule applies to completed phases in [`ROADMAP.md`](ROADMAP.md)
— close them per the phase-loop procedure (phase gate, then audit, then
removal), never by annotation.

Check [`INBOX.md`](INBOX.md) at every loop boundary. Translate each item
into its canonical home and delete it **in the same commit** — the diff is
the human's receipt. Never truncate the whole file; delete only what you
processed.

Do not add a new Autofix fix pattern without its own authorized
[`ROADMAP.md`](ROADMAP.md) phase (see `docs/build-status.md`'s Blocked row
and `docs/project-charter.md`'s Guardrails) — Autofix expansion is
deliberately gated higher than normal feature work because a wrong autofix
silently corrupts a user's docs.

Full procedure for how priority, current-state, and direction docs relate to
each other, and when to stop and ask a human instead of proceeding: see
`../../LOOP_ENGINEERING.md`.

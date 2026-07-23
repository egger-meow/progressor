# CLAUDE.md

This file provides guidance to Claude Code (or any agent reading this
repo's conventions) when working with code in this repository.

## What this is

linkcheck is a CLI that finds broken links (relative paths, heading anchors,
optionally external URLs) across a tree of Markdown files, and can
autofix a narrow, high-confidence subset of breaks. It is a linter first —
catching every real break matters more than fixing some of them
automatically. See `docs/project-charter.md` for the full mission and
guardrails.

## Before you change anything

**Not initialized yet?** If the files below still carry `TEMPLATE:`
markers (`./scripts/check-templates.sh` lists them), there is nothing to
loop on — follow the agent procedure in `../../BOOTSTRAP.md` instead.
(Inert here: linkcheck finished init long ago; the paragraph stays as
part of the standard entry-point shape.)

Read, in this order, if you haven't already this session:

1. [`INBOX.md`](INBOX.md) — pending human input; process it per that file's
   protocol before taking new work.
2. [`PRIORITIES.md`](PRIORITIES.md) — the task you're authorized to work on
   next.
3. [`ROADMAP.md`](ROADMAP.md) — which phase that task belongs to, and what
   phase comes next when the queue drains.
4. [`docs/project-charter.md`](docs/project-charter.md) — mission, safety
   principles, and the documentation contract.
5. [`docs/domain-model.md`](docs/domain-model.md) — shared names; don't
   invent new vocabulary for concepts that already have one.
6. [`docs/status.md`](docs/status.md) and
   [`docs/build-status.md`](docs/build-status.md) — what currently exists.

Do **not** add `CHANGELOG.md`, `docs/audits/`, or `FRAMEWORK_FEEDBACK.md`
to this routine orientation read. They're append-only history — read on
demand only (a specific audit via its index, the `[Unreleased]` section
when adding an entry), never as a blanket read for context. See
`../../LOOP_ENGINEERING.md`, "Reading discipline."
`FRAMEWORK_FEEDBACK.md` is write-only during loops: when the framework
itself misleads you or wastes tokens, append a short entry per that file's
header and move on — nothing in it licenses work.

Full procedure (the two loops, the inbox protocol, both verification gates):
`../../LOOP_ENGINEERING.md`.

## Commands

```bash
npm install
npm run build            # compiles src/ -> dist/
npx linkcheck <dir>      # run the CLI against a doc tree
npx linkcheck <dir> --fix
npx linkcheck <dir> --check-external
npx linkcheck <dir> --format json

npm run lint
npm run typecheck
npm test                 # vitest
npm run verify           # lint + typecheck + test + build, in order — the gate
```

## Architecture

Four-stage pipeline: Discovery → Validation → {Reporting, Autofix}. Only
Validation touches the filesystem or network; Discovery only parses.
Reporting and Autofix both consume Validation's output independently — see
`docs/system-direction.md` for the full boundary rules and
`docs/domain-model.md` for the shared types (`Link`, `Target`, `Broken
Link`, `Autofix Candidate`, `Scan Report`) that cross those boundaries.

## Key references

- [`AGENTS.md`](AGENTS.md) — repo conventions (structure, style, testing,
  commit conventions).
- [`PRIORITIES.md`](PRIORITIES.md) — the active, ordered priority contract.
- [`ROADMAP.md`](ROADMAP.md) — the pre-authorized phase queue. The agent
  activates and removes phases; only a human adds or reorders them.
- [`INBOX.md`](INBOX.md) — the human checkpoint. Check at every loop
  boundary; translate-then-clear in the same commit.
- [`docs/README.md`](docs/README.md) — index of all canonical docs.
- [`docs/status.md`](docs/status.md) — source of truth for current behavior.

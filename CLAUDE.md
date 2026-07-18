<!-- TEMPLATE: This is the entry point Claude Code reads automatically in this
repo. Keep it short — it should orient an agent in under a minute and then
point at the canonical docs, not duplicate their content. Mirror any
structural change here into AGENTS.md; the two files should never disagree.
Delete this comment block once filled in. -->

# CLAUDE.md

This file provides guidance to Claude Code (or any agent reading this
repo's conventions) when working with code in this repository.

## What this is

<!-- TEMPLATE: 2-4 sentences. What does this project do, for whom, and what
is it explicitly NOT (e.g. "an operator-assist tool, not an autonomous
bot")? Copy the opening framing from docs/project-charter.md once that's
written — this section should be a compressed pointer to it, not a fork of
it. -->

## Before you change anything

**Not initialized yet?** If the files below still carry `TEMPLATE:`
markers (`./scripts/check-templates.sh` lists them), there is nothing to
loop on — this project hasn't been through init. Don't improvise: follow
the agent procedure in [`BOOTSTRAP.md`](BOOTSTRAP.md); if the human has
already described their project in chat, that's your intake — start from
it. If a bootstrap was already underway, use that file's "Locating
yourself" table. Everything below applies once init is complete.

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
`LOOP_ENGINEERING.md`, "Reading discipline." `FRAMEWORK_FEEDBACK.md` is
write-only during loops: when the framework itself misleads you or wastes
tokens, append a short entry per that file's header and move on — nothing
in it licenses work.

Full procedure (the two loops, the inbox protocol, both verification gates):
[`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md).

## Commands

<!-- TEMPLATE: fill in the actual install/run/test/lint/build commands for
this project, e.g.:

```bash
<install command>
<run command>
<test command>
<lint/typecheck command>
```

If there's a single bundled task-gate command (recommended — see
docs/status.md), call it out explicitly here as the thing to run before
calling any change done. -->

## Architecture

<!-- TEMPLATE: Short orientation to the codebase layout and the handful of
non-obvious invariants a change is likely to break — the things a new
contributor (human or agent) would get wrong without being told. Link to
docs/system-direction.md and docs/domain-model.md for anything longer than a
paragraph; don't duplicate them here. Delete this section if
docs/system-direction.md already covers it well enough that a pointer is
sufficient. -->

## Key references

- [`AGENTS.md`](AGENTS.md) — repo conventions (structure, style, testing,
  commit conventions).
- [`PRIORITIES.md`](PRIORITIES.md) — the active, ordered priority contract.
  Treat it as authorization, not a backlog to reorder at will.
- [`ROADMAP.md`](ROADMAP.md) — the pre-authorized phase queue. The agent
  activates and removes phases; only a human adds or reorders them.
- [`INBOX.md`](INBOX.md) — the human checkpoint. Check at every loop
  boundary; translate-then-clear in the same commit.
- [`docs/README.md`](docs/README.md) — index of all canonical docs.
- [`docs/status.md`](docs/status.md) — source of truth for current behavior.

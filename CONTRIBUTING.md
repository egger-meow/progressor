# Contributing to loop-engine

This file is about improving the **scaffold itself** — the templates,
`LOOP_ENGINEERING.md`, `INIT_CHECKLIST.md`, and the scripts in `scripts/`.
If you're using loop-engine inside your own project and want guidance on
filling in *your* templates, see [`INIT_CHECKLIST.md`](INIT_CHECKLIST.md)
instead — this file has nothing to say about that.

## What belongs here vs. in a project that adopts this scaffold

- Structural changes (adding/removing/renaming a canonical doc, changing what
  `PRIORITIES.md`'s rules require) belong here, because they change what
  every adopting project's copy looks like.
- Content changes (filling in a charter, writing real priorities) never
  belong here — this repo's own template files should stay templates. If
  you find yourself writing real project content into one of these files,
  you're editing the wrong copy.

## Before proposing a structural change

Loop engineering's whole premise is that direction, current state, priority,
and history each get exactly one canonical home (see
[`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md), "The core insight"). Before
adding a new file or section, check:

1. Does this fact already have a home in one of the four categories? If so,
   extend that doc instead of adding a new one.
2. If it's genuinely new, which of the four categories does it belong to,
   and does it change how often that category updates? A doc that updates
   at a different cadence than its category usually means it's misplaced.
3. Will an adopting project actually keep this current, or is it the kind of
   doc that gets written once and rots? `LOOP_ENGINEERING.md` is explicit
   that a stale doc an agent trusts is worse than no doc — don't add
   structure that's likely to become that.

## Making a change

1. Update the template file(s) under repo root and/or `docs/`.
2. If the change affects the fill-in order or adds a new required step,
   update [`INIT_CHECKLIST.md`](INIT_CHECKLIST.md) to match.
3. If the change affects the worked example's shape, update
   [`examples/linkcheck/`](examples/linkcheck/) so it stays a faithful,
   fully-filled-in instance of the current templates — a drifted example is
   actively misleading.
4. If the change affects `README.md`, mirror it in `README.zh-TW.md` — the
   two are translations of each other and must make the same claims. The
   same applies to the other four files with a `.zh-TW.md` sibling —
   `LOOP_ENGINEERING.md`, `INIT_CHECKLIST.md`, `BOOTSTRAP.md`, and
   `examples/README.md` (this
   file, `CONTRIBUTING.md`, is itself one of the five). Everything else
   deliberately does **not** get a `.zh-TW.md` sibling — see README.md's FAQ
   "Why do only some files have a Traditional Chinese version?" for why
   (functionally load-bearing filenames + mutable live content don't mix
   with permanent bilingual twins).
5. Run the template-completeness check against `examples/linkcheck/` (it
   should report clean — that directory has no unfilled `TEMPLATE:`
   markers by design) and against the root scaffold (it should report
   everything still templated, since the root scaffold is meant to stay
   unfilled):
   ```bash
   ./scripts/check-templates.sh examples/linkcheck
   ```
6. Update `CHANGELOG.md` under `[Unreleased]`.

## Style

- Keep `TEMPLATE:` guidance comments actionable: say what to write and,
  where useful, give a model/shape to adapt — not just "fill this in."
- Prefer linking between docs over duplicating content across them; a fact
  stated in two places will eventually disagree with itself.
- Keep the scaffold stack-agnostic. If a change only makes sense for one
  language or framework, it belongs in a project's own filled-in docs, not
  in this repo's templates.

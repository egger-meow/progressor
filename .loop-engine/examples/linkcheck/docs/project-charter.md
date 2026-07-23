# Project Charter

## Mission

linkcheck finds broken links in a tree of Markdown documentation — relative
file paths that no longer resolve, heading anchors that no longer exist, and
(optionally) external URLs that 404 — before a reader does. It is a CI-friendly
linter first and an autofixer second: catching every real break matters more
than fixing some of them automatically. It is explicitly not a general-purpose
doc generator, link shortener, or content migrator.

## Core Areas

### Link Discovery

Parses every `.md`/`.mdx` file in the scan root and extracts every Markdown
link and reference-style link, recording its source file, line, and raw
target text.

### Link Validation

Resolves each discovered link against the filesystem (relative paths),
the target file's heading slugs (anchors), and, when `--check-external` is
passed, a live HTTP request (external URLs, rate-limited and cached). A link
is "broken" only if resolution fails with high confidence — see Guardrails.

### Reporting

Produces a human-readable terminal report and a machine-readable JSON report
(`--format json`), grouped by source file, each entry carrying enough
context (line, target, resolution attempt, suggested fix if any) to act on
without re-running the tool.

### Autofix

For a narrow set of break categories where the correct fix is unambiguous
(case-mismatched relative paths on case-insensitive-authored links; moved
files tracked in an explicit `.linkcheck-redirects.json` manifest), rewrites
the link target in place. Everything else is reported, never guessed at.

## Guardrails

- **A false negative (reporting a broken link as fine) is worse than a false
  positive.** When validation confidence is ambiguous, report it as broken
  with a confidence note rather than silently passing it.
- **Autofix only ever rewrites link target text, never surrounding prose or
  file structure**, and only for the specific break categories it's built
  and verified for (see `docs/status.md`) — it never "guesses" a plausible
  fix for a category it wasn't designed to handle.
- **`--fix` refuses to run against a dirty git working tree** unless
  `--force` is passed, so every autofix is trivially diffable and revertable.
- **linkcheck never makes an external network request unless
  `--check-external` is explicitly passed** — default runs are fully
  offline and deterministic.

## Documentation Contract

Use these docs as the source of truth. Update the canonical doc when
direction or behavior changes — do not rely on chat history or an agent's
memory of a past session as the record of what was decided.

- [`project-charter.md`](project-charter.md) (this file): mission, core
  areas, guardrails.
- [`domain-model.md`](domain-model.md): concept names and relationships.
- [`system-direction.md`](system-direction.md): architecture direction and
  refactor priorities.
- [`status.md`](status.md): current behavior and system-specific notes.
- [`build-status.md`](build-status.md): coarse build status and verification
  evidence.
- [`../ROADMAP.md`](../ROADMAP.md): the pre-authorized phase queue.
- [`../PRIORITIES.md`](../PRIORITIES.md): active engineering priorities.
- [`../INBOX.md`](../INBOX.md): pending human input (transient — items are
  translated into the docs above, then cleared).

If a decision isn't answered by any doc listed here, that's a signal to stop
and ask a human rather than infer — see `../../../LOOP_ENGINEERING.md`.

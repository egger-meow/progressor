<!-- TEMPLATE: This is the coarse, whole-project map (a table an agent or
human can scan in seconds) plus a dated, append-only evidence log. The
evidence log is what makes "done" trustworthy instead of asserted — every
claim of completion for anything nontrivial should have a matching dated
entry describing how it was actually verified. Delete this comment once the
legend and first table rows are filled in; keep the structure. -->

# Build Status

This file tracks build status at a coarse, whole-project level. Update it
when a capability moves from planned to partial or complete — not for every
commit. For fine-grained current behavior, see `status.md`.

## Status Legend

- **Built**: implemented and usable as-is.
- **Partial**: implemented enough to inspect or prototype, but not complete.
- **Planned**: direction is documented but implementation is missing.
- **Blocked**: intentionally held until a prerequisite (safety, architecture,
  external dependency) exists.

## Current Status

<!-- TEMPLATE: One row per major area from project-charter.md /
domain-model.md. Keep Notes specific — "Built" with no notes tells an agent
nothing about edge cases; that's what status.md is for, but a one-line
pointer here to what's NOT covered yet is valuable. -->

| Area | Status | Notes |
| --- | --- | --- |
| `TEMPLATE: <area>` | `TEMPLATE: Built/Partial/Planned/Blocked` | `TEMPLATE: notes` |

## Next Build Milestones

<!-- TEMPLATE: A short, current statement of what the next meaningful chunk
of work is at a product level — not a duplicate of PRIORITIES.md's item
list, but the "why" that ties those items together. -->

## Verification Evidence

Append-only. Every entry is a dated, specific record of how something was
actually verified — not "looks good," but what was run, what the result was,
and what (if anything) is still unverified as a result. Never edit or delete
a past entry; if something it describes later turns out to be wrong, add a
new entry correcting it and say so explicitly.

<!-- TEMPLATE: seed format, e.g.:
- 2026-01-01: <what was tested>, <how>, <result>. <what remains unverified,
  if anything>. -->

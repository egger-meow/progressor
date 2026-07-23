# Autofix Phase 1 — Completion Audit

**Phase authorized:** 2026-02-18, `ROADMAP.md` (authorized by the project
owner after three consecutive weekly doc-health reports showed the same two
break categories accounting for 80%+ of reported breaks; removed from the
roadmap on completion — see git history for the original entry).
**Audit written:** 2026-03-02
**Status:** Complete

## Original Acceptance Gates

1. Autofix correctly rewrites case-mismatched relative link targets, and
   only when the correctly-cased file actually exists at that location.
2. Autofix correctly rewrites links whose old path is listed in
   `.linkcheck-redirects.json`, using the manifest's mapped new path.
3. Autofix never modifies anything other than the link target text — no
   reformatting, no touching unrelated lines.
4. `--fix` refuses to run against a dirty git working tree unless `--force`.
5. Every Broken Link outside these two categories is still reported, not
   silently skipped or guessed at.
6. `npm run verify` passes.

## Evidence, Gate by Gate

### Gate 1: case-mismatch fix

`test/fixtures/broken-tree` contains 4 case-mismatch links against real
files with different casing. Manual `--fix` run + hand diff (see
`build-status.md`, 2026-03-02 entry): all 4 corrected, 0 false corrections
against the 2 fixture links that look like case mismatches but point at
files that don't exist under any casing (correctly left unfixed).

### Gate 2: redirect-manifest fix

Same fixture tree includes a `.linkcheck-redirects.json` with 2 entries.
Both corresponding links were rewritten to the mapped paths; a third link
pointing at an old path *not* in the manifest was correctly left unfixed
and reported as a plain broken link.

### Gate 3: no unrelated content changes

`git diff` on the fixture tree after `--fix`, reviewed by hand, touched only
the 6 link target strings across 6 lines — no whitespace, formatting, or
surrounding-prose changes anywhere in the diff.

### Gate 4: dirty-tree refusal

Ran `--fix` against the fixture tree with an uncommitted unrelated change
present; linkcheck exited nonzero with `E_DIRTY_TREE` and made no writes.
`--force` then ran and applied fixes as expected.

### Gate 5: everything else still reported

Of 17 total broken links in the fixture tree, 6 were autofixed (gates 1-2)
and the remaining 11 (anchor breaks, external 404s, unmapped moved files)
were all present in the report with `autofixable: false` and no file writes
attempted for any of them.

### Gate 6: verification gate

`npm run verify` passed on commit `a1b2c3d` (lint, typecheck, unit tests,
build all green).

## Exceptions / Deviations

None. All six gates were met as originally written with no scope changes
during implementation.

## Follow-Up

- No automated fixture-replay test exists yet for Autofix — this phase's
  evidence is manual-diff-based (see gates above), which doesn't scale as a
  regression guard for future changes. Tracked as the next authorized
  `ROADMAP.md` phase
  (not a blocker on this phase, since it doesn't affect correctness of what
  shipped — see `docs/status.md` Known Limits).
- General "guess the intended file" autofix was considered and explicitly
  rejected during phase scoping — see `docs/project-charter.md` Guardrails
  and `docs/build-status.md`'s Blocked row for that capability. Not a gap;
  an intentional non-goal.
- `FRAMEWORK_FEEDBACK.md` gained one entry during this phase (audit
  evidence granularity); flagged to the human at phase close and since
  harvested upstream — see that file's receipt line.

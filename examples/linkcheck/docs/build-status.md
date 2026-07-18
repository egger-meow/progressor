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

| Area | Status | Notes |
| --- | --- | --- |
| Discovery (Markdown) | Built | Inline + reference-style links; excludes fenced code blocks. HTML `<a href>` parsing not started. |
| Validation — relative paths | Built | Case-sensitivity enforced regardless of host filesystem. |
| Validation — anchors | Partial | No duplicate-heading disambiguation; see `status.md` Known Limits. |
| Validation — external | Partial | Opt-in, rate-limited, no cross-run cache. |
| Reporting | Built | Terminal + JSON, CI-safe exit codes. |
| Autofix — case mismatch | Built | Diff-reviewed on every change since Autofix Phase 1 (see `audits/autofix-phase-1-audit.md`). |
| Autofix — redirect manifest | Built | Same phase; see audit. |
| Autofix — general "guess the intended file" | Blocked | Explicitly out of scope per `project-charter.md` Guardrails; will not be built. |

## Next Build Milestones

Autofix Phase 1 (case-mismatch + redirect-manifest fixes) is complete and
audited. No further Autofix expansion is currently authorized — the false-
negative-is-worse-than-false-positive guardrail means new fix patterns need
their own explicitly authorized `../ROADMAP.md` phase with a written exit
condition, not incremental addition. The active phase is Validation
Hardening (anchor disambiguation, external-check caching); the Autofix
regression harness is the next authorized phase — see `../ROADMAP.md`.

## Verification Evidence

- 2026-03-02: `npm run verify` passed on commit `a1b2c3d`. Manually ran
  `linkcheck test/fixtures/broken-tree --fix` against a scratch git worktree
  and diffed the result by hand: 4 case-mismatch fixes and 2
  redirect-manifest fixes applied, all correct; 11 other breaks correctly
  left unfixed and reported. No unintended content changes in any touched
  file.
- 2026-03-04: external-URL check run manually against `docs/` (47 links,
  `--check-external`): 2 real 404s found (both since fixed upstream), 0
  false positives, 1 timeout on a since-confirmed-flaky host — reported, not
  silently dropped, matching the guardrail.

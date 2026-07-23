# Status

Source of truth for current, actually-implemented behavior. If this doc and
the running code disagree, the code wins and this doc is out of date — fix
the doc as part of whatever change you're making, don't leave the drift for
later.

## Verification Gates

### Task Gate

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Bundled as `npm run verify`, which runs all four in order and stops at the
first failure — this runs on every task-loop iteration. Nothing is "done"
until `npm run verify` passes and, for Autofix changes specifically, a
manual run against `test/fixtures/` has been diffed by hand (see Known
Limits — Autofix has no fixture-replay test yet).

### Phase Gate

Runs only when a `ROADMAP.md` phase closes; results are recorded as evidence
in the phase audit (`audits/`):

1. `npm run verify` green on a fresh clone (not just the working tree).
2. Full autofix walkthrough: `linkcheck test/fixtures/broken-tree --fix` in
   a scratch git worktree, hand-diffed — every applied fix correct, every
   unfixable break reported, zero unintended content changes.
3. `--check-external` run against the real `docs/` tree completing without
   timeout truncation, with any timeout reported rather than dropped.
4. Exit-code spot check: nonzero exit with remaining breaks, zero exit on a
   clean tree (CI-safety).

## Current Behavior

**Discovery**: parses `.md` and `.mdx`, both inline (`[text](target)`) and
reference-style (`[text][ref]` + `[ref]: target`) links. Does not parse
links inside fenced code blocks (intentional — those are examples, not
navigable links) or HTML `<a href>` tags embedded in Markdown (not yet
built, see `../PRIORITIES.md` Non-Blocking / Later).

**Validation — relative paths**: resolves against the filesystem
case-sensitively on Linux/macOS runners, case-insensitively on the local
filesystem otherwise; flags a case-mismatch as broken even on
case-insensitive filesystems, since it will break in CI. Handles `./`, `../`,
and root-relative (`/docs/...`) paths anchored at the scan root.

**Validation — anchors**: builds a heading-slug table per target file using
the same slugification GitHub uses (lowercase, spaces to hyphens, strip
punctuation) and checks the link's anchor against it. Does not yet handle
duplicate-heading disambiguation suffixes (`#setup-1`) — see Known Limits.

**Validation — external**: only runs with `--check-external`. Rate-limited
to 2 requests/second per host, 5-second timeout, treated as `external-timeout`
(reported, not silently skipped) on timeout. Results cached in-memory for the
duration of one run only (not persisted between runs yet).

**Reporting**: terminal (default) and `--format json`. Exit code is nonzero
if any Broken Link exists after Autofix (if `--fix` was passed) — CI-safe.

**Autofix**: handles exactly two patterns —
1. Case-mismatched relative path where the correctly-cased file exists at
   the same location (rewrites the link target's casing only).
2. A `file-not-found` whose old path is a key in `.linkcheck-redirects.json`
   (rewrites the link target to the manifest's mapped new path).

Everything else is reported as broken with `autofixable: false`. `--fix`
refuses to run on a dirty git tree without `--force` (see Guardrails in
`project-charter.md`).

## Known Limits

- Duplicate-heading anchor disambiguation (`#setup-1`, `#setup-2`) isn't
  handled — a link to the second `#setup` heading in a file will be flagged
  as broken even when GitHub would resolve it. Tracked in `../PRIORITIES.md`.
- External-URL cache doesn't persist across runs, so `--check-external` on a
  large doc tree is slow on every CI run, not just the first.
- No fixture-replay test harness for Autofix yet — Autofix correctness is
  currently verified by manual diff review per change, not by an automated
  regression suite. Building it is the next authorized `../ROADMAP.md` phase.

## Configuration / Environment Notes

- `--check-external` is opt-in; CI does not pass it by default (network
  flakiness would make the gate unreliable) — a separate scheduled job runs
  it nightly and reports failures to `#docs-health` instead of blocking PRs.
- `.linkcheck-redirects.json` is optional; its absence is not an error.

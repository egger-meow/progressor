# Domain Model

Shared vocabulary for linkcheck. If code, docs, or conversation use a term
for a core concept that isn't defined here, either the term is wrong or this
doc is out of date — fix whichever it is before proceeding.

## Concepts

### Link

A single Markdown link or reference-style link found during Discovery.
Carries `sourceFile`, `sourceLine`, `rawTarget` (the text inside `()` or the
reference definition), and a `kind`: `relative-path`, `anchor`, `external`,
or `relative-path+anchor` (e.g. `./guide.md#setup`).

### Target

The resolved destination a `Link` points at, once Validation has attempted
resolution. A `relative-path` Target resolves to a filesystem path; an
`anchor` Target resolves to a heading slug within a specific file; an
`external` Target resolves to an HTTP response (only when
`--check-external` is set).

### Broken Link

A `Link` whose `Target` failed to resolve, at or above the confidence
threshold defined in `docs/project-charter.md`'s Guardrails. Every Broken
Link carries a `reason` (`file-not-found`, `anchor-not-found`,
`external-4xx`, `external-5xx`, `external-timeout`, `ambiguous`) — `reason`
drives both Reporting's message and whether an Autofix Candidate exists.

### Autofix Candidate

A `Broken Link` that also matches one of the specific patterns Autofix knows
how to repair with full confidence (see `docs/status.md` for the current
list). Not every Broken Link is an Autofix Candidate — most aren't, by
design (see Guardrails).

### Redirect Manifest

`.linkcheck-redirects.json` at the scan root: an explicit, human- or
agent-maintained map of `{ oldPath: newPath }` for files that were
intentionally moved. Autofix consults this before attempting any
move-based fix; it never infers a move on its own.

### Scan Report

The full output of a run: every discovered `Link`, its resolution result,
and (if broken) its `reason` and Autofix Candidate status if any. This is
what both the terminal and JSON formats render from — they're two views of
the same Scan Report, not independently computed.

## Naming Conventions

Code and docs both use `sourceFile`/`sourceLine`/`rawTarget`/`reason` as the
field names above — do not introduce synonyms (e.g. `path` for `sourceFile`)
even locally within a function; grep-ability across the codebase matters
more than local brevity.

# System Direction

## Target Architecture

A four-stage pipeline, each stage a pure function over the previous stage's
output, so any stage can be tested in isolation and the pipeline can grow new
input formats without touching downstream stages:

```
Discovery (files -> Link[])
  -> Validation (Link[] -> ValidatedLink[])
    -> Reporting (ValidatedLink[] -> ScanReport)
    -> Autofix (ValidatedLink[] + ScanReport -> file writes)
```

Discovery only knows how to parse a source format into `Link`s — it never
touches the filesystem beyond reading the files it's given. Validation is the
only stage allowed to touch the filesystem (path resolution) or network
(`--check-external`). Reporting and Autofix both consume Validation's output
independently; Autofix must never re-derive resolution logic itself.

## Current Fit

Discovery and Validation are format-agnostic in interface but currently only
implement a Markdown parser (`src/discovery/markdown.ts`) — the pipeline
boundary is real, but there's only one producer behind it yet. Autofix
currently only knows the two patterns in `docs/status.md`; it consumes
`ScanReport` correctly per the target architecture, so adding a new fixable
pattern doesn't require changing Discovery or Validation.

## Refactor Priorities

When next touching Validation's external-URL path, prefer moving the
HTTP-check cache from in-memory (current) to a `.linkcheck-cache.json` file
keyed by URL + last-checked timestamp — this is a standing bias for the next
person who touches that code, not an active priority; see `../PRIORITIES.md`
for what's actually blocking right now.

## Retiring Legacy Paths

The original v0.x implementation validated anchors with a regex-based slug
guesser before the current heading-parser-based approach landed. That path
is fully removed — do not reintroduce a regex fallback "just in case";
`docs/build-status.md`'s Verification Evidence log has the record of why it
was replaced.

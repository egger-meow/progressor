<!-- TEMPLATE: This is the index/map of canonical docs — one line per doc,
stating its purpose, so an agent or human can decide which doc to open
without opening all of them. Add a line whenever you add a new canonical doc;
remove the line if you delete one. Keep this file itself short — it's a
table of contents, not content. Delete this comment once adjusted for your
project (the structure below is already generic and usually needs no
changes, only additions). -->

# Docs

Start here when changing product behavior, architecture, or user-facing
workflows. This is an index — each doc below is the single source of truth
for its topic; don't duplicate their content elsewhere, including in chat
responses that will outlive their usefulness.

## Canonical Docs

- [`project-charter.md`](project-charter.md): mission, core principles,
  safety/guardrail rules, and the documentation contract.
- [`domain-model.md`](domain-model.md): shared names for this project's core
  concepts and how they relate.
- [`system-direction.md`](system-direction.md): architecture direction,
  current fit, and refactor priorities.
- [`status.md`](status.md): currently implemented behavior — the source of
  truth for what actually works right now.
- [`build-status.md`](build-status.md): coarse Built/Partial/Planned/Blocked
  map across the whole project, plus a dated verification-evidence log.
- [`release.md`](release.md): versioning scheme and release checklist.
<!-- TEMPLATE: add project-specific docs here, e.g.:
- `api-spec.md`: target API surface and contract direction.
- `ui-direction.md`: target UI shape and interaction requirements.
- `storage.md`: persistence/schema-migration rules.
- `deployment.md`: environment and operational notes.
Only add a doc here if it will be kept current — an abandoned doc is worse
than no doc, because agents will trust and act on stale content. -->

## Phase Audits

[`audits/`](audits/README.md) holds one file per completed major build
phase: requirement-by-requirement evidence that the phase's written exit
condition was actually met. Write one when a `../ROADMAP.md` phase passes
the phase gate and closes out completely — see `audits/README.md`.

## Raw / Historical Notes

<!-- TEMPLATE: if you're migrating from an existing pile of notes, docs, or
a wiki, park anything not yet promoted to a canonical doc under a clearly
labeled subfolder here (e.g. `docs/notes/`) rather than deleting it. Update
the canonical docs above when direction changes — future agents should read
canonical docs, not reconstruct intent from old notes. Delete this section
if there's no legacy material to preserve. -->

<!-- TEMPLATE: Fill in the versioning scheme and checklist for this specific
project's stack. The structure below (versioning rule, ordered checklist,
notes template) is generic and usually doesn't need to change; the commands
inside it do. Delete this comment once filled in. -->

# Release Process

This document defines the release path for this project.

## Versioning

<!-- TEMPLATE: State the scheme (SemVer is a reasonable default) and every
place a version number must be kept in sync, e.g.:
- `MAJOR.MINOR.PATCH` stored in `<file>`, `<file>`, ...
- Git tags use a leading `v`, e.g. `v0.1.0`.
- Any component-level version (schema migrations, API version) that is
  intentionally NOT the same as the project release version — say so
  explicitly to prevent an agent from "fixing" the mismatch. -->

## Release Checklist

<!-- TEMPLATE: Ordered, copy-pasteable steps. Model shape from a real
project — replace the specifics:

1. Ensure the working tree contains only intended release changes.
2. Update version metadata in: <files>.
3. Update `CHANGELOG.md` with the release date, included capabilities,
   safety/breaking notes, and migration notes when applicable.
4. Regenerate any generated contracts/types if applicable:
   ```bash
   <command>
   ```
5. Run the task gate (see `status.md`) — and the phase gate too, if this
   release closes a `ROADMAP.md` phase:
   ```bash
   <command>
   ```
6. Inspect status docs for drift: `README.md`, `docs/status.md`,
   `docs/build-status.md`, `../PRIORITIES.md`.
7. Commit the release prep, then create and push an annotated tag:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin <main-branch>
   git push origin vX.Y.Z
   ```
8. Create the release from the tag, using `CHANGELOG.md` as the source for
   release notes, including the exact validation commands that passed. -->

## Release Notes Template

```markdown
## Summary

<!-- one paragraph -->

## Included

- ...

## Breaking / Safety Notes

- ...

## Validation

- <command that was run and passed>

## Known Limits

- ...
```

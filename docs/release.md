# Release Process

This document defines the release path for this project.

Progressor is a single-user local tool with no external distribution
channel today — "release" means "tag a known-good point in the local git
history," not publishing a package. Keep this checklist minimal until that
changes.

## Versioning

- `MAJOR.MINOR.PATCH` (SemVer), stored in `package.json` once the scaffold
  exists (see `../ROADMAP.md`'s Active Phase).
- Git tags use a leading `v`, e.g. `v0.1.0`.
- The Prisma schema's own migration history is versioned independently by
  Prisma's migration files — do not try to keep migration numbers in sync
  with the release version; they answer different questions.

## Release Checklist

1. Ensure the working tree contains only intended release changes.
2. Update the version in `package.json`.
3. Update `CHANGELOG.md` with the release date, included capabilities, and
   any known limits — move the `[Unreleased]` entries under a new version
   heading.
4. Run the task gate (see `docs/status.md`), and the phase gate too if this
   release closes a `ROADMAP.md` phase:
   ```bash
   npm run verify
   ```
5. Inspect status docs for drift: `README.md`, `docs/status.md`,
   `docs/build-status.md`, `../PRIORITIES.md`.
6. Commit the release prep, then create an annotated tag:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   ```
   (No `git push` step — this is a local-only project; push only if/when an
   external remote is actually in use.)

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

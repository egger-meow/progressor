# Release Process

This document defines the release path for linkcheck.

## Versioning

- SemVer, `MAJOR.MINOR.PATCH`, stored in `package.json` and mirrored as a git
  tag with a leading `v` (e.g. `v0.3.1`).
- Pre-1.0: any Autofix behavior change (new fixable pattern, changed
  confidence threshold) is a minor bump even though SemVer would technically
  allow it as patch — Autofix changes are exactly the kind of thing a
  consumer needs to notice in a changelog before upgrading.

## Release Checklist

1. Ensure the working tree contains only intended release changes.
2. Update the version in `package.json`.
3. Update `CHANGELOG.md` with the release date, included changes, and any
   Autofix behavior changes called out explicitly under their own heading.
4. Run the task gate (and the phase gate from `status.md`, if this release
   closes a `../ROADMAP.md` phase):
   ```bash
   npm run verify
   ```
5. Inspect status docs for drift: `README.md`, `docs/status.md`,
   `docs/build-status.md`, `../PRIORITIES.md`.
6. Commit the release prep, then create and push an annotated tag:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin main
   git push origin vX.Y.Z
   ```
7. Publish to npm (`npm publish`) and create the GitHub release from the tag,
   using `CHANGELOG.md` as the source for release notes.

## Release Notes Template

```markdown
## Summary

<!-- one paragraph -->

## Included

- ...

## Autofix Behavior Changes

- ... (or "none")

## Validation

- `npm run verify`

## Known Limits

- ...
```

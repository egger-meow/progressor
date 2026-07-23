# Changelog

All notable changes to linkcheck are documented here.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/), and
this project's versioning is defined in [`docs/release.md`](docs/release.md).

## [Unreleased]

### Changed

- Anchor validation duplicate-heading disambiguation (in progress — see
  `PRIORITIES.md`).

## [0.3.0] - 2026-03-02

### Added

- Autofix Phase 1: case-mismatch and redirect-manifest fix patterns
  (`--fix`), gated behind a clean-git-tree check (`--force` to override).
  See `docs/audits/autofix-phase-1-audit.md`.

### Changed

- `--check-external` now rate-limits to 2 requests/second per host
  (previously unbounded, which had triggered a host's abuse detection once).

## [0.2.0] - 2026-01-14

### Added

- `--check-external` opt-in external URL validation.
- `--format json` machine-readable report output.

## [0.1.0] - 2025-12-01

### Added

- Initial release: Discovery and Validation for relative-path and anchor
  links in `.md`/`.mdx` files, terminal reporting, CI-safe exit codes.

# linkcheck

A CLI that scans a tree of Markdown files for broken links — internal
relative paths, heading anchors, and (optionally) external URLs — and can
automatically repair the subset of breaks it can fix with full confidence.

> This is a worked example for [loop-engine](../../README.md), not a
> published package. See [`../README.md`](../README.md) for why it exists.

## Install & run

```bash
npm install
npm run build
npx linkcheck ./docs
npx linkcheck ./docs --fix   # only the confidently-fixable subset; see docs/status.md
```

See [`AGENTS.md`](AGENTS.md) / [`CLAUDE.md`](CLAUDE.md) for full commands,
[`docs/project-charter.md`](docs/project-charter.md) for what this tool is
for, and [`PRIORITIES.md`](PRIORITIES.md) for what's being worked on next.

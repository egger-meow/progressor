#!/usr/bin/env bash
# Scans the repo for leftover `TEMPLATE:` markers left in doc scaffolding.
# Exit 0 = clean (every template has been filled in and its markers removed).
# Exit 1 = one or more TEMPLATE: markers remain.
#
# Usage (run from the repo root; this script now lives one level deeper,
# under .loop-engine/scripts/):
#   ./.loop-engine/scripts/check-templates.sh            # scan whole repo
#   ./.loop-engine/scripts/check-templates.sh docs        # scan a subfolder
#
# This is what INIT_CHECKLIST.md step 10 asks you to do by hand; run this
# instead once you believe every template is filled in. It's also the
# natural gate to wire into CI once this project has one, so a doc can't
# quietly merge half-templated.
#
# Matches only real marker forms — the HTML guidance comment (<!-- TEMPLATE:)
# and inline placeholders (`TEMPLATE: <...>`) — so docs that merely *mention*
# TEMPLATE: markers in prose (README, LOOP_ENGINEERING.md, this checklist's
# own instructions) don't flag forever.
#
# Excluded by design: docs/audits/TEMPLATE.md (meant to stay a blank template
# forever) and BOOTSTRAP.md (it quotes the bootstrap awaiting-authorization
# marker verbatim as an instruction, and would otherwise flag forever — its
# exit-0 state detection depends on this). The exclude matches by basename,
# so it also covers the zh-TW/BOOTSTRAP.md translation without a separate
# entry.

set -euo pipefail

scan_path="${1:-.}"

matches=$(grep -rnE --include='*.md' \
    --exclude-dir=.git --exclude-dir=node_modules \
    --exclude-dir=.venv --exclude-dir=venv --exclude-dir=__pycache__ \
    --exclude='TEMPLATE.md' \
    --exclude='BOOTSTRAP.md' \
    '<!-- TEMPLATE:|`TEMPLATE: ' "$scan_path" || true)

if [ -z "$matches" ]; then
    echo "OK: no TEMPLATE: markers found under '$scan_path'."
    exit 0
fi

echo "Found unfilled TEMPLATE: marker(s):"
echo "$matches"
echo
echo "Fill these in (see INIT_CHECKLIST.md) before treating the affected docs as authoritative."
exit 1

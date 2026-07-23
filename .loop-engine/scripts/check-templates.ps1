#Requires -Version 5.1
<#
Scans the repo for leftover `TEMPLATE:` markers left in doc scaffolding.
Exit 0 = clean (every template has been filled in and its markers removed).
Exit 1 = one or more TEMPLATE: markers remain.

Usage (run from the repo root; this script now lives one level deeper,
under .loop-engine/scripts/):
  pwsh .loop-engine/scripts/check-templates.ps1            # scan whole repo
  pwsh .loop-engine/scripts/check-templates.ps1 -Path docs # scan a subfolder

This is what INIT_CHECKLIST.md step 10 asks you to do by hand; run this
instead once you believe every template is filled in. It's also the natural
gate to wire into CI once this project has one, so a doc can't quietly merge
half-templated.

Matches only real marker forms -- the HTML guidance comment (<!-- TEMPLATE:)
and inline placeholders (`TEMPLATE: <...>`) -- so docs that merely mention
TEMPLATE: markers in prose don't flag forever.

Excluded by design: docs/audits/TEMPLATE.md (meant to stay a blank template
forever) and BOOTSTRAP.md (it quotes the bootstrap awaiting-authorization
marker verbatim as an instruction, and would otherwise flag forever -- its
exit-0 state detection depends on this). The exclude matches by basename,
so it also covers the zh-TW/BOOTSTRAP.md translation without a separate
entry.
#>
param(
    [string]$Path = "."
)

$excludeDirs = @('.git', 'node_modules', '.venv', 'venv', '__pycache__')

$files = Get-ChildItem -Path $Path -Recurse -File -Include *.md |
    Where-Object {
        $full = $_.FullName
        $_.Name -ne 'TEMPLATE.md' -and
        $_.Name -ne 'BOOTSTRAP.md' -and
        -not ($excludeDirs | Where-Object { $full -match [regex]::Escape("\$_\") })
    }

$hits = @()
foreach ($file in $files) {
    $lineNum = 0
    foreach ($line in Get-Content -LiteralPath $file.FullName) {
        $lineNum++
        if ($line -match '<!-- TEMPLATE:|`TEMPLATE: ') {
            $hits += [PSCustomObject]@{
                File = (Resolve-Path -Relative $file.FullName)
                Line = $lineNum
                Text = $line.Trim()
            }
        }
    }
}

if ($hits.Count -eq 0) {
    Write-Host "OK: no TEMPLATE: markers found under '$Path'." -ForegroundColor Green
    exit 0
}

Write-Host "Found $($hits.Count) unfilled TEMPLATE: marker(s):" -ForegroundColor Yellow
$hits | ForEach-Object {
    Write-Host ("  {0}:{1}  {2}" -f $_.File, $_.Line, $_.Text)
}
Write-Host "`nFill these in (see INIT_CHECKLIST.md) before treating the affected docs as authoritative." -ForegroundColor Yellow
exit 1

# Post-build icon fix for Windows.
# Electrobun's compiled CLI cannot resolve `rcedit` at build time
# ("Cannot find module .../rcedit/package.json from 'B:\~BUN\root\electrobun'"),
# so it ships exes without embedded icons. This script embeds them afterwards
# using the project's own rcedit binary and repacks the installer artifacts.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/fix-icons.ps1 [-Channel stable]
param([string]$Channel = "stable")

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "build\$Channel-win-x64"
$rcedit = Join-Path $root "node_modules\rcedit\bin\rcedit-x64.exe"
$ico = Join-Path $outDir "temp-icon.ico"

if (-not (Test-Path -LiteralPath $rcedit)) { throw "rcedit not found: $rcedit (run bun install)" }
if (-not (Test-Path -LiteralPath $ico)) { throw "icon not found: $ico (electrobun build must run first)" }

$setupExe = Join-Path $outDir "Markdown Reader-Setup.exe"
$launcher = Join-Path $outDir "MarkdownReader\bin\launcher"

& $rcedit $setupExe --set-icon $ico
if ($LASTEXITCODE -ne 0) { throw "rcedit failed on Setup.exe" }

Copy-Item -LiteralPath $launcher -Destination "$launcher.exe" -Force
& $rcedit "$launcher.exe" --set-icon $ico
if ($LASTEXITCODE -ne 0) { throw "rcedit failed on launcher" }
Move-Item -LiteralPath "$launcher.exe" -Destination $launcher -Force

# Repack archive (same top-level layout electrobun produces)
Push-Location $outDir
try {
  & tar -c --zstd -f "Markdown Reader-Setup.tar.zst" MarkdownReader
  if ($LASTEXITCODE -ne 0) { throw "tar repack failed" }
} finally { Pop-Location }

# Rebuild installer zip (same entry layout)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = Join-Path $outDir "MarkdownReader-Setup.zip"
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, "Create")
try {
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $outDir "Markdown Reader-Setup.metadata.json"), ".installer/Markdown Reader-Setup.metadata.json") | Out-Null
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $outDir "Markdown Reader-Setup.tar.zst"), ".installer/Markdown Reader-Setup.tar.zst") | Out-Null
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $setupExe, "Markdown Reader-Setup.exe") | Out-Null
} finally { $zip.Dispose() }

# Refresh artifacts copies
Copy-Item -LiteralPath $zipPath -Destination (Join-Path $root "artifacts\$Channel-win-x64-MarkdownReader-Setup.zip") -Force
Copy-Item -LiteralPath (Join-Path $outDir "Markdown Reader-Setup.tar.zst") -Destination (Join-Path $root "artifacts\$Channel-win-x64-MarkdownReader.tar.zst") -Force

Write-Output "Icons embedded and artifacts repacked for channel: $Channel"

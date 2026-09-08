# Portable single-exe for Windows via 7-Zip SFX.
# Takes the electrobun stable build folder (build/<channel>-win-x64/<App>/),
# normalizes the entry point to bin\MDPOWER.exe and packs everything into
# one self-extracting exe: double-click -> extracts to temp -> launches.
# Requires 7-Zip installed (preinstalled on GitHub windows-latest runners).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/package-portable.ps1 [-Channel stable]
param([string]$Channel = "stable")

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "build\$Channel-win-x64"

$appDir = Get-ChildItem -LiteralPath $outDir -Directory | Select-Object -First 1
if (-not $appDir) { throw "app dir not found in $outDir (run electrobun build first)" }
$binDir = Join-Path $appDir.FullName "bin"
if (-not (Test-Path -LiteralPath $binDir)) { throw "bin dir not found in $($appDir.FullName)" }

$launcher = Get-ChildItem -LiteralPath $binDir -Filter "launcher*" | Select-Object -First 1
if (-not $launcher) { throw "launcher binary not found in $binDir" }
$entryExe = Join-Path $binDir "MDPOWER.exe"
if ($launcher.FullName -ne $entryExe) {
  Copy-Item -LiteralPath $launcher.FullName -Destination $entryExe -Force
}

$rcedit = Join-Path $root "node_modules\rcedit\bin\rcedit-x64.exe"
$iconPng = Join-Path $root "src\assets\icon.png"
try {
  if ((Test-Path -LiteralPath $rcedit) -and (Test-Path -LiteralPath $iconPng)) {
    $icoTmp = Join-Path ([IO.Path]::GetTempPath()) "mdpower-portable-icon.ico"
    & bun -e "const fs=require('fs');require('png-to-ico')('src/assets/icon.png').then(b=>fs.writeFileSync(process.argv[1],b))" $icoTmp 2>$null
    if (Test-Path -LiteralPath $icoTmp) {
      & $rcedit $entryExe --set-icon $icoTmp
      Remove-Item -LiteralPath $icoTmp -Force -ErrorAction SilentlyContinue
      Write-Output "Icon embedded into MDPOWER.exe"
    }
  }
} catch {
  Write-Output "Icon embed skipped: $_"
}

$sevenZipDir = Join-Path $env:ProgramFiles "7-Zip"
$sevenZip = Join-Path $sevenZipDir "7z.exe"
$sfx = Join-Path $sevenZipDir "7z.sfx"
if (-not (Test-Path -LiteralPath $sevenZip)) { throw "7-Zip not found at $sevenZip" }
if (-not (Test-Path -LiteralPath $sfx)) { throw "7z.sfx not found at $sfx" }

$workDir = Join-Path ([IO.Path]::GetTempPath()) "mdpower-portable"
if (Test-Path -LiteralPath $workDir) { Remove-Item -LiteralPath $workDir -Recurse -Force }
New-Item -ItemType Directory -Path $workDir | Out-Null

$configPath = Join-Path $workDir "config.txt"
[IO.File]::WriteAllText($configPath, ";!@Install@!UTF-8!`r`nTitle=`"MDPOWER`"`r`nRunProgram=`"bin\MDPOWER.exe`"`r`n;!@InstallEnd@!`r`n", [Text.Encoding]::UTF8)

$archivePath = Join-Path $workDir "app.7z"
& $sevenZip a -mx=9 -y $archivePath "$($appDir.FullName)\*" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "7z archive failed" }

$artifactsDir = Join-Path $root "artifacts"
New-Item -ItemType Directory -Path $artifactsDir -Force | Out-Null
$portablePath = Join-Path $artifactsDir "$Channel-win-x64-MDPOWER-Portable.exe"
if (Test-Path -LiteralPath $portablePath) { Remove-Item -LiteralPath $portablePath -Force }
cmd /c copy /b "$sfx"+"$configPath"+"$archivePath" "$portablePath" | Out-Null
if (-not (Test-Path -LiteralPath $portablePath)) { throw "portable exe was not created" }

Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue

$sizeMb = ((Get-Item -LiteralPath $portablePath).Length / 1MB).ToString("0.0")
Write-Output "Portable created: $portablePath ($sizeMb MB)"

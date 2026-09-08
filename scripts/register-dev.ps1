# Register .md file association for development
# Run as Administrator: powershell -ExecutionPolicy Bypass -File scripts/register-dev.ps1

$appPath = "$PSScriptRoot\..\node_modules\.bin\electrobun.cmd"

if (-not (Test-Path $appPath)) {
  # Try to find the app exe in the build output
  $possiblePaths = @(
    "$PSScriptRoot\..\dist\MDPOWER.exe",
    "$PSScriptRoot\..\dist\mdpower.exe"
  )
  foreach ($p in $possiblePaths) {
    if (Test-Path $p) {
      $appPath = $p
      break
    }
  }
}

if (-not (Test-Path $appPath)) {
  Write-Host "Warning: Could not find app executable. Registering anyway with placeholder path." -ForegroundColor Yellow
  Write-Host "After building, update the path in registry or re-run this script." -ForegroundColor Yellow
}

$progId = "MDPOWER.md"
$appName = "MDPOWER"

# Create ProgID
New-Item -Path "HKCU:\Software\Classes\$progId" -Force | Out-Null
New-ItemProperty -Path "HKCU:\Software\Classes\$progId" -Name "" -Value $appName -Force | Out-Null

# Default icon
New-Item -Path "HKCU:\Software\Classes\$progId\DefaultIcon" -Force | Out-Null
New-ItemProperty -Path "HKCU:\Software\Classes\$progId\DefaultIcon" -Name "" -Value "`"$appPath`",1" -Force | Out-Null

# Open command
New-Item -Path "HKCU:\Software\Classes\$progId\shell\open\command" -Force | Out-Null
New-ItemProperty -Path "HKCU:\Software\Classes\$progId\shell\open\command" -Name "" -Value "`"$appPath`" `"%1`"" -Force | Out-Null

# Associate .md extension
New-Item -Path "HKCU:\Software\Classes\.md" -Force | Out-Null
New-ItemProperty -Path "HKCU:\Software\Classes\.md" -Name "" -Value $progId -Force | Out-Null

# Also associate .markdown
New-Item -Path "HKCU:\Software\Classes\.markdown" -Force | Out-Null
New-ItemProperty -Path "HKCU:\Software\Classes\.markdown" -Name "" -Value $progId -Force | Out-Null

# Notify Explorer of changes
$taskbarStop = [System.Diagnostics.Process]::Start("taskkill", "/f /im explorer.exe")
$taskbarStop.WaitForExit()
Start-Process "explorer.exe"

Write-Host "File association registered successfully!" -ForegroundColor Green
Write-Host ".md and .markdown files will now open with $appName" -ForegroundColor Green

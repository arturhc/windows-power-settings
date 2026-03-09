$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$mainScript = Join-Path $projectRoot "src\main.js"

if (-not (Test-Path $mainScript)) {
    throw "No se encontro el archivo: $mainScript"
}

$nodePath = (Get-Command node -ErrorAction Stop).Source

# Inicia el agente sin consola usando CreateNoWindow para evitar ventanas de cmd/conhost.
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $nodePath
$psi.Arguments = "`"$mainScript`""
$psi.WorkingDirectory = $projectRoot
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
[void][System.Diagnostics.Process]::Start($psi)

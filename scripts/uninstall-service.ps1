$ErrorActionPreference = "Stop"

$taskName = "PowerLidToggleAgent"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task) {
    try {
        Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    } catch {
    }
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Tarea eliminada: $taskName"
} else {
    Write-Host "No existia la tarea: $taskName"
}

$mainScriptPattern = [Regex]::Escape((Join-Path $projectRoot "src\main.js"))
$nodeProcesses = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -and $_.CommandLine -match $mainScriptPattern }

foreach ($proc in $nodeProcesses) {
    try {
        Stop-Process -Id $proc.ProcessId -Force
        Write-Host "Proceso detenido: node.exe PID=$($proc.ProcessId)"
    } catch {
        Write-Warning "No se pudo detener PID=$($proc.ProcessId): $($_.Exception.Message)"
    }
}

Write-Host "Desinstalacion completada."

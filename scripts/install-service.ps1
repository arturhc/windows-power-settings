$ErrorActionPreference = "Stop"

$taskName = "PowerLidToggleAgent"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$startScript = Join-Path $projectRoot "scripts\start-agent.vbs"
$wscriptExe = Join-Path $env:WINDIR "System32\wscript.exe"
$userId = "$env:USERDOMAIN\$env:USERNAME"

if (-not (Test-Path $startScript)) {
    throw "No se encontro el script de inicio: $startScript"
}

if (-not (Test-Path $wscriptExe)) {
    throw "No se encontro wscript.exe en: $wscriptExe"
}

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task) {
    try {
        Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    } catch {
    }
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$action = New-ScheduledTaskAction `
    -Execute $wscriptExe `
    -Argument "//B //Nologo `"$startScript`""

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -Hidden

try {
    $principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Highest
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Force | Out-Null
} catch {
    Write-Warning "No se pudo registrar con privilegios altos. Se instalara con permisos limitados."
    $principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Force | Out-Null
}

Start-ScheduledTask -TaskName $taskName

Write-Host "Instalacion completada."
Write-Host "Tarea registrada: $taskName"
Write-Host "Combinacion global: Ctrl+Shift+Alt+L"

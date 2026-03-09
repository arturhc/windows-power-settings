# Power Lid Toggle (Windows)

Programa pequeno para Windows que hace toggle del comportamiento al cerrar la tapa:

- `Modo normal`: cerrar tapa => `Suspender`.
- `Modo trabajo`: cerrar tapa => `No hacer nada`.

El cambio se activa con una hotkey global:

- `Ctrl + Shift + Alt + L`

Feedback sonoro (automatico):

- Al quedar en `Suspender`: reproduce `C:\Windows\Media\chimes.wav`.
- Al quedar en `No hacer nada`: reproduce `C:\Windows\Media\chord.wav`.

## Por que no es un servicio clasico de Windows

Un servicio real corre en `Session 0` y no recibe teclado global del usuario.  
Para soportar hotkey global de forma confiable, este proyecto instala un agente oculto al iniciar sesion usando `Task Scheduler` (comportamiento tipo servicio para este caso).

## Como y cuando inicia

- Se instala la tarea programada `PowerLidToggleAgent`.
- Trigger: `AtLogOn` del usuario actual.
- Arranca automaticamente cuando inicias sesion en Windows (no tiene hora fija).
- La tarea ejecuta `wscript.exe` con `scripts/start-agent.vbs` para lanzar el agente sin ventana visible.

## Requisitos

- Windows 10/11.
- Node.js en PATH (`node -v`).
- PowerShell 5+.

## Instalacion rapida (1 comando)

Desde la carpeta del proyecto:

```powershell
npm run setup
```

Ese comando:

1. instala dependencias de Node (si hubiera),
2. registra la tarea `PowerLidToggleAgent`,
3. arranca el agente en segundo plano.

## Scripts disponibles

- `npm run install-service`: instala o actualiza la tarea.
- `npm run uninstall-service`: elimina la tarea y detiene el agente.
- `npm run status`: muestra accion actual de tapa (AC/DC).
- `npm run toggle`: alterna entre suspender y no hacer nada.
- `npm start`: ejecuta el agente en la sesion actual.

## Archivos principales

- `src/main.js`: agente principal; recibe eventos de hotkey y hace toggle.
- `src/powercfg.js`: wrapper de `powercfg` para leer/escribir `LIDACTION`.
- `src/sound.js`: reproduce sonido distinto segun el modo activo.
- `scripts/hotkey-listener.ps1`: registro de hotkey global con `RegisterHotKey`.
- `scripts/start-agent.vbs`: launcher oculto del agente (sin ventana de consola).
- `scripts/install-service.ps1`: instalacion de tarea programada.
- `scripts/uninstall-service.ps1`: desinstalacion.

## Logs

El agente escribe log en:

`%LOCALAPPDATA%\PowerLidToggle\agent.log`

Archivo de lock de instancia unica:

`%LOCALAPPDATA%\PowerLidToggle\agent.lock`

## Verificacion rapida

```powershell
npm run status
npm run toggle
npm run status
```

Tambien puedes validar la tarea:

```powershell
schtasks /Query /TN "\PowerLidToggleAgent" /V /FO LIST
```

## Solucion de problemas

- Si `Ctrl+Shift+Alt+L` no hace nada:
  - revisa si el agente esta activo (`Task Scheduler` -> `PowerLidToggleAgent`),
  - consulta el log en `%LOCALAPPDATA%\PowerLidToggle\agent.log`,
  - prueba ejecutar manualmente `npm start`.
- Si el Panel de control no refleja cambios:
  - cierra y vuelve a abrir la ventana de "Configuracion del sistema" (a veces no refresca en vivo).
- Si ves una ventana de consola abierta:
  - no uses `npm start` para uso diario (ese modo es interactivo),
  - usa la tarea instalada (`npm run install-service`), que arranca oculta.
- Si en log aparece `ERROR:REGISTER_FAILED:1409`:
  - la hotkey ya esta tomada por otro proceso; cierra la app conflictiva o cambia la combinacion.
- Si no escuchas sonidos:
  - revisa volumen y mezclador de Windows para `Windows PowerShell`/`Node.js`,
  - valida que existan `C:\Windows\Media\chimes.wav` y `C:\Windows\Media\chord.wav`,
  - prueba manual: `powershell -NoProfile -Command \"(New-Object System.Media.SoundPlayer 'C:\\Windows\\Media\\chimes.wav').PlaySync()\"`.
- Si `powercfg` falla por permisos:
  - vuelve a instalar con PowerShell/terminal como administrador.

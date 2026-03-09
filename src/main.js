const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const readline = require("node:readline");

const { actionLabel, getCurrentLidAction, toggleLidAction } = require("./powercfg");
const logger = require("./logger");

const HOTKEY_SCRIPT = path.resolve(__dirname, "..", "scripts", "hotkey-listener.ps1");
const LOCK_PATH = path.join(logger.baseDir, "agent.lock");

let listenerProcess = null;
let isToggling = false;
let shuttingDown = false;
let lockAcquired = false;

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireLock() {
  try {
    fs.mkdirSync(logger.baseDir, { recursive: true });
    const fd = fs.openSync(LOCK_PATH, "wx");
    fs.writeFileSync(fd, String(process.pid), "utf8");
    fs.closeSync(fd);
    lockAcquired = true;
    return true;
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error;
    }

    let existingPid = NaN;
    try {
      existingPid = Number.parseInt(fs.readFileSync(LOCK_PATH, "utf8").trim(), 10);
    } catch {
      existingPid = NaN;
    }

    if (isPidAlive(existingPid)) {
      logger.info(`Otra instancia ya esta activa (PID ${existingPid}). Esta instancia termina.`);
      return false;
    }

    try {
      fs.unlinkSync(LOCK_PATH);
    } catch {
      return false;
    }

    return acquireLock();
  }
}

function releaseLock() {
  if (!lockAcquired) return;
  try {
    const current = Number.parseInt(fs.readFileSync(LOCK_PATH, "utf8").trim(), 10);
    if (current === process.pid) {
      fs.unlinkSync(LOCK_PATH);
    }
  } catch {
  } finally {
    lockAcquired = false;
  }
}

async function printCurrentState() {
  try {
    const state = await getCurrentLidAction();
    logger.info(
      `Estado inicial: AC=${state.ac} (${actionLabel(state.ac)}), DC=${state.dc} (${actionLabel(state.dc)})`
    );
  } catch (error) {
    logger.error(`No se pudo leer estado inicial: ${error.message}`);
  }
}

async function onHotkey() {
  if (isToggling) {
    logger.info("Hotkey ignorada porque hay una operacion en curso.");
    return;
  }

  isToggling = true;
  try {
    const result = await toggleLidAction();
    logger.info(
      `Toggle OK. Antes AC/DC=${result.previous.ac}/${result.previous.dc}. ` +
        `Ahora AC/DC=${result.current.ac}/${result.current.dc} (${actionLabel(result.current.ac)}).`
    );
  } catch (error) {
    logger.error(`Error al aplicar toggle: ${error.message}`);
  } finally {
    isToggling = false;
  }
}

function stopListener() {
  if (listenerProcess && !listenerProcess.killed) {
    listenerProcess.kill();
  }
}

function startListener() {
  const args = [
    "-NoLogo",
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    HOTKEY_SCRIPT
  ];

  listenerProcess = spawn("powershell", args, {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  let registerFailed = false;

  logger.info("Listener de hotkey iniciado. Combinacion: Ctrl+Shift+Alt+L");

  const out = readline.createInterface({ input: listenerProcess.stdout });
  out.on("line", (line) => {
    const text = String(line).trim();
    if (!text) return;

    if (text === "HOTKEY") {
      void onHotkey();
      return;
    }

    if (text === "READY") {
      logger.info("Hotkey registrada correctamente.");
      return;
    }

    if (text.startsWith("ERROR:REGISTER_FAILED:")) {
      registerFailed = true;
      logger.error(`No se pudo registrar hotkey global. ${text}`);
      return;
    }

    logger.info(`Hotkey listener: ${text}`);
  });

  const err = readline.createInterface({ input: listenerProcess.stderr });
  err.on("line", (line) => {
    const text = String(line).trim();
    if (text) logger.error(`PowerShell stderr: ${text}`);
  });

  listenerProcess.on("exit", (code, signal) => {
    logger.error(`Listener finalizado. code=${code} signal=${signal}`);
    if (!shuttingDown && !registerFailed) {
      setTimeout(startListener, 3000);
      return;
    }

    if (registerFailed) {
      logger.error("Listener detenido para evitar reintentos infinitos por hotkey ocupada.");
    }
  });
}

function shutdown() {
  shuttingDown = true;
  logger.info("Apagando agente.");
  stopListener();
  releaseLock();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

void (async () => {
  if (!acquireLock()) {
    process.exit(0);
  }
  logger.info("Arrancando PowerLidToggle agent.");
  logger.info(`Log: ${logger.logPath}`);
  await printCurrentState();
  startListener();
})();

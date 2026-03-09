const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const MODE_WAV_FILES = {
  0: "chord.wav",
  1: "chimes.wav"
};

const localAppData = process.env.LOCALAPPDATA
  ? process.env.LOCALAPPDATA
  : path.join(os.homedir(), "AppData", "Local");
const soundLogPath = path.join(localAppData, "PowerLidToggle", "agent.log");
const systemRoot = process.env.SystemRoot || process.env.WINDIR || "C:\\Windows";
const POWERSHELL_EXE_PATH = path.join(
  systemRoot,
  "System32",
  "WindowsPowerShell",
  "v1.0",
  "powershell.exe"
);
const POWERSHELL_EXE = fs.existsSync(POWERSHELL_EXE_PATH) ? POWERSHELL_EXE_PATH : "powershell";

function logSoundError(message) {
  try {
    fs.mkdirSync(path.dirname(soundLogPath), { recursive: true });
    const line = `${new Date().toISOString()} [ERROR] Sound: ${message}\n`;
    fs.appendFileSync(soundLogPath, line, "utf8");
  } catch {
  }
}

function buildSoundScript(mode) {
  const wavName = MODE_WAV_FILES[mode];
  if (!wavName) return null;
  const fallbackSystemSound =
    mode === 1
      ? "[System.Media.SystemSounds]::Asterisk.Play();"
      : "[System.Media.SystemSounds]::Exclamation.Play();";

  const mediaRoot = process.env.WINDIR ? path.join(process.env.WINDIR, "Media") : null;
  const wavPath = mediaRoot ? path.join(mediaRoot, wavName) : null;

  if (wavPath && fs.existsSync(wavPath)) {
    const escapedPath = wavPath.replace(/'/g, "''");
    return (
      "$ErrorActionPreference='SilentlyContinue';" +
      `$p='${escapedPath}';` +
      "try { " +
      "$player = New-Object System.Media.SoundPlayer $p; " +
      "$player.PlaySync(); " +
      "} catch { " +
      `try { ${fallbackSystemSound} } catch {};` +
      "}"
    );
  }

  return `$ErrorActionPreference='SilentlyContinue'; try { ${fallbackSystemSound} } catch {};`;
}

function playModeSound(mode) {
  const script = buildSoundScript(mode);
  if (!script) return;

  const child = spawn(
    POWERSHELL_EXE,
    ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
    {
      windowsHide: true,
      stdio: "ignore"
    }
  );

  child.on("error", (error) => {
    logSoundError(`spawn fallo: ${error.message}`);
  });
  child.on("exit", (code, signal) => {
    if (code !== 0) {
      logSoundError(`proceso finalizo con code=${code} signal=${signal}`);
    }
  });
}

module.exports = { playModeSound };

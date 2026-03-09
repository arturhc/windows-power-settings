const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const baseDir = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, "PowerLidToggle")
  : path.join(os.homedir(), "AppData", "Local", "PowerLidToggle");

const logPath = path.join(baseDir, "agent.log");

function ensureDir() {
  fs.mkdirSync(baseDir, { recursive: true });
}

function write(level, message) {
  ensureDir();
  const line = `${new Date().toISOString()} [${level}] ${message}\n`;
  fs.appendFileSync(logPath, line, "utf8");
}

function info(message) {
  write("INFO", message);
}

function error(message) {
  write("ERROR", message);
}

module.exports = {
  baseDir,
  logPath,
  info,
  error
};

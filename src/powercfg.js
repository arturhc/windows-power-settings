const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

const SUBGROUP = "SUB_BUTTONS";
const ACTION_LABELS = {
  0: "No hacer nada",
  1: "Suspender",
  2: "Hibernar",
  3: "Apagar"
};

const SUPPORTED_ACTIONS = new Set([0, 1]);

async function runPowercfg(args) {
  try {
    const { stdout } = await execFileAsync("powercfg", args, { windowsHide: true });
    return stdout;
  } catch (error) {
    const parts = [];
    if (error.stderr) parts.push(String(error.stderr).trim());
    if (error.stdout) parts.push(String(error.stdout).trim());
    if (error.message) parts.push(error.message);
    throw new Error(`Fallo powercfg ${args.join(" ")}: ${parts.filter(Boolean).join(" | ")}`);
  }
}

function parseLidAction(output) {
  const lines = output.split(/\r?\n/);
  const lidAliasIndex = lines.findIndex((line) => line.toUpperCase().includes("LIDACTION"));

  if (lidAliasIndex === -1) {
    throw new Error("No se encontro el bloque LIDACTION en la salida de powercfg.");
  }

  const values = [];
  for (let i = lidAliasIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];

    if (/^\s*GUID\b/i.test(line) && values.length > 0) {
      break;
    }

    const match = line.match(/0x([0-9a-fA-F]+)/);
    if (match) {
      values.push(Number.parseInt(match[1], 16));
    }

    if (values.length >= 2) {
      break;
    }
  }

  if (values.length < 2) {
    throw new Error("No se pudieron leer los indices AC/DC de LIDACTION.");
  }

  return { ac: values[0], dc: values[1] };
}

function actionLabel(index) {
  return ACTION_LABELS[index] ?? `Valor ${index}`;
}

async function getCurrentLidAction() {
  const output = await runPowercfg(["/QH", "SCHEME_CURRENT", SUBGROUP]);
  return parseLidAction(output);
}

async function setLidAction(action) {
  if (!SUPPORTED_ACTIONS.has(action)) {
    throw new Error(`Accion no soportada: ${action}. Usa 0 (no hacer nada) o 1 (suspender).`);
  }

  await runPowercfg(["/SETACVALUEINDEX", "SCHEME_CURRENT", SUBGROUP, "LIDACTION", String(action)]);
  await runPowercfg(["/SETDCVALUEINDEX", "SCHEME_CURRENT", SUBGROUP, "LIDACTION", String(action)]);
  await runPowercfg(["/SETACTIVE", "SCHEME_CURRENT"]);
  return getCurrentLidAction();
}

async function toggleLidAction() {
  const previous = await getCurrentLidAction();
  const target = previous.ac === 0 && previous.dc === 0 ? 1 : 0;
  const current = await setLidAction(target);

  return { previous, current, target };
}

module.exports = {
  actionLabel,
  getCurrentLidAction,
  setLidAction,
  toggleLidAction
};

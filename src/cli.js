#!/usr/bin/env node

const { actionLabel, getCurrentLidAction, setLidAction, toggleLidAction } = require("./powercfg");

async function run() {
  const command = (process.argv[2] || "status").toLowerCase();

  if (command === "status") {
    const state = await getCurrentLidAction();
    console.log(`AC: ${state.ac} (${actionLabel(state.ac)})`);
    console.log(`DC: ${state.dc} (${actionLabel(state.dc)})`);
    return;
  }

  if (command === "toggle") {
    const result = await toggleLidAction();
    console.log(
      `Antes AC/DC=${result.previous.ac}/${result.previous.dc}. Ahora AC/DC=${result.current.ac}/${result.current.dc} (${actionLabel(result.current.ac)}).`
    );
    return;
  }

  if (command === "on" || command === "sleep") {
    const state = await setLidAction(1);
    console.log(`Suspension al cerrar tapa activada. AC/DC=${state.ac}/${state.dc}.`);
    return;
  }

  if (command === "off" || command === "no-sleep") {
    const state = await setLidAction(0);
    console.log(`Suspension al cerrar tapa desactivada. AC/DC=${state.ac}/${state.dc}.`);
    return;
  }

  console.error("Comando no soportado.");
  console.error("Uso: node src/cli.js [status|toggle|on|off]");
  process.exit(1);
}

run().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});

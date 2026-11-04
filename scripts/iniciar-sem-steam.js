// Abre o jogo no Electron SEM tentar a Steam (STEAM_MODO=mock). Funciona igual no Windows, Linux e Mac.
const { spawn } = require("child_process");
const electron = require("electron"); // caminho do executável do Electron
const filho = spawn(electron, ["."], { stdio: "inherit", env: { ...process.env, STEAM_MODO: "mock" } });
filho.on("exit", (c) => process.exit(c ?? 0));

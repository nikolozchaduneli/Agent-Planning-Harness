/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const { spawn } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
process.chdir(projectRoot);
process.env.NODE_PATH = path.join(projectRoot, "node_modules");
require("module").Module._initPaths();

const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev"], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { build } from "../src/build/build.js";
import { loadConfig } from "../src/config.js";
import { BlyssError } from "../src/errors.js";
import { init } from "../src/init/init.js";
import { serve } from "../src/server/server.js";

const [command, ...args] = process.argv.slice(2);
const projectDir = process.cwd();
const usage = `Usage: blyss init [directory]  copy the starter into a new or empty directory
       blyss build             build the website into its public directory
       blyss serve             serve it on PORT, or on server.fallbackPort
       blyss --help            show this help
       blyss --version         show the version of Blyss`;

function fail(label, error) {
  if (error instanceof BlyssError) console.error(error.message);
  else console.error(`${label} failed:`, error);
  process.exitCode = 1;
}

// What is wrong with the command line, followed by the commands.
function refuse(problem) {
  console.error(`${problem}\n${usage}`);
  process.exitCode = 1;
}

// build and serve take no arguments, and init none but its directory.
const unexpected = args.find((arg, index) => command !== "init" || index > 0 || arg.startsWith("-"));

if ([command, ...args].some(arg => arg === "--help" || arg === "-h")) {
  console.log(usage);
} else if (command === "--version" || command === "-v") {
  console.log(JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")).version);
} else if (!["init", "build", "serve"].includes(command)) {
  refuse(command === undefined ? "Blyss needs a command." : `Unknown command: ${command}`);
} else if (unexpected !== undefined) {
  refuse(`Unexpected argument: ${unexpected}`);
} else if (command === "init") {
  init(projectDir, args[0]).catch(error => fail("Init", error));
} else if (command === "build") {
  build(projectDir, "./blyss.config.js").catch(error => fail("Build", error));
} else {
  loadConfig(projectDir).then(config => serve(projectDir, config)).catch(error => fail("Serve", error));
}

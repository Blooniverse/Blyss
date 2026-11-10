#!/usr/bin/env node
import { build } from "../src/build/build.js";
import { loadConfig } from "../src/config.js";
import { BlyssError } from "../src/errors.js";
import { init } from "../src/init/init.js";
import { serve } from "../src/server/server.js";

const [command, ...args] = process.argv.slice(2);
const projectDir = process.cwd();

function fail(label, error) {
  if (error instanceof BlyssError) console.error(error.message);
  else console.error(`${label} failed:`, error);
  process.exitCode = 1;
}

if (command === "build") {
  build(projectDir, "./blyss.config.js").catch(error => fail("Build", error));
} else if (command === "serve") {
  loadConfig(projectDir).then(config => serve(projectDir, config)).catch(error => fail("Serve", error));
} else if (command === "init") {
  const unexpected = args.find((arg, index) => index > 0 || arg.startsWith("-"));
  if (unexpected === undefined) {
    init(projectDir, args[0]).catch(error => fail("Init", error));
  } else {
    console.error(`Unexpected argument: ${unexpected}`);
    console.error("Usage: blyss init [directory]");
    process.exit(1);
  }
} else {
  console.error(`Unknown command: ${command ?? "(none)"}`);
  console.error("Usage: blyss init [directory] | blyss build | blyss serve");
  process.exit(1);
}

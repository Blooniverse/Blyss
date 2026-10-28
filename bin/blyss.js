#!/usr/bin/env node
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "../src/build/build.js";
import { serve } from "../src/server/server.js";

const command = process.argv[2];
const projectDir = process.cwd();

async function loadConfig(dir) {
  const { default: config } = await import(pathToFileURL(join(dir, "blyss.config.js")).href);
  return config;
}

if (command === "build") {
  build(projectDir, "./blyss.config.js").catch(err => {
    console.error("Build failed:", err);
    process.exit(1);
  });
} else if (command === "serve") {
  loadConfig(projectDir).then(config => serve(projectDir, config)).catch(err => {
    console.error("Serve failed:", err);
    process.exit(1);
  });
} else {
  console.error(`Unknown command: ${command ?? "(none)"}`);
  console.error("Usage: blyss build | blyss serve");
  process.exit(1);
}

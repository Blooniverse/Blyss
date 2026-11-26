#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { build } from "../src/build/build.js";
import { check, printReport } from "../src/build/check.js";
import { loadConfig } from "../src/config.js";
import { BlyssError } from "../src/errors.js";
import { init } from "../src/init/init.js";
import { createContent, kinds } from "../src/new/new.js";
import { serve } from "../src/server/server.js";

const [command, ...args] = process.argv.slice(2);
const projectDir = process.cwd();
const usage = `Usage: blyss init [directory]  copy the starter into a new or empty directory
       blyss new <page|post|doc> [--lang <key>] [--slug <slug>] [--key <translationKey>] "<title>"
                               create a draft with a valid front matter
       blyss check [--json]    check the website with its drafts without writing anything
       blyss build [--drafts]  build the website, with --drafts also its drafts
       blyss serve [--hostbind <address>] [--port <number>] [--watch [--drafts]]
                               serve it, by default on 127.0.0.1, port 3000; with --watch, rebuild and reload on changes
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

// The options of a command: those of options take a value, such as --port 4000, which parse checks; switches take
// none. positional tells how many further arguments the command takes. Returns the options, the further arguments,
// or the problem with the command line.
function parseArgs(args, { options = {}, switches = [], positional = 0 }) {
  const parsed = {};
  const rest = [];
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (switches.includes(flag)) {
      parsed[flag.slice(2)] = true;
    } else if (Object.hasOwn(options, flag)) {
      const [name, parse] = options[flag];
      const value = args[++index];
      if (value === undefined) return { problem: `${flag} needs a value.` };
      if (parse(value) === undefined) return { problem: `Cannot use ${flag} ${JSON.stringify(value)}.` };
      parsed[name] = parse(value);
    } else if (!flag.startsWith("-") && rest.length < positional) {
      rest.push(flag);
    } else {
      return { problem: `Unexpected argument: ${flag}` };
    }
  }
  return { options: parsed, rest };
}

const text = value => (value.trim() ? value : undefined);
const commands = {
  init: { positional: 1 },
  new: { positional: 2, options: { "--lang": ["language", text], "--slug": ["slug", text], "--key": ["translationKey", text] } },
  check: { switches: ["--json"] },
  build: { switches: ["--drafts"] },
  serve: {
    switches: ["--watch", "--drafts"],
    options: {
      "--hostbind": ["hostBind", text],
      "--port": ["port", value => /^\d+$/.test(value) && Number(value) <= 65535 ? Number(value) : undefined]
    }
  }
};
const known = Object.hasOwn(commands, command);
let parsed = known ? parseArgs(args, commands[command]) : {};
if (command === "serve" && parsed.options?.drafts && !parsed.options.watch) parsed = { problem: "--drafts needs --watch: blyss serve builds nothing without it." };
if (command === "new" && !parsed.problem && (!Object.hasOwn(kinds, parsed.rest[0]) || parsed.rest.length < 2)) {
  parsed = { problem: Object.hasOwn(kinds, parsed.rest[0]) ? `blyss new ${parsed.rest[0]} needs a title.`
    : "blyss new needs the kind of the content, page, post or doc, and its title." };
}

if ([command, ...args].some(arg => arg === "--help" || arg === "-h")) {
  console.log(usage);
} else if (command === "--version" || command === "-v") {
  console.log(JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")).version);
} else if (!known) {
  refuse(command === undefined ? "Blyss needs a command." : `Unknown command: ${command}`);
} else if (parsed.problem) {
  refuse(parsed.problem);
} else if (command === "init") {
  init(projectDir, parsed.rest[0]).catch(error => fail("Init", error));
} else if (command === "new") {
  const [kind, title] = parsed.rest;
  createContent(projectDir, { kind, title, ...parsed.options })
    .then(file => console.log(`Created ${file} as a draft: remove its line draft: true to publish it.`))
    .catch(error => fail("New", error));
} else if (command === "check") {
  check(projectDir).then(report => {
    if (parsed.options.json) console.log(JSON.stringify(report, null, 2));
    else printReport(report);
    if (!report.ok) process.exitCode = 1;
  }).catch(error => fail("Check", error));
} else if (command === "build") {
  build(projectDir, "./blyss.config.js", { drafts: Boolean(parsed.options.drafts) }).catch(error => fail("Build", error));
} else {
  loadConfig(projectDir).then(config => serve(projectDir, config, parsed.options)).catch(error => fail("Serve", error));
}

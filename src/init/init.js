import { constants } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rm, rmdir, stat, writeFile } from "node:fs/promises";
import { builtinModules } from "node:module";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { BlyssError } from "../errors.js";

const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
const starterDirectory = join(packageRoot, "starters", "lean");
// npm never publishes files named .gitignore, so the starter stores them without the leading dot.
const renamedFiles = new Map([["gitignore", ".gitignore"]]);
const validNamePart = /^[a-z0-9][a-z0-9._-]*$/;
const reservedNames = new Set([...builtinModules, "node_modules", "favicon.ico"]);

function packageNameFor(destination) {
  const name = basename(destination);
  const scope = basename(dirname(destination));
  const scoped = `${scope}/${name}`;
  if (scope.startsWith("@") && validNamePart.test(scope.slice(1)) && validNamePart.test(name) && scoped.length <= 214) {
    return scoped;
  }
  const normalized = name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replaceAll("ß", "ss")
    .replace(/[^a-z0-9._-]+/g, "-").slice(0, 214).replace(/^[._-]+|[._-]+$/g, "");
  if (!normalized) return "blyss-website";
  return reservedNames.has(normalized) ? `${normalized}-website` : normalized;
}

async function renderPackageJson(destination) {
  const [template, blyss] = await Promise.all([
    readFile(join(starterDirectory, "package.json"), "utf8"),
    readFile(join(packageRoot, "package.json"), "utf8").then(JSON.parse)
  ]);
  const values = {
    SITE_PACKAGE_NAME: packageNameFor(destination),
    BLYSS_VERSION: `^${blyss.version}`,
    SUPPORTED_NODE_RANGE: blyss.engines.node
  };
  return template.replace(/__([A-Z][A-Z_]*)__/g, (token, key) => {
    if (typeof values[key] !== "string") throw new Error(`The starter contains an unknown token: ${token}`);
    return JSON.stringify(values[key]).slice(1, -1);
  });
}

async function readStarter() {
  const entries = await readdir(starterDirectory, { recursive: true, withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory() || entry.isFile())
    .map(entry => ({
      source: join(entry.parentPath, entry.name),
      target: join(relative(starterDirectory, entry.parentPath), renamedFiles.get(entry.name) ?? entry.name),
      isDirectory: entry.isDirectory()
    }))
    .sort((left, right) => left.target.split(sep).length - right.target.split(sep).length);
}

async function destinationExists(destination) {
  let info;
  try {
    info = await stat(destination);
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
  const problem = !info.isDirectory() ? "it is not a directory"
    : (await readdir(destination)).length > 0 ? "the directory is not empty" : "";
  if (problem) {
    throw new BlyssError(`Cannot initialize ${destination}: ${problem}.\n` +
      "Blyss never overwrites existing files. Choose a new or empty directory:\n  blyss init <directory>");
  }
  return true;
}

// Each call fails with EEXIST instead of replacing a path that appeared after the destination was checked.
function createEntry({ source, target, isDirectory }, path, packageJson) {
  if (isDirectory) return mkdir(path);
  if (target === "package.json") return writeFile(path, packageJson, { flag: "wx" });
  return copyFile(source, path, constants.COPYFILE_EXCL);
}

async function removeCreated(created) {
  for (const { path, isDirectory } of created.reverse()) {
    // rmdir only removes empty directories, so nothing added by another process is deleted.
    await (isDirectory ? rmdir(path) : rm(path, { force: true })).catch(() => {});
  }
}

function successMessage(cwd, destination, directory) {
  const steps = ["npm install", "npm run build", "npm start"];
  if (destination !== cwd) {
    const location = isAbsolute(directory) ? destination : relative(cwd, destination);
    steps.unshift(`cd ${/\s/.test(location) ? `"${location}"` : location}`);
  }
  return `Created a lean Blyss website in ${destination}.\n\nNext steps:\n${steps.map(step => `  ${step}`).join("\n")}`;
}

export async function init(projectDir, directory = ".") {
  const cwd = resolve(projectDir);
  const destination = resolve(cwd, directory);
  const created = [];
  try {
    const exists = await destinationExists(destination);
    const [entries, packageJson] = await Promise.all([readStarter(), renderPackageJson(destination)]);
    if (!exists) {
      // mkdir returns the first directory it created; record it and every directory below it.
      const first = await mkdir(destination, { recursive: true });
      for (let path = destination; first && path !== dirname(first); path = dirname(path)) {
        created.unshift({ path, isDirectory: true });
      }
    }
    for (const entry of entries) {
      const path = join(destination, entry.target);
      created.push({ path, isDirectory: entry.isDirectory });
      await createEntry(entry, path, packageJson).catch(error => {
        if (error.code === "EEXIST") created.pop(); // not created by this invocation
        throw error;
      });
    }
  } catch (error) {
    await removeCreated(created);
    if (error instanceof BlyssError || !error?.syscall) throw error;
    throw new BlyssError(`Cannot initialize ${destination}:\n  ${error.message}`, { cause: error });
  }
  console.log(successMessage(cwd, destination, directory));
}

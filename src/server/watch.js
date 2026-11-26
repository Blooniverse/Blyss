import { spawn } from "node:child_process";
import { existsSync, readFileSync, watch } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const cli = fileURLToPath(new URL("../../bin/blyss.js", import.meta.url));

// The nearest directory that exists: path itself or, while it is missing, the first of those above it.
const nearest = path => (existsSync(path) || dirname(path) === path ? path : nearest(dirname(path)));

// The files of a configuration: file with what it imports by a relative path, such as a configuration that it
// extends, and with what the modules among these import in turn. One that is missing counts as well: it may appear.
const imported = /\b(?:from|import)\s*(?:\(\s*)?(["'])(\.{1,2}\/[^"'\n]+)\1/g;
function configurationFiles(file, found = new Set()) {
  if (found.has(file)) return found;
  found.add(file);
  let source = "";
  try {
    if (/\.[cm]?[jt]s$/.test(file)) source = readFileSync(file, "utf8");
  } catch {
    // A module that cannot be read imports nothing.
  }
  for (const [, , specifier] of source.matchAll(imported)) {
    let module;
    try {
      module = fileURLToPath(new URL(specifier, pathToFileURL(file)));
    } catch {
      continue; // it names no file, as with a % that starts no escape: the build tells
    }
    configurationFiles(module, found);
  }
  return found;
}

// Watches a directory, with all that it holds if recursive, and calls changed with the path of what has changed in
// it, if that is known. While the directory is missing, such as static/ of a website without static files, the
// nearest one above it is watched for it: that the directory appears is a change, and so is that it goes. failed
// learns of a directory that cannot be watched. Returns a function that stops watching.
function observe(directory, recursive, changed, failed) {
  let watcher;
  let target;
  // True if the directory has appeared or has gone since it is watched, after which the watching follows it.
  const moved = () => {
    if (nearest(directory) === target) return false;
    const existed = target === directory;
    attach();
    if (existed !== (target === directory)) changed();
    return true;
  };
  // What is watched may go, or the directory appear, before the watching starts: it is looked for once more then.
  function attach() {
    do {
      watcher?.close();
      watcher = undefined;
      target = nearest(directory);
      try {
        watcher = watch(target, { recursive: recursive && target === directory }, (event, name) => {
          if (!moved() && target === directory) changed(name ? resolve(directory, name) : undefined);
        });
        watcher.on("error", error => { if (!moved()) failed(target, error); });
      } catch (error) {
        if (error.code !== "ENOENT" || nearest(directory) === target) {
          failed(target, error);
          return;
        }
      }
    } while (nearest(directory) !== target);
  }
  attach();
  return () => watcher?.close();
}

// Builds the website now and whenever one of its sources changes: a file in one of directories, such as _content/,
// or a file of its configuration (see configurationFiles above). Each build runs as blyss build in a process of
// its own, which reads the configuration afresh and tells what it says by now (see bin/blyss.js): the directories
// of the sources that it names are watched from then on, in place of directories. Changes that follow each other
// within a moment cause one build, and a change during a build causes another one after it. onBuilt learns how
// each build went: { ok: true, served } with what the build has told, or { ok: false, message } with what it wrote
// to stderr. Returns a function that stops watching and starts no further build; a build that is running is not
// interrupted, which would leave a part of the output: the promise that the function returns resolves once it ends.
export function rebuildOnChange(projectDir, directories, configFile, { drafts = false, onBuilt = () => {} } = {}) {
  const configuration = resolve(projectDir, configFile);
  let sources = directories.map(directory => resolve(projectDir, directory));
  let files = new Set();
  let child;
  let pending = false;
  let timer;
  let stopped = false;

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 100);
  };
  const failed = (path, error) => {
    const message = `Cannot watch ${relative(projectDir, path) || "."}: ${error.message}`;
    console.error(message);
    onBuilt({ ok: false, message });
  };

  // What is watched, by directory: those of the sources, each with all that it holds, and those of the files of
  // the configuration, each for these files alone, as editors replace a file rather than change it. A directory
  // that is no longer one of them is no longer watched.
  const watched = new Map();
  const arrange = () => {
    files = configurationFiles(configuration);
    const wanted = new Map([...sources.map(directory => [directory, true]), ...[...files].map(file => [dirname(file), false])]
      .map(([directory, recursive]) => [JSON.stringify([directory, recursive]), { directory, recursive }]));
    for (const [key, stop] of watched) {
      if (wanted.has(key)) continue;
      stop();
      watched.delete(key);
    }
    for (const [key, { directory, recursive }] of wanted) {
      if (watched.has(key)) continue;
      watched.set(key, observe(directory, recursive, path => { if (recursive || !path || files.has(path)) schedule(); }, failed));
    }
  };

  function rebuild() {
    if (stopped) return;
    if (child) {
      pending = true;
      return;
    }
    // The configuration may import other files by now.
    arrange();
    child = spawn(process.execPath, [cli, "build", ...(drafts ? ["--drafts"] : [])],
      { cwd: projectDir, stdio: ["ignore", "pipe", "pipe", "ipc"] });
    let stdout = "";
    let stderr = "";
    let served;
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    // The sources that the build names are watched at once, so that a change to them mends a build that fails.
    // Under node --watch, Node itself names the modules of the build on this channel: such a message is none of Blyss.
    child.on("message", message => {
      if (!message?.served) return;
      ({ served } = message);
      if (stopped) return;
      sources = served.sources;
      arrange();
    });
    child.on("close", code => {
      child = undefined;
      if (stopped) return;
      if (code === 0) {
        // Of all that the build says, the last line sums it up.
        console.log(`Rebuilt: ${stdout.trim().split("\n").at(-1)}`);
        onBuilt({ ok: true, served });
      } else {
        console.error(`${stderr.trim()}\nThe website was not rebuilt: it keeps its previous build until the next change.`);
        onBuilt({ ok: false, message: stderr.trim() });
      }
      if (pending) {
        pending = false;
        rebuild();
      }
    });
  }

  rebuild();
  return () => {
    stopped = true;
    clearTimeout(timer);
    for (const stop of watched.values()) stop();
    return new Promise(done => {
      if (child) child.once("close", done);
      else done();
    });
  };
}

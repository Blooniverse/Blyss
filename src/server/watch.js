import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync, watch } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { within } from "../build/paths.js";

const cli = fileURLToPath(new URL("../../bin/blyss.js", import.meta.url));

// The nearest directory that exists: path itself or, while it is missing, the first of those above it.
const nearest = path => (existsSync(path) || dirname(path) === path ? path : nearest(dirname(path)));

// What tells the directory at a path from one that has replaced it there: its number, which the next directory may
// get again, and the time of its birth.
function identityOf(path) {
  const { ino, birthtimeNs } = statSync(path, { bigint: true, throwIfNoEntry: false }) ?? {};
  return `${ino} ${birthtimeNs}`;
}

// Watches a directory, with all that it holds if recursive, and calls changed with the path of what has changed in
// it, or without one if no more is known than that some of it may have changed. While the directory is missing,
// such as static/ of a website without static files, the nearest one above it is watched for it: that the directory
// appears is a change of the directory itself, and so is that it goes. That another directory has replaced it, as
// when it is removed and made anew at once, is a change of which no more is known: where a directory is watched by
// its number, as on Linux, the one that was removed would be watched on, in vain. The directory above it tells
// that reliably, so that it is watched as well, for nothing else. failed learns of a directory that cannot be
// watched. Returns a function that stops watching.
function observe(directory, recursive, changed, failed) {
  let watchers = [];
  let target;
  let identity;
  // Watches anew if the directory has appeared, has gone or has been replaced since it is watched, and tells so.
  const follow = () => {
    if (nearest(directory) === target && identityOf(target) === identity) return false;
    const existed = target === directory;
    attach();
    if (existed !== (target === directory)) changed(directory);
    else if (existed) changed();
    return true;
  };
  const start = (path, options, heard) => {
    const watcher = watch(path, options, heard);
    watcher.on("error", error => { if (!follow()) failed(path, error); });
    watchers.push(watcher);
  };
  // What is watched may go, or the directory appear, before the watching starts: it is looked for once more then.
  // The identity is taken first: a directory that is replaced after that is found to be another at its next event.
  function attach() {
    do {
      for (const watcher of watchers.splice(0)) watcher.close();
      target = nearest(directory);
      identity = identityOf(target);
      try {
        start(target, { recursive: recursive && target === directory }, (event, name) => {
          const existed = target === directory;
          follow();
          if (existed && target === directory) changed(name ? resolve(directory, name) : undefined);
        });
        if (target === directory && dirname(directory) !== directory) start(dirname(directory), {}, follow);
      } catch (error) {
        if (error.code !== "ENOENT" || nearest(directory) === target) {
          failed(target, error);
          return;
        }
      }
    } while (nearest(directory) !== target);
  }
  attach();
  return () => { for (const watcher of watchers.splice(0)) watcher.close(); };
}

// Runs build in the process that rebuildOnChange below has started for it, and tells that server afterwards, also if
// the build fails:
// - served, what the configuration says by now, as the function of that name returns it (see servedOf in
//   server.js), unless the configuration is faulty;
// - files, the modules that the build has imported or looked for: blyss.config.js with those that it imports and
//   those of the data files of the components. Node names each as it resolves it, in whatever form it is
//   imported, so that no comment and no text is taken for a module. A module that is missing is told as well, so
//   that the website is built once it appears: the file that Node names in its error or, for require, which names
//   none, each file that it would take for a path (see "All together" in the documentation of the modules of Node).
// Once the server has gone, the build stops: it would write on beside the build of a server that is started anew.
export async function tellServer(served, build) {
  const gone = () => process.exit();
  process.once("disconnect", gone);
  const files = new Set();
  const note = url => {
    try {
      if (url.startsWith("file:")) files.add(resolve(fileURLToPath(url)));
    } catch {
      // It names no file, which Node tells itself.
    }
  };
  registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        const resolved = nextResolve(specifier, context);
        note(resolved.url);
        return resolved;
      } catch (error) {
        if (typeof error?.url === "string") {
          note(error.url);
        } else if (error?.code === "MODULE_NOT_FOUND" && /^(?:\.{0,2}\/|file:)/.test(specifier) && URL.canParse(specifier, context.parentURL)) {
          // The file of that path, also with an extension, or in the directory of that path the file that its
          // package.json names as main, likewise, or index.
          const { href } = new URL(specifier, context.parentURL);
          const paths = [href];
          try {
            const { main } = JSON.parse(readFileSync(new URL(`${href}/package.json`), "utf8"));
            if (typeof main === "string") paths.push(new URL(main, `${href}/`).href);
          } catch {
            // There is no package.json, or none that tells.
          }
          note(`${href}/package.json`);
          for (const path of paths) for (const end of ["", ".js", ".json", ".node", "/index.js", "/index.json", "/index.node"]) note(path + end);
        }
        throw error;
      }
    }
  });
  let told;
  try {
    told = await served();
    await build();
  } finally {
    process.off("disconnect", gone);
    process.send({ files: [...files], served: told }, () => {});
  }
}

// Builds the website now and whenever one of its sources changes: a file in a directory of the sources of served
// (see servedOf in server.js), such as _content/, the file of the configuration, or a module that a build has
// imported from elsewhere, such as one that the configuration imports. Each build runs as blyss build in a process
// of its own, which reads the configuration afresh and tells what it says by now and which modules it has imported
// (see tellServer above): these are watched from then on. Changes that follow each other within a moment cause one
// build, and a change during a build causes another one after it. onBuilt learns how each build went:
// { ok: true, served } with what the build has told, or { ok: false, message } with what it wrote to stderr.
// Returns a function that stops watching and starts no further build; a build that is running is not interrupted,
// which would leave a part of the output: the promise that the function returns resolves once it ends.
export function rebuildOnChange(projectDir, served, configFile, { drafts = false, onBuilt = () => {} } = {}) {
  const configuration = resolve(projectDir, configFile);
  let sources = served.sources.map(directory => resolve(projectDir, directory));
  let output = resolve(projectDir, served.publicDirectory);
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

  // The modules that are watched: the file of the configuration and those that a build has told, but none in the
  // output directory, nor that directory itself, and none in node_modules of the website. Every build deletes the
  // output directory and writes it anew, so that each build would cause the next.
  const watchable = file => !within(output, file) && !relative(projectDir, file).split(sep).includes("node_modules");
  const modulesOf = told => new Set([configuration, ...told.filter(watchable)]);
  let files = modulesOf([]);

  // What is watched, by directory: those of the sources, each with all that it holds, and those of the modules
  // elsewhere, each for these files alone, as editors replace a file rather than change it. That a directory
  // appears or goes counts as well. A change of which no more is known counts too, but not in a directory that
  // holds the output directory, such as that of blyss.config.js: a build may cause such a change itself. A
  // directory that is no longer one of them is no longer watched.
  const watched = new Map();
  const arrange = () => {
    const modules = [...files].filter(file => !sources.some(directory => within(directory, file)));
    const wanted = new Map([...sources.map(directory => [directory, true]), ...modules.map(file => [dirname(file), false])]
      .map(([directory, recursive]) => [JSON.stringify([directory, recursive]), { directory, recursive }]));
    for (const [key, stop] of watched) {
      if (wanted.has(key)) continue;
      stop();
      watched.delete(key);
    }
    for (const [key, { directory, recursive }] of wanted) {
      if (watched.has(key)) continue;
      const counts = path => (path ? recursive || path === directory || files.has(path) : !within(directory, output));
      watched.set(key, observe(directory, recursive, path => { if (counts(path)) schedule(); }, failed));
    }
  };

  function rebuild() {
    if (stopped) return;
    if (child) {
      pending = true;
      return;
    }
    child = spawn(process.execPath, [cli, "build", ...(drafts ? ["--drafts"] : [])],
      { cwd: projectDir, stdio: ["ignore", "pipe", "pipe", "ipc"] });
    let stdout = "";
    let stderr = "";
    let told;
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    // What the build tells is watched at once, also if the build has failed: a change to it mends the build. Under
    // node --watch, Node itself names the modules of the build on this channel: such a message is none of Blyss.
    child.on("message", message => {
      if (!Array.isArray(message?.files)) return;
      told = message.served;
      if (stopped) return;
      if (told) {
        sources = told.sources;
        output = told.publicDirectory;
      }
      files = modulesOf(message.files);
      arrange();
    });
    child.on("close", code => {
      child = undefined;
      if (stopped) return;
      if (code === 0) {
        // Of all that the build says, the last line sums it up.
        console.log(`Rebuilt: ${stdout.trim().split("\n").at(-1)}`);
        onBuilt({ ok: true, served: told });
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

  arrange();
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

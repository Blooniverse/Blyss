import { spawn } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readlinkSync, realpathSync, statSync, watch } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isSystemFile, within } from "../build/paths.js";

const cli = fileURLToPath(new URL("../../bin/blyss.js", import.meta.url));

// The variable of the environment by which a server tells a build that it runs it. Another program may run
// blyss build with a channel of its own, as a process manager does: that build is one like any other.
export const forServer = "BLYSS_TELL_SERVER";

// The nearest directory that exists: path itself or, while it is missing, the first of those above it.
const nearest = path => (existsSync(path) || dirname(path) === path ? path : nearest(dirname(path)));

// What the file system tells of a path: nothing of one that is missing, or of which it cannot tell.
function statOf(path) {
  try {
    return statSync(path, { bigint: true });
  } catch {
    return {};
  }
}

// What tells the directory at a path from one that has replaced it there: its number, which the next directory may
// get again, and the time of its birth.
function identityOf(path) {
  const { ino, birthtimeNs } = statOf(path);
  return `${ino} ${birthtimeNs}`;
}

// What tells a file from what it was when a build read it: the time of its last change, its size and its number.
function versionOf(path) {
  const { mtimeNs, size, ino } = statOf(path);
  return `${mtimeNs} ${size} ${ino}`;
}

// Watches a directory, with all that it holds if recursive, and calls changed with the path of what has changed in
// it, or without one if no more is known than that some of it may have changed: the directory has appeared, has
// gone or has been replaced by another. While the directory is missing, such as static/ of a website without static
// files, the nearest one above it is watched for it. Where a directory is watched by its number, as on Linux, one
// that is removed and made anew at once would be watched on as the one that is gone, in vain: the directory above
// it tells that reliably, so that it is watched as well, for nothing else. failed learns of a directory that cannot
// be watched. Returns a function that stops watching.
function observe(directory, recursive, changed, failed) {
  let watchers = [];
  let target;
  let identity;
  // Watches anew if the directory has appeared, has gone or has been replaced since it is watched, and tells so.
  const follow = () => {
    if (nearest(directory) === target && identityOf(target) === identity) return false;
    const existed = target === directory;
    attach();
    if (existed || target === directory) changed();
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

// The file of a URL, if it names one.
const fileOf = url => (url.startsWith("file:") ? [fileURLToPath(url)] : []);

// The file that import takes for a name that is a path, which it reads as a URL. A path of require need be none,
// as one with a % that starts no escape: it has no such file.
function importedOf(specifier, parentURL) {
  try {
    return /^(?:\.{0,2}\/|file:)/.test(specifier) ? fileOf(new URL(specifier, parentURL).href) : [];
  } catch {
    return [];
  }
}

// The files that require takes for a name that is a path: the file of that path, also with an extension, or in the
// directory of that path the file that its package.json names as main, likewise, or index (see "All together" in
// the documentation of the modules of Node). The path counts as it is written, and is no URL: a # or a ? is part
// of the name of a file. A name that is no path, as that of a package, has none.
function requiredOf(specifier, parentURL) {
  if (!/^\.{1,2}(?:[/\\]|$)/.test(specifier) && !isAbsolute(specifier)) return [];
  const path = resolve(dirname(fileURLToPath(parentURL)), specifier);
  const paths = [path];
  try {
    const { main } = JSON.parse(readFileSync(join(path, "package.json"), "utf8"));
    if (typeof main === "string") paths.push(resolve(path, main));
  } catch {
    // There is no package.json, or none that tells.
  }
  const ends = ["", ".js", ".json", ".node", ...["index.js", "index.json", "index.node"].map(name => sep + name)];
  return [join(path, "package.json"), ...paths.flatMap(base => ends.map(end => base + end))];
}

// The files that a module which Node has looked for in vain may be: the website is built once one of them appears.
// For import, the error names the file. For require, the error names none: if a package.json maps the name to a
// file, the error has the path of that package.json, and the first line of its message is the name of the file
// and nothing more; else they are the files that require takes for a path.
function missingOf(specifier, parentURL, error) {
  if (typeof error.url === "string") return fileOf(error.url);
  if (error.code !== "MODULE_NOT_FOUND") return [];
  const [, mapped = ""] = (typeof error.path === "string" && /^Cannot find module '(.*)'$/m.exec(error.message)) || [];
  return isAbsolute(mapped) ? [mapped] : requiredOf(specifier, parentURL);
}

// True for a path at which a link is; false also for one that is missing, or below a file.
function isLink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

// The links on the way of a path, followed by the path that they lead to, at which nothing need be: the file and
// each directory above it may be a link, and so may those of the path that such a link leads to.
function followLinks(path, links = []) {
  const found = [];
  for (let current = path; dirname(current) !== current; current = dirname(current)) {
    if (!links.includes(current) && isLink(current)) found.push(current);
  }
  const [lowest] = found;
  let all = [...links, ...found];
  let end = path;
  try {
    // Each link leads to a path with links of its own, and the lowest one to where this path ends.
    for (const link of found.toReversed()) {
      const target = resolve(realpathSync(dirname(link)), readlinkSync(link));
      const way = followLinks(link === lowest ? join(target, relative(link, path)) : target, all);
      all = way.slice(0, -1);
      if (link === lowest) end = way.at(-1);
    }
  } catch {
    // A link has gone meanwhile: no more is known of the way.
  }
  return [...all, end];
}

// The links that lead to a file which Node has found for a name. Node names the file itself, and no link on the
// way to it, such as a current.js that is a link to the settings in use: once that link leads to another file, the
// website is another one, though no file has changed. If the name is a path, the links are on the way of that
// path: of its file for import, which reads the path as a URL, and of the files that require takes for it. None
// is looked for if one of these is the file itself, as it is for nearly every name: no link leads to it then.
function linksTo(file, specifier, parentURL) {
  const imported = importedOf(specifier, parentURL);
  const paths = imported.includes(file) ? imported : [...imported, ...requiredOf(specifier, parentURL)];
  return paths.includes(file) ? [] : paths.flatMap(path => followLinks(path).slice(0, -1));
}

// Runs build in the process that rebuildOnChange below has started for it, and tells that server
// - served, what the configuration says by now, as the function of that name returns it (see servedOf in
//   server.js), before the build: the server watches the sources that it names from then on;
// - files, once the build has ended, also if it has failed: the modules that it has imported or looked for, which
//   are blyss.config.js with those that it imports and those of the data files of the components. Node names each
//   as it resolves it, in whatever form it is imported, so that no comment and no text is taken for a module. Each
//   is told with its version by then, which is before Node reads it: the server learns of a module only after the
//   build has read it, and so finds out whether it has changed meanwhile. With a module that Node has found
//   through links, these are told (see linksTo above). A module that is missing is told as the files that it may
//   be (see missingOf above), each with the links on its way and the path that they lead to: such a file may be
//   a link that leads nowhere.
// Once the server has gone, the build stops, and it does not start if the server has gone before: it would write
// beside the build of a server that is started anew.
export async function tellServer(served, build) {
  const gone = () => process.exit();
  if (!process.connected) gone();
  process.once("disconnect", gone);
  const files = new Map();
  const note = paths => {
    try {
      for (const path of paths()) if (!files.has(path)) files.set(path, versionOf(path));
    } catch {
      // It names no file, which Node tells itself.
    }
  };
  registerHooks({
    resolve(specifier, context, nextResolve) {
      let resolved;
      try {
        resolved = nextResolve(specifier, context);
      } catch (error) {
        note(() => missingOf(specifier, context.parentURL, error).flatMap(path => followLinks(path)));
        throw error;
      }
      note(() => fileOf(resolved.url));
      note(() => fileOf(resolved.url).flatMap(file => linksTo(file, specifier, context.parentURL)));
      return resolved;
    }
  });
  try {
    process.send({ blyss: { served: await served() } }, () => {});
    await build();
  } finally {
    process.off("disconnect", gone);
    process.send({ blyss: { files: [...files] } }, () => {});
  }
}

// Builds the website now and whenever one of its sources changes: a file in a directory of the sources of served
// (see servedOf in server.js), such as _content/, the file of the configuration, or a module that a build has
// imported from elsewhere, such as one that the configuration imports. Each build runs as blyss build in a process
// of its own, which reads the configuration afresh and tells what it says by now and which modules it has imported
// (see tellServer above): these are watched from then on, and the website is built once more if one of them has
// changed since that build read it. Changes that follow each other within a moment cause one build, and a change
// during a build causes another one after it. onBuilt learns how each build went:
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

  // The modules that are watched, each with its version as the last build has read it: the file of the
  // configuration and those that a build has told, but none in the output directory, nor that directory itself, and
  // none in node_modules of the website. Every build deletes the output directory and writes it anew, so that each
  // build would cause the next.
  const watchable = file => !within(output, file) && !relative(projectDir, file).split(sep).includes("node_modules");
  const modulesOf = told => new Map([[configuration, versionOf(configuration)], ...told.filter(([file]) => watchable(file))]);
  let files = modulesOf([]);
  // True for a module that is no longer what the last build has read.
  const isStale = file => versionOf(file) !== files.get(file);

  // What is watched, by directory: those of the sources, each with all that it holds, and those of the modules
  // elsewhere, each for these files alone, as editors replace a file rather than change it. Where no more is known
  // of a directory of modules than that some of it may have changed, it has if one of its modules is no longer
  // what the last build has read: a build changes none of them, but may cause such a change in a directory that
  // holds the output directory. A directory that is no longer one of them is no longer watched.
  const watched = new Map();
  const arrange = () => {
    const modules = [...files.keys()].filter(file => !sources.some(directory => within(directory, file)));
    const wanted = new Map([...sources.map(directory => [directory, true]), ...modules.map(file => [dirname(file), false])]
      .map(([directory, recursive]) => [JSON.stringify([directory, recursive]), { directory, recursive }]));
    for (const [key, stop] of watched) {
      if (wanted.has(key)) continue;
      stop();
      watched.delete(key);
    }
    for (const [key, { directory, recursive }] of wanted) {
      if (watched.has(key)) continue;
      const counts = path => recursive ||
        (path ? files.has(path) : [...files.keys()].some(file => dirname(file) === directory && isStale(file)));
      // A file that the operating system writes into a folder that it shows, as the Finder does, changes no page.
      watched.set(key, observe(directory, recursive, path => { if (!(path && isSystemFile(path)) && counts(path)) schedule(); }, failed));
    }
  };

  function rebuild() {
    if (stopped) return;
    if (child) {
      pending = true;
      return;
    }
    // This build reads all that has changed until now: no further one is due for that.
    clearTimeout(timer);
    // The environment tells the build that a server runs it, which it is to tell (see tellServer above).
    child = spawn(process.execPath, [cli, "build", ...(drafts ? ["--drafts"] : [])],
      { cwd: projectDir, env: { ...process.env, [forServer]: "1" }, stdio: ["ignore", "pipe", "pipe", "ipc"] });
    let stdout = "";
    let stderr = "";
    let told;
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    // What the build tells is watched at once, also if the build fails: a change to it mends the build. Under
    // node --watch, Node itself names the modules of the build on this channel, which is none of what Blyss tells.
    child.on("message", message => {
      const { served: says, files: modules } = message?.blyss ?? {};
      if (says) told = says;
      if (stopped || !(says || modules)) return;
      if (says) ({ sources, publicDirectory: output } = says);
      // The server learns of a module only here, after the build has read it. One that it is told for the first
      // time may have changed since, unnoticed: the website is built once more if it has. As only a module that is
      // new to the server is looked at, and that after it is watched, this happens once for each at most.
      const fresh = (modules ?? []).filter(([file]) => !files.has(file));
      if (modules) files = modulesOf(modules);
      arrange();
      if (fresh.some(([file]) => files.has(file) && isStale(file))) schedule();
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

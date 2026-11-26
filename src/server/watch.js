import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../../bin/blyss.js", import.meta.url));

// Builds the website now and whenever one of its sources changes: a file in one of directories, such as _content/,
// or the file of its configuration. Each build runs as blyss build in a process of its own, which reads the
// configuration afresh, and changes that follow each other within a moment cause one build. A change during a build
// causes another one after it. onBuilt learns how each build went: { ok: true }, or { ok: false, message } with
// what the build wrote to stderr. Returns a function that stops watching.
export function rebuildOnChange(projectDir, directories, configFile, { drafts = false, onBuilt = () => {} } = {}) {
  let building = false;
  let pending = false;
  let timer;
  let stopped = false;

  const rebuild = () => {
    if (building) {
      pending = true;
      return;
    }
    building = true;
    const child = spawn(process.execPath, [cli, "build", ...(drafts ? ["--drafts"] : [])], { cwd: projectDir });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("close", code => {
      building = false;
      if (stopped) return;
      if (code === 0) {
        // Of all that the build says, the last line sums it up.
        console.log(`Rebuilt: ${stdout.trim().split("\n").at(-1)}`);
        onBuilt({ ok: true });
      } else {
        console.error(`${stderr.trim()}\nThe website was not rebuilt: it keeps its previous build until the next change.`);
        onBuilt({ ok: false, message: stderr.trim() });
      }
      if (pending) {
        pending = false;
        rebuild();
      }
    });
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 100);
  };

  // A directory that is missing, such as static/ of a website without static files, is not watched.
  const watchers = [];
  const observe = (path, options, filter = () => true) => {
    try {
      const watcher = watch(path, options, (event, name) => { if (filter(name)) schedule(); });
      watcher.on("error", error => {
        const message = `Cannot watch ${path}: ${error.message}`;
        console.error(message);
        onBuilt({ ok: false, message });
      });
      watchers.push(watcher);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  };
  for (const directory of directories) observe(directory, { recursive: true });
  // Editors replace a file rather than change it, so its directory is watched, for its name.
  observe(dirname(configFile), {}, name => name === basename(configFile));
  rebuild();
  return () => {
    stopped = true;
    clearTimeout(timer);
    for (const watcher of watchers) watcher.close();
  };
}

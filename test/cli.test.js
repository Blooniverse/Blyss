import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { chmod, cp, mkdir, mkdtemp, readdir, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const cli = join(root, "bin", "blyss.js");
const starter = join(root, "starters", "lean");
const blyss = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const validPackageName = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;

let sandbox;
before(async () => { sandbox = await realpath(await mkdtemp(join(tmpdir(), "blyss-test-"))); });
after(() => rm(sandbox, { recursive: true, force: true }));

function run(args, cwd) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });
}

async function listFiles(directory) {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  return entries.filter(entry => entry.isFile())
    .map(entry => relative(directory, join(entry.parentPath, entry.name)).split(sep).join("/"))
    .sort();
}

async function starterFiles() {
  return (await listFiles(starter)).map(file => file === "gitignore" ? ".gitignore" : file).sort();
}

async function emptyDirectory(name) {
  const path = join(sandbox, name);
  await mkdir(path, { recursive: true });
  return path;
}

async function freePort() {
  const probe = createServer().listen(0, "127.0.0.1");
  await once(probe, "listening");
  const { port } = probe.address();
  probe.close();
  await once(probe, "close");
  return port;
}

describe("blyss init <new-directory>", () => {
  let result;
  let site;
  before(() => {
    site = join(sandbox, "new", "site");
    result = run(["init", join("new", "site")], sandbox);
  });

  test("creates the complete starter", async () => {
    assert.equal(result.status, 0, result.stderr);
    const files = await starterFiles();
    assert.deepEqual(await listFiles(site), files);
    for (const file of files.filter(file => file !== "package.json")) {
      const source = join(starter, file === ".gitignore" ? "gitignore" : file);
      assert.equal(await readFile(join(site, file), "utf8"), await readFile(source, "utf8"), file);
    }
  });

  test("prints the destination and next steps", () => {
    assert.equal(result.stdout, `Created a lean Blyss website in ${site}.\n\nNext steps:\n` +
      `  cd ${join("new", "site")}\n  npm install\n  npm run build\n  npm start\n`);
  });

  test("copies dotfiles such as .gitignore", async () => {
    const gitignore = await readFile(join(site, ".gitignore"), "utf8");
    for (const pattern of ["node_modules/", "dist/", "*.log", ".DS_Store"]) {
      assert.ok(gitignore.split("\n").includes(pattern), pattern);
    }
  });

  test("leaves no replacement tokens in package.json", async () => {
    assert.doesNotMatch(await readFile(join(site, "package.json"), "utf8"), /__[A-Z_]+__/);
  });

  test("depends on the running Blyss version and its Node.js range", async () => {
    const sitePackage = JSON.parse(await readFile(join(site, "package.json"), "utf8"));
    assert.equal(sitePackage.name, "site");
    assert.equal(sitePackage.dependencies["@blooniverse/blyss"], `^${blyss.version}`);
    assert.equal(sitePackage.engines.node, blyss.engines.node);
  });
});

describe("blyss init", () => {
  test("accepts an existing empty directory", async () => {
    const site = await emptyDirectory("empty");
    const result = run(["init", site], sandbox);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(await listFiles(site), await starterFiles());
  });

  test("initializes an empty current working directory", async () => {
    const site = await emptyDirectory("current");
    const result = run(["init"], site);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `Created a lean Blyss website in ${site}.\n\nNext steps:\n` +
      "  npm install\n  npm run build\n  npm start\n");
    assert.deepEqual(await listFiles(site), await starterFiles());
  });

  test("refuses a non-empty directory or a file without changing it", async () => {
    const site = await emptyDirectory("occupied");
    await writeFile(join(site, "notes.txt"), "keep me");
    for (const destination of [site, join(site, "notes.txt")]) {
      const result = run(["init", destination], sandbox);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /^Cannot initialize .+: (the directory is not empty|it is not a directory)\./);
      assert.doesNotMatch(result.stderr, /\n\s+at /);
    }
    assert.deepEqual(await readdir(site), ["notes.txt"]);
    assert.equal(await readFile(join(site, "notes.txt"), "utf8"), "keep me");
  });

  test("rejects options and extra arguments", async () => {
    const cwd = await emptyDirectory("arguments");
    for (const args of [["init", "--force"], ["init", "one", "two"]]) {
      const result = run(args, cwd);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /^Unexpected argument: (--force|two)\nUsage: blyss init \[directory\]/);
    }
    assert.deepEqual(await readdir(cwd), []);
  });

  test("derives npm-compatible package names from the directory", async () => {
    const cases = [
      ["My Blyss Site!", "my-blyss-site"],
      ["Über Straße", "uber-strasse"],
      [join("@acme", "site"), "@acme/site"],
      [join("@Acme", "Site"), "site"],
      ["http", "http-website"]
    ];
    for (const [index, [directory, expected]] of cases.entries()) {
      const cwd = await emptyDirectory(join("names", String(index)));
      assert.equal(run(["init", directory], cwd).status, 0, directory);
      const { name } = JSON.parse(await readFile(join(cwd, directory, "package.json"), "utf8"));
      assert.equal(name, expected);
      assert.match(name, validPackageName);
    }
  });

  const unreadableSkip = process.platform === "win32" || process.getuid?.() === 0
    ? "an unreadable starter file requires POSIX permissions and a non-root user" : false;
  test("removes only what it created when copying fails", { skip: unreadableSkip }, async () => {
    const copy = await emptyDirectory("unreadable-package");
    for (const path of ["package.json", "src", "starters"]) {
      await cp(join(root, path), join(copy, path), { recursive: true });
    }
    await chmod(join(copy, "starters", "lean", "templates", "post.html"), 0o000);
    const { init } = await import(pathToFileURL(join(copy, "src", "init", "init.js")).href);
    const failure = { name: "BlyssError", message: /^Cannot initialize .+:\n {2}EACCES: permission denied/ };

    await assert.rejects(init(sandbox, join("rollback", "new", "site")), failure);
    await assert.rejects(stat(join(sandbox, "rollback")), { code: "ENOENT" });

    const existing = await emptyDirectory("rollback-existing");
    await assert.rejects(init(sandbox, existing), failure);
    assert.deepEqual(await readdir(existing), []);
  });
});

describe("a generated starter", () => {
  let site;
  before(() => {
    site = join(sandbox, "built");
    assert.equal(run(["init", site], sandbox).status, 0);
  });

  test("builds with the local Blyss package", async () => {
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
    const pages = ["en/", "en/about/", "en/posts/hello-world/", "de/", "de/about/", "de/posts/hallo-welt/"];
    assert.deepEqual(await listFiles(join(site, "dist")),
      ["assets/css/main.css", "robots.txt", ...pages.map(page => `${page}index.html`)].sort());
    for (const page of pages) {
      const html = await readFile(join(site, "dist", page, "index.html"), "utf8");
      assert.doesNotMatch(html, /{{\w+}}/, page);
      const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
      assert.ok(Array.isArray(jsonLd["@graph"]), page);
    }
    const post = await readFile(join(site, "dist", "en", "posts", "hello-world", "index.html"), "utf8");
    assert.match(post, /<a lang="de" hreflang="de" href="\/de\/posts\/hallo-welt\/">Deutsch<\/a>/);
  });

  test("is served for a smoke test and terminates cleanly", { timeout: 15_000 }, async () => {
    const port = await freePort();
    const server = spawn(process.execPath, [cli, "serve"], { cwd: site, env: { ...process.env, PORT: String(port) } });
    const exited = once(server, "exit");
    let stderr = "";
    server.stderr.on("data", chunk => { stderr += chunk; });
    try {
      await new Promise((resolve, reject) => {
        let stdout = "";
        server.stdout.on("data", chunk => {
          stdout += chunk;
          if (stdout.includes(`Blyss is serving dist/ on port ${port}`)) resolve();
        });
        exited.then(() => reject(new Error(`blyss serve exited early: ${stderr}`)), reject);
      });
      const base = `http://127.0.0.1:${port}`;
      const home = await fetch(`${base}/`, { redirect: "manual" });
      await home.text();
      assert.equal(home.status, 302);
      assert.equal(home.headers.get("location"), "/en/");
      for (const [path, status] of [["/en/", 200], ["/de/posts/hallo-welt/", 200], ["/assets/css/main.css", 200], ["/missing/", 404]]) {
        const response = await fetch(base + path);
        await response.text();
        assert.equal(response.status, status, path);
      }
    } finally {
      server.kill();
    }
    await exited;
    assert.equal(stderr, "");
  });

  test("lists the three newest posts of each language by datePublished", async () => {
    const posts = join(sandbox, "recent-posts");
    assert.equal(run(["init", posts], sandbox).status, 0);
    for (const [slug, date] of [["oldest", "2026-01-01"], ["newest", "2026-12-31"], ["older", "2026-06-30"]]) {
      await writeFile(join(posts, "content", "en", "posts", `${slug}.md`),
        `---\ntitle: ${slug}\ndatePublished: ${date}\n---\n\nText.\n`);
    }
    const result = run(["build"], posts);
    assert.equal(result.status, 0, result.stderr);
    const recentPosts = async language => {
      const home = await readFile(join(posts, "dist", language, "index.html"), "utf8");
      return [...home.matchAll(/<li><a href="\/\w+\/posts\/([^/]+)\/">/g)].map(match => match[1]);
    };
    assert.deepEqual(await recentPosts("en"), ["newest", "hello-world", "older"]);
    assert.deepEqual(await recentPosts("de"), ["hallo-welt"]);
  });
});

describe("missing configuration", () => {
  test("build and serve fail with an actionable message", async () => {
    const site = await emptyDirectory("unconfigured");
    for (const command of ["build", "serve"]) {
      const result = run([command], site);
      assert.equal(result.status, 1, command);
      assert.equal(result.stderr, `Blyss configuration not found:\n  ${join(site, "blyss.config.js")}\n\n` +
        "Create a starter website with:\n  blyss init\n");
    }
    assert.deepEqual(await readdir(site), []);
  });

  test("is not confused with a missing module imported by the configuration", async () => {
    const site = await emptyDirectory("broken-config");
    await writeFile(join(site, "blyss.config.js"), 'import "./missing.js";\nexport default {};\n');
    const result = run(["build"], site);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^Build failed: Error \[ERR_MODULE_NOT_FOUND\]: Cannot find module .*missing\.js/);
    assert.doesNotMatch(result.stderr, /Blyss configuration not found/);
  });
});

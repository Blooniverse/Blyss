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
    for (const pattern of ["node_modules/", "public/", "*.log", ".DS_Store"]) {
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
    const pages = [["en", "hello-world"], ["de", "hallo-welt"]].flatMap(([language, post]) =>
      ["", "about/", "posts/", `posts/${post}/`, "tags/", "tags/blyss/", "tags/markdown/"].map(path => `${language}/${path}`));
    assert.deepEqual(await listFiles(join(site, "public")),
      ["assets/css/main.css", "robots.txt", "sitemap.xml", ...pages.map(page => `${page}index.html`)].sort());
    for (const page of pages) {
      const html = await readFile(join(site, "public", page, "index.html"), "utf8");
      assert.doesNotMatch(html, /{{\w+}}/, page);
      const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
      assert.ok(Array.isArray(jsonLd["@graph"]), page);
    }
    const post = await readFile(join(site, "public", "en", "posts", "hello-world", "index.html"), "utf8");
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
          if (stdout.includes(`Blyss is serving public/ on port ${port}`)) resolve();
        });
        exited.then(() => reject(new Error(`blyss serve exited early: ${stderr}`)), reject);
      });
      const base = `http://127.0.0.1:${port}`;
      const home = await fetch(`${base}/`, { redirect: "manual" });
      await home.text();
      assert.equal(home.status, 302);
      assert.equal(home.headers.get("location"), "/en/");
      for (const [path, status] of [["/en/", 200], ["/de/posts/hallo-welt/", 200], ["/en/posts/", 200], ["/de/tags/blyss/", 200],
        ["/sitemap.xml", 200], ["/assets/css/main.css", 200], ["/missing/", 404]]) {
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
});

describe("a site with several tagged posts", () => {
  let site;
  const page = path => readFile(join(site, "public", path, "index.html"), "utf8");
  const main = async path => {
    const html = await page(path);
    return html.slice(html.indexOf("<main>"), html.indexOf("</main>"));
  };
  const postSlugs = async path => [...(await main(path)).matchAll(/href="\/\w+\/posts\/([^/"]+)\/"/g)].map(match => match[1]);

  before(async () => {
    site = join(sandbox, "blog");
    assert.equal(run(["init", site], sandbox).status, 0);
    const posts = {
      oldest: "title: Oldest\ndatePublished: 2026-01-01\ntags: Blyss",
      newest: 'title: </script><script>alert(1)</script>\ndatePublished: 2026-12-31\ntags:\n  - Static Sites\n  - "Über Blyss"',
      older: "title: Older\ndatePublished: 2026-06-30\ntags: [blyss, static sites]"
    };
    for (const [slug, frontMatter] of Object.entries(posts)) {
      await writeFile(join(site, "content", "en", "posts", `${slug}.md`), `---\n${frontMatter}\n---\n\nText.\n`);
    }
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
  });

  test("lists the three newest posts of each language by datePublished", async () => {
    assert.deepEqual(await postSlugs("en"), ["newest", "hello-world", "older"]);
    assert.deepEqual(await postSlugs("de"), ["hallo-welt"]);
  });

  test("archives all posts newest first", async () => {
    assert.deepEqual(await postSlugs("en/posts"), ["newest", "hello-world", "older", "oldest"]);
    assert.match(await page("en"), /<a href="\/en\/posts\/">Posts<\/a>/);
  });

  test("links posts to their tags, spelled as in the newest tagged post", async () => {
    assert.match(await main("en/posts/older"), new RegExp('<p>Tags: <a href="/en/tags/blyss/" rel="tag">Blyss</a>, ' +
      '<a href="/en/tags/static-sites/" rel="tag">Static Sites</a></p>'));
  });

  test("lists every tag with its post count and the posts of each tag", async () => {
    const tags = [...(await main("en/tags")).matchAll(/<li><a href="[^"]+">([^<]+)<\/a> (\(\d+\))<\/li>/g)];
    assert.deepEqual(tags.map(([, name, count]) => `${name} ${count}`),
      ["Blyss (3)", "Markdown (1)", "Static Sites (2)", "Über Blyss (1)"]);
    assert.deepEqual(await postSlugs("en/tags/blyss"), ["hello-world", "older", "oldest"]);
    assert.deepEqual(await postSlugs("en/tags/static-sites"), ["newest", "older"]);
    assert.deepEqual(await postSlugs("en/tags/uber-blyss"), ["newest"]);
    assert.match(await page("en/tags/blyss"), /<a lang="de" hreflang="de" href="\/de\/tags\/blyss\/">Deutsch<\/a>/);
  });

  test("writes a sitemap of every page with dates and translations", async () => {
    const sitemap = await readFile(join(site, "public", "sitemap.xml"), "utf8");
    const pages = (await listFiles(join(site, "public"))).filter(file => file.endsWith("index.html"))
      .map(file => `https://example.com/${file.replace(/index\.html$/, "")}`);
    assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]).sort(), pages.sort());
    const post = sitemap.split("<url>").find(entry => entry.includes("<loc>https://example.com/en/posts/hello-world/</loc>"));
    assert.match(post, /<lastmod>2026-11-10<\/lastmod>/);
    for (const [hreflang, path] of [["de", "de/posts/hallo-welt/"], ["en", "en/posts/hello-world/"], ["x-default", "en/"]]) {
      assert.ok(post.includes(`<xhtml:link rel="alternate" hreflang="${hreflang}" href="https://example.com/${path}"/>`), hreflang);
    }
  });

  test("escapes JSON-LD so that content cannot close its script element", async () => {
    const html = await page("en/posts/newest");
    assert.equal(html.match(/<\/script/gi).length, 1);
    const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const post = jsonLd["@graph"].find(node => node["@type"] === "BlogPosting");
    assert.equal(post.name, "</script><script>alert(1)</script>");
    assert.deepEqual(post.keywords, ["Static Sites", "Über Blyss"]);
  });
});

describe("invalid content", () => {
  let site;
  before(() => {
    site = join(sandbox, "invalid");
    assert.equal(run(["init", site], sandbox).status, 0);
    assert.equal(run(["build"], site).status, 0);
  });

  const page = join("content", "en", "pages", "posts.md");
  const post = join("content", "en", "posts", "symbols.md");
  const cases = [
    ["a page with the URL of a generated page", page, "---\ntitle: Posts\n---\n",
      `Cannot build /en/posts/: ${page} and the generated page "Posts" have the same URL.\nRename ${page} or give it a different slug.\n`],
    ["a tag without a Latin letter or digit", post, '---\ntitle: Symbols\ntags: [Blyss, "#"]\n---\n',
      `Cannot build ${post}: the tag "#" needs a Latin letter or digit for its URL.\n`]
  ];
  for (const [name, file, source, message] of cases) {
    test(`rejects ${name} and keeps the previous output`, async () => {
      await writeFile(join(site, file), source);
      try {
        const result = run(["build"], site);
        assert.equal(result.status, 1);
        assert.equal(result.stderr, message);
        assert.ok((await stat(join(site, "public", "en", "index.html"))).isFile());
      } finally {
        await rm(join(site, file));
      }
    });
  }
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

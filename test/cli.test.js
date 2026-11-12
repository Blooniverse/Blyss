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
    const pages = [["en", "hello-world", "templates", "translations"], ["de", "hallo-welt", "uebersetzungen", "vorlagen"]]
      .flatMap(([language, ...posts]) => ["", "about/", "posts/", ...posts.map(post => `posts/${post}/`), "tags/", "tags/blyss/",
        "tags/markdown/"].map(path => `${language}/${path}index.html`));
    const notFoundPages = ["404.html", "en/404.html", "de/404.html"];
    assert.deepEqual(await listFiles(join(site, "public")), ["assets/css/main.css", "assets/img/logo.svg", "assets/js/overlay.js",
      "robots.txt", "sitemap.xml", "staticwebapp.config.json", ...pages, ...notFoundPages].sort());
    for (const page of [...pages, ...notFoundPages]) {
      const html = await readFile(join(site, "public", page), "utf8");
      assert.doesNotMatch(html, /{{\w+}}/, page);
      const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
      assert.ok(Array.isArray(jsonLd["@graph"]), page);
    }
    const post = await readFile(join(site, "public", "en", "posts", "hello-world", "index.html"), "utf8");
    assert.match(post, /<a lang="de" hreflang="de" href="\/de\/posts\/hallo-welt\/">Deutsch<\/a>/);
    assert.equal(await readFile(join(site, "public", "404.html"), "utf8"), await readFile(join(site, "public", "en", "404.html"), "utf8"));
    assert.match(await readFile(join(site, "public", "de", "404.html"), "utf8"), /<h1>Seite nicht gefunden<\/h1>/);
  });

  test("renders the home pages with home.html: title and slogan in the header, then the article", async () => {
    assert.match(await readFile(join(site, "public", "en", "index.html"), "utf8"), new RegExp("</aside>\\s*<div class=\"page\">\\s*" +
      "<header>\\s*<h1>Blyss</h1>\\s*<h2>Blyss slogan</h2>\\s*</header>\\s*<main>\\s*<article>\\s*<h3>Blyss about or description</h3>"));
    const german = await readFile(join(site, "public", "de", "index.html"), "utf8");
    for (const label of ['<label for="overlay-slider">Schieberegler</label>', "<h3>Neueste Inhalte</h3>",
      '<input type="search" aria-label="Suchen" placeholder="Suchen">']) {
      assert.ok(german.includes(label), label);
    }
  });

  test("marks every page with its kind and the layout of blyss.config.js", async () => {
    const kinds = { "en/index.html": "home", "de/about/index.html": "page", "en/posts/hello-world/index.html": "post",
      "de/posts/index.html": "list", "en/tags/blyss/index.html": "list", "de/404.html": "not-found" };
    for (const [path, kind] of Object.entries(kinds)) {
      const html = await readFile(join(site, "public", path), "utf8");
      assert.ok(html.includes(`<body data-kind="${kind}" data-align="left" style="--site-margin: 2vmin">`), path);
    }
  });

  test("configures Azure Static Web Apps like blyss serve", async () => {
    const { default: config } = await import(pathToFileURL(join(site, "blyss.config.js")).href);
    const azure = JSON.parse(await readFile(join(site, "public", "staticwebapp.config.json"), "utf8"));
    assert.deepEqual(azure.routes, [{ route: "/", redirect: `/${config.site.defaultLanguage}/`, statusCode: 302 }]);
    assert.ok((await stat(join(site, "public", azure.responseOverrides["404"].rewrite))).isFile());
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
        ["/de/404.html", 200], ["/sitemap.xml", 200], ["/assets/css/main.css", 200], ["/assets/js/overlay.js", 200],
        ["/assets/img/logo.svg", 200], ["/missing/", 404]]) {
        const response = await fetch(base + path);
        await response.text();
        assert.equal(response.status, status, path);
      }
      const missing = await fetch(`${base}/de/missing/`);
      assert.equal(missing.status, 404);
      assert.equal(missing.headers.get("content-type"), "text/html; charset=utf-8");
      assert.match(await missing.text(), /<h1>Page not found<\/h1>/);

      await rm(join(site, "public", "404.html"));
      const plain = await fetch(`${base}/missing/`);
      assert.equal(plain.status, 404);
      assert.equal(await plain.text(), "404 Not Found");
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
    const configFile = join(site, "blyss.config.js");
    const config = await readFile(configFile, "utf8");
    assert.ok(config.includes("pageSize: 10"));
    await writeFile(configFile, config.replace("pageSize: 10", "pageSize: 2"));
    for (const language of ["en", "de"]) {
      const home = join(site, "content", language, "pages", "index.md");
      await writeFile(home, `${await readFile(home, "utf8")}\n{{recentPosts}}\n`);
    }
    const words = Array.from({ length: 80 }, (_, index) => `w${index + 1}`).join(" ");
    const posts = {
      oldest: ["title: Oldest\ndatePublished: 2026-01-01\ntags: Blyss", "Text."],
      newest: ['title: </script><script>alert(1)</script>\ndatePublished: 2026-12-31\ntags:\n  - Static Sites\n  - "Über Blyss"',
        `## Heading\n\nOne *two* \`three\` [four](/en/) <b>five</b> 6 < 7 & 8.\n\n\`\`\`\ncode block\n\`\`\`\n\n${words}`],
      older: ["title: Older\ndatePublished: 2026-06-30\ntags: [blyss, static sites]", "Text."]
    };
    for (const [slug, [frontMatter, body]] of Object.entries(posts)) {
      await writeFile(join(site, "content", "en", "posts", `${slug}.md`), `---\n${frontMatter}\n---\n\n${body}\n`);
    }
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
  });

  test("lists the three newest posts of each language by datePublished", async () => {
    assert.deepEqual(await postSlugs("en"), ["newest", "templates", "translations"]);
    assert.deepEqual(await postSlugs("de"), ["vorlagen", "uebersetzungen", "hallo-welt"]);
  });

  test("shows the three newest posts with an 80-word teaser in the overlay of every page", async () => {
    const overlay = async path => {
      const html = await readFile(join(site, "public", path), "utf8");
      return html.slice(html.indexOf('<div id="overlay"'), html.indexOf("</aside>"));
    };
    const home = await overlay("en/index.html");
    for (const path of ["en/about/index.html", "en/posts/older/index.html", "en/tags/index.html", "en/404.html"]) {
      assert.equal(await overlay(path), home, path);
    }
    assert.deepEqual([...home.matchAll(/<h4><a href="\/en\/posts\/([^/]+)\/">/g)].map(match => match[1]),
      ["newest", "templates", "translations"]);
    const words = Array.from({ length: 70 }, (_, index) => `w${index + 1}`).join(" ");
    assert.ok(home.includes('<h4><a href="/en/posts/newest/">&lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt;</a></h4>\n' +
      `    <p>One two three four five 6 &lt; 7 &amp; 8. ${words}…</p>\n  </li>`));
    assert.match(await overlay("de/index.html"), /<h4><a href="\/de\/posts\/vorlagen\/">Vorlagen und Stile<\/a><\/h4>/);
  });

  test("archives all posts newest first, pageSize posts per page", async () => {
    assert.deepEqual(await postSlugs("en/posts"), ["newest", "templates"]);
    assert.deepEqual(await postSlugs("en/posts/page/2"), ["translations", "hello-world"]);
    assert.deepEqual(await postSlugs("en/posts/page/3"), ["older", "oldest"]);
    await assert.rejects(stat(join(site, "public", "en", "posts", "page", "4")), { code: "ENOENT" });
    assert.match(await page("en"), /<a href="\/en\/posts\/">Posts<\/a>/);
  });

  test("links paginated lists to newer and older pages", async () => {
    const pager = (newer, older) => '<nav aria-label="Pagination">\n<ul>\n' +
      (newer ? `  <li><a href="${newer}" rel="prev">Newer posts</a></li>\n` : "") +
      (older ? `  <li><a href="${older}" rel="next">Older posts</a></li>\n` : "") + "</ul>\n</nav>";
    assert.ok((await main("en/posts")).includes(pager(null, "/en/posts/page/2/")));
    assert.ok((await main("en/posts/page/2")).includes(pager("/en/posts/", "/en/posts/page/3/")));
    assert.ok((await main("en/posts/page/3")).includes(pager("/en/posts/page/2/", null)));
    assert.match(await page("en/posts/page/2"), /<title>Posts – Page 2 \| My Website<\/title>/);
    assert.doesNotMatch(await main("de/tags/markdown"), /<nav/);
    assert.doesNotMatch(await main("en/tags/static-sites"), /<nav/);
    await assert.rejects(stat(join(site, "public", "en", "tags", "static-sites", "page")), { code: "ENOENT" });
  });

  test("links posts to their tags, spelled as in the newest tagged post", async () => {
    assert.match(await main("en/posts/older"), new RegExp('<p>Tags: <a href="/en/tags/blyss/" rel="tag">Blyss</a>, ' +
      '<a href="/en/tags/static-sites/" rel="tag">Static Sites</a></p>'));
  });

  test("lists every tag with its post count and the posts of each tag", async () => {
    const tags = [...(await main("en/tags")).matchAll(/<li><a href="[^"]+">([^<]+)<\/a> (\(\d+\))<\/li>/g)];
    assert.deepEqual(tags.map(([, name, count]) => `${name} ${count}`),
      ["Blyss (5)", "Markdown (1)", "Static Sites (2)", "Über Blyss (1)"]);
    assert.deepEqual(await postSlugs("en/tags/blyss"), ["templates", "translations"]);
    assert.deepEqual(await postSlugs("en/tags/blyss/page/2"), ["hello-world", "older"]);
    assert.deepEqual(await postSlugs("en/tags/blyss/page/3"), ["oldest"]);
    assert.deepEqual(await postSlugs("en/tags/static-sites"), ["newest", "older"]);
    assert.deepEqual(await postSlugs("en/tags/uber-blyss"), ["newest"]);
    assert.match(await page("en/tags/blyss"), /<a lang="de" hreflang="de" href="\/de\/tags\/blyss\/">Deutsch<\/a>/);
  });

  test("writes a sitemap of every page with dates and translations", async () => {
    const sitemap = await readFile(join(site, "public", "sitemap.xml"), "utf8");
    const pages = (await listFiles(join(site, "public"))).filter(file => file.endsWith("index.html"))
      .map(file => `https://example.com/${file.replace(/index\.html$/, "")}`);
    assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]).sort(), pages.sort());
    assert.doesNotMatch(sitemap, /404/);
    const post = sitemap.split("<url>").find(entry => entry.includes("<loc>https://example.com/en/posts/hello-world/</loc>"));
    assert.match(post, /<lastmod>2026-11-10<\/lastmod>/);
    for (const [hreflang, path] of [["de", "de/posts/hallo-welt/"], ["en", "en/posts/hello-world/"], ["x-default", "en/"]]) {
      assert.ok(post.includes(`<xhtml:link rel="alternate" hreflang="${hreflang}" href="https://example.com/${path}"/>`), hreflang);
    }
  });

  test("escapes JSON-LD so that content cannot close its script element", async () => {
    const html = await page("en/posts/newest");
    assert.equal(html.match(/<\/script/gi).length, 2, "the scripts of overlay.js and JSON-LD");
    const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const post = jsonLd["@graph"].find(node => node["@type"] === "BlogPosting");
    assert.equal(post.name, "</script><script>alert(1)</script>");
    assert.deepEqual(post.keywords, ["Static Sites", "Über Blyss"]);
  });
});

describe("a site without templates/home.html", () => {
  test("renders its home pages with page.html", async () => {
    const site = join(sandbox, "without-home-template");
    assert.equal(run(["init", site], sandbox).status, 0);
    await rm(join(site, "templates", "home.html"));
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
    const html = await readFile(join(site, "public", "en", "index.html"), "utf8");
    assert.ok(html.includes('<body data-kind="home" '));
    assert.match(html, /<main>\s*<article>\s*<header>\s*<h1>Blyss<\/h1>\s*<\/header>\s*<h3>Blyss about or description<\/h3>/);
  });
});

describe("a site with its own layout and slider", () => {
  let site;
  let configFile;
  const page = path => readFile(join(site, "public", path), "utf8");
  const slider = async path => {
    const html = await page(path);
    return html.slice(html.indexOf('<div class="slider">'), html.indexOf("<p>", html.indexOf('<div class="slider">')));
  };
  const settings = config => config.slice(config.indexOf("  layout: {"), config.indexOf("  directories: {"));

  before(async () => {
    site = join(sandbox, "custom-layout");
    assert.equal(run(["init", site], sandbox).status, 0);
    configFile = join(site, "blyss.config.js");
    const config = await readFile(configFile, "utf8");
    await writeFile(configFile, config.replace(settings(config), `  layout: { margin: "3rem", align: "center" },
  slider: {
    start: -10,
    end: 30,
    steps: [
      { value: 30, description: { en: "Hot", de: "Heiß" } },
      { value: -10, description: { en: "Cold & <icy>", de: "Kalt" } },
      { value: 0, description: { en: "Frost", de: "Frost" } }
    ]
  },
`));
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
  });

  test("applies layout.margin and layout.align to every page", async () => {
    for (const path of ["en/index.html", "de/posts/index.html", "en/posts/hello-world/index.html", "404.html"]) {
      assert.match(await page(path), /<body data-kind="[\w-]+" data-align="center" style="--site-margin: 3rem">/, path);
    }
  });

  test("runs the slider from start to end, starting halfway, with its steps sorted and described in each language", async () => {
    const steps = (cold, frost, hot) => '<output for="overlay-slider" aria-hidden="true">10</output>\n' +
      '        <input id="overlay-slider" type="range" min="-10" max="30" value="10">\n<ol>\n' +
      `  <li style="--position: 0%"><data value="-10">-10</data> ${cold}</li>\n` +
      `  <li style="--position: 25%" aria-current="step"><data value="0">0</data> ${frost}</li>\n` +
      `  <li style="--position: 100%"><data value="30">30</data> ${hot}</li>\n</ol>`;
    assert.ok((await slider("en/index.html")).includes(steps("Cold &amp; &lt;icy&gt;", "Frost", "Hot")));
    assert.ok((await slider("de/about/index.html")).includes(steps("Kalt", "Frost", "Heiß")));
    assert.ok((await slider("de/index.html")).includes('<h3><label for="overlay-slider">Schieberegler</label></h3>'));
  });

  test("falls back to a left-aligned layout and a slider from 0 to 100 without steps, and accepts a margin of 0", async () => {
    const config = await readFile(configFile, "utf8");
    await writeFile(configFile, config.replace(settings(config), "  layout: { margin: 0 },\n"));
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
    assert.ok((await page("en/index.html")).includes('<body data-kind="home" data-align="left" style="--site-margin: 0px">'));
    const fallback = await slider("en/index.html");
    assert.ok(fallback.includes('<input id="overlay-slider" type="range" min="0" max="100" value="50">'));
    assert.doesNotMatch(fallback, /<ol>/);
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

describe("invalid configuration", () => {
  let site;
  let config;
  before(async () => {
    site = join(sandbox, "unsafe", "site");
    assert.equal(run(["init", site], sandbox).status, 0);
    assert.equal(run(["build"], site).status, 0);
    config = await readFile(join(site, "blyss.config.js"), "utf8");
  });

  async function withConfig(search, replacement, check) {
    assert.ok(config.includes(search), search);
    await writeFile(join(site, "blyss.config.js"), config.replace(search, replacement));
    try {
      await check();
    } finally {
      await writeFile(join(site, "blyss.config.js"), config);
    }
  }

  // Each value would delete the website or one of its sources if Blyss accepted it.
  for (const [value, requirement] of [[".", "a subdirectory of SITE"], ["..", "a subdirectory of SITE"],
    ["content", "separate from directories.content"], ["static/assets", "separate from directories.static"]]) {
    test(`refuses directories.public "${value}" without deleting anything`, async () => {
      const files = await listFiles(join(sandbox, "unsafe"));
      const message = `Cannot use directories.public "${value}": every build deletes it, so it must be ` +
        `${requirement.replace("SITE", site)}.\nUse a dedicated directory such as "public".\n`;
      await withConfig('public: "public"', `public: "${value}"`, async () => {
        for (const command of ["build", "serve"]) {
          const env = { ...process.env, PORT: String(await freePort()) };
          const result = spawnSync(process.execPath, [cli, command], { cwd: site, encoding: "utf8", env, timeout: 10_000 });
          assert.equal(result.status, 1, command);
          assert.equal(result.stderr, message, command);
        }
      });
      assert.deepEqual(await listFiles(join(sandbox, "unsafe")), files);
    });
  }

  test("refuses a pagination.pageSize that is not a whole number greater than 0", async () => {
    for (const value of ["0", '"10"']) {
      await withConfig("pageSize: 10", `pageSize: ${value}`, async () => {
        const result = run(["build"], site);
        assert.equal(result.status, 1, value);
        assert.equal(result.stderr, `Cannot use pagination.pageSize ${value}: it must be a whole number greater than 0.\n`);
        assert.ok((await stat(join(site, "public", "en", "index.html"))).isFile());
      });
    }
  });

  test("refuses a layout or slider setting that the templates cannot use", async () => {
    for (const [search, replacement, message] of [
      ['margin: "2vmin"', 'margin: "2em"', 'layout.margin "2em": it must be a CSS length in px, rem, vw, vh, vmin or vmax, such as "2vmin"'],
      ['margin: "2vmin"', 'margin: "2vmin; color: red"',
        'layout.margin "2vmin; color: red": it must be a CSS length in px, rem, vw, vh, vmin or vmax, such as "2vmin"'],
      ['align: "left"', 'align: "right"', 'layout.align "right": it must be "left" or "center"'],
      ["start: 1,", "start: 1.5,", "slider.start 1.5: it must be a whole number"],
      ["end: 1000", "end: 1", "slider.end 1: it must be a whole number greater than slider.start (1)"],
      ["value: 250,", "value: 1001,", "slider.steps[1].value 1001: it must be a whole number from 1 to 1000"],
      ['de: "Viertel"', 'fr: "Quart"', 'slider.steps[1].description: it needs a text for the language "de"']
    ]) {
      await withConfig(search, replacement, async () => {
        const result = run(["build"], site);
        assert.equal(result.status, 1, replacement);
        assert.equal(result.stderr, `Cannot use ${message}.\n`);
        assert.ok((await stat(join(site, "public", "en", "index.html"))).isFile());
      });
    }
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

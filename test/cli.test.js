import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { chmod, cp, mkdir, mkdtemp, readdir, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { connect, createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, posix, relative, sep, win32 } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { escapeHtml } from "../src/build/html.js";
import { fileFor } from "../src/server/server.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const cli = join(root, "bin", "blyss.js");
const starter = join(root, "starters", "lean");
const blyss = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const validPackageName = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
// chmod cannot make a file unreadable on Windows or for the superuser.
const cannotRestrict = process.platform === "win32" || process.getuid?.() === 0;

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

// The title, description and section headings of a text of the starter, as its pages show them: the tests of
// the starter follow its wording, which changes more often than the engine.
async function starterText(language, ...file) {
  const source = await readFile(join(starter, "_content", language, ...file), "utf8");
  const field = name => escapeHtml(source.match(new RegExp(`^${name}: (.*)$`, "m"))?.[1] ?? "");
  const heading = /^(?:hero|overlay)Texts\.md$/.test(file.at(-1)) ? /^#### (.+)$/gm : /^### (.+)$/gm;
  return { title: field("title"), description: field("description"),
    headings: [...source.matchAll(heading)].map(match => escapeHtml(match[1])) };
}

async function enableStarterComponent(site, name) {
  const configFile = join(site, "blyss.config.js");
  const config = await readFile(configFile, "utf8");
  const setting = `${name}: false`;
  assert.ok(config.includes(setting), setting);
  await writeFile(configFile, config.replace(setting, `${name}: true`));
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

// Runs check with the base URL of blyss serve for site, then stops the server; returns what it wrote to stderr.
async function whileServing(site, check) {
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
    await check(`http://127.0.0.1:${port}`);
  } finally {
    server.kill();
  }
  await exited;
  return stderr;
}

describe("blyss", () => {
  test("shows its commands for --help and its version for --version", () => {
    for (const args of [["--help"], ["-h"], ["build", "--help"]]) {
      const result = run(args, sandbox);
      assert.equal(result.status, 0, args.join(" "));
      assert.match(result.stdout, /^Usage: blyss init \[directory\] .+\n {7}blyss build .+\n {7}blyss serve .+\n {7}blyss --help .+\n {7}blyss --version .+\n$/);
      assert.equal(result.stderr, "");
    }
    for (const flag of ["--version", "-v"]) {
      const result = run([flag], sandbox);
      assert.equal(result.status, 0, flag);
      assert.equal(result.stdout, `${blyss.version}\n`);
    }
  });

  test("refuses a missing or unknown command and arguments of build and serve, and names the commands", async () => {
    const cwd = await emptyDirectory("commands");
    for (const [args, problem] of [[[], "Blyss needs a command."], [["bild"], "Unknown command: bild"],
      [["build", "now"], "Unexpected argument: now"], [["serve", "--port", "4000"], "Unexpected argument: --port"]]) {
      const result = run(args, cwd);
      assert.equal(result.status, 1, args.join(" "));
      assert.ok(result.stderr.startsWith(`${problem}\nUsage: blyss init [directory] `), result.stderr);
      assert.equal(result.stdout, "");
    }
    assert.deepEqual(await readdir(cwd), []);
  });
});

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

  test("accepts a directory that holds nothing but .git, which it leaves as it is", async () => {
    const site = await emptyDirectory("repository");
    await mkdir(join(site, ".git"));
    await writeFile(join(site, ".git", "HEAD"), "ref: refs/heads/main\n");
    const result = run(["init", site], sandbox);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(await listFiles(site), [".git/HEAD", ...await starterFiles()].sort());
    assert.equal(await readFile(join(site, ".git", "HEAD"), "utf8"), "ref: refs/heads/main\n");
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

  const unreadableSkip = cannotRestrict ? "an unreadable starter file requires POSIX permissions and a non-root user" : false;
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
  // The starter with every variant of every component switched on, in the hero and in the overlay.
  let full;
  before(async () => {
    site = join(sandbox, "built");
    assert.equal(run(["init", site], sandbox).status, 0);
    await enableStarterComponent(site, "componentSliderHero");
    full = join(sandbox, "built-full");
    assert.equal(run(["init", full], sandbox).status, 0);
    const configFile = join(full, "blyss.config.js");
    const config = await readFile(configFile, "utf8");
    assert.equal(config.match(/component\w+(?:Hero|Overlay): false/g).length, 5);
    await writeFile(configFile, config.replace(/(component\w+(?:Hero|Overlay)): false/g, "$1: true"));
    const result = run(["build"], full);
    assert.equal(result.status, 0, result.stderr);
  });

  test("builds with the local Blyss package", async () => {
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
    const pages = [["en", ["hello-world", "templates"], ["installation", "configuration", "templates", "components", "deployment", "development", "writing", "writing/book", "writing/book/docs", "writing/book/navigation", "writing/pages-and-posts", "writing/translations", "writing/markdown-spice", "writing/labels-numbers-references"]],
      ["de", ["hallo-welt", "vorlagen"], ["installation", "konfiguration", "vorlagen", "komponenten", "bereitstellung", "entwicklung", "schreiben", "schreiben/buch", "schreiben/buch/dokumente", "schreiben/buch/navigation", "schreiben/seiten-und-beitraege", "schreiben/uebersetzungen", "schreiben/markdown-wuerze", "schreiben/labels-nummern-referenzen"]]]
      .flatMap(([language, posts, docs]) => ["", "pages/about/", "posts/", ...posts.map(post => `posts/${post}/`), "tags/", "tags/blyss/",
        "tags/markdown/", "book/", ...docs.map(doc => `book/${doc}/`)].map(path => `${language}/${path}index.html`));
    const notFoundPages = ["404.html", "en/404.html", "de/404.html"];
    // Static files are copied as they are; components publish their files but their templates and data files.
    const componentFiles = (await listFiles(join(starter, "components"))).filter(file => !/\.(?:html|data\.js)$/.test(file));
    assert.deepEqual(componentFiles, ["componentFlowchart", "componentFlower", "componentGallery", "componentMermaid", "componentSlider", "componentVegaLite"]
      .flatMap(name => ["css", "js"].map(type => `${name}/${name}.${type}`)));
    assert.deepEqual(await listFiles(join(site, "public")), [...await listFiles(join(starter, "static")),
      ...componentFiles.map(file => `components/${file}`), "sitemap.xml", ...pages, ...notFoundPages].sort());
    for (const page of [...pages, ...notFoundPages]) {
      const html = await readFile(join(site, "public", page), "utf8");
      assert.doesNotMatch(html.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, ""), /{{\w+}}/, page);
      const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
      assert.ok(Array.isArray(jsonLd["@graph"]), page);
      // Only the not-found pages ask search engines to leave them out.
      assert.equal(html.includes('<meta name="robots" content="noindex">'), notFoundPages.includes(page), page);
    }
    const post = await readFile(join(site, "public", "en", "posts", "hello-world", "index.html"), "utf8");
    assert.match(post, /<a lang="de" hreflang="de" href="\/de\/posts\/hallo-welt\/">Deutsch<\/a>/);
    assert.equal(await readFile(join(site, "public", "404.html"), "utf8"), await readFile(join(site, "public", "en", "404.html"), "utf8"));
    assert.match(await readFile(join(site, "public", "de", "404.html"), "utf8"), /<h1>Seite nicht gefunden<\/h1>/);
  });

  test("links each doc to its translation, also in a section within a section", async () => {
    for (const [english, german] of [
      ["installation", "installation"], ["configuration", "konfiguration"], ["templates", "vorlagen"],
      ["components", "komponenten"], ["deployment", "bereitstellung"], ["development", "entwicklung"],
      ["writing", "schreiben"], ["writing/book", "schreiben/buch"], ["writing/book/docs", "schreiben/buch/dokumente"],
      ["writing/book/navigation", "schreiben/buch/navigation"], ["writing/pages-and-posts", "schreiben/seiten-und-beitraege"],
      ["writing/translations", "schreiben/uebersetzungen"], ["writing/markdown-spice", "schreiben/markdown-wuerze"],
      ["writing/labels-numbers-references", "schreiben/labels-nummern-referenzen"]
    ]) {
      const en = await readFile(join(site, "public", "en", "book", english, "index.html"), "utf8");
      const de = await readFile(join(site, "public", "de", "book", german, "index.html"), "utf8");
      assert.ok(en.includes(`hreflang="de" href="https://example.com/de/book/${german}/"`), english);
      assert.ok(de.includes(`hreflang="en" href="https://example.com/en/book/${english}/"`), german);
    }
  });

  test("renders the home pages with a site header and the title and slogan inside main", async () => {
    const { title, description } = await starterText("en", "pages", "index.md");
    const english = (await readFile(join(site, "public", "en", "index.html"), "utf8")).replace(/>\s+</g, "><");
    assert.ok(english.includes(`<header class="site-bar">`));
    assert.ok(english.includes(`<nav aria-label="Main navigation">`));
    assert.ok(english.includes(`</header><div class="page"><main><header><h1>${title}</h1><h2>${description}</h2></header><article>`));
    assert.match(english, /<\/article><\/main><\/div><aside class="hero" aria-label="Highlights">.*<\/aside><footer>/s);
    const german = await readFile(join(site, "public", "de", "index.html"), "utf8");
    const [slider, heroTexts] = await Promise.all([starterText("de", "components", "componentSliderHero.md"), starterText("de", "heroTexts.md")]);
    for (const label of [`<h3><label for="componentSliderHero-1-input">${slider.title}</label></h3>`, `<h3>${heroTexts.title}</h3>`,
      '<input type="search" aria-label="Suchen" placeholder="Suchen">']) {
      assert.ok(german.includes(label), label);
    }
    assert.doesNotMatch(german, /<component-(?:gallery|flower)/);
    const switchedOn = await readFile(join(full, "public", "de", "index.html"), "utf8");
    for (const name of ["componentGalleryHero", "componentFlowerHero"]) {
      const { title: heading } = await starterText("de", "components", `${name}.md`);
      assert.ok(switchedOn.includes(`<h3 id="${name}-1-title">${heading}</h3>`), name);
    }
  });

  test("shows the gallery, switched on, with its settings, its texts and its images, which load lazily", async () => {
    const html = await readFile(join(full, "public", "de", "pages", "about", "index.html"), "utf8");
    assert.ok(html.includes('<component-gallery class="component" role="group" aria-labelledby="componentGalleryOverlay-1-title" ' +
      'style="--height-overall: 8rem; --scale-center: 1.4; --height-expanded: 70; --speed-scrolling: 400ms; --speed-enlargement: 300ms">'));
    for (const label of ["Vorheriges Bild", "Nächstes Bild"]) assert.ok(html.includes(`<button type="button" aria-label="${label}">`), label);
    const images = [...html.matchAll(/<li><img loading="lazy" src="\/(assets\/img\/gallery\/[^"]+)" alt="[^"]+"><\/li>/g)].map(match => match[1]);
    assert.equal(images.length, 7);
    for (const image of images) assert.ok((await stat(join(full, "public", image))).isFile(), image);
  });

  test("shows the flower, switched on, with its colours, a button for each petal and the texts of the petals", async () => {
    const headings = { en: ["Pluck a petal", "One text each", "Count them", "Three colours"],
      de: ["Zupfen Sie ein Blatt", "Je ein Text", "Zählen Sie nach", "Drei Farben"] };
    for (const [language, label] of [["en", "Petal"], ["de", "Blütenblatt"]]) {
      const html = await readFile(join(full, "public", language, "index.html"), "utf8");
      const flower = html.slice(html.indexOf("<component-flower "), html.indexOf("</component-flower>"));
      assert.ok(flower.startsWith('<component-flower class="component" role="group" aria-labelledby="componentFlowerHero-1-title" ' +
        'style="--hue-petals: 202; --hue-centre: 322; --hue-stem: 82; --petal-width: 0.9; --speed-falling: 3s; --speed-text: 3s; ' +
        '--speed-fading: 4s; --opacity-fallen: 0.2; --font-size-text: 0.6">'), language);
      assert.deepEqual([...flower.matchAll(/<button type="button" class="petal" style="--angle: ([\d.]+)deg" aria-label="([^"]+)" disabled><\/button>/g)]
        .map(match => match.slice(1)), [0, 90, 180, 270].map((angle, index) => [String(angle), `${label} ${index + 1}`]));
      assert.deepEqual([...flower.matchAll(/<li>\n<h3>([^<]+)<\/h3>\n<p>/g)].map(match => match[1]), headings[language]);
      assert.equal(flower.match(/<span style="--lie: -?\d+deg"><\/span>/g).length, 4, language);
    }
  });

  test("gives the hero and the overlay each their own variant of a component, with its own texts", async () => {
    const flower = async (path, region) => {
      const html = (await readFile(join(full, "public", path), "utf8")).match(new RegExp(`<aside class="${region}"[\\s\\S]*?</aside>`))[0];
      return html.slice(html.indexOf("<component-flower "), html.indexOf("</component-flower>"));
    };
    const hero = await flower("en/index.html", "hero");
    const overlay = await flower("en/pages/about/index.html", "overlay");
    assert.ok(hero.includes('aria-labelledby="componentFlowerHero-1-title"') && hero.includes("<code>componentFlowerHero.md</code>"));
    assert.ok(overlay.includes('aria-labelledby="componentFlowerOverlay-1-title"') && overlay.includes("<code>componentFlowerOverlay.md</code>"));
    assert.doesNotMatch(hero, /componentFlowerOverlay/);
    assert.doesNotMatch(overlay, /componentFlowerHero/);
  });

  test("shows a variant and a component in a post that names them in a paragraph or in a block of its own, next to the overlay's variant", async () => {
    const html = await readFile(join(site, "public", "en", "posts", "templates", "index.html"), "utf8");
    const [article, overlay] = html.split('<aside class="overlay"');
    assert.match(article, /like the hero&#39;s slider here:<\/p>\n<link [^>]+>\n<script [^>]+><\/script>\n<component-slider class="component">\n {2}<h3><label for="componentSliderHero-1-input">Slider<\/label><\/h3>/);
    // The block of the component itself sets its title, its range, its steps and its text.
    assert.ok(article.includes('<component-slider class="component">\n  <h3><label for="componentSlider-1-input">A slider of its own</label></h3>\n' +
      '  <output for="componentSlider-1-input" aria-hidden="true">5</output>\n' +
      '  <input id="componentSlider-1-input" type="range" min="0" max="10" value="5">\n\n<p>It runs from 0 to 10 and has no steps.</p>\n'));
    assert.ok(overlay.includes('<input id="componentSliderOverlay-1-input" type="range" min="1" max="10000" value="5000">'));
    assert.equal(html.match(/ id="[^"]+"/g).length, new Set(html.match(/ id="[^"]+"/g)).size);
  });

  test("marks every page with its kind and the layout of blyss.config.js", async () => {
    const { default: { layout } } = await import(pathToFileURL(join(site, "blyss.config.js")).href);
    const kinds = { "en/index.html": "home", "de/pages/about/index.html": "page", "en/posts/hello-world/index.html": "post",
      "de/posts/index.html": "list", "en/tags/blyss/index.html": "list", "en/book/index.html": "book",
      "de/book/schreiben/buch/navigation/index.html": "book", "de/404.html": "not-found" };
    for (const [path, kind] of Object.entries(kinds)) {
      const html = await readFile(join(site, "public", path), "utf8");
      const align = kind === "home" ? layout.alignHome : layout.alignOther;
      assert.ok(html.includes(`<body data-kind="${kind}" data-align="${align}" data-align-hero="${layout.alignHero}" ` +
        `data-align-overlay="${layout.alignOverlay}" style="--site-margin: ${layout.margin}; --hero-padding: ${layout.paddingHero}; ` +
        `--overlay-padding: ${layout.paddingOverlay}">`), path);
    }
  });

  test("configures Azure Static Web Apps like blyss serve", async () => {
    const { default: config } = await import(pathToFileURL(join(site, "blyss.config.js")).href);
    const azure = JSON.parse(await readFile(join(site, "public", "staticwebapp.config.json"), "utf8"));
    assert.deepEqual(azure.routes, [{ route: "/", redirect: `/${config.site.defaultLanguage}/`, statusCode: 302 }]);
    assert.ok((await stat(join(site, "public", azure.responseOverrides["404"].rewrite))).isFile());
  });

  test("shows formulas as MathML, footnotes, highlighted code and diagrams in the doc that describes them", async () => {
    const english = await readFile(join(site, "public", "en", "book", "writing", "markdown-spice", "index.html"), "utf8");
    const german = await readFile(join(site, "public", "de", "book", "schreiben", "markdown-wuerze", "index.html"), "utf8");
    for (const html of [english, german]) {
      assert.ok(html.includes('<link rel="stylesheet" href="/assets/temml/Temml-Local.css">'));
      assert.match(html, / in <math><mrow><msup><mi>e<\/mi>/);
      assert.match(html, /<div class="math"><math display="block" class="tml-display" style="display:block math;"><mrow><mi>x<\/mi><mo>=<\/mo><mfrac>/);
      assert.ok(html.includes('<pre tabindex="0"><code class="language-js"><span class="hljs-comment">//'));
      assert.deepEqual([...html.matchAll(/<(component-[a-z-]+) class="component"/g)].map(match => match[1]),
        ["component-mermaid", "component-flowchart", "component-vega-lite", "component-slider"]);
      assert.equal(html.match(/ id="[^"]+"/g).length, new Set(html.match(/ id="[^"]+"/g)).size);
    }
    assert.ok(english.includes("prices such as $5 and $10 stay text. Write <code>\\$</code>"));
    assert.ok(english.includes('a caret<sup class="footnote-ref"><a href="#fn:1" id="fnref:1" role="doc-noteref">1</a></sup>, and'));
    assert.ok(english.includes('<section class="footnotes" role="doc-endnotes" aria-label="Footnotes">\n<ol>\n<li id="fn:1">\n<p>This footnote'));
    assert.ok(english.includes('<p>A further paragraph of a footnote is indented by four spaces. ' +
      '<a href="#fnref:2" role="doc-backlink" aria-label="Back to the text">↩︎</a></p>\n</li>\n</ol>\n</section>'));
    assert.ok(german.includes('<section class="footnotes" role="doc-endnotes" aria-label="Fußnoten">'));
    assert.ok(german.includes('role="doc-backlink" aria-label="Zurück zum Text">'));
    // The diagrams keep their code, escaped, for the scripts that draw them, and take their texts from their language.
    assert.ok(english.includes('<component-mermaid class="component" id="componentMermaid-1" ' +
      'data-library="https://cdn.jsdelivr.net/npm/mermaid@12.3.0/dist/mermaid.esm.min.mjs" data-theme="neutral" ' +
      'data-error="This diagram cannot be shown.">\n  <figure>\n    <pre tabindex="0">flowchart LR\n  write[Write Markdown] --&gt; build[blyss build]\n'));
    assert.ok(german.includes('data-line-width="2" data-yes="ja" data-no="nein" data-error="Dieses Flussdiagramm kann nicht angezeigt werden.">'));
    assert.ok(german.includes('<pre tabindex="0">{\n  &quot;description&quot;: &quot;Beiträge pro Monat als Balken&quot;,'));
  });

  test("shows a task list, callouts titled in the language of the page, figures and a formula of MyST in the doc that describes them", async () => {
    for (const [language, doc, note, gives] of [["en", "writing/markdown-spice", "Note", "gives"], ["de", "schreiben/markdown-wuerze", "Anmerkung", "ergibt"]]) {
      const html = await readFile(join(site, "public", language, "book", doc, "index.html"), "utf8");
      assert.match(html, /<ul>\n<li><input checked="" disabled="" type="checkbox"> [^<]+<\/li>\n<li><input disabled="" type="checkbox"> /);
      assert.ok(html.includes(`<div class="admonition note" role="note">\n<p class="admonition-title">${note}</p>\n`));
      assert.match(html, /<div class="admonition warning" role="note">\n<p class="admonition-title"><code>public\/<\/code> [^<]+<\/p>\n<p>[^<]+<\/p>\n<pre /);
      assert.match(html, /<figure class="align-center">\n<img src="\/assets\/img\/gallery\/lighthouse\.svg" alt="[^"]+" style="width: 30%">\n<figcaption>\n<p>/);
      assert.ok(html.includes(` ${gives} <math><mrow><msup><mi>a</mi><mn>2</mn></msup>`));
      // A callout that opens, an alert of GitHub and the images of a figure.
      assert.match(html, /<details class="admonition dropdown tip">\n<summary class="admonition-title">[^\n]+<\/summary>\n<p>/);
      assert.match(html, /<div class="admonition important" role="note">\n<p class="admonition-title">(?:Important|Wichtig)<\/p>\n<p>/);
      assert.match(html, /<figure class="subfigures">\n<figure>\n<img src="\/assets\/img\/gallery\/sunrise\.svg" alt="[^"]+">\n<figcaption><span class="caption-number">\(a\)<\/span> /);
    }
  });

  test("labels, numbers and refers to the figures and the formulas of the doc that describes them, in the language of the page", async () => {
    for (const [language, doc, figure] of [["en", "writing/labels-numbers-references", "Figure"], ["de", "schreiben/labels-nummern-referenzen", "Abbildung"]]) {
      const html = await readFile(join(site, "public", language, "book", doc, "index.html"), "utf8");
      assert.match(html, new RegExp(`<figure id="[a-z-]+" class="align-center">\\n<img [^>]+>\\n<figcaption>\\n<p><span class="caption-number">${figure} 1:</span> `));
      assert.match(html, new RegExp(`<figure id="([a-z-]+)" class="subfigures">\\n<figure id="\\1-a">\\n[^]+?<figcaption>\\n<p><span class="caption-number">${figure} 2:</span> `));
      // The formula with a label and the two lines of the environment of LaTeX share one sequence.
      assert.deepEqual(html.match(/<mtext class="tml-tag">[^<]+<\/mtext>/g).map(tag => tag.replace(/<[^>]+>/g, "")), ["(1)", "(2)", "(3)"]);
      // A reference shows the number of a figure after the label of the language, that of a formula and the text of a heading.
      assert.match(html, new RegExp(`<code>\\[\\]\\(#([a-z-]+)\\)</code> \\S+ <a href="#\\1">${figure} 1</a>, [^\\n]+ <a href="#[a-z-]+">${figure} 2b</a>`));
      assert.match(html, /<code>\{eq\}`([a-z-]+)`<\/code> \S+ <a href="#\1">\(1\)<\/a>/);
      assert.match(html, /<code>\[\]\(#([a-z]+)\)<\/code> \S+ <a href="#\1">(?:References|Verweise)<\/a>/);
      // Each link to a part of the page leads to one of its elements.
      const ids = new Set(html.match(/ id="[^"]+"/g).map(id => id.slice(5, -1)));
      for (const href of html.match(/ href="#[^"]+"/g)) assert.ok(ids.has(decodeURIComponent(href.slice(8, -1))), href);
    }
  });

  test("ships the stylesheet and the font of the Temml version that writes the formulas", async () => {
    for (const file of ["Temml-Local.css", "Temml.woff2"]) {
      const shipped = await readFile(join(starter, "static", "assets", "temml", file));
      assert.ok(shipped.equals(await readFile(fileURLToPath(import.meta.resolve(`temml/dist/${file}`)))), file);
    }
  });

  test("is served for a smoke test and terminates cleanly", { timeout: 15_000 }, async () => {
    const stderr = await whileServing(site, async base => {
      const home = await fetch(`${base}/`, { redirect: "manual" });
      await home.text();
      assert.equal(home.status, 302);
      assert.equal(home.headers.get("location"), "/en/");
      for (const [path, status] of [["/en/", 200], ["/de/posts/hallo-welt/", 200], ["/en/posts/", 200], ["/de/tags/blyss/", 200],
        ["/en/book/", 200], ["/de/book/schreiben/buch/navigation/", 200], ["/de/404.html", 200], ["/sitemap.xml", 200], ["/assets/css/main.css", 200], ["/assets/img/logo.svg", 200],
        ["/components/componentSlider/componentSlider.js", 200], ["/components/componentSlider/componentSlider.html", 404],
        ["/components/componentSlider/componentSlider.data.js", 404], ["/missing/", 404]]) {
        const response = await fetch(base + path);
        await response.text();
        assert.equal(response.status, status, path);
      }
      const font = await fetch(`${base}/assets/temml/Temml.woff2`);
      await font.arrayBuffer();
      assert.equal(font.headers.get("content-type"), "font/woff2");
      const missing = await fetch(`${base}/de/missing/`);
      assert.equal(missing.status, 404);
      assert.equal(missing.headers.get("content-type"), "text/html; charset=utf-8");
      assert.match(await missing.text(), /<h1>Page not found<\/h1>/);

      await rm(join(site, "public", "404.html"));
      const plain = await fetch(`${base}/missing/`);
      assert.equal(plain.status, 404);
      assert.equal(await plain.text(), "404 Not Found");
    });
    assert.equal(stderr, "");
  });
});

describe("blyss serve", () => {
  let site;
  before(() => {
    site = join(sandbox, "served");
    assert.equal(run(["init", site], sandbox).status, 0);
    assert.equal(run(["build"], site).status, 0);
  });

  test("names no file outside public/, not even on another drive of Windows", () => {
    assert.equal(fileFor("/site/public", "/en/index.html", posix), "/site/public/en/index.html");
    assert.equal(fileFor("/site/public", "/../blyss.config.js", posix), undefined);
    assert.equal(fileFor("C:\\site\\public", "/en/index.html", win32), "C:\\site\\public\\en\\index.html");
    for (const pathname of ["/../blyss.config.js", "/en/..\\..\\blyss.config.js", "/D:/notes.txt", "/d:\\notes.txt", "\\\\D:\\notes.txt"]) {
      assert.equal(fileFor("C:\\site\\public", pathname, win32), undefined, pathname);
    }
  });

  test("answers 404 for a file that it cannot read and keeps serving", { skip: cannotRestrict && "an unreadable file requires POSIX permissions and a non-root user", timeout: 15_000 }, async () => {
    const file = join(site, "public", "unreadable.txt");
    await writeFile(file, "Text.");
    await chmod(file, 0o000);
    const stderr = await whileServing(site, async base => {
      for (const [path, status] of [["/unreadable.txt", 404], ["/en/", 200]]) {
        const response = await fetch(base + path);
        await response.text();
        assert.equal(response.status, status, path);
      }
    });
    assert.equal(stderr, "");
  });

  test("leads a directory that is requested without its final slash to its page, never to another host", { timeout: 15_000 }, async () => {
    const stderr = await whileServing(site, async base => {
      for (const [path, location] of [["/en", "/en/"], ["/de/book?page=2", "/de/book/?page=2"], ["/en/posts/hello-world", "/en/posts/hello-world/"]]) {
        const response = await fetch(base + path, { redirect: "manual" });
        await response.text();
        assert.equal(response.status, 302, path);
        assert.equal(response.headers.get("location"), location, path);
      }
      // A directory without a page, a file and a missing path are answered as they are.
      for (const [path, status] of [["/assets", 404], ["/assets/css/main.css", 200], ["/en/missing", 404]]) {
        const response = await fetch(base + path, { redirect: "manual" });
        await response.text();
        assert.equal(response.status, status, path);
      }
      // fetch would resolve this path itself, so the request is written as it is: a redirect to //en/ would lead to
      // the host "en".
      const answer = await new Promise((resolve, reject) => {
        const socket = connect(Number(new URL(base).port), "127.0.0.1", () => {
          socket.write("GET /.//en HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n");
        });
        let received = "";
        socket.setEncoding("utf8").on("data", chunk => { received += chunk; }).on("end", () => resolve(received)).on("error", reject);
      });
      assert.ok(answer.startsWith("HTTP/1.1 302 "), answer);
      assert.match(answer, /\r\nLocation: \/en\/\r\n/);
    });
    assert.equal(stderr, "");
  });

  test("answers the requests that read, GET and HEAD, and no other", { timeout: 15_000 }, async () => {
    const stderr = await whileServing(site, async base => {
      const head = await fetch(`${base}/en/`, { method: "HEAD" });
      assert.equal(head.status, 200);
      assert.equal(await head.text(), "");
      for (const method of ["POST", "PUT", "DELETE"]) {
        const response = await fetch(`${base}/en/`, { method });
        assert.equal(response.status, 405, method);
        assert.equal(response.headers.get("allow"), "GET, HEAD", method);
        assert.equal(await response.text(), "");
      }
    });
    assert.equal(stderr, "");
  });

  test("names a port that is in use without a stack trace", { timeout: 15_000 }, async () => {
    await whileServing(site, async base => {
      const { port } = new URL(base);
      const second = spawnSync(process.execPath, [cli, "serve"], { cwd: site, encoding: "utf8", env: { ...process.env, PORT: port } });
      assert.equal(second.status, 1);
      assert.equal(second.stderr, `Cannot serve on port ${port}: the port is already in use.\n` +
        `Stop the program that uses it, or set the environment variable PORT to another port, such as ${Number(port) + 1}.\n`);
    });
  });
  test("says in the terminal and in the browser that a website has not been built yet", { timeout: 15_000 }, async () => {
    const unbuilt = join(sandbox, "unbuilt");
    assert.equal(run(["init", unbuilt], sandbox).status, 0);
    const hint = "There is no public/ yet. Build the website first: npm run build\n";
    const stderr = await whileServing(unbuilt, async base => {
      const response = await fetch(`${base}/en/`);
      assert.equal(response.status, 404);
      assert.equal(await response.text(), `404 Not Found\n\n${hint}`);
    });
    assert.equal(stderr, hint);
  });
});

describe("a page with quoted front matter", () => {
  test("takes the values between the quotes, also after a byte order mark", async () => {
    const site = join(sandbox, "quoted");
    assert.equal(run(["init", site], sandbox).status, 0);
    await writeFile(join(site, "_content", "en", "pages", "quoted.md"),
      '\uFEFF---\ntitle: "Quotes: \\"double\\""\nslug: \'in-quotes\'\ndescription: \'It\'\'s single\'\ntranslationKey: "quoted"\n---\n\nText.\n');
    await writeFile(join(site, "_content", "de", "pages", "zitiert.md"), "---\ntitle: Zitiert\ntranslationKey: quoted\n---\n\nText.\n");
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
    const html = await readFile(join(site, "public", "en", "pages", "in-quotes", "index.html"), "utf8");
    assert.ok(html.includes("<h1>Quotes: &quot;double&quot;</h1>"));
    assert.ok(html.includes('<meta name="description" content="It&#39;s single">'));
    assert.ok(html.includes('<li><a lang="de" hreflang="de" href="/de/pages/zitiert/">Deutsch</a></li>'));
  });
});

describe("a website below a path", () => {
  let site;
  const page = (...path) => readFile(join(site, "public", ...path), "utf8");
  before(async () => {
    site = join(sandbox, "below");
    assert.equal(run(["init", site], sandbox).status, 0);
    await enableStarterComponent(site, "componentSliderHero");
    // The website lies below /docs, hosts Mermaid itself and names its path in a template.
    const configFile = join(site, "blyss.config.js");
    const config = await readFile(configFile, "utf8");
    const library = 'library: "https://cdn.jsdelivr.net/npm/mermaid@12.3.0/dist/mermaid.esm.min.mjs"';
    assert.ok(config.includes('baseUrl: "https://example.com"') && config.includes(library));
    await writeFile(configFile, config.replace('baseUrl: "https://example.com"', 'baseUrl: "https://example.com/docs/"')
      .replace(library, 'library: "/assets/mermaid/mermaid.esm.min.mjs"'));
    const document = join(site, "templates", "document.html");
    await writeFile(document, (await readFile(document, "utf8")).replace("<body ", '<body data-base="{{basePath}}" '));
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
  });

  test("starts the links and the files of every page with the path, and leaves its absolute URLs as they are", async () => {
    for (const file of (await listFiles(join(site, "public"))).filter(file => file.endsWith(".html"))) {
      const html = await page(file);
      assert.equal(html.match(/\s(?:href|src)="\/(?!docs\/)[^"]*"/), null, file);
      assert.doesNotMatch(html, /docs\/docs/, file);
    }
    const home = await page("en", "index.html");
    for (const expected of ['<link rel="canonical" href="https://example.com/docs/en/">', '<link rel="stylesheet" href="/docs/assets/css/main.css">',
      '<a class="logo" href="/docs/en/"><img src="/docs/assets/img/logo.svg"', '<li><a href="/docs/en/posts/">Posts</a></li>',
      '<script type="module" src="/docs/components/componentSlider/componentSlider.js"></script>', '<body data-base="/docs" ']) {
      assert.ok(home.includes(expected), expected);
    }
    // A link of the Markdown, the image of a figure, and the URL of a library in static/, which its component writes
    // into a data attribute.
    assert.ok((await page("en", "book", "index.html")).includes('<a href="/docs/en/book/installation/">'));
    const spice = await page("en", "book", "writing", "markdown-spice", "index.html");
    assert.ok(spice.includes('<img src="/docs/assets/img/gallery/lighthouse.svg" '));
    assert.ok(spice.includes('data-library="/docs/assets/mermaid/mermaid.esm.min.mjs"'));
    assert.ok((await page("sitemap.xml")).includes("<loc>https://example.com/docs/en/</loc>"));
  });

  test("is served below the path, to which / redirects", { timeout: 15_000 }, async () => {
    const stderr = await whileServing(site, async base => {
      for (const path of ["/", "/docs", "/docs/"]) {
        const response = await fetch(base + path, { redirect: "manual" });
        await response.text();
        assert.equal(response.status, 302, path);
        assert.equal(response.headers.get("location"), "/docs/en/", path);
      }
      for (const [path, status] of [["/docs/en/", 200], ["/docs/de/book/", 200], ["/docs/assets/css/main.css", 200], ["/docs/missing/", 404],
        ["/en/", 404], ["/assets/css/main.css", 404]]) {
        const response = await fetch(base + path);
        await response.text();
        assert.equal(response.status, status, path);
      }
    });
    assert.equal(stderr, "");
  });
});

describe("a site with a third language and German as its default", () => {
  let site;
  let configFile;
  const page = path => readFile(join(site, "public", path), "utf8");
  before(async () => {
    site = join(sandbox, "trilingual");
    assert.equal(run(["init", site], sandbox).status, 0);
    await enableStarterComponent(site, "componentSliderHero");
    configFile = join(site, "blyss.config.js");
    const config = await readFile(configFile, "utf8");
    // French follows English, whose labels it takes but for the language switcher's, and gets a text for each slider step.
    const english = config.slice(config.indexOf("      en: {"), config.indexOf("      de: {"));
    const french = english.replace("en: {", "fr: {").replace('"English"', '"Français"').replace('locale: "en"', 'locale: "fr"')
      .replace('language: "Language"', 'language: "Langue"');
    await writeFile(configFile, config.replace('defaultLanguage: "en"', 'defaultLanguage: "de"')
      .replace("      de: {", `${french}      de: {`).replaceAll(', de: "', ', fr: "Étape", de: "'));
    // The French content copies the English one but for the title of the first post, which gets a slug of its own.
    await cp(join(site, "_content", "en"), join(site, "_content", "fr"), { recursive: true });
    const post = join(site, "_content", "fr", "posts", "hello-world.md");
    await writeFile(post, (await readFile(post, "utf8")).replace("title: Hello World", "title: Bonjour le monde\nslug: bonjour-le-monde"));
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
  });

  // Builds the site with a changed blyss.config.js, runs check and restores the configuration.
  async function buildWith(change, check) {
    const config = await readFile(configFile, "utf8");
    await writeFile(configFile, change(config));
    try {
      const result = run(["build"], site);
      assert.equal(result.status, 0, result.stderr);
      await check();
    } finally {
      await writeFile(configFile, config);
    }
  }

  test("builds every page of the third language with its labels and its component texts", async () => {
    const english = await listFiles(join(site, "public", "en"));
    assert.deepEqual(await listFiles(join(site, "public", "fr")), english.map(file => file.replace("hello-world", "bonjour-le-monde")).sort());
    const home = await page("fr/index.html");
    assert.ok(home.includes('<nav aria-label="Langue">'));
    assert.ok(home.includes("<span>Étape</span>"));
    assert.doesNotMatch(home, /{{\w+}}/);
  });

  test("lists the languages in the order of site.languages", async () => {
    const post = await page("en/posts/hello-world/index.html");
    const urls = { en: "/en/posts/hello-world/", fr: "/fr/posts/bonjour-le-monde/", de: "/de/posts/hallo-welt/" };
    const switcher = post.slice(post.indexOf('<nav aria-label="Language">'));
    assert.deepEqual([...switcher.slice(0, switcher.indexOf("</nav>")).matchAll(/hreflang="(\w+)" href="([^"]+)"[^>]*>([^<]+)</g)]
      .map(match => match.slice(1)), [["en", urls.en, "English"], ["fr", urls.fr, "Français"], ["de", urls.de, "Deutsch"]]);
    // The translation in the default language, German, is x-default as well.
    const alternates = [...Object.entries(urls), ["x-default", urls.de]].map(([hreflang, url]) => [hreflang, `https://example.com${url}`]);
    assert.deepEqual([...post.matchAll(/<link rel="alternate" hreflang="([\w-]+)" href="([^"]+)">/g)].map(match => match.slice(1)), alternates);
    const sitemap = await page("sitemap.xml");
    const entry = sitemap.slice(sitemap.indexOf(`<loc>https://example.com${urls.fr}</loc>`)).split("</url>")[0];
    assert.deepEqual([...entry.matchAll(/hreflang="([\w-]+)" href="([^"]+)"/g)].map(match => match.slice(1)), alternates);
    const graph = JSON.parse(post.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
    assert.deepEqual(graph.find(node => node["@type"] === "WebSite").inLanguage, ["en", "fr", "de"]);
  });

  test("redirects / to the default language and shows its not-found page", { timeout: 15_000 }, async () => {
    assert.equal(await page("404.html"), await page("de/404.html"));
    const stderr = await whileServing(site, async base => {
      const home = await fetch(`${base}/`, { redirect: "manual" });
      await home.text();
      assert.equal(home.status, 302);
      assert.equal(home.headers.get("location"), "/de/");
      const missing = await fetch(`${base}/fr/missing/`);
      assert.equal(missing.status, 404);
      assert.match(await missing.text(), /<h1>Seite nicht gefunden<\/h1>/);
    });
    assert.equal(stderr, "");
  });

  test("makes the first language the default if site.defaultLanguage is omitted", { timeout: 15_000 }, async () => {
    await buildWith(config => config.replace(/^ *defaultLanguage: .*\n/m, ""), async () => {
      assert.equal(await page("404.html"), await page("en/404.html"));
      assert.ok((await page("de/posts/hallo-welt/index.html"))
        .includes('<link rel="alternate" hreflang="x-default" href="https://example.com/en/posts/hello-world/">'));
      const stderr = await whileServing(site, async base => {
        const home = await fetch(`${base}/`, { redirect: "manual" });
        await home.text();
        assert.equal(home.headers.get("location"), "/en/");
      });
      assert.equal(stderr, "");
    });
  });

  test("hides the language switcher but keeps the alternates if site.languageSwitcher is false", async () => {
    await buildWith(config => config.replace("languageSwitcher: true", "languageSwitcher: false"), async () => {
      for (const path of ["en/posts/hello-world/index.html", "fr/index.html", "de/404.html"]) {
        const html = await page(path);
        assert.doesNotMatch(html, /<nav aria-label="(?:Language|Langue|Sprache)">/, path);
        assert.ok(html.includes('<link rel="alternate" hreflang="fr" href="https://example.com/fr/'), path);
        assert.doesNotMatch(html, /{{\w+}}/, path);
      }
    });
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
      const home = join(site, "_content", language, "pages", "index.md");
      // The English home page also names the placeholder in code, where it stays as it is written.
      const code = language === "en" ? "\nWrite `{{recentPosts}}` in a paragraph of its own:\n\n```markdown\n{{recentPosts}}\n```\n" : "";
      await writeFile(home, `${await readFile(home, "utf8")}\n{{recentPosts}}\n${code}`);
    }
    const posts = {
      oldest: ["title: Oldest\ndatePublished: 2026-01-01\ntags: Blyss", "Text."],
      newest: ['title: </script><script>alert(1)</script>\ndatePublished: 2026-12-31\ntags:\n  - Static Sites\n  - "Über Blyss"',
        "Text."],
      older: ["title: Older\ndatePublished: 2026-06-30\ntags: [blyss, static sites]", "Text."]
    };
    for (const [slug, [frontMatter, body]] of Object.entries(posts)) {
      await writeFile(join(site, "_content", "en", "posts", `${slug}.md`), `---\n${frontMatter}\n---\n\n${body}\n`);
    }
    await writeFile(join(site, "_content", "de", "posts", "dollar.md"),
      '---\ntitle: Dollar $& $$ $` $\' "$"\ndatePublished: 2026-12-01\n---\n\nText.\n');
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
  });

  test("lists the three newest posts of each language by datePublished", async () => {
    assert.deepEqual(await postSlugs("en"), ["newest", "templates", "hello-world"]);
    assert.deepEqual(await postSlugs("de"), ["dollar", "vorlagen", "hallo-welt"]);
  });

  test("lists a post with $ in its title as it is", async () => {
    const home = await main("de");
    assert.ok(home.includes('<li><a href="/de/posts/dollar/">Dollar $&amp; $$ $` $&#39; &quot;$&quot;</a></li>'), home);
    assert.doesNotMatch(home, /{{recentPosts}}/);
  });

  test("lists the newest posts for a paragraph of {{recentPosts}} alone, not for the placeholder in code", async () => {
    const home = await main("en");
    assert.equal(home.match(/<section aria-label="Recent posts">/g).length, 1);
    assert.ok(home.includes("<p>Write <code>{{recentPosts}}</code> in a paragraph of its own:</p>"));
    assert.ok(home.includes('<pre tabindex="0"><code class="language-markdown">{{recentPosts}}\n</code></pre>'));
  });

  test("shows the texts of heroTexts.md in the hero of the home pages and those of overlayTexts.md in the overlay of the other pages", async () => {
    const region = async (path, start) => {
      const html = await readFile(join(site, "public", path), "utf8");
      return html.includes(start) ? html.slice(html.indexOf(start), html.indexOf("</aside>")) : "";
    };
    const hero = path => region(path, '<aside class="hero"');
    const overlay = path => region(path, '<div id="overlay"');
    const texts = html => [...html.matchAll(/<div>\n<h4>([^<]+)<\/h4>/g)].map(match => match[1]);
    const [heroEnglish, heroGerman, overlayEnglish, overlayGerman] = await Promise.all([["en", "heroTexts.md"], ["de", "heroTexts.md"],
      ["en", "overlayTexts.md"], ["de", "overlayTexts.md"]].map(([language, file]) => starterText(language, file)));
    const home = await hero("en/index.html");
    assert.ok(home.includes(`<h3>${heroEnglish.title}</h3>`));
    assert.deepEqual(texts(home), heroEnglish.headings);
    assert.deepEqual(texts(await hero("de/index.html")), heroGerman.headings);
    assert.equal(await overlay("en/index.html"), "");
    const about = await overlay("en/pages/about/index.html");
    for (const path of ["en/posts/older/index.html", "en/tags/index.html", "en/book/index.html", "en/404.html"]) {
      assert.equal(await overlay(path), about, path);
      assert.equal(await hero(path), "", path);
    }
    assert.ok(about.includes(`<h3>${overlayEnglish.title}</h3>`));
    assert.deepEqual(texts(about), overlayEnglish.headings);
    assert.deepEqual(texts(await overlay("de/posts/index.html")), overlayGerman.headings);
  });

  test("archives all posts newest first, pageSize posts per page", async () => {
    assert.deepEqual(await postSlugs("en/posts"), ["newest", "templates"]);
    assert.deepEqual(await postSlugs("en/posts/page/2"), ["hello-world", "older"]);
    assert.deepEqual(await postSlugs("en/posts/page/3"), ["oldest"]);
    await assert.rejects(stat(join(site, "public", "en", "posts", "page", "4")), { code: "ENOENT" });
    assert.match(await page("en"), /<a href="\/en\/posts\/">Posts<\/a>/);
  });

  test("rejects a post at the URL of a generated page", async () => {
    const post = join("_content", "en", "posts", "page", "2.md");
    await mkdir(join(site, "_content", "en", "posts", "page"));
    await writeFile(join(site, post), "---\ntitle: Two\n---\n");
    try {
      const result = run(["build"], site);
      assert.equal(result.status, 1);
      assert.equal(result.stderr, `Cannot build /en/posts/page/2/: ${post} and the generated page "Posts – Page 2" have the same URL.\n` +
        `Rename ${post} or give it a different slug.\n`);
    } finally {
      await rm(join(site, "_content", "en", "posts", "page"), { recursive: true });
    }
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
      ["Blyss (4)", "Markdown (1)", "Static Sites (2)", "Über Blyss (1)"]);
    assert.deepEqual(await postSlugs("en/tags/blyss"), ["templates", "hello-world"]);
    assert.deepEqual(await postSlugs("en/tags/blyss/page/2"), ["older", "oldest"]);
    await assert.rejects(stat(join(site, "public", "en", "tags", "blyss", "page", "3")), { code: "ENOENT" });
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
    for (const [hreflang, path] of [["de", "de/posts/hallo-welt/"], ["en", "en/posts/hello-world/"], ["x-default", "en/posts/hello-world/"]]) {
      assert.ok(post.includes(`<xhtml:link rel="alternate" hreflang="${hreflang}" href="https://example.com/${path}"/>`), hreflang);
    }
    // A page without a translation in the default language has no x-default.
    const german = sitemap.split("<url>").find(entry => entry.includes("<loc>https://example.com/de/posts/dollar/</loc>"));
    assert.deepEqual([...german.matchAll(/hreflang="([\w-]+)"/g)].map(match => match[1]), ["de"]);
    assert.doesNotMatch(await page("de/posts/dollar"), /hreflang="x-default"/);
  });

  test("describes a post as a BlogPosting with its title as its headline and the publisher as its author", async () => {
    const html = await page("en/posts/oldest");
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
    const post = graph.find(node => node["@type"] === "BlogPosting");
    assert.equal(post.headline, "Oldest");
    assert.equal(post.datePublished, "2026-01-01");
    assert.deepEqual(post.author, { "@id": "https://example.com/#publisher" });
  });

  test("escapes JSON-LD so that content cannot close its script element", async () => {
    const html = await page("en/posts/newest");
    assert.equal(html.match(/<\/script/gi).length, 2, "the script of the overlay's slider and JSON-LD");
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
    const { title } = await starterText("en", "pages", "index.md");
    assert.ok(html.replace(/>\s+</g, "><").includes(`<main><article><header><h1>${title}</h1></header>`));
  });
});

describe("a site with technical documentation", () => {
  let site;
  const page = path => readFile(join(site, "public", path, "index.html"), "utf8");
  const part = (html, start, end) => html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start)) + end.length);

  before(async () => {
    site = join(sandbox, "book");
    assert.equal(run(["init", site], sandbox).status, 0);
    const docs = join(site, "_content", "en", "book");
    await rm(docs, { recursive: true });
    await mkdir(join(docs, "guides"), { recursive: true });
    const headings = "## Overview\n\n### Details\n\n#### Deep\n\n## Overview\n\n## Overlay\n\n## Install & *run*\n\n## ???\n\n## Demo\n\n" +
      '<div id="demo">Demo</div>';
    for (const [file, frontMatter, body = "Text."] of [
      ["index.md", "title: Docs"],
      ["zebra.md", "title: Zebra\norder: 1"],
      ["apple.md", "title: Apple\norder: 1\ndatePublished: 2026-11-01\ntags: Blyss"],
      ["later.md", "title: Later"],
      ["guides/index.md", "title: Guides\norder: 2"],
      ["guides/setup.md", "title: Setup\norder: -1", headings],
      ["guides/deploy.md", "title: Deploy\norder: 2.5\nslug: shipping"]
    ]) {
      await writeFile(join(docs, file), `---\n${frontMatter}\n---\n\n${body}\n`);
    }
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
  });

  test("lists the docs by directory, then by order and title, and marks the current one", async () => {
    assert.equal(part(await page("en/book/guides/setup"), '<nav aria-label="Documentation">', "</nav>"),
      '<nav aria-label="Documentation">\n<ul>\n  <li><a href="/en/book/">Docs</a></li>\n' +
      '  <li><a href="/en/book/apple/">Apple</a></li>\n  <li><a href="/en/book/zebra/">Zebra</a></li>\n' +
      '  <li><a href="/en/book/guides/">Guides</a>\n    <ul>\n' +
      '      <li><a href="/en/book/guides/setup/" aria-current="page">Setup</a></li>\n' +
      '      <li><a href="/en/book/guides/shipping/">Deploy</a></li>\n    </ul>\n  </li>\n' +
      '  <li><a href="/en/book/later/">Later</a></li>\n</ul>\n</nav>');
  });

  test("links each doc to the previous and the next doc of the navigation", async () => {
    const pager = (previous, next) => '<nav aria-label="Pagination">\n<ul>\n' +
      (previous ? `  <li><a href="/en/book/${previous[0]}" rel="prev">Previous: ${previous[1]}</a></li>\n` : "") +
      (next ? `  <li><a href="/en/book/${next[0]}" rel="next">Next: ${next[1]}</a></li>\n` : "") + "</ul>\n</nav>";
    assert.ok((await page("en/book")).includes(pager(null, ["apple/", "Apple"])));
    assert.ok((await page("en/book/guides")).includes(pager(["zebra/", "Zebra"], ["guides/setup/", "Setup"])));
    assert.ok((await page("en/book/later")).includes(pager(["guides/shipping/", "Deploy"], null)));
    // In the starter's German docs: from the last doc of a section within a section to the doc that follows the section.
    const [previous, next] = await Promise.all([starterText("de", "book", "schreiben", "buch", "dokumente.md"),
      starterText("de", "book", "schreiben", "seiten-und-beitraege.md")]);
    assert.ok((await page("de/book/schreiben/buch/navigation")).includes('<nav aria-label="Seitennavigation">\n<ul>\n' +
      `  <li><a href="/de/book/schreiben/buch/dokumente/" rel="prev">Zurück: ${previous.title}</a></li>\n` +
      `  <li><a href="/de/book/schreiben/seiten-und-beitraege/" rel="next">Weiter: ${next.title}</a></li>\n</ul>\n</nav>`));
  });

  test("gives the headings of a doc unique ids and lists its ## and ### headings above its text", async () => {
    const html = await page("en/book/guides/setup");
    for (const heading of ['<h2 id="overview">Overview</h2>', '<h3 id="details">Details</h3>', '<h4 id="deep">Deep</h4>',
      '<h2 id="overview-1">Overview</h2>', '<h2 id="overlay-1">Overlay</h2>', '<h2 id="install--run">Install &amp; <em>run</em></h2>',
      '<h2 id="section">???</h2>', '<h2 id="demo-1">Demo</h2>']) {
      assert.ok(html.includes(heading), heading);
    }
    assert.ok(html.includes('</header>\n<nav aria-label="On this page">\n<p>On this page</p>\n<ul>\n' +
      '  <li><a href="#overview">Overview</a>\n    <ul>\n      <li><a href="#details">Details</a></li>\n    </ul>\n  </li>\n' +
      '  <li><a href="#overview-1">Overview</a></li>\n  <li><a href="#overlay-1">Overlay</a></li>\n' +
      '  <li><a href="#install--run">Install &amp; run</a></li>\n  <li><a href="#section">???</a></li>\n' +
      '  <li><a href="#demo-1">Demo</a></li>\n</ul>\n</nav>'));
    const ids = html.match(/ id="[^"]+"/g);
    assert.equal(ids.length, new Set(ids).size);
    assert.ok((await page("de/book/schreiben/buch/navigation")).includes('<h2 id="überschriften">Überschriften</h2>'));
    assert.doesNotMatch(await page("en/book/later"), /On this page/);
  });

  test("describes docs as TechArticle and keeps them out of the posts and the tags", async () => {
    const html = await page("en/book/apple");
    assert.ok(html.includes('<body data-kind="book" '));
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
    const doc = graph.find(node => node["@type"] === "TechArticle");
    assert.equal(doc.url, "https://example.com/en/book/apple/");
    assert.equal(doc.headline, "Apple");
    assert.equal(doc.datePublished, "2026-11-01");
    assert.deepEqual(doc.mainEntityOfPage, { "@id": `${doc.url}#webpage` });
    assert.equal(doc.keywords, undefined);
    for (const path of ["en/posts", "en/tags", "en/tags/blyss"]) {
      assert.doesNotMatch(part(await page(path), "<main>", "</main>"), /\/book\//, path);
    }
    assert.ok((await readFile(join(site, "public", "sitemap.xml"), "utf8")).includes("<loc>https://example.com/en/book/guides/shipping/</loc>"));
  });

  test("renders docs with page.html without templates/book.html", async () => {
    const template = join(site, "templates", "book.html");
    const source = await readFile(template, "utf8");
    await rm(template);
    try {
      const result = run(["build"], site);
      assert.equal(result.status, 0, result.stderr);
      const html = await page("en/book/guides/setup");
      assert.match(html, /<main>\s*<article>\s*<header>\s*<h1>Setup<\/h1>\s*<\/header>\s*<h2 id="overview">Overview<\/h2>/);
      assert.doesNotMatch(html, /<nav aria-label="(?:Documentation|On this page|Pagination)">/);
    } finally {
      await writeFile(template, source);
    }
  });
});

describe("a site with drafts", () => {
  let site;
  const page = path => readFile(join(site, "public", path), "utf8");
  const drafts = { post: join("_content", "en", "posts", "zeppelin.md"), page: join("_content", "en", "pages", "quokka.md"),
    doc: join("_content", "en", "book", "yucca.md") };
  // The pages of the output, and its sitemap, that name a draft or link to one.
  const traces = async () => {
    const files = (await listFiles(join(site, "public"))).filter(file => /\.(?:html|xml)$/.test(file));
    const texts = await Promise.all(files.map(page));
    return files.filter((file, index) => /zeppelin|quokka|yucca|xylophone/i.test(texts[index]));
  };

  before(async () => {
    site = join(sandbox, "drafts");
    assert.equal(run(["init", site], sandbox).status, 0);
    // A draft of each kind: the newest post, with a tag of its own and a German translation that is published, a
    // page whose date is not one yet, and the first doc of the documentation.
    await writeFile(join(site, drafts.post),
      "---\ntitle: Zeppelin\ndatePublished: 2026-12-24\ntranslationKey: zeppelin\ntags: [Xylophone]\ndraft: true\n---\n\nText.\n");
    await writeFile(join(site, "_content", "de", "posts", "luftschiff.md"),
      "---\ntitle: Luftschiff\ndatePublished: 2026-12-24\ntranslationKey: zeppelin\n---\n\nText.\n");
    await writeFile(join(site, drafts.page), "---\ntitle: Quokka\ndatePublished: soon\ndraft: true\n---\n\nText.\n");
    await writeFile(join(site, drafts.doc), "---\ntitle: Yucca\norder: 0\ndraft: true\n---\n\nText.\n");
  });

  test("leaves a draft out of the pages, the lists, the navigation, the translations and the sitemap, unchecked, and names it", async () => {
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(await traces(), []);
    // The German post is published without its English translation.
    assert.doesNotMatch(await page("de/posts/luftschiff/index.html"), /hreflang="(?:en|x-default)"/);
    for (const file of Object.values(drafts)) assert.ok(result.stdout.includes(`Left out the draft ${file}\n`), file);
    assert.doesNotMatch(result.stdout, /\(draft\)|draft\(s\)/);
  });

  test("builds the drafts for --drafts, checked like every page and marked in the output of the build", async () => {
    // Only now does the date of the draft page matter.
    const unchecked = run(["build", "--drafts"], site);
    assert.equal(unchecked.status, 1);
    assert.equal(unchecked.stderr, `Cannot build ${drafts.page}: its datePublished "soon" is not a date.\n` +
      "Write a date as 2026-11-10, or with its time as 2026-11-10T09:30:00+01:00.\n");
    await writeFile(join(site, drafts.page), "---\ntitle: Quokka\ndraft: true\n---\n\nText.\n");
    const result = run(["build", "--drafts"], site);
    assert.equal(result.status, 0, result.stderr);
    for (const url of ["/en/posts/zeppelin/", "/en/pages/quokka/", "/en/book/yucca/"]) {
      assert.ok(result.stdout.includes(`Built ${url} (draft)\n`), url);
    }
    assert.match(result.stdout, /\nBlyss built \d+ localized page\(s\), including 3 draft\(s\)\.\n$/);
    assert.doesNotMatch(result.stdout, /Left out/);
    // The draft post leads the archive, has the page of its tag and is the translation of the German post; the draft
    // doc is the first of the navigation.
    const archive = await page("en/posts/index.html");
    assert.ok(archive.slice(archive.indexOf("<main>")).includes(
      '<ul>\n  <li><time datetime="2026-12-24">2026-12-24</time> <a href="/en/posts/zeppelin/">Zeppelin</a></li>'));
    assert.ok((await page("en/tags/xylophone/index.html")).includes('<a href="/en/posts/zeppelin/">Zeppelin</a>'));
    assert.ok((await page("de/posts/luftschiff/index.html"))
      .includes('<link rel="alternate" hreflang="en" href="https://example.com/en/posts/zeppelin/">'));
    assert.match(await page("en/book/index.html"),
      /<nav aria-label="Documentation">\n<ul>\n {2}<li><a href="\/en\/book\/"[^>]*>[^<]+<\/a><\/li>\n {2}<li><a href="\/en\/book\/yucca\/">Yucca<\/a><\/li>/);
    assert.ok((await page("en/pages/quokka/index.html")).includes("<h1>Quokka</h1>"));
    assert.ok((await page("sitemap.xml")).includes("<loc>https://example.com/en/book/yucca/</loc>"));
  });

  test("refuses a doc whose section has a draft as its start page and a draft that is neither true nor false", async () => {
    const index = join("_content", "en", "book", "guides", "index.md");
    const doc = join("_content", "en", "book", "guides", "setup.md");
    await mkdir(join(site, dirname(index)));
    await writeFile(join(site, index), "---\ntitle: Guides\ndraft: true\n---\n");
    for (const [frontMatter, message] of [
      ["title: Setup", `Cannot build ${doc}: ${index}, the start page of its section, is a draft.\n` +
        "Make the doc a draft as well, or publish the start page: its title names the section in the navigation.\n"],
      ["title: Setup\ndraft: yes", `Cannot build ${doc}: its draft "yes" is neither true nor false.\n` +
        "Set draft to true to leave the page out of the build, or remove the field to publish it.\n"]
    ]) {
      await writeFile(join(site, doc), `---\n${frontMatter}\n---\n`);
      const result = run(["build"], site);
      assert.equal(result.status, 1, frontMatter);
      assert.equal(result.stderr, message);
    }
    // A section of drafts alone is left out as a whole.
    await writeFile(join(site, doc), "---\ntitle: Setup\ndraft: true\n---\n");
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
    await assert.rejects(stat(join(site, "public", "en", "book", "guides")), { code: "ENOENT" });
  });
});

describe("a site with its own hero texts and fragments", () => {
  let site;
  const page = path => readFile(join(site, "public", path), "utf8");
  const long = Array.from({ length: 300 }, (_, index) => `w${index + 1}`).join(" ");

  before(async () => {
    site = join(sandbox, "hero");
    assert.equal(run(["init", site], sandbox).status, 0);
    const texts = [`#### One\n\n${long}\n\n##### Part of one\n\nMore.`, "#### Two\n\n```md\n### Not a text\n```",
      ...[3, 4, 5, 6, 7, 8, 9].map(number => `#### Text ${number}\n\nText.`)];
    await writeFile(join(site, "_content", "en", "heroTexts.md"),
      `---\ntitle: Nine <texts>\n---\n\n<!-- Each #### heading starts a text. -->\n\n${texts.join("\n\n")}\n`);
    await writeFile(join(site, "_content", "en", "notice.md"), "---\ntitle: Notice\n---\n\nClosed on *Monday*.\n");
    const documentFile = join(site, "templates", "document.html");
    const template = await readFile(documentFile, "utf8");
    await writeFile(documentFile, template.replace('  <div class="page">',
      '  <section class="notice"><h2>{{noticeTitle}}</h2>{{noticeContent}}</section>\n  <div class="page">'));
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
  });

  test("shows every text of heroTexts.md in full, each from one #### heading to the next", async () => {
    const html = await page("en/index.html");
    const hero = html.slice(html.indexOf("<h3>Nine"), html.indexOf("</aside>"));
    assert.ok(hero.startsWith("<h3>Nine &lt;texts&gt;</h3>"));
    assert.equal(hero.match(/<div>\n<h4>/g).length, 9);
    assert.ok(hero.includes(`<div>\n<h4>One</h4>\n<p>${long}</p>\n<h5>Part of one</h5>\n<p>More.</p>\n</div>`));
    assert.ok(hero.includes('<div>\n<h4>Two</h4>\n<pre tabindex="0"><code class="language-md"><span class="hljs-section">### Not a text</span>\n</code></pre>\n</div>'));
  });

  test("gives templates each Markdown file directly in _content/<language>/ without publishing it", async () => {
    assert.ok((await page("en/posts/index.html")).includes(
      '<section class="notice"><h2>Notice</h2><p>Closed on <em>Monday</em>.</p>\n</section>'));
    assert.ok((await page("de/posts/index.html")).includes('<section class="notice"><h2></h2></section>'));
    for (const name of ["heroTexts", "overlayTexts", "notice"]) {
      await assert.rejects(stat(join(site, "public", "en", name)), { code: "ENOENT" });
    }
  });
});

describe("a site with its own layout and component settings", () => {
  let site;
  let configFile;
  const page = path => readFile(join(site, "public", path), "utf8");
  const slider = async path => {
    const html = await page(path);
    const start = html.indexOf('<component-slider class="component">');
    return html.slice(start, html.indexOf("<p>", start));
  };
  const gallery = async path => (await page(path)).match(/<component-gallery [^>]+>/)[0];
  const flower = async path => {
    const html = await page(path);
    return html.slice(html.indexOf("<component-flower "), html.indexOf("</component-flower>"));
  };
  const settings = config => config.slice(config.indexOf("  layout: {"), config.indexOf("  directories: {"));
  const regions = `  hero: { components: { componentSliderHero: true, componentGalleryHero: true, componentFlowerHero: true } },
  overlay: { components: { componentSliderOverlay: true } },
`;

  before(async () => {
    site = join(sandbox, "custom-layout");
    assert.equal(run(["init", site], sandbox).status, 0);
    configFile = join(site, "blyss.config.js");
    const config = await readFile(configFile, "utf8");
    // The German flower has an introduction, two texts and no name for its petals.
    await writeFile(join(site, "_content", "de", "components", "componentFlowerHero.md"),
      "---\ntitle: Blume\n---\n\nEinleitung.\n\n### Eins\n\nText *eins*.\n\n#### Mehr\n\n### Zwei\n");
    await writeFile(configFile, config.replace(settings(config), `  layout: { margin: "3rem", paddingHero: "4vh", paddingOverlay: "5vh", alignHome: "left", alignOther: "centerLeft", alignHero: "center", alignOverlay: "left" },
${regions}  components: {
    componentSliderHero: {
      start: -10,
      end: 30,
      steps: [
        { value: 30, description: { en: "Hot", de: "Heiß" } },
        { value: -10, description: { en: "Cold & <icy>", de: "Kalt" } },
        { value: 0, description: { en: "Frost", de: "Frost" } }
      ]
    },
    componentSliderOverlay: { start: 0, end: 4, steps: [{ value: 4, description: { en: "Full", de: "Voll" } }, { value: 0, description: { en: "Empty", de: "Leer" } }] },
    componentGalleryHero: { heightOverall: "200px", heightCenter: "150%", heightExpanded: "90%", animationSpeedScrolling: "1s", animationSpeedImgEnlargement: ".2s" },
    componentFlowerHero: { petals: 5, colourSystem: "complementary", colourBaseHue: 40, animationSpeedFalling: "1500ms", animationSpeedText: "2s",
      animationSpeedFading: ".5s", opacityFallen: "20%", fontSizeText: "75%" }
  },
`));
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
  });

  test("applies layout.margin, the paddings and the alignments of the pages, of the hero and of the overlay", async () => {
    const body = (kind, align) => `<body data-kind="${kind}" data-align="${align}" data-align-hero="center" data-align-overlay="left" ` +
      'style="--site-margin: 3rem; --hero-padding: 4vh; --overlay-padding: 5vh">';
    assert.ok((await page("de/index.html")).includes(body("home", "left")));
    for (const [path, kind] of [["de/posts/index.html", "list"], ["en/posts/hello-world/index.html", "post"], ["404.html", "not-found"]]) {
      assert.ok((await page(path)).includes(body(kind, "centerLeft")), path);
    }
  });

  test("runs the slider from start to end, starting halfway, with its steps sorted and described in each language", async () => {
    const steps = (cold, frost, hot) => '  <output for="componentSliderHero-1-input" aria-hidden="true">10</output>\n' +
      '  <input id="componentSliderHero-1-input" type="range" min="-10" max="30" value="10">\n<ol class="steps">\n' +
      `  <li style="--position: 0%"><data value="-10">-10</data> <span>${cold}</span></li>\n` +
      `  <li style="--position: 25%" aria-current="step"><data value="0">0</data> <span>${frost}</span></li>\n` +
      `  <li style="--position: 100%"><data value="30">30</data> <span>${hot}</span></li>\n</ol>`;
    assert.ok((await slider("en/index.html")).includes(steps("Cold &amp; &lt;icy&gt;", "Frost", "Hot")));
    assert.ok((await slider("de/index.html")).includes(steps("Kalt", "Frost", "Heiß")));
    assert.ok((await slider("de/index.html")).includes('<h3><label for="componentSliderHero-1-input">Schieberegler</label></h3>'));
    // The overlay's slider has settings of its own.
    assert.ok((await slider("de/pages/about/index.html")).includes('  <output for="componentSliderOverlay-1-input" aria-hidden="true">2</output>\n' +
      '  <input id="componentSliderOverlay-1-input" type="range" min="0" max="4" value="2">\n<ol class="steps">\n' +
      '  <li style="--position: 0%" aria-current="step"><data value="0">0</data> <span>Leer</span></li>\n' +
      '  <li style="--position: 100%"><data value="4">4</data> <span>Voll</span></li>\n</ol>'));
  });

  test("gives the gallery its heights and speeds, the height of the image in the centre as a factor", async () => {
    assert.ok((await gallery("de/index.html")).endsWith(
      'style="--height-overall: 200px; --scale-center: 1.5; --height-expanded: 90; --speed-scrolling: 1s; --speed-enlargement: .2s">'));
  });

  test("gives the flower its petals, colours and times, and each petal the text of its number", async () => {
    const english = await flower("en/index.html");
    assert.ok(english.startsWith('<component-flower class="component" role="group" aria-labelledby="componentFlowerHero-1-title" ' +
      'style="--hue-petals: 40; --hue-centre: 220; --hue-stem: 40; --petal-width: 0.846; --speed-falling: 1500ms; --speed-text: 2s; ' +
      '--speed-fading: .5s; --opacity-fallen: 0.2; --font-size-text: 0.75">'));
    assert.deepEqual([...english.matchAll(/style="--angle: ([\d.]+)deg" aria-label="([^"]+)" disabled>/g)].map(match => match.slice(1)),
      [["0", "Petal 1"], ["72", "Petal 2"], ["144", "Petal 3"], ["216", "Petal 4"], ["288", "Petal 5"]]);
    assert.deepEqual([...english.matchAll(/<li>\n<h3>([^<]+)<\/h3>/g)].map(match => match[1]),
      ["Pluck a petal", "One text each", "Count them", "Three colours", "At your pace"]);
    assert.deepEqual([...english.matchAll(/<span style="--lie: (-?\d+)deg"><\/span>/g)].map(match => match[1]), ["78", "90", "102", "-91", "-79"]);
    const german = await flower("de/index.html");
    assert.ok(german.includes('<ol class="texts" aria-live="polite">\n    <li>\n<h3>Eins</h3>\n<p>Text <em>eins</em>.</p>\n<h4>Mehr</h4>\n</li>\n' +
      "    <li>\n<h3>Zwei</h3>\n</li>\n  </ol>"));
    assert.equal(german.match(/aria-label="Petal \d" disabled>/g).length, 5);
    assert.doesNotMatch(german, /Einleitung/);
  });

  test("falls back to the default layout and component settings, and accepts a margin of 0", async () => {
    const config = await readFile(configFile, "utf8");
    await writeFile(configFile, config.replace(settings(config), `  layout: { margin: 0 },\n${regions}`));
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
    const attributes = 'data-align-hero="centerExtra" data-align-overlay="centerExtra" style="--site-margin: 0px; --hero-padding: 1rem; --overlay-padding: 1rem"';
    assert.ok((await page("en/index.html")).includes(`<body data-kind="home" data-align="center" ${attributes}>`));
    assert.ok((await page("en/pages/about/index.html")).includes(`<body data-kind="page" data-align="left" ${attributes}>`));
    const fallback = await slider("en/index.html");
    assert.ok(fallback.includes('<input id="componentSliderHero-1-input" type="range" min="0" max="100" value="50">'));
    assert.doesNotMatch(fallback, /<ol/);
    assert.ok((await gallery("en/index.html")).endsWith(
      'style="--height-overall: 8rem; --scale-center: 1.3; --height-expanded: 70; --speed-scrolling: 400ms; --speed-enlargement: 300ms">'));
  });
});

describe("a site with its own hero and overlay", () => {
  let site;
  let configFile;
  let config;
  const page = path => readFile(join(site, "public", path), "utf8");
  // The hero or the overlay of a page, or nothing, and the components of such a region in their order.
  const region = async (path, name) => (await page(path)).match(new RegExp(`<aside class="${name}"[\\s\\S]*?</aside>`))?.[0] ?? "";
  const components = html => [...html.matchAll(/<(component-[a-z]+) /g)].map(match => match[1]);
  // The headings of the starter's texts of the hero and of the overlay, by region and language: their title first.
  const headings = { hero: {}, overlay: {} };

  before(async () => {
    site = join(sandbox, "regions");
    assert.equal(run(["init", site], sandbox).status, 0);
    configFile = join(site, "blyss.config.js");
    config = await readFile(configFile, "utf8");
    for (const name of ["hero", "overlay"]) {
      for (const language of ["en", "de"]) {
        const { title, headings: texts } = await starterText(language, `${name}Texts.md`);
        headings[name][language] = [`<h3>${title}</h3>`, ...texts.map(text => `<h4>${text}</h4>`)];
      }
    }
  });

  // Builds the site with other settings for the hero, the overlay and their synchronisation.
  async function buildWith(settings) {
    const [start, end] = [config.indexOf("  hero: {"), config.indexOf("\n  components: {")];
    assert.ok(start > 0 && end > start);
    await writeFile(configFile, config.slice(0, start) + settings + config.slice(end));
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
  }

  test("shows the parts of the hero and of the overlay that are switched on, the components in the order of the settings", async () => {
    await buildWith(`  hero: { components: { componentFlowerHero: true, componentSliderHero: false, componentGalleryHero: true }, texts: false },
  overlay: { showOn: { home: true, book: false }, components: { componentGalleryOverlay: true, componentFlowerOverlay: false }, texts: true },`);
    const hero = await region("en/index.html", "hero");
    assert.deepEqual(components(hero), ["component-flower", "component-gallery"]);
    assert.ok(hero.includes("<h3></h3>"));
    for (const heading of headings.hero.en) assert.ok(!hero.includes(heading), heading);
    const overlay = await region("en/index.html", "overlay");
    assert.deepEqual(components(overlay), ["component-gallery"]);
    for (const heading of headings.overlay.en) assert.ok(overlay.includes(heading), heading);
    const home = await page("en/index.html");
    assert.equal(home.match(/ id="[^"]+"/g).length, new Set(home.match(/ id="[^"]+"/g)).size);
    for (const [path, shown] of [["en/book/index.html", false], ["de/book/schreiben/buch/navigation/index.html", false],
      ["en/posts/hello-world/index.html", true], ["de/tags/index.html", true], ["404.html", true]]) {
      assert.equal(Boolean(await region(path, "overlay")), shown, path);
      assert.equal(await region(path, "hero"), "", path);
    }
  });

  test("leaves out a hero and an overlay without a part that is switched on", async () => {
    await buildWith("  hero: { components: { componentSliderHero: false, componentFlowerHero: false }, texts: false },\n  overlay: { texts: false },");
    for (const path of ["en/index.html", "de/index.html", "en/pages/about/index.html", "de/posts/index.html"]) {
      const html = await page(path);
      assert.doesNotMatch(html, /<aside|<component-/, path);
      for (const name of ["hero", "overlay"]) assert.ok(!html.includes(headings[name][path.slice(0, 2)][0]), path);
      assert.doesNotMatch(html, /{{\w+}}/, path);
      assert.match(html, /<\/div>\s*<footer>/, path);
    }
  });

  test("shows the texts alone without settings, the overlay on every kind of page", async () => {
    await buildWith("");
    const hero = await region("de/index.html", "hero");
    assert.deepEqual(components(hero), []);
    for (const heading of headings.hero.de) assert.ok(hero.includes(heading), heading);
    for (const path of ["de/index.html", "en/pages/about/index.html", "en/book/index.html", "en/404.html"]) {
      const overlay = await region(path, "overlay");
      assert.deepEqual(components(overlay), [], path);
      assert.ok(overlay.includes(headings.overlay[path.slice(0, 2)][0]), path);
    }
  });

  test("gives the overlay the components and the texts of the hero if synchroniseHeroOverlay is true", async () => {
    await buildWith(`  hero: { components: { componentFlowerHero: true, componentSliderHero: false }, texts: true },
  overlay: { showOn: { post: false }, components: { componentSliderOverlay: true, componentGalleryOverlay: true }, texts: false },
  synchroniseHeroOverlay: true,`);
    const hero = await region("en/index.html", "hero");
    // From the first component to the end of the texts, the overlay is the hero.
    const parts = html => html.slice(html.indexOf("<link "), html.lastIndexOf("</div>"));
    for (const path of ["en/index.html", "en/pages/about/index.html", "en/tags/index.html"]) {
      const overlay = await region(path, "overlay");
      assert.deepEqual(components(overlay), ["component-flower"], path);
      assert.ok(overlay.includes('aria-labelledby="componentFlowerHero-'), path);
      for (const heading of headings.hero.en) assert.ok(overlay.includes(heading), path);
      assert.ok(!overlay.includes(headings.overlay.en[0]), path);
    }
    assert.equal(parts(await region("en/pages/about/index.html", "overlay")), parts(hero));
    assert.equal(await region("en/posts/hello-world/index.html", "overlay"), "");
  });

  test("has neither a hero nor an overlay without their templates", async () => {
    for (const template of ["hero.html", "overlay.html"]) await rm(join(site, "templates", template));
    await writeFile(configFile, config);
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
    for (const path of ["en/index.html", "de/pages/about/index.html", "en/book/index.html"]) {
      const html = await page(path);
      assert.doesNotMatch(html, /<aside|{{\w+}}/, path);
    }
  });
});

describe("a site with a component of its own", () => {
  let site;
  let configFile;
  const page = path => readFile(join(site, "public", path), "utf8");
  const blocks = join("_content", "en", "pages", "blocks.md");

  before(async () => {
    site = join(sandbox, "component");
    assert.equal(run(["init", site], sandbox).status, 0);
    const component = join(site, "components", "notice");
    await mkdir(join(component, "img"), { recursive: true });
    await writeFile(join(component, "notice.html"),
      '<aside id="{{id}}" data-level="{{level}}"><h2>{{title}}</h2><small>{{hint}} {{closeLabel}}</small>{{content}}{{hours}}</aside>\n');
    await writeFile(join(component, "notice.css"), "aside { color: red; }\n");
    await writeFile(join(component, "img", "icon.svg"), '<svg xmlns="http://www.w3.org/2000/svg"/>\n');
    // What the browser does not need has a name that starts with a dot or an underscore: notes, the file of an editor
    // and, in a directory that is no component, a module that the data file imports.
    await writeFile(join(component, "_notes.md"), "Notes.\n");
    await writeFile(join(component, "img", ".DS_Store"), "");
    await mkdir(join(site, "components", "_shared"));
    await writeFile(join(site, "components", "_shared", "list.js"), 'export const list = items => items.join(" & ");\n');
    await writeFile(join(component, "notice.data.js"), `import { list } from "../_shared/list.js";
export default ({ settings, languageKey, escapeHtml, refuse }) => {
  if (!Array.isArray(settings.hours)) throw refuse("hours", settings.hours, "a list of hours");
  return { hours: \`<p>\${escapeHtml(list(settings.hours))} (\${languageKey})</p>\` };
};
`);
    configFile = join(site, "blyss.config.js");
    const config = await readFile(configFile, "utf8");
    assert.ok(config.includes("\n  components: {"));
    await writeFile(configFile, config.replace("\n  components: {", '\n  components: {\n    notice: { level: "high & <dry>", hours: ["9", "17"] },'));
    await writeFile(join(site, "_content", "en", "components", "notice.md"), "---\ntitle: Notice\nhint: Read <this>\n---\n\nClosed on *Monday*.\n");
    const about = join(site, "_content", "en", "pages", "about.md");
    await writeFile(about, `${await readFile(about, "utf8")}\n{{notice}}\n\nWrite \`{{notice}}\` in a paragraph of its own:\n\n  {{notice}}\n`);
    const documentFile = join(site, "templates", "document.html");
    await writeFile(documentFile, (await readFile(documentFile, "utf8")).replace("  <footer>", "{{notice}}  <footer>"));
    // Blocks: with front matter and Markdown of its own, empty, with a front matter without fields, with a setting
    // alone, and of a component that is missing.
    await writeFile(join(site, blocks), "---\ntitle: Blocks\n---\n\n" +
      '```{{notice}}\n---\ntitle: Block & <own>\nlevel: low\nhours: ["8", "12"]\n---\n\nOpen on *Sunday*.\n```\n\n' +
      "```{{notice}}\n```\n\n```{{notice}}\n---\n---\n```\n\n~~~{{notice}}\n---\nhours:\n  - 1\n  - 2\n---\n~~~\n\n```{{missing}}\ntext\n```\n");
    await writeFile(join(site, "_content", "de", "pages", "blocks.md"), "---\ntitle: Blöcke\n---\n\n" +
      "```{{componentFlowerHero}}\n---\npetals: 3\ncolourSystem: complementary\nfontSizeText: 80%\n---\n\n### Eins\n\nText.\n\n### Zwei\n```\n");
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
  });

  test("shows it in Markdown and in a template, filled with its settings, its texts, the labels and its data", async () => {
    const notice = (id, texts, language) =>
      `<aside id="notice-${id}" data-level="high &amp; &lt;dry&gt;">${texts}<p>9 &amp; 17 (${language})</p></aside>`;
    const about = await page("en/pages/about/index.html");
    for (const id of [1, 2, 3]) {
      assert.ok(about.includes(notice(id, "<h2>Notice</h2><small>Read &lt;this&gt; Close</small><p>Closed on <em>Monday</em>.</p>\n", "en")), id);
    }
    assert.ok(about.indexOf('id="notice-2"') < about.indexOf("</main>") && about.indexOf("</main>") < about.indexOf('id="notice-3"'));
    assert.ok(about.includes("<p>Write <code>{{notice}}</code> in a paragraph of its own:</p>"));
    assert.ok((await page("de/pages/about/index.html")).includes(notice(1, "<h2></h2><small> Schließen</small>", "de")));
  });

  test("publishes its files but its template, its data file and what has a name that starts with a dot or an underscore", async () => {
    // Beside the components of the starter, whose names start with "component".
    assert.deepEqual((await listFiles(join(site, "public", "components"))).filter(file => !file.startsWith("component")),
      ["notice/img/icon.svg", "notice/notice.css"]);
  });

  test("gives a fenced code block that names it a text and settings of its own", async () => {
    const notice = (id, level, texts, hours) => `<aside id="notice-${id}" data-level="${level}">${texts}<p>${hours} (en)</p></aside>`;
    const text = "<h2>Notice</h2><small>Read &lt;this&gt; Close</small><p>Closed on <em>Monday</em>.</p>\n";
    const html = await page("en/pages/blocks/index.html");
    // The first block replaces the title, a setting, a list and the text, and keeps the hint of the component's text.
    assert.ok(html.includes(notice(1, "low", "<h2>Block &amp; &lt;own&gt;</h2><small>Read &lt;this&gt; Close</small><p>Open on <em>Sunday</em>.</p>\n", "8 &amp; 12")));
    // An empty block and one whose front matter has no fields are the component as it is, and a block without
    // Markdown keeps the component's text.
    for (const id of [2, 3]) assert.ok(html.includes(notice(id, "high &amp; &lt;dry&gt;", text, "9 &amp; 17")), id);
    assert.ok(html.includes(notice(4, "high &amp; &lt;dry&gt;", text, "1 &amp; 2")));
    assert.ok(html.includes('<pre tabindex="0"><code class="language-{{missing}}">text\n</code></pre>'));
    // The component of the template follows the blocks, as it is.
    assert.ok(html.includes(notice(5, "high &amp; &lt;dry&gt;", text, "9 &amp; 17")));
    assert.ok(html.indexOf('id="notice-4"') < html.indexOf("</main>") && html.indexOf("</main>") < html.indexOf('id="notice-5"'));
  });

  test("gives a block of the flower its petals, its colours and its texts, and the names of the component's text", async () => {
    const html = await page("de/pages/blocks/index.html");
    const flower = html.slice(html.indexOf("<component-flower "), html.indexOf("</component-flower>"));
    assert.ok(flower.startsWith('<component-flower class="component" role="group" aria-labelledby="componentFlowerHero-1-title" ' +
      'style="--hue-petals: 202; --hue-centre: 22; --hue-stem: 202; --petal-width: 0.9; --speed-falling: 3s; --speed-text: 3s; ' +
      '--speed-fading: 4s; --opacity-fallen: 0.2; --font-size-text: 0.8">\n  <h3 id="componentFlowerHero-1-title">Blume</h3>'));
    assert.deepEqual([...flower.matchAll(/style="--angle: ([\d.]+)deg" aria-label="([^"]+)" disabled>/g)].map(match => match.slice(1)),
      [["0", "Blütenblatt 1"], ["120", "Blütenblatt 2"], ["240", "Blütenblatt 3"]]);
    assert.deepEqual([...flower.matchAll(/<li>\n<h3>([^<]+)<\/h3>/g)].map(match => match[1]), ["Eins", "Zwei"]);
  });

  test("refuses a setting that its data file refuses, in blyss.config.js, in a block and for a variant without settings, and keeps the previous output", async () => {
    const config = await readFile(configFile, "utf8");
    const source = await readFile(join(site, blocks), "utf8");
    for (const [file, original, search, replacement, message] of [
      [configFile, config, 'hours: ["9", "17"]', "hours: 9", "Cannot use components.notice.hours 9: it must be a list of hours.\n"],
      [join(site, blocks), source, 'hours: ["8", "12"]', "hours: 8",
        `Cannot build ${blocks}: its {{notice}} block cannot use hours 8, which must be a list of hours.\n`],
      [join(site, blocks), source, "---\n\nOpen on", "\nOpen on", `Cannot build ${blocks}: the front matter of its {{notice}} block lacks its closing ---.\n`],
      [join(site, blocks), source, "```{{missing}}", "{{noticeOverlay}}\n\n```{{missing}}", "Cannot use components.noticeOverlay.hours undefined: it must be a list of hours.\n"]
    ]) {
      assert.ok(original.includes(search), search);
      await writeFile(file, original.replace(search, replacement));
      try {
        const result = run(["build"], site);
        assert.equal(result.status, 1, replacement);
        assert.equal(result.stderr, message);
        assert.ok((await stat(join(site, "public", "en", "index.html"))).isFile());
      } finally {
        await writeFile(file, original);
      }
    }
  });
});

describe("a site with formulas, footnotes and a component that shows code blocks", () => {
  let site;
  const page = path => readFile(join(site, "public", path), "utf8");
  const notes = join("_content", "en", "pages", "notes.md");
  const sliderText = join("_content", "en", "components", "componentSliderHero.md");
  const chart = (id, lines, kind, title, code) =>
    `<figure id="chart-${id}" data-lines="${lines}" data-kind="${kind}" data-texts="0"><figcaption>${title}</figcaption><pre>${code}</pre></figure>\n`;

  before(async () => {
    site = join(sandbox, "writing");
    assert.equal(run(["init", site], sandbox).status, 0);
    await enableStarterComponent(site, "componentSliderHero");
    // The component shows the code blocks in two languages and counts the lines of the code as it is written.
    const component = join(site, "components", "chart");
    await mkdir(component);
    await writeFile(join(component, "chart.html"),
      '<figure id="{{id}}" data-lines="{{lines}}" data-kind="{{kind}}" data-texts="{{texts}}"><figcaption>{{title}}</figcaption><pre>{{content}}</pre></figure>\n');
    await writeFile(join(component, "chart.data.js"), `export const languages = ["chart", "plot"];
export default ({ settings, source, texts, refuse }) => {
  if (settings.kind !== undefined && settings.kind !== "bar") throw refuse("kind", settings.kind, '"bar"');
  return { lines: source.trim().split("\\n").length, texts: texts.length };
};
`);
    await writeFile(join(site, "_content", "en", "components", "chart.md"), "---\ntitle: Default\n---\n\n### a <b> & $x$\n");
    await writeFile(join(site, notes), "---\ntitle: Notes\n---\n\n" +
      "Inline $a$ and $$b$$ here, but $5 and $10, \\$x\\$ and `$c$` stay, as *does $d*e$ in* an emphasis.\n\n$$\n\\frac{1}{2}\n$$\n\n" +
      "First[^b], second[^a] and first again[^b]; [^missing] stays.\n\n[^a]: Note *a*.\n[^b]: Note b.\n[^unused]: Unused.\n\n" +
      // Code directly below a paragraph, and what holds no formula and no link: the description of an image and the text of a link.
      "Code below a paragraph:\n```\n$$\n\\frac{1\n$$\n```\n\nAnd:\n~~~\n[^b]: Not a footnote.\n~~~\n\n" +
      "![A plot of $f$ and [^a]](/plot.png), [a link to [^a]](/x/) and ``quotes'' before $q$.\n\n" +
      "After ~5, a_b, 5 * 3, a < b, wow! and www.example.com comes $w$.\n\n" +
      "```chart\n---\ntitle: Not front matter\n---\nx < y & $z$\n```\n\n```plot with further words\np\n```\n\n" +
      "```{{chart}}\n---\ntitle: Own & <title>\nkind: bar\n---\n\none\ntwo\n```\n\n{{chart}}\n\n- ```chart\n  nested\n  ```\n\n" +
      '```{{componentMermaid}}\n---\nlibrary: /mermaid.mjs?v=1&x="y"\n---\n\ngraph TD\n```\n');
    // Formulas are read in every text: in that of a component and in those of the hero.
    await writeFile(join(site, sliderText), `${await readFile(join(site, sliderText), "utf8")}\nA formula $s$.\n`);
    const heroTexts = join(site, "_content", "en", "heroTexts.md");
    await writeFile(heroTexts, `${await readFile(heroTexts, "utf8")}\n#### Formula\n\nA formula $h$.\n`);
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
  });

  test("turns $…$ and $$…$$ into MathML in every text and leaves other dollar signs as they are", async () => {
    const html = await page("en/pages/notes/index.html");
    const formula = letter => `<math><mi>${letter}</mi></math>`;
    assert.ok(html.includes(`<p>Inline ${formula("a")} and <math display="block" class="tml-display" style="display:block math;"><mi>b</mi></math> ` +
      "here, but $5 and $10, $x$ and <code>$c$</code> stay, as <em>does <math><mrow><mi>d</mi><mo>∗</mo><mi>e</mi></mrow></math> in</em> an emphasis.</p>"));
    assert.ok(html.includes('<div class="math"><math display="block" class="tml-display" style="display:block math;"><mfrac><mn>1</mn><mn>2</mn></mfrac></math></div>'));
    // Code below a paragraph stays code, whatever it starts with, and the description of an image stays plain text.
    assert.ok(html.includes('<p>Code below a paragraph:</p>\n<pre tabindex="0"><code>$$\n\\frac{1\n$$\n</code></pre>\n<p>And:</p>\n<pre tabindex="0"><code>[^b]: Not a footnote.\n</code></pre>'));
    assert.ok(html.includes('<p><img src="/plot.png" alt="A plot of $f$ and [^a]">, <a href="/x/">a link to [^a]</a> ' +
      `and \`\`quotes&#39;&#39; before ${formula("q")}.</p>`));
    // A formula is found after every character at which marked ends a text.
    assert.ok(html.includes('<p>After ~5, a_b, 5 * 3, a &lt; b, wow! and <a href="http://www.example.com">www.example.com</a> ' +
      `comes ${formula("w")}.</p>`));
    const home = await page("en/index.html");
    assert.ok(home.includes(`<p>A formula ${formula("s")}.</p>`));
    assert.ok(home.includes(`<div>\n<h4>Formula</h4>\n<p>A formula ${formula("h")}.</p>\n</div>`));
  });

  test("numbers the footnotes by their first references and lists those that the text refers to, each with its links back", async () => {
    const html = await page("en/pages/notes/index.html");
    const reference = (number, id) => `<sup class="footnote-ref"><a href="#fn:${number}" id="${id}" role="doc-noteref">${number}</a></sup>`;
    const back = (id, count = "") => `<a href="#${id}" role="doc-backlink" aria-label="Back to the text">↩︎${count}</a>`;
    assert.ok(html.includes(`<p>First${reference(1, "fnref:1")}, second${reference(2, "fnref:2")} and first again${reference(1, "fnref:1:2")}; [^missing] stays.</p>`));
    assert.ok(html.includes('<section class="footnotes" role="doc-endnotes" aria-label="Footnotes">\n<ol>\n' +
      `<li id="fn:1">\n<p>Note b. ${back("fnref:1")} ${back("fnref:1:2", "<sup>2</sup>")}</p>\n</li>\n` +
      `<li id="fn:2">\n<p>Note <em>a</em>. ${back("fnref:2")}</p>\n</li>\n</ol>\n</section>`));
    assert.doesNotMatch(html, /Unused/);
    assert.equal(html.match(/ id="[^"]+"/g).length, new Set(html.match(/ id="[^"]+"/g)).size);
  });

  test("shows a code block in a language of a component with that component, which takes code as its text", async () => {
    const html = await page("en/pages/notes/index.html");
    // A code block in one of its languages is the code as it is, and neither front matter nor Markdown.
    assert.ok(html.includes(chart(1, 4, "", "Default", "---\ntitle: Not front matter\n---\nx &lt; y &amp; $z$")));
    assert.ok(html.includes(chart(2, 1, "", "Default", "p")));
    // A block of the component has front matter, and the component itself shows the code of its text.
    assert.ok(html.includes(chart(3, 2, "bar", "Own &amp; &lt;title&gt;", "one\ntwo")));
    assert.ok(html.includes(chart(4, 1, "", "Default", "### a &lt;b&gt; &amp; $x$")));
    assert.ok(html.includes('<pre tabindex="0"><code class="language-chart">nested\n</code></pre>'));
    // A block of a diagram sets the URL of its library, escaped like every setting.
    assert.ok(html.includes('<component-mermaid class="component" id="componentMermaid-1" data-library="/mermaid.mjs?v=1&amp;x=&quot;y&quot;" data-theme="neutral" '));
  });

  test("refuses a formula that is not LaTeX, a language that two components show and code that a component refuses, and keeps the previous output", async () => {
    const graph = join("components", "graph");
    const graphData = join(graph, "graph.data.js");
    const source = await readFile(join(site, notes), "utf8");
    const text = await readFile(join(site, sliderText), "utf8");
    await mkdir(join(site, graph));
    await writeFile(join(site, graph, "graph.html"), "<figure>{{content}}</figure>\n");
    await writeFile(join(site, graphData), "export default () => ({});\n");
    for (const [file, original, search, replacement, message] of [
      [notes, source, "\\frac{1}{2}", "\\frac{1", new RegExp(`^Cannot build ${notes.replaceAll("\\", "\\\\")}: its formula \\$\\$ \\\\frac\\{1 \\$\\$ is not valid LaTeX\\.\\n` +
        ".+\\nWrite \\\\\\$ for a dollar sign that starts no formula\\.\\n$")],
      [sliderText, text, "$s$", "$\\nothing$", new RegExp(`^Cannot build ${sliderText.replaceAll("\\", "\\\\")}: its formula \\$\\\\nothing\\$ is not valid LaTeX\\.\\n`)],
      [graphData, "export default () => ({});\n", "export", 'export const languages = ["plot"];\nexport',
        new RegExp(`^Cannot build ${graph.replaceAll("\\", "\\\\")}: chart already shows the code blocks in "plot"\\.\\n$`)],
      [graphData, "export default () => ({});\n", "export", 'export const languages = "graph";\nexport',
        new RegExp(`^Cannot build ${graphData.replaceAll("\\", "\\\\")}: its languages must be a list of the languages of the code blocks that the ` +
          'component shows, each without a space, such as \\["mermaid"\\]\\.\\n$')],
      [notes, source, "{{chart}}\n\n- ", '```vega-lite\n{ "mark": \n```\n\n- ', new RegExp(`^Cannot build ${notes.replaceAll("\\", "\\\\")}: its \\{\\{componentVegaLite\\}\\} block ` +
        'cannot use the code "\\{ \\\\"mark\\\\":", which must be a Vega-Lite specification in JSON \\(.+\\)\\.\\n$')]
    ]) {
      assert.ok(original.includes(search), search);
      await writeFile(join(site, file), original.replace(search, replacement));
      try {
        const result = run(["build"], site);
        assert.equal(result.status, 1, replacement);
        assert.match(result.stderr, message);
        assert.ok((await stat(join(site, "public", "en", "pages", "notes", "index.html"))).isFile());
      } finally {
        await writeFile(join(site, file), original);
      }
    }
    await rm(join(site, graph), { recursive: true });
  });
});

describe("a site with the callouts, the figures and the formulas of MyST", () => {
  let site;
  const page = path => readFile(join(site, "public", path), "utf8");
  const file = join("_content", "en", "pages", "directives.md");
  const kinds = { attention: "Attention", caution: "Caution", danger: "Danger", error: "Error", hint: "Hint", important: "Important",
    note: "Note", seealso: "See also", tip: "Tip", warning: "Warning" };
  const callout = (kind, title, body) => `<div class="admonition ${kind}" role="note">\n<p class="admonition-title">${title}</p>\n${body}</div>\n`;
  const fence = "```";
  const source = `---\ntitle: Directives\ntranslationKey: directives\n---\n\n${[
    // A callout of each kind between backticks, without a title of its own.
    ...Object.keys(kinds).map(kind => `${fence}{${kind}}\nA ${kind}.\n${fence}`),
    // The titles of a callout: the text after its kind, or its first block if that is bold or a heading; a callout
    // of nothing but that text.
    ":::{tip} A *title* with `code`[^t]\nBody[^b].\n:::",
    "[^b]: Body note.\n[^t]: Title note.",
    ":::{note}\n**Bold title**\n\nBelow bold.\n:::",
    ":::{note}\n## Heading title\n\nBelow a heading.\n:::",
    ":::{warning} Only this text\n:::",
    // Directives around a directive and around code, below a line of a paragraph, in a list and in a quotation.
    `::::{important} Outer\n:::{note}\nInner.\n:::\n\n${fence}js\ncode();\n${fence}\n::::`,
    `${fence}\`{caution}\n${fence}{note}\nShorter fence.\n${fence}\n${fence}\``,
    "A paragraph.\n:::{hint}\nBelow a paragraph.\n:::",
    "- Item\n\n  :::{tip}\n  In a list.\n  :::",
    "> :::{tip}\n> Quoted.\n> :::",
    // An image and figures, with options of both forms and without any.
    `${fence}{image} /assets/img/my logo.svg\n:alt: A & B\n:width: 300\n:align: right\n${fence}`,
    ':::{figure} /assets/img/logo.svg\n---\nalt: "The logo"\nwidth: 50%\nalign: center\n---\nThe **caption**.\n\nIts second paragraph.\n:::',
    `${fence}{figure} /assets/img/logo.svg\n${fence}`,
    // Formulas within a text and on lines of their own.
    "A role {math}`a*b*c`, one with a dollar sign {math}`\\$5` and a longer run {math}``x``, but \\{math}`f` and {abc}`g` stay.",
    `${fence}{math}\n\\frac{1}{2}\n${fence}`,
    ":::{math}\n\\frac{3}{4}\n:::",
    // Other names in braces, and what a component shows, alone and within a directive.
    `${fence}{r}\nplot(x)\n${fence}`,
    ":::{tab-set}\nTabs.\n:::",
    `${fence}{{componentMermaid}}\ngraph TD\n${fence}`,
    `::::{note}\n${fence}mermaid\ngraph LR\n${fence}\n::::`
  ].join("\n\n")}\n`;
  // Labels and numbers, the images of a figure, callouts that open, a callout without a kind of its own, and the
  // alerts of GitHub.
  const labelled = join("_content", "en", "pages", "labels.md");
  const labels = `---\ntitle: Labels\n---\n\n${[
    // A footnote follows the text, and so do the numbers of its formula and of its figure.
    "A text with a footnote[^last].\n\n[^last]: Shown last, with [](#fig-note).\n\n    $$ z $$ (eq-note)\n\n    :::{figure} /assets/img/logo.svg\n    :label: fig-note\n    :::",
    "[^unused]: $$ u $$ (eq-unused)",
    // References, above the elements that they name: without a text, with {number} and {name}, and as roles.
    "See [](#fig-logo), [](#pair-b), [](#eq:dollar), [](#eq-own), [](#intro), [](#more) and [](#plain).",
    "[Fig. {number}](#fig-logo), [formula %s](#eq-half), [*{name}*, {number}](#pair-a), [`{number}`](#fig-logo), [\\{number}](#fig-logo) and [the paragraph](#par).",
    "{ref}`fig-logo`, {numref}`Fig. %s <fig-logo>`, {eq}`eq-latex` and {ref}`the start <intro>`.",
    "(intro)=\n## Introduction",
    "(par)=\nA paragraph with a label.",
    ":::{figure} /assets/img/logo.svg\n:label: fig-logo\nThe logo.\n:::",
    ":::{figure} /assets/img/logo.svg\nNot numbered.\n:::",
    ":::{figure} /assets/img/logo.svg\n:enumerated:\n:::",
    `${fence}{image} /assets/img/logo.svg\n:name: img-logo\n${fence}`,
    `${fence}{math}\n:label: eq-half\n\\frac{1}{2}\n${fence}`,
    "$$\n\\frac{3}{4}\n$$ (eq:dollar)",
    "$$\n\\label{eq-latex} \\frac{5}{6}\n$$",
    `${fence}{math}\n:label: eq-off\n:enumerated: false\n\\frac{7}{8}\n${fence}`,
    // Environments of LaTeX that number their lines, a tag of LaTeX and a number for all lines of an environment.
    "$$\n\\begin{align} a &= b \\\\ c &= d \\nonumber \\\\ e &= f \\end{align}\n$$",
    "$$ g \\tag{*} $$ (eq-own)",
    `${fence}{math}\n:enumerated: false\n\\begin{equation} h \\end{equation}\n${fence}`,
    `${fence}{math}\n:enumerated:\n\\begin{aligned} i &= j \\\\ k &= l \\end{aligned} % as a whole\n${fence}`,
    ":::{figure}\n:label: pair\n:align: center\n\n![The logo](/assets/img/logo.svg)\n![](/assets/img/logo.svg)\n\nTwo **logos**.\n:::",
    ":::{note} Click me\n:class: dropdown\n:label: more\nHidden.\n:::",
    ":::{warning}\n:open:\nShown.\n:::",
    ":::{admonition} A *title* of its own\n:class: tip wide\nAdvice.\n:::",
    ":::{admonition}\nNo title.\n:::",
    "> [!NOTE]\n> Useful *information*.",
    "> [!caution] On the line.\n>\n> **Bold stays text.**",
    "> [!FOO]\n> A quotation.",
    // The label of a block of a component, which stays one.
    `(flow)=\n${fence}mermaid\ngraph TD\n${fence}`,
    // A figure without a number, which a reference names by its caption.
    ":::{figure} /assets/img/logo.svg\n:label: plain\n:enumerated: false\nA **plain** caption.\n\nIts second paragraph.\n:::",
    "[The figure](#fig-logo), [the formula](#eq:dollar) and [the heading](#intro)."
  ].join("\n\n")}\n`;

  before(async () => {
    site = join(sandbox, "directives");
    assert.equal(run(["init", site], sandbox).status, 0);
    await writeFile(join(site, file), source);
    await writeFile(join(site, "_content", "de", "pages", "directives.md"),
      `---\ntitle: Direktiven\ntranslationKey: directives\n---\n\n:::{note}\nText.\n:::\n\n${fence}{seealso}\nMehr.\n${fence}\n`);
    // A text of the hero is no page, but its callout is titled in its language as well; its formula has no number,
    // and its {ref} is no reference.
    const heroTexts = join(site, "_content", "de", "heroTexts.md");
    await writeFile(heroTexts, `${await readFile(heroTexts, "utf8")}\n#### Hinweisbox\n\n:::{tip}\nIm Hero.\n:::\n\n` +
      "#### Formel\n\n$$\n\\begin{equation} E \\end{equation}\n$$\n\nKein Verweis: {ref}`formel`.\n");
    await writeFile(join(site, labelled), labels);
    await writeFile(join(site, "_content", "de", "pages", "labels.md"),
      "---\ntitle: Labels\n---\n\n:::{figure} /assets/img/logo.svg\n:label: logo\nDas Logo.\n:::\n\n> [!TIP]\n> Ein Rat.\n\nSiehe [](#logo).\n");
    // In a doc, a heading with a label has it as its id, which the heading below it leaves alone.
    await writeFile(join(site, "_content", "en", "book", "labelled.md"), "---\ntitle: Labelled\norder: 9\n---\n\n(setup)=\n## Setup\n\n## Setup\n");
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
  });

  test("shows a callout of each kind, titled by the text after its kind, by its first block or by the label of its language", async () => {
    const html = await page("en/pages/directives/index.html");
    for (const [kind, label] of Object.entries(kinds)) assert.ok(html.includes(callout(kind, label, `<p>A ${kind}.</p>\n`)), kind);
    // The footnote of a title precedes that of the text below it.
    const reference = number => `<sup class="footnote-ref"><a href="#fn:${number}" id="fnref:${number}" role="doc-noteref">${number}</a></sup>`;
    assert.ok(html.includes(callout("tip", `A <em>title</em> with <code>code</code>${reference(1)}`, `<p>Body${reference(2)}.</p>\n`)));
    assert.ok(html.includes(callout("note", "Bold title", "<p>Below bold.</p>\n")));
    assert.ok(html.includes(callout("note", "Heading title", "<p>Below a heading.</p>\n")));
    assert.ok(html.includes(callout("warning", "Warning", "<p>Only this text</p>\n")));
    assert.ok((await page("de/pages/directives/index.html"))
      .includes(callout("note", "Anmerkung", "<p>Text.</p>\n") + callout("seealso", "Siehe auch", "<p>Mehr.</p>\n")));
    assert.ok((await page("de/index.html")).includes(`<div>\n<h4>Hinweisbox</h4>\n${callout("tip", "Tipp", "<p>Im Hero.</p>\n")}</div>`));
  });

  test("holds a directive and code within a directive, and a directive below a paragraph, in a list and in a quotation", async () => {
    const html = await page("en/pages/directives/index.html");
    const code = '<pre tabindex="0"><code class="language-js"><span class="hljs-title function_">code</span>();\n</code></pre>\n';
    assert.ok(html.includes(callout("important", "Outer", callout("note", "Note", "<p>Inner.</p>\n") + code)));
    assert.ok(html.includes(callout("caution", "Caution", callout("note", "Note", "<p>Shorter fence.</p>\n"))));
    assert.ok(html.includes(`<p>A paragraph.</p>\n${callout("hint", "Hint", "<p>Below a paragraph.</p>\n")}`));
    assert.ok(html.includes(`<li><p>Item</p>\n${callout("tip", "Tip", "<p>In a list.</p>\n")}</li>`));
    assert.ok(html.includes(`<blockquote>\n${callout("tip", "Tip", "<p>Quoted.</p>\n")}</blockquote>`));
  });

  test("shows an image and a figure with their description, width and alignment, and the body of a figure as its caption", async () => {
    const html = await page("en/pages/directives/index.html");
    assert.ok(html.includes('<p class="align-right"><img src="/assets/img/my%20logo.svg" alt="A &amp; B" style="width: 300px"></p>'));
    assert.ok(html.includes('<figure class="align-center">\n<img src="/assets/img/logo.svg" alt="The logo" style="width: 50%">\n' +
      "<figcaption>\n<p>The <strong>caption</strong>.</p>\n<p>Its second paragraph.</p>\n</figcaption>\n</figure>"));
    assert.ok(html.includes('<figure>\n<img src="/assets/img/logo.svg" alt="">\n</figure>'));
  });

  test("turns {math} into MathML, within a text and as a directive", async () => {
    const html = await page("en/pages/directives/index.html");
    const formula = body => `<math>${body}</math>`;
    assert.ok(html.includes(`<p>A role ${formula("<mrow><mi>a</mi><mo>∗</mo><mi>b</mi><mo>∗</mo><mi>c</mi></mrow>")}, one with a dollar sign ` +
      `${formula("<mrow><mi>$</mi><mn>5</mn></mrow>")} and a longer run ${formula("<mi>x</mi>")}, but {math}<code>f</code> and {abc}<code>g</code> stay.</p>`));
    for (const [numerator, denominator] of [[1, 2], [3, 4]]) {
      assert.ok(html.includes('<div class="math"><math display="block" class="tml-display" style="display:block math;">' +
        `<mfrac><mn>${numerator}</mn><mn>${denominator}</mn></mfrac></math></div>`));
    }
  });

  test("leaves a fence with another name what it is in Markdown, and shows the block of a component alone but not within a directive", async () => {
    const html = await page("en/pages/directives/index.html");
    assert.ok(html.includes('<pre tabindex="0"><code class="language-{r}">plot(x)\n</code></pre>'));
    assert.ok(html.includes("<p>:::{tab-set}\nTabs.\n:::</p>"));
    assert.ok(html.includes('<component-mermaid class="component" id="componentMermaid-1" '));
    assert.ok(html.includes(callout("note", "Note", '<pre tabindex="0"><code class="language-mermaid">graph LR\n</code></pre>\n')));
  });

  test("gives an element with a label its id, and a number to a figure and a formula with a label or with enumerated", async () => {
    const html = await page("en/pages/labels/index.html");
    const image = '<img src="/assets/img/logo.svg" alt="">';
    const numbered = (number, text = "") => `<span class="caption-number">Figure ${number}${text && ":"}</span>${text && ` ${text}`}`;
    assert.ok(html.includes('<h2 id="intro">Introduction</h2>\n<div id="par">\n<p>A paragraph with a label.</p>\n</div>\n' +
      `<figure id="fig-logo">\n${image}\n<figcaption>\n<p>${numbered(1, "The logo.")}</p>\n</figcaption>\n</figure>\n` +
      `<figure>\n${image}\n<figcaption>\n<p>Not numbered.</p>\n</figcaption>\n</figure>\n` +
      `<figure>\n${image}\n<figcaption>\n<p>${numbered(2)}</p>\n</figcaption>\n</figure>\n` +
      '<p><img id="img-logo" src="/assets/img/logo.svg" alt=""></p>'));
    // A label is an option, follows $$ in brackets or is the \label of LaTeX; a number stands beside its formula.
    for (const [id, numerator, number] of [["eq-half", 1, 1], ["eq:dollar", 3, 2], ["eq-latex", 5, 3]]) {
      assert.match(html, new RegExp(`<div class="math" id="${id}"><math [^>]+><mtable [^\\n]+<mfrac><mn>${numerator}</mn>[^\\n]+<mtext class="tml-tag">\\(${number}\\)</mtext>`));
    }
    assert.ok(html.includes('<div class="math" id="eq-off"><math display="block" class="tml-display" style="display:block math;"><mfrac><mn>7</mn><mn>8</mn></mfrac></math></div>'));
    assert.ok(html.includes('<p><a href="#fig-logo">The figure</a>, <a href="#eq:dollar">the formula</a> and <a href="#intro">the heading</a>.</p>'));
    assert.match(html, /<div id="flow">\n(?:<(?:link|script) [^\n]+\n)*<component-mermaid class="component" id="componentMermaid-1" /);
    assert.equal(html.match(/ id="[^"]+"/g).length, new Set(html.match(/ id="[^"]+"/g)).size);
    assert.ok((await page("de/pages/labels/index.html")).includes('<p><span class="caption-number">Abbildung 1:</span> Das Logo.</p>'));
    const doc = await page("en/book/labelled/index.html");
    assert.ok(doc.includes('<h2 id="setup">Setup</h2>\n<h2 id="setup-1">Setup</h2>'));
    assert.ok(doc.includes('<li><a href="#setup">Setup</a></li>\n  <li><a href="#setup-1">Setup</a></li>'));
  });

  test("numbers the formulas and the figures of a page in the order in which it shows them, with the lines that an environment of LaTeX numbers", async () => {
    const html = await page("en/pages/labels/index.html");
    // The tag of a formula is no number, and neither a line with \nonumber nor a formula whose enumerated is off has one.
    assert.deepEqual(html.match(/<mtext class="tml-tag">[^<]+<\/mtext>/g).map(tag => tag.replace(/<[^>]+>/g, "")),
      ["(1)", "(2)", "(3)", "(4)", "(5)", "(*)", "(6)", "(7)"]);
    assert.match(html, /<mtd[^>]*><mrow><mo>=<\/mo><mi>b<\/mi><\/mrow><\/mtd><mtd[^>]*><mtext class="tml-tag">\(4\)<\/mtext><\/mtd><\/mtr>.+<mi>d<\/mi><\/mrow><\/mtd><mtd[^>]*><mtext><\/mtext><\/mtd><\/mtr>.+<mtext class="tml-tag">\(5\)<\/mtext>/);
    assert.match(html, /<mi>h<\/mi><\/mtd><mtd[^>]*><mtext><\/mtext><\/mtd><\/mtr><\/mtable><\/math><\/div>/);
    assert.ok(!html.includes("tml-eqn"));
    // Any other text has no numbers, so that none stands twice on a page.
    assert.match(await page("de/index.html"), /<h4>Formel<\/h4>\n<div class="math"><math [^\n]+<mi>E<\/mi><\/mtd><mtd[^>]*><mtext><\/mtext><\/mtd><\/mtr><\/mtable><\/math><\/div>/);
    // The footnote, which the text defines first, is shown last; one without a reference is not shown.
    assert.match(html, /<li id="fn:1">\n<p>Shown last, with <a href="#fig-note">Figure 4<\/a>\.<\/p>\n<div class="math" id="eq-note"><math [^\n]+<mtext class="tml-tag">\(7\)<\/mtext>[^\n]+\n<figure id="fig-note">\n[^\n]+\n<figcaption>\n<p><span class="caption-number">Figure 4<\/span><\/p>/);
    assert.ok(!html.includes("eq-unused"));
  });

  test("fills in a reference with the number or the name of its element, also for {number} and {name} in its text and for a role of MyST", async () => {
    const html = await page("en/pages/labels/index.html");
    const link = (label, text) => `<a href="#${label}">${text}</a>`;
    // A numbered figure and one of its images, formulas with a number and with a tag, a heading, a callout and a caption.
    assert.ok(html.includes(`<p>See ${link("fig-logo", "Figure 1")}, ${link("pair-b", "Figure 3b")}, ${link("eq:dollar", "(2)")}, ${link("eq-own", "(*)")}, ` +
      `${link("intro", "Introduction")}, ${link("more", "Click me")} and ${link("plain", "A <strong>plain</strong> caption.")}.</p>`));
    // Code and a backslash keep {number}, and a link with a text of its own stays as it is.
    assert.ok(html.includes(`<p>${link("fig-logo", "Fig. 1")}, ${link("eq-half", "formula 1")}, ${link("pair-a", "<em>The logo</em>, 3a")}, ` +
      `${link("fig-logo", "<code>{number}</code>")}, ${link("fig-logo", "{number}")} and ${link("par", "the paragraph")}.</p>`));
    assert.ok(html.includes(`<p>${link("fig-logo", "Figure 1")}, ${link("fig-logo", "Fig. 1")}, ${link("eq-latex", "(3)")} and ${link("intro", "the start")}.</p>`));
    assert.ok((await page("de/pages/labels/index.html")).includes('<p>Siehe <a href="#logo">Abbildung 1</a>.</p>'));
    // Any other text has no labels, so that its {ref} stays as it is written.
    assert.ok((await page("de/index.html")).includes("<p>Kein Verweis: {ref}<code>formel</code>.</p>"));
  });

  test("shows the images of a figure without a URL as figures within it, each with a letter and its description", async () => {
    const part = (letter, description) => `<figure id="pair-${letter}">\n<img src="/assets/img/logo.svg" alt="${description}">\n` +
      `<figcaption><span class="caption-number">(${letter})</span>${description && ` ${description}`}</figcaption>\n</figure>\n`;
    assert.ok((await page("en/pages/labels/index.html")).includes(`<figure id="pair" class="subfigures align-center">\n${part("a", "The logo")}${part("b", "")}` +
      '<figcaption>\n<p><span class="caption-number">Figure 3:</span> Two <strong>logos</strong>.</p>\n</figcaption>\n</figure>'));
  });

  test("makes a callout one that opens at a click, and {admonition} one with the title and the classes that it is given", async () => {
    const html = await page("en/pages/labels/index.html");
    assert.ok(html.includes('<details class="admonition note dropdown" id="more">\n<summary class="admonition-title">Click me</summary>\n<p>Hidden.</p>\n</details>\n' +
      '<details class="admonition warning dropdown" open>\n<summary class="admonition-title">Warning</summary>\n<p>Shown.</p>\n</details>\n' +
      '<div class="admonition tip wide" role="note">\n<p class="admonition-title">A <em>title</em> of its own</p>\n<p>Advice.</p>\n</div>\n' +
      '<div class="admonition" role="note">\n<p>No title.</p>\n</div>'));
  });

  test("reads a quotation that starts with one of the alerts of GitHub as a callout of that kind", async () => {
    const html = await page("en/pages/labels/index.html");
    assert.ok(html.includes(callout("note", "Note", "<p>Useful <em>information</em>.</p>\n") +
      callout("caution", "Caution", "<p>On the line.</p>\n<p><strong>Bold stays text.</strong></p>\n") +
      "<blockquote>\n<p>[!FOO]\nA quotation.</p>\n</blockquote>"));
    assert.ok((await page("de/pages/labels/index.html")).includes(callout("tip", "Tipp", "<p>Ein Rat.</p>\n")));
  });

  test("refuses a label that is no name, stands twice, names nothing or belongs to no page, a link without a text that is no reference to an element with something to show, and a figure without an image", async () => {
    const heroTexts = join("_content", "en", "heroTexts.md");
    const hero = await readFile(join(site, heroTexts), "utf8");
    const link = "[The figure](#fig-logo)";
    for (const [file, original, search, replacement, message] of [
      [labelled, labels, ":label: fig-logo", ":label: fig logo", 'its label "fig logo" must be a name of letters, digits, hyphens, underscores, full stops and colons, such as "fig-harbour"\\.\\n$'],
      [labelled, labels, ":label: fig-logo", ":label: intro", 'it has the label "intro" twice, but a label names one element of a page\\.\\n$'],
      [labelled, labels, ":label: fig-logo", ":label: pair-b", 'it has the label "pair-b" twice, but a label names one element of a page\\.\\n$'],
      [labelled, labels, ":name: img-logo", ":name: overlay", 'its label "overlay" is the id of an element of its templates, so it needs another name\\.\\n$'],
      [labelled, labels, ":name: img-logo", ":name: fn:1", 'its label "fn:1" is the id of a footnote, so it needs another name\\.\\n$'],
      [labelled, labels, "(par)=\nA paragraph", "(par)=\n\n(par2)=\nA paragraph", "its label \\(par\\)= must stand above a block that has no other label\\.\\n$"],
      [labelled, labels, link, "[](#figure-logo)", "its reference to #figure-logo names no label of its page\\.\\n" +
        "Label the element that it means, as with \\(figure-logo\\)= on the line above it, or give the link a text\\.\\n$"],
      [labelled, labels, link, "{ref}`the logo <figure-logo>`", "its reference to #figure-logo names no label of its page\\.\\n" +
        "Label the element that it means, as with \\(figure-logo\\)= on the line above it\\.\\n$"],
      [labelled, labels, link, "[](#par)", "its reference to #par has nothing to show: the element with that label has neither a number nor a name\\.\\n" +
        "Write the text of the reference, as in \\[this part\\]\\(#par\\)\\.\\n$"],
      [labelled, labels, link, "[Section {number}](#intro)", "its reference to #intro asks for \\{number\\}, but the element with that label has no number\\.\\n" +
        "Write \\\\\\{number\\} to show these characters themselves\\.\\n$"],
      [labelled, labels, link, "[%s](#par)", "its reference to #par asks for %s, but the element with that label has no number\\.\\n" +
        "Write \\\\%s to show these characters themselves\\.\\n$"],
      [labelled, labels, link, "[{name}](#eq-half)", "its reference to #eq-half asks for \\{name\\}, but the element with that label has no name\\.\\n" +
        "Write \\\\\\{name\\} to show these characters themselves\\.\\n$"],
      [labelled, labels, link, "[](/en/pages/about/#team)", "its link to /en/pages/about/#team has no text\\.\\n" +
        "Only a reference needs none: a link to a label of its own page, such as \\[\\]\\(#fig-harbour\\)\\.\\n$"],
      [labelled, labels, "![The logo](/assets/img/logo.svg)\n![](/assets/img/logo.svg)\n\n", "", "its \\{figure\\} directive lacks its image: the URL of one follows its name, " +
        "as in \\{figure\\} /assets/img/harbour\\.jpg, or its body holds images, each as !\\[description\\]\\(URL\\)\\.\\n$"],
      [labelled, labels, ":class: dropdown", ":class: drop.down", 'its \\{note\\} directive cannot use class "drop\\.down", which must be the names of classes, ' +
        'each of letters, digits, hyphens and underscores, such as "dropdown"\\.\\n$'],
      [labelled, labels, ":open:", ":open: maybe", 'its \\{warning\\} directive cannot use open "maybe", which must be true or false\\.\\n$'],
      [heroTexts, hero, hero, `${hero}\n#### Figure\n\n:::{figure} /assets/img/logo.svg\n:label: hero\n:::\n`, "its \\{figure\\} directive has a label or a number, " +
        "but only the text of a page, of a post or of a doc has labels and numbers\\.\\n$"]
    ]) {
      assert.ok(original.includes(search), search);
      await writeFile(join(site, file), original.replace(search, replacement));
      try {
        const result = run(["build"], site);
        assert.equal(result.status, 1, replacement);
        assert.match(result.stderr, new RegExp(`^Cannot build ${file.replaceAll("\\", "\\\\")}: ${message}`));
        assert.ok((await stat(join(site, "public", "en", "pages", "labels", "index.html"))).isFile());
      } finally {
        await writeFile(join(site, file), original);
      }
    }
  });

  test("refuses an option that it does not know, a value that an option cannot have and a directive that lacks its image or its formula, and keeps the previous output", async () => {
    const options = "; a line of text that starts like an option follows an empty line\\.\\n$";
    for (const [search, replacement, message] of [
      ["A note.", ":icon: false\nA note.", 'its \\{note\\} directive has the option "icon", which Blyss does not know\\.\\n' +
        `A \\{note\\} directive can have "class", "open", "label" and "name"${options}`],
      [":alt: A & B", ":height: 2em", 'its \\{image\\} directive has the option "height", which Blyss does not know\\.\\n' +
        `A \\{image\\} directive can have "alt", "align", "width", "label" and "name"${options}`],
      ["{image} /assets/img/my logo.svg", "{image}", "its \\{image\\} directive lacks the URL of its image, which follows its name, as in \\{image\\} /assets/img/harbour\\.jpg\\.\\n$"],
      [":align: right", ":align: right\n\nA text.", "its \\{image\\} directive has a text, which an image does not show\\.\\n" +
        "Write the description of the image as :alt:, or its caption in a \\{figure\\} directive\\.\\n$"],
      [":align: right", ":align: middle", 'its \\{image\\} directive cannot use align "middle", which must be "left", "center" or "right"\\.\\n$'],
      ["width: 50%", "width: half", 'its \\{figure\\} directive cannot use width "half", which must be a number, alone or with a unit of CSS, ' +
        'such as "50%", "300px" or "300"\\.\\n$'],
      ["align: center\n---", "align: center", "the options of its \\{figure\\} directive lack their closing ---\\.\\n$"],
      ["{math}\n\\frac{1}{2}", "{math} x\n\\frac{1}{2}", 'its \\{math\\} directive has "x" after its name, but its formula stands on the lines below it\\.\\n$'],
      ["{math}\n\\frac{1}{2}\n", "{math}\n", "its \\{math\\} directive has no formula\\.\\n$"],
      // A formula without dollar signs is refused without the advice on dollar signs.
      ["\\frac{3}{4}", "\\frac{3", "its formula :::\\{math\\} \\\\frac\\{3 ::: is not valid LaTeX\\.\\n.+\\n$"],
      ["{math}`a*b*c`", "{math}`\\frac{`", "its formula \\{math\\}`\\\\frac\\{` is not valid LaTeX\\.\\n.+\\n$"]
    ]) {
      assert.ok(source.includes(search), search);
      await writeFile(join(site, file), source.replace(search, replacement));
      try {
        const result = run(["build"], site);
        assert.equal(result.status, 1, replacement);
        assert.match(result.stderr, new RegExp(`^Cannot build ${file.replaceAll("\\", "\\\\")}: ${message}`));
        assert.ok((await stat(join(site, "public", "en", "pages", "directives", "index.html"))).isFile());
      } finally {
        await writeFile(join(site, file), source);
      }
    }
  });
});

describe("invalid content", () => {
  let site;
  before(() => {
    site = join(sandbox, "invalid");
    assert.equal(run(["init", site], sandbox).status, 0);
    assert.equal(run(["build"], site).status, 0);
  });

  const page = join("_content", "en", "pages", "about", "index.md");
  const about = join("_content", "en", "pages", "about.md");
  const post = join("_content", "en", "posts", "symbols.md");
  const hero = join("_content", "en", "heroTexts.md");
  const overlay = join("_content", "en", "overlayTexts.md");
  const fragment = join("_content", "en", "my-hero.md");
  const text = join("_content", "en", "components", "componentSlyderHero.md");
  const variant = join("components", "componentSliderHero", "componentSliderHero.html");
  const french = join("_content", "fr", "pages", "index.md");
  const loose = join("_content", "index.md");
  const section = join("_content", "en", "docs", "intro.md");
  const doc = join("_content", "en", "book", "guides", "setup.md");
  const sectionIndex = join("_content", "en", "book", "guides", "index.md");
  const order = join("_content", "en", "book", "order.md");
  const open = join("_content", "en", "posts", "open.md");
  const escape = join("_content", "en", "posts", "escape.md");
  const twin = join("_content", "en", "pages", "twin.md");
  const dated = join("_content", "en", "posts", "dated.md");
  const modified = join("_content", "en", "book", "modified.md");
  const english = join("_content", "en", sep);
  const notADate = "Write a date as 2026-11-10, or with its time as 2026-11-10T09:30:00+01:00.\n";
  const cases = [
    ["a page with the URL of another page", page, "---\ntitle: About\n---\n",
      `Cannot build /en/pages/about/: ${about} and ${page} have the same URL.\nRename ${about} or give it a different slug.\n`],
    ["a page with the translationKey of another page of its language", twin, "---\ntitle: Twin\ntranslationKey: about\n---\n",
      `Cannot build ${twin}: ${about} has the same translationKey "about" in the same language.\n` +
      "Give the page a translationKey of its own: only its translations in the other languages share it.\n"],
    ["a post whose front matter lacks its closing ---", open, "---\ntitle: Open\n\nText.\n",
      `Cannot build ${open}: its front matter lacks its closing ---.\n`],
    ["a post whose description is a text of several lines, as YAML allows", open, "---\ntitle: Folded\ndescription: >-\n  A text\n  of two lines.\n---\n",
      `Cannot build ${open}: its description is ">-", which starts a text of several lines in YAML, but a field of the front matter ` +
      'is a single line.\nWrite the text on the line of the field, or ">-" in quotes if it is the text itself.\n'],
    ["a post whose slug leads out of the output directory", escape, "---\ntitle: Escape\nslug: ../../../../escape\n---\n",
      `Cannot build ${escape}: "../../../../escape" cannot be a part of its URL.\nA slug and the names of a file and of its ` +
      'directories contain no "/", "\\", "?" or "#" and are neither "." nor "..": set slug to a name such as "my-page".\n'],
    ["a tag without a Latin letter or digit", post, '---\ntitle: Symbols\ntags: [Blyss, "#"]\n---\n',
      `Cannot build ${post}: the tag "#" needs a Latin letter or digit for its URL.\n`],
    ["a post whose datePublished is written in another way", dated, "---\ntitle: Dated\ndatePublished: 10.11.2026\n---\n",
      `Cannot build ${dated}: its datePublished "10.11.2026" is not a date.\n${notADate}`],
    ["a doc whose dateModified names a day that its month lacks", modified, "---\ntitle: Modified\ndateModified: 2026-02-30\n---\n",
      `Cannot build ${modified}: its dateModified "2026-02-30" is not a date.\n${notADate}`],
    ["hero texts with content before their first #### heading", hero, "Introduction.\n\n#### Text\n\nText.\n",
      `Cannot build ${hero}: each of its texts starts with a #### heading, but there is content before the first one.\n`],
    ["overlay texts with content before their first #### heading", overlay, "---\ntitle: Texts\n---\n\n## Text\n\n#### Text\n",
      `Cannot build ${overlay}: each of its texts starts with a #### heading, but there is content before the first one.\n`],
    ["hero texts using an old ### heading", hero, "### Old\n\nText.\n",
      `Cannot build ${hero}: its region texts use a ### heading.\nChange each ### heading to #### to start a text below the region's title.\n`],
    ["overlay texts using an old ### heading after a section", overlay, "#### New\n\nText.\n\n### Old\n",
      `Cannot build ${overlay}: its region texts use a ### heading.\nChange each ### heading to #### to start a text below the region's title.\n`],
    ["a fragment whose name templates cannot use", fragment, "---\ntitle: Mine\n---\n",
      `Cannot build ${fragment}: templates use its name in placeholders, so it must start with a Latin letter and contain ` +
      "only Latin letters and digits, such as heroTexts.md.\n"],
    ["a text for a component that does not exist", text, "---\ntitle: Slider\n---\n",
      `Cannot build ${text}: there is no component "componentSlyderHero" or "componentSlyder" in components/.\n`],
    ["a component with the name of a variant", variant, "<p></p>\n", `Cannot build ${dirname(variant)}: componentSliderHero is the name ` +
      "of the hero's variant of componentSlider, so the component needs another name.\n"],
    ["content in the directory of a language that site.languages lacks", french, "---\ntitle: Accueil\n---\n",
      `Cannot build ${french}: there is no language "fr" in site.languages.\nAdd the language to site.languages, or move the file ` +
      `to the directory of one of its languages, such as ${english}.\n`],
    ["content outside the directories of the languages", loose, "---\ntitle: Home\n---\n",
      `Cannot build ${loose}: content lies in the directory of its language, such as ${english}.\n`],
    ["content outside the sections of a language", section, "---\ntitle: Intro\n---\n",
      `Cannot build ${section}: there is no content section "docs".\nMove the file into ${join(english, "pages", sep)}, ` +
      `${join(english, "posts", sep)} or ${join(english, "book", sep)}.\n`],
    ["a doc in a directory without index.md", doc, "---\ntitle: Setup\n---\n",
      `Cannot build ${doc}: there is no ${sectionIndex}, the start page of its section.\n` +
      `Add ${sectionIndex}: its title names the section in the navigation.\n`],
    ["a doc whose order is not a number", order, "---\ntitle: Order\norder: first\n---\n",
      `Cannot build ${order}: its order "first" is not a number.\nSet order to a number, such as 1 or 2.5, or remove it.\n`]
  ];
  for (const [name, file, source, message] of cases) {
    test(`rejects ${name} and keeps the previous output`, async () => {
      const original = await readFile(join(site, file), "utf8").catch(() => null);
      const created = await mkdir(dirname(join(site, file)), { recursive: true });
      await writeFile(join(site, file), source);
      try {
        const result = run(["build"], site);
        assert.equal(result.status, 1);
        assert.equal(result.stderr, message);
        assert.ok((await stat(join(site, "public", "en", "index.html"))).isFile());
      } finally {
        if (original === null) await rm(join(site, file));
        else await writeFile(join(site, file), original);
        if (created) await rm(created, { recursive: true });
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
    ["_content", "separate from directories.content"], ["static/assets", "separate from directories.static"]]) {
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

  test("names a missing name, URL, publisher or directory of the website instead of a stack trace", async () => {
    for (const [search, replacement, message] of [
      ['name: "My Website", // CHANGE BEFORE PRODUCTION', "", 'site.name undefined: it must be the name of the website, such as "My Website"'],
      ['baseUrl: "https://example.com"', 'baseUrl: "example.com"', 'site.baseUrl "example.com": it must be the URL of the website, such as "https://example.com"'],
      ["publisher: {", "publishers: {", "site.publisher undefined: it must be an object such as " +
        '{ type: "Organization", name: "Example Publisher", url: "https://example.com" }'],
      ['content: "_content",', "", 'directories.content undefined: it must be the name of a directory, such as "_content"']
    ]) {
      await withConfig(search, replacement, async () => {
        const result = run(["build"], site);
        assert.equal(result.status, 1, replacement);
        assert.equal(result.stderr, `Cannot use ${message}.\n`);
        assert.ok((await stat(join(site, "public", "en", "index.html"))).isFile());
      });
    }
  });

  test("refuses language settings that the pages cannot use, in build and serve", { timeout: 30_000 }, async () => {
    for (const [search, replacement, message] of [
      ['defaultLanguage: "en"', 'defaultLanguage: "fr"', 'site.defaultLanguage "fr": it must be "en" or "de"'],
      ["languageSwitcher: true", 'languageSwitcher: "no"', 'site.languageSwitcher "no": it must be true or false'],
      ["      de: {", "      DE: {", "site.languages.DE: URLs use its key as a directory, so it must contain only lower-case Latin " +
        'letters, digits and hyphens, such as "en" or "pt-br"'],
      ['label: "Deutsch"', 'label: " "', 'site.languages.de.label " ": it must be the name of the language, such as "Deutsch"'],
      ['locale: "en"', 'locale: "en_GB"', 'site.languages.en.locale "en_GB": it must be a language tag, such as "en" or "en-GB"'],
      ['search: "Suchen"', "", 'site.languages.de.labels: every language needs the same labels, but it lacks "search"']
    ]) {
      await withConfig(search, replacement, async () => {
        for (const command of ["build", "serve"]) {
          const env = { ...process.env, PORT: String(await freePort()) };
          const result = spawnSync(process.execPath, [cli, command], { cwd: site, encoding: "utf8", env, timeout: 10_000 });
          assert.equal(result.status, 1, `${command} with ${replacement}`);
          assert.equal(result.stderr, `Cannot use ${message}.\n`);
        }
        assert.ok((await stat(join(site, "public", "en", "index.html"))).isFile());
      });
    }
  });

  test("refuses a layout or component setting that the templates cannot use", async () => {
    const length = 'it must be a CSS length in px, rem, vw, vh, vmin or vmax, such as';
    for (const [search, replacement, message] of [
      ['margin: "2vmin"', 'margin: "2em"', `layout.margin "2em": ${length} "2vmin"`],
      ['margin: "2vmin"', 'margin: "2vmin; color: red"', `layout.margin "2vmin; color: red": ${length} "2vmin"`],
      ['paddingHero: "1rem"', 'paddingHero: "5%"', `layout.paddingHero "5%": ${length} "2vmin"`],
      ['alignHome: "center"', 'alignHome: "centerLeft"', 'layout.alignHome "centerLeft": it must be "center" or "left"'],
      ['paddingOverlay: "1rem"', 'paddingOverlay: "1em"', `layout.paddingOverlay "1em": ${length} "2vmin"`],
      ['alignOverlay: "centerExtra"', 'alignOverlay: "centerLeft"',
        'layout.alignOverlay "centerLeft": it must be "centerExtra", "left" or "center"'],
      ["componentSliderHero: false", "componentSlyderHero: false",
        'hero.components.componentSlyderHero: there is no component "componentSlyderHero" or "componentSlyder" in components/'],
      ["componentFlowerHero: false", 'componentFlowerHero: "on"', 'hero.components.componentFlowerHero "on": it must be true (on) or false (off)'],
      ["componentGalleryOverlay: false", "componentGalleryOverlay: 0", "overlay.components.componentGalleryOverlay 0: it must be true (on) or false (off)"],
      ["texts: true // all texts of _content/<language>/heroTexts.md", "texts: 1 // all texts of _content/<language>/heroTexts.md",
        "hero.texts 1: it must be true (on) or false (off)"],
      ["post: true,", "posts: true,",
        'overlay.showOn.posts: there is no kind of page "posts", only "home", "page", "post", "book", "list" and "not-found"'],
      ["home: false,", "home: 0,", "overlay.showOn.home 0: it must be true (on) or false (off)"],
      ["synchroniseHeroOverlay: false", 'synchroniseHeroOverlay: "yes"', 'synchroniseHeroOverlay "yes": it must be true (on) or false (off)'],
      ["componentGalleryHero: {", "componentGaleryHero: {",
        'components.componentGaleryHero: there is no component "componentGaleryHero" or "componentGalery" in components/'],
      ["start: 1,", "start: 1.5,", "components.componentSliderHero.start 1.5: it must be a whole number"],
      ["end: 10000", "end: 1", "components.componentSliderHero.end 1: it must be a whole number greater than start (1)"],
      ["value:  2500,", "value: 10001,", "components.componentSliderHero.steps[1].value 10001: it must be a whole number from 1 to 10000"],
      ['de: "Ein Viertel"', 'fr: "Quart"', 'components.componentSliderHero.steps[1].description {"en":"A Quarter","fr":"Quart"}: ' +
        'it must be an object with a text for the language "de"'],
      ['heightOverall: "8rem"', 'heightOverall: "8em"', `components.componentGalleryHero.heightOverall "8em": ${length} "8rem"`],
      ['settings\n      heightOverall: "8rem"', 'settings\n      heightOverall: "8em"', `components.componentGalleryOverlay.heightOverall "8em": ${length} "8rem"`],
      ['heightCenter: "140%"', 'heightCenter: "13rem"', 'components.componentGalleryHero.heightCenter "13rem": ' +
        'it must be a percentage of heightOverall from 100% up, such as "130%"'],
      ['heightExpanded: "70%"', 'heightExpanded: "170%"', 'components.componentGalleryHero.heightExpanded "170%": ' +
        'it must be a percentage of the height of the screen above 0% and up to 100%, such as "70%"'],
      ['animationSpeedScrolling: "400ms"', 'animationSpeedScrolling: "400MS"', 'components.componentGalleryHero.animationSpeedScrolling "400MS": ' +
        'it must be a duration in ms or s, such as "400ms"'],
      ['animationSpeedImgEnlargement: "300ms"', "animationSpeedImgEnlargement: 300", 'components.componentGalleryHero.animationSpeedImgEnlargement 300: ' +
        'it must be a duration in ms or s, such as "400ms"'],
      ["petals: 4", "petals: 2", "components.componentFlowerHero.petals 2: it must be a whole number from 3 to 24"],
      ['colourSystem: "triadic"', 'colourSystem: "tetradic"', 'components.componentFlowerHero.colourSystem "tetradic": it must be "complementary" or "triadic"'],
      ["colourBaseHue: 202", "colourBaseHue: 361", "components.componentFlowerHero.colourBaseHue 361: it must be a hue from 0 to 360, such as 202"],
      ['animationSpeedFalling: "3s"', "animationSpeedFalling: 3", 'components.componentFlowerHero.animationSpeedFalling 3: it must be a duration in ms or s, such as "3s"'],
      ['opacityFallen: "20%"', 'opacityFallen: "0%"', 'components.componentFlowerHero.opacityFallen "0%": it must be a percentage from 1% to 100%, such as "30%"'],
      ['fontSizeText: "60%"', 'fontSizeText: ".6rem"', 'components.componentFlowerHero.fontSizeText ".6rem": ' +
        'it must be a percentage of the default text size above 0%, such as "60%"'],
      ['theme: "neutral"', 'theme: "pink"', 'components.componentMermaid.theme "pink": it must be "default", "neutral", "dark", "forest" or "base"'],
      ["lineWidth: 2", "lineWidth: 0", "components.componentFlowchart.lineWidth 0: it must be a number above 0 and up to 10, such as 2"],
      ['libraryVega: "https://', 'libraryVega: "http://', 'components.componentVegaLite.libraryVega "http://cdn.jsdelivr.net/npm/vega@6.4.0/build/vega.min.js": ' +
        'it must be a URL that starts with https:// or with /, such as "/assets/vega/vega.min.js"']
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

describe("a website without a directory or a template", () => {
  let site;
  before(() => {
    site = join(sandbox, "incomplete");
    assert.equal(run(["init", site], sandbox).status, 0);
    assert.equal(run(["build"], site).status, 0);
  });

  test("names a missing template or content directory and keeps the previous output", async () => {
    const content = join("_content", sep);
    for (const [path, message] of [
      [join("templates", "document.html"), `Cannot build without ${join("templates", "document.html")}: a website needs the templates ` +
        "document.html, page.html and post.html.\nCreate the template, or set directories.templates to their directory.\n"],
      ["_content", `Cannot build without ${content}: it holds the content of the website, in a directory for each language such as ` +
        `${join(content, "en", sep)}.\nCreate it, or set directories.content to the directory of the content.\n`]
    ]) {
      await rename(join(site, path), join(site, `${path}.away`));
      try {
        const result = run(["build"], site);
        assert.equal(result.status, 1, path);
        assert.equal(result.stderr, message);
        assert.ok((await stat(join(site, "public", "en", "index.html"))).isFile());
      } finally {
        await rename(join(site, `${path}.away`), join(site, path));
      }
    }
  });

  test("names a placeholder that a template cannot fill, in the template of a page, of a region and of the document, and keeps the previous output", async () => {
    // A misspelt placeholder, a label, which only document.html and the regions have, and a placeholder of another template.
    for (const [name, placeholder, unknown] of [["document.html", "{{pageTitle}}", "{{pageTitel}}"], ["page.html", "{{title}}", "{{postsLabel}}"],
      ["overlay.html", "{{texts}}", "{{bookToc}}"]]) {
      const file = join(site, "templates", name);
      const template = await readFile(file, "utf8");
      assert.ok(template.includes(placeholder), placeholder);
      await writeFile(file, template.replace(placeholder, unknown));
      try {
        const result = run(["build"], site);
        assert.equal(result.status, 1, name);
        assert.equal(result.stderr, `Cannot build with ${join("templates", name)}: there is no placeholder ${unknown}.\nCorrect its name or remove it.\n`);
        assert.ok((await stat(join(site, "public", "en", "index.html"))).isFile());
      } finally {
        await writeFile(file, template);
      }
    }
  });

  test("builds without static/, which leaves no files to copy", async () => {
    await rm(join(site, "static"), { recursive: true });
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
    assert.ok((await stat(join(site, "public", "en", "index.html"))).isFile());
    await assert.rejects(stat(join(site, "public", "assets")), { code: "ENOENT" });
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

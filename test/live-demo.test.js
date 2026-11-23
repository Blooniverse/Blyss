import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, posix } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseFrontMatter } from "../src/build/front-matter.js";
import { withBasePath } from "../src/build/html.js";
import { renderDocument } from "../src/build/markdown.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const cli = join(root, "bin", "blyss.js");
const starter = join(root, "starters", "lean");
const { default: starterConfig } = await import(pathToFileURL(join(starter, "blyss.config.js")).href);

let sandbox;
before(async () => { sandbox = await mkdtemp(join(tmpdir(), "blyss-live-demo-")); });
after(() => rm(sandbox, { recursive: true, force: true }));

const run = (args, cwd) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });
const files = async directory => (await readdir(directory, { recursive: true, withFileTypes: true })).filter(entry => entry.isFile())
  .map(entry => posix.join(...join(entry.parentPath, entry.name).slice(directory.length + 1).split(/[\\/]/)));
const unescapeHtml = text => text.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&amp;", "&");

async function createSite(name) {
  const site = join(sandbox, name);
  const result = run(["init", site], sandbox);
  assert.equal(result.status, 0, result.stderr);
  return site;
}

describe("the renderer of Blyss in the browser", () => {
  let site;
  let published;
  before(async () => {
    site = await createSite("renderer");
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
    published = join(site, "public", "components", "blyss-renderer");
  });

  test("is published as the modules of the build, each import among them, with the licences", async () => {
    const names = await files(published);
    for (const module of ["errors.js", "build/directives.js", "build/front-matter.js", "build/html.js", "build/markdown.js", "build/settings.js"]) {
      assert.equal(await readFile(join(published, module), "utf8"), await readFile(join(root, "src", module), "utf8"), module);
    }
    // A browser finds a module only by its path: none is imported by the name of a package or of a part of Node.js.
    for (const name of names.filter(file => file.endsWith(".js"))) {
      const source = await readFile(join(published, name), "utf8");
      for (const [, specifier] of source.matchAll(/^(?:import|export)\b[^"'\n]*?["']([^"'\n]+)["'];?$/gm)) {
        assert.match(specifier, /^\.\.?\//, `${name} imports ${specifier}`);
        assert.ok(names.includes(posix.join(posix.dirname(name), specifier)), `${name} imports ${specifier}`);
      }
    }
    for (const licence of ["LICENSE.txt", "libraries/LICENSE-highlight.js.txt", "libraries/LICENSE-marked.txt", "libraries/LICENSE-temml.txt"]) {
      assert.ok(names.includes(licence), licence);
    }
  });

  test("reads every Markdown text of the starter like the build", async () => {
    const browser = await import(pathToFileURL(join(published, "renderer.js")).href);
    const content = join(starter, "_content");
    const texts = (await files(content)).filter(file => file.endsWith(".md"));
    assert.ok(texts.length > 40);
    // What a renderer makes of a text: its HTML, or the message with which it refuses the text.
    const read = (render, markdown, file, labels) => {
      try {
        return render(markdown, file, labels);
      } catch (error) {
        return `${error.name}: ${error.message}`;
      }
    };
    for (const file of texts) {
      const { labels } = starterConfig.site.languages[file.split("/")[0]];
      const { markdown } = parseFrontMatter(await readFile(join(content, file), "utf8"));
      assert.equal(read(browser.renderDocument, markdown, file, labels), read(renderDocument, markdown, file, labels), file);
    }
    const html = '<a href="/en/">Home</a> <img src="/assets/img/logo.svg" alt=""> <a href="//example.com/">Other</a>';
    assert.equal(browser.withBasePath(html, "/docs"), withBasePath(html, "/docs"));
    assert.ok(browser.withBasePath(html, "/docs").includes('src="/docs/assets/img/logo.svg"'));
  });

  test("is left out of a website without a component that asks for it, and refused if a data file asks for it wrongly", async () => {
    const plain = await createSite("plain");
    await rm(join(plain, "components", "componentLiveDemo"), { recursive: true });
    for (const language of ["en", "de"]) {
      await rm(join(plain, "_content", language, "components", "componentLiveDemo.md"));
      const home = join(plain, "_content", language, "pages", "index.md");
      await writeFile(home, (await readFile(home, "utf8")).replace("\n{{componentLiveDemo}}\n", ""));
    }
    const configFile = join(plain, "blyss.config.js");
    const config = await readFile(configFile, "utf8");
    const settings = /,\n {4}\/\/ The live demo[\s\S]*?\n {4}componentLiveDemo: \{[\s\S]*?\n {4}\}/;
    assert.match(config, settings);
    await writeFile(configFile, config.replace(settings, ""));
    let result = run(["build"], plain);
    assert.equal(result.status, 0, result.stderr);
    await assert.rejects(stat(join(plain, "public", "components", "blyss-renderer")), { code: "ENOENT" });

    // A component of the website asks for the renderer and reads a text with it, with the labels of each language.
    const probe = join(plain, "components", "probe");
    await mkdir(probe);
    await writeFile(join(probe, "probe.html"), '<div id="{{id}}">{{word}}{{read}}</div>\n');
    const data = renderer => `export const renderer = ${renderer};\nexport default ({ labels, renderDocument }) => ` +
      '({ word: labels.figure, read: renderDocument("> [!NOTE]\\n> Read[^1].\\n\\n[^1]: A note.") });\n';
    await writeFile(join(probe, "probe.data.js"), data('"yes"'));
    result = run(["build"], plain);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, `Cannot build ${join("components", "probe", "probe.data.js")}: its renderer must be true or false. With true, ` +
      "the build publishes the renderer of Blyss with the website, for a script of the component that reads Markdown in the browser.\n");
    await assert.rejects(stat(join(plain, "public", "components", "blyss-renderer")), { code: "ENOENT" });
    await writeFile(join(probe, "probe.data.js"), data("true"));
    const about = join(plain, "_content", "de", "pages", "about.md");
    await writeFile(about, `${await readFile(about, "utf8")}\n{{probe}}\n`);
    result = run(["build"], plain);
    assert.equal(result.status, 0, result.stderr);
    assert.ok((await stat(join(plain, "public", "components", "blyss-renderer", "renderer.js"))).isFile());
    const page = await readFile(join(plain, "public", "de", "pages", "about", "index.html"), "utf8");
    assert.ok(page.includes('<div id="probe-1">Abbildung<div class="admonition note" role="note">\n<p class="admonition-title">Anmerkung</p>'));
    assert.ok(page.includes('<section class="footnotes" role="doc-endnotes" aria-label="Fußnoten">'));
  });
});

describe("the live demo of the starter", () => {
  let site;
  const page = path => readFile(join(site, "public", path), "utf8");
  const block = join("_content", "en", "pages", "demo.md");
  const own = "---\ntitle: Demo\n---\n\n````{{componentLiveDemo}}\n---\ntitle: Own demo\nrows: 4\n---\n\nA *note* of its own.\n\n" +
    "### Only\n\n```markdown\n**Own** text.\n### No example\n```\n````\n";
  // The examples that a page shows: each with its name, its Markdown and its result.
  const examplesOf = html => [...html.matchAll(/<li>\s*<h4>([^<]*)<\/h4>\s*<pre tabindex="0"><code>([\s\S]*?)<\/code><\/pre>\s*<template>([\s\S]*?)<\/template>\s*<\/li>/g)]
    .map(([, name, code, result]) => ({ name: unescapeHtml(name), markdown: unescapeHtml(code), result }));

  before(async () => {
    site = await createSite("demo");
    await writeFile(join(site, block), own);
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
  });

  test("keeps the last result and the text of a visitor, and tells in plain words of what it cannot show or load", async t => {
    const site = await createSite("demo-feedback");
    const result = run(["build"], site);
    assert.equal(result.status, 0, result.stderr);
    // The page of the demo, as far as its script needs it.
    class Element {
      listeners = {};
      attributes = {};
      dataset = {};
      addEventListener(name, callback) { (this.listeners[name] ??= []).push(callback); }
      dispatch(name) { for (const callback of this.listeners[name] ?? []) callback({}); }
      setAttribute(name, value) { this.attributes[name] = value; }
      removeAttribute(name) { delete this.attributes[name]; }
      append() {}
    }
    const article = { html: "", shown: [], replaceChildren(content) { this.shown.push(this.html = content.html); } };
    const preview = {
      documentElement: { style: {}, getBoundingClientRect: () => ({ height: 100 }) },
      querySelector: () => article,
      addEventListener() {},
      createElement() {
        return {
          set innerHTML(html) {
            this.content = { html, querySelectorAll: () => /language-mermaid/.test(html)
              ? [{ textContent: "diagram", parentElement: { replaceWith() {} } }] : [] };
          }
        };
      }
    };
    const editor = new Element();
    const frame = Object.assign(new Element(), { contentDocument: preview, style: {}, offsetHeight: 100, clientHeight: 100 });
    const status = Object.assign(new Element(), { textContent: "" });
    const example = { querySelector: selector => ({
      h4: { textContent: "Example" }, code: { textContent: "Example" }, template: { innerHTML: "<p>Example</p>" }
    })[selector] };
    const elements = {
      ".live": new Element(), ".examples": { children: [example] }, ".choice": new Element(),
      textarea: editor, iframe: frame, ".status": status, ".reset": new Element()
    };
    let Demo;
    const page = {
      HTMLElement: class extends Element { querySelector(selector) { return elements[selector]; } },
      customElements: { define(_name, constructor) { Demo = constructor; } },
      document: { compatMode: "CSS1Compat", documentElement: { lang: "en" }, head: { querySelectorAll: () => [] }, createElement: () => new Element() },
      ResizeObserver: class { observe() {} },
      getComputedStyle: () => ({ fontSize: "16px", fontFamily: "sans-serif" })
    };
    const previous = Object.fromEntries(Object.keys(page).map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
    Object.assign(globalThis, page);
    t.after(() => {
      for (const [name, descriptor] of Object.entries(previous)) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
      }
    });

    await import(pathToFileURL(join(site, "public", "components", "componentLiveDemo", "componentLiveDemo.js")).href);
    const demo = new Demo();
    demo.id = "demo";
    demo.dataset = {
      labels: JSON.stringify(starterConfig.site.languages.en.labels), basePath: "",
      loading: "Loading", unavailable: "Preview unavailable", failed: "Check the text.",
      diagramFailed: "Check the diagram.", diagramUnavailable: "Diagram stays code.",
      libraryMermaid: pathToFileURL(join(site, "missing-mermaid.mjs")).href
    };
    // The times of the demo's script pass at once, and what it loads takes the time that it takes.
    const [pause, patience] = [120, 600];
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const warnings = t.mock.method(console, "warn", () => {});
    const turn = () => new Promise(setImmediate);
    const until = async state => {
      for (const start = Date.now(); !state(); await turn()) {
        assert.ok(Date.now() - start < 10_000, `The live demo says ${JSON.stringify(status.textContent)} and shows ${article.html}`);
        t.mock.timers.tick(patience);
      }
    };
    const type = text => {
      editor.value = text;
      editor.dispatch("input");
    };

    demo.connectedCallback();
    frame.dispatch("load");
    assert.equal(article.html, "<p>Example</p>");

    // Without the renderer, the result of the example stays, and the console is told once.
    const renderer = join(site, "public", "components", "blyss-renderer", "renderer.js");
    await rename(renderer, `${renderer}.hidden`);
    for (const text of ["First edit", "Second edit"]) {
      status.textContent = "";
      type(text);
      await until(() => status.textContent === "Preview unavailable");
      assert.equal(article.html, "<p>Example</p>");
    }
    await rename(`${renderer}.hidden`, renderer);

    // A text that is on its way to its result when the next keystroke comes is never shown: here, the renderer
    // arrives between that keystroke and the result that follows it.
    type("Passing by");
    t.mock.timers.tick(pause);
    type("Fixed **text**");
    await import(pathToFileURL(renderer).href);
    await turn();
    await until(() => /<strong>text<\/strong>/.test(article.html));
    assert.ok(!article.shown.some(html => html.includes("Passing by")));
    assert.equal(status.textContent, "");

    // A text that cannot be shown leaves the last result, and its message has nothing of what the renderer says.
    const last = article.html;
    type("Bad $\\frac{a$");
    await until(() => status.textContent === "Check the text.");
    assert.equal(editor.attributes["aria-invalid"], "true");
    assert.equal(article.html, last);
    assert.equal(editor.value, "Bad $\\frac{a$");
    type("Fixed again");
    await until(() => article.html.includes("Fixed again"));
    assert.equal(status.textContent, "");
    assert.equal(editor.attributes["aria-invalid"], undefined);

    // A keystroke before the message of such a text is due leaves that message behind.
    type("Bad $\\frac{a$");
    t.mock.timers.tick(pause);
    await turn();
    t.mock.timers.tick(patience - 100);
    type("And fixed");
    t.mock.timers.tick(100);
    assert.equal(status.textContent, "");
    await until(() => article.html.includes("And fixed"));
    assert.equal(status.textContent, "");

    // Without Mermaid, a diagram stays code; one that Mermaid cannot draw leaves the last result.
    type("```mermaid\ngraph TD\nA-->B\n```");
    await until(() => status.textContent === "Diagram stays code.");
    assert.match(article.html, /language-mermaid/);
    const mermaid = join(site, "mermaid.mjs");
    await writeFile(mermaid, 'export default { initialize() {}, async render() { throw new Error("technical secret"); } };\n');
    demo.dataset.libraryMermaid = pathToFileURL(mermaid).href;
    type(`${editor.value}\n`);
    await until(() => status.textContent === "Check the diagram.");

    assert.deepEqual(warnings.mock.calls.map(call => call.arguments[0]),
      ["Blyss live demo: the renderer of Blyss cannot be loaded.", "Blyss live demo: Mermaid cannot be loaded."]);
  });

  test("shows each example of its text as code, with the result of the build, in every language", async () => {
    for (const [language, { labels }] of Object.entries(starterConfig.site.languages)) {
      const file = join("_content", language, "components", "componentLiveDemo.md");
      const { metadata, markdown } = parseFrontMatter(await readFile(join(starter, file), "utf8"));
      const html = await page(join(language, "index.html"));
      const demo = html.slice(html.indexOf("<component-live-demo "), html.indexOf("</component-live-demo>"));
      assert.ok(demo.includes(`<h3 id="componentLiveDemo-1-title">${metadata.title}</h3>`), language);
      assert.ok(demo.includes('<textarea id="componentLiveDemo-1-editor" rows="7"'), language);
      assert.ok(demo.includes('<iframe title="') && demo.includes('sandbox="allow-same-origin"'), language);
      const examples = examplesOf(demo);
      // The headings of the starter's examples; none of the examples holds a ### heading itself.
      assert.deepEqual(examples.map(example => example.name), [...markdown.matchAll(/^### (.+)$/gm)].map(match => match[1]), language);
      assert.ok(examples.length >= 3, language);
      for (const example of examples) {
        assert.ok(markdown.includes(`\n${example.markdown}\n`), `${language}: ${example.name}`);
        assert.equal(example.result, renderDocument(example.markdown, file, labels), `${language}: ${example.name}`);
      }
      assert.deepEqual(JSON.parse(unescapeHtml(demo.match(/ data-labels="([^"]*)"/)[1])), labels, language);
      assert.doesNotMatch(demo.replace(/<(code|template)\b[^>]*>[\s\S]*?<\/\1>/g, ""), /{{\w+}}/, language);
    }
  });

  test("gives a block its own title, lines, note and examples, and refuses what the demo cannot use", async () => {
    const html = await page(join("en", "pages", "demo", "index.html"));
    const demo = html.slice(html.indexOf("<component-live-demo "), html.indexOf("</component-live-demo>"));
    assert.ok(demo.includes('<h3 id="componentLiveDemo-1-title">Own demo</h3>'));
    assert.ok(demo.includes('<textarea id="componentLiveDemo-1-editor" rows="4"'));
    assert.ok(demo.includes('<div class="note">\n<p>A <em>note</em> of its own.</p>\n'));
    // A ### heading within the Markdown of an example belongs to it.
    assert.deepEqual(examplesOf(demo), [{ name: "Only", markdown: "**Own** text.\n### No example", result: "<p><strong>Own</strong> text.</p>\n<h3>No example</h3>\n" }]);

    const configFile = join(site, "blyss.config.js");
    const config = await readFile(configFile, "utf8");
    const library = 'libraryMermaid: "https://cdn.jsdelivr.net/';
    for (const [file, original, search, replacement, message] of [
      [join(site, block), own, "rows: 4", "rows: 1", `Cannot build ${block}: its {{componentLiveDemo}} block cannot use rows 1, which must be a whole number from 2 to 40.\n`],
      [join(site, block), own, "```markdown\n**Own** text.\n### No example\n```\n", "**Own** text.\n",
        `Cannot build ${block}: its {{componentLiveDemo}} block cannot use example "Only", which must be a ### heading above a fenced code block that holds its Markdown.\n`],
      [join(site, block), own, "**Own** text.", "**Own** $\\frac{a$ text.", `Cannot build ${block}: its formula $\\frac{a$ is not valid LaTeX.\n`],
      [configFile, config, library, 'libraryMermaid: "http://cdn.jsdelivr.net/', 'Cannot use components.componentLiveDemo.libraryMermaid "http://cdn.jsdelivr.net/npm/mermaid@'],
      [configFile, config, 'themeMermaid: "dark"', 'themeMermaid: "night"',
        'Cannot use components.componentLiveDemo.themeMermaid "night": it must be "default", "neutral", "dark", "forest" or "base".\n']
    ]) {
      assert.ok(original.includes(search), search);
      await writeFile(file, original.replace(search, replacement));
      try {
        const result = run(["build"], site);
        assert.equal(result.status, 1, replacement);
        assert.ok(result.stderr.startsWith(message), result.stderr);
        assert.ok((await stat(join(site, "public", "en", "index.html"))).isFile());
      } finally {
        await writeFile(file, original);
      }
    }
  });

  test("draws its diagrams with the Mermaid of the Mermaid component", () => {
    const { componentLiveDemo, componentMermaid } = starterConfig.components;
    assert.equal(componentLiveDemo.libraryMermaid, componentMermaid.library);
  });
});

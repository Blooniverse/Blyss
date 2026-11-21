import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { marked } from "marked";
import { parseFrontMatter } from "../src/build/front-matter.js";
import { escapeHtml } from "../src/build/html.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const cli = join(root, "bin", "blyss.js");
const script = await readFile(join(root, "starters/lean/static/assets/js/copy-markdown.js"), "utf8");

describe("copying documentation Markdown", () => {
  let site;
  const body = '\nGrüße & <tag href="/hello"> "quoted"\n\n{{componentSlider}}\n\n```html\n</script>\n```\n';
  const title = 'Copy: "test" *bold* & <tag> [link](https://example.com) # person@example.com www.example.com';
  const copied = `# Copy: "test" \\*bold\\* &amp; \\<tag\\> \\[link\\](https\\://example.com) \\# person\\@example.com www\\.example.com\n${body}`;
  const run = args => spawnSync(process.execPath, [cli, ...args], { cwd: site, encoding: "utf8" });
  const page = path => readFile(join(site, "public", path, "index.html"), "utf8");

  before(async () => {
    site = await mkdtemp(join(tmpdir(), "blyss-copy-"));
    let result = run(["init", "."]);
    assert.equal(result.status, 0, result.stderr);
    const config = join(site, "blyss.config.js");
    await writeFile(config, (await readFile(config, "utf8")).replace('baseUrl: "https://example.com"', 'baseUrl: "https://example.com/docs"'));
    await writeFile(join(site, "_content/en/book/copy-test.md"),
      `---\ntitle: ${JSON.stringify(title)}\ndescription: Private description\ntranslationKey: copy-test\n---\n${body}`);
    await writeFile(join(site, "_content/en/book/untitled.md"), "---\ndescription: Private description\n---\n\nUntitled body.\n");
    await writeFile(join(site, "_content/en/book/no-front-matter.md"), "No front matter.\n");
    await writeFile(join(site, "_content/en/book/no-blank-line.md"), "---\ntitle: Tight\n---\nBody immediately follows.\n");
    await writeFile(join(site, "_content/en/book/private-draft.md"), "---\ntitle: Private draft\ndraft: true\n---\nsecret draft body\n");
    await writeFile(join(site, "_content/en/posts/copy-test-post.md"), "---\ntitle: Post\n---\n\nPost body.\n");
    result = run(["build"]);
    assert.equal(result.status, 0, result.stderr);
  });
  after(() => rm(site, { recursive: true, force: true }));

  test("copies the title as a heading and the authored body on documentation pages in both languages", async () => {
    const html = await page("en/book/copy-test");
    const encoded = html.match(/data-markdown="([^"]*)"/)[1];
    assert.equal(Buffer.from(encoded, "base64").toString("utf8"), copied);
    assert.equal(marked.parse(copied).split("\n")[0], `<h1>${escapeHtml(title)}</h1>`);
    assert.match(html, /<button type="button">Copy Markdown<\/button>/);
    assert.match(html, /src="\/docs\/assets\/js\/copy-markdown\.js"/);
    const german = await page("de/book");
    const germanSource = await readFile(join(site, "_content/de/book/index.md"), "utf8");
    const germanFrontMatter = parseFrontMatter(germanSource);
    assert.equal(Buffer.from(german.match(/data-markdown="([^"]*)"/)[1], "base64").toString("utf8"),
      `# ${germanFrontMatter.metadata.title}\n${germanFrontMatter.markdown}`);
    assert.match(german, /<button type="button">Markdown kopieren<\/button>/);
    for (const path of ["en", "en/pages/about", "en/posts/copy-test-post", "en/posts"]) {
      assert.doesNotMatch(await page(path), /class="copy-markdown"/, path);
    }
    assert.ok(!(await readdir(join(site, "public/en/book"))).includes("private-draft"));
  });

  test("leaves out front matter when there is no authored title", async () => {
    for (const [path, expected] of [["untitled", "\nUntitled body.\n"], ["no-front-matter", "No front matter.\n"]]) {
      const html = await page(`en/book/${path}`);
      assert.equal(Buffer.from(html.match(/data-markdown="([^"]*)"/)[1], "base64").toString("utf8"), expected);
    }
  });

  test("separates the heading from a body that starts immediately after front matter", async () => {
    const html = await page("en/book/no-blank-line");
    assert.equal(Buffer.from(html.match(/data-markdown="([^"]*)"/)[1], "base64").toString("utf8"),
      "# Tight\n\nBody immediately follows.\n");
  });

  test("copies Unicode Markdown and reports success or failure", async () => {
    let clipboardText;
    let click;
    const status = { textContent: "" };
    const button = { addEventListener: (event, handler) => { assert.equal(event, "click"); click = handler; } };
    const container = {
      hidden: true,
      dataset: { markdown: Buffer.from(copied).toString("base64"), copied: "Copied", failed: "Failed", unavailable: "Unavailable" },
      querySelector: selector => selector === "button" ? button : status
    };
    const clipboard = { writeText: async text => { clipboardText = text; } };
    const context = { document: { querySelector: () => container }, navigator: { clipboard },
      window: { isSecureContext: true }, atob, Uint8Array, TextDecoder };
    runInNewContext(script, context);
    assert.equal(container.hidden, false);
    await click();
    assert.equal(clipboardText, copied);
    assert.equal(status.textContent, "Copied");
    clipboard.writeText = async () => { throw new Error("Permission denied"); };
    await click();
    assert.equal(status.textContent, "Failed");
  });

  test("disables copying and explains when clipboard access is unavailable", () => {
    for (const [clipboard, isSecureContext] of [[undefined, true], [{ writeText() {} }, false]]) {
      const status = { textContent: "" };
      const button = { disabled: false };
      const container = { hidden: true, dataset: { unavailable: "Unavailable" },
        querySelector: selector => selector === "button" ? button : status };
      runInNewContext(script, { document: { querySelector: () => container }, navigator: { clipboard },
        window: { isSecureContext } });
      assert.equal(container.hidden, false);
      assert.equal(button.disabled, true);
      assert.equal(status.textContent, "Unavailable");
    }
  });
});

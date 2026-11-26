import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The browser can read Markdown like the build does. For a website with a component that asks for it (see
// components.js), the build publishes the modules that read Markdown, the renderer, at /components/blyss-renderer/:
// a name that no component can have. A script of such a component imports renderer.js from there.

// The modules of the renderer by their paths in src/: markdown.js and what it imports. They are published as they
// are, so that the browser gets the same HTML for the same text; only libraries.js is written for the browser.
const modules = ["errors.js", "build/dates.js", "build/directives.js", "build/front-matter.js", "build/html.js", "build/markdown.js", "build/settings.js"];

// The entry of the renderer: what a script may rely on, whatever the modules behind it are.
const entry = version => `// The renderer of Blyss ${version} for the browser: it reads Markdown like the build of the website that publishes it.
// Blyss is licensed under the GNU General Public License v3.0, see LICENSE.txt; marked, Temml and highlight.js are
// licensed under their own licences, see libraries/.
//
// renderDocument(markdown, name, labels) returns the HTML of a text that is read like that of a page, of a post or
// of a doc. name names the text in the message of an error, and labels are those of a language in blyss.config.js.
// withBasePath(html, basePath) gives the URLs of that HTML the path of a website that lies below one.
export { withBasePath } from "./build/html.js";
export { renderDocument } from "./build/markdown.js";
`;

const libraries = `// The copies of the libraries that the build of the website itself uses.
export { default as hljs } from "../libraries/highlight.js";
export { Marked } from "../libraries/marked.js";
export { default as temml } from "../libraries/temml.js";
`;

// The file that Node.js loads for a specifier, such as the module of a library that the build itself imports.
const fileOf = specifier => fileURLToPath(import.meta.resolve(specifier));
// A module without the address of its source map, which is not published.
const withoutSourceMap = source => source.replace(/\n\/\/# sourceMappingURL=\S+\s*$/, "\n");
// A CommonJS module of highlight.js as an expression of its value.
const commonJs = source => `(module => {\n${source}\nreturn module.exports;\n})({ exports: {} })`;

// highlight.js for the browser, as one module: its core and the languages that it calls common, such as JavaScript,
// HTML, CSS, Bash, JSON, YAML and Markdown. The build knows every language of highlight.js; in the browser, code in
// another language stays plain.
async function highlighter(directory) {
  const read = file => readFile(join(directory, "lib", file), "utf8");
  const names = [...(await read("common.js")).matchAll(/registerLanguage\('([^']+)'/g)].map(match => match[1]);
  const languages = await Promise.all(names.map(async name =>
    `hljs.registerLanguage(${JSON.stringify(name)}, ${commonJs(await read(join("languages", `${name}.js`)))});`));
  return `const hljs = ${commonJs(await read("core.js"))};\n${languages.join("\n")}\nexport default hljs;\n`;
}

// The files of the renderer, each by its path below /components/blyss-renderer/, with the licences of Blyss and of
// the libraries. They are read before the build deletes its previous output, which a failure therefore keeps.
export async function readRenderer() {
  const blyss = file => readFile(new URL(`../../${file}`, import.meta.url), "utf8");
  const packageOf = name => dirname(fileOf(`${name}/package.json`));
  const licenceOf = name => readFile(join(packageOf(name), "LICENSE"), "utf8");
  const files = {
    "renderer.js": entry(JSON.parse(await blyss("package.json")).version),
    "LICENSE.txt": await blyss("LICENSE"),
    "build/libraries.js": libraries,
    "libraries/highlight.js": await highlighter(packageOf("highlight.js")),
    "libraries/LICENSE-highlight.js.txt": await licenceOf("highlight.js"),
    "libraries/marked.js": withoutSourceMap(await readFile(fileOf("marked"), "utf8")),
    "libraries/LICENSE-marked.txt": await licenceOf("marked"),
    "libraries/temml.js": withoutSourceMap(await readFile(fileOf("temml"), "utf8")),
    "libraries/LICENSE-temml.txt": await licenceOf("temml")
  };
  for (const file of modules) files[file] = await blyss(`src/${file}`);
  return files;
}

// Writes the files of the renderer into the output of the build.
export async function publishRenderer(files, publicDirectory) {
  for (const [file, text] of Object.entries(files)) {
    const path = join(publicDirectory, "components", "blyss-renderer", file);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, text, "utf8");
  }
}

import { cp, readdir, readFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { BlyssError } from "../errors.js";
import { publishRenderer, readRenderer } from "./browser.js";
import { readFrontMatter } from "./front-matter.js";
import { renderDocument, renderMarkdown } from "./markdown.js";
import { isSystemFile } from "./paths.js";
import { applyTemplate, escapeHtml, labelValues } from "./render.js";
import { basePathOf, refuse } from "./settings.js";
import { splitTexts } from "./texts.js";

// Texts, numbers and truth values become placeholders; lists and objects are left to the component's data file.
function scalars(values = {}) {
  return Object.fromEntries(Object.entries(values)
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
    .map(([key, value]) => [key, escapeHtml(value)]));
}

// The front matter of a block sets settings of its component: a value that is JSON, such as 5, true or [1, 2], is
// taken as such, and any other value as a text, without the quotes around it. So are the values of a list and of a
// group of fields, which hold a setting such as the steps of the slider.
function settingsOf({ written, metadata }) {
  const typed = (value, text) => {
    if (Array.isArray(value)) return value.map((item, index) => typed(item, text[index]));
    if (typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typed(item, text[key])]));
    try {
      return JSON.parse(value);
    } catch {
      return text;
    }
  };
  return typed(written, metadata);
}

// A component's optional data file checks its settings and returns further values for its template. It can also name
// the languages of the fenced code blocks that the component shows, such as export const languages = ["mermaid"],
// and ask for the renderer of Blyss in the browser, with export const renderer = true (see browser.js).
async function importData(file, location) {
  const url = pathToFileURL(file).href;
  let data;
  let languages;
  let renderer;
  try {
    ({ default: data, languages = [], renderer = false } = await import(url));
  } catch (error) {
    // Only the data file itself may be missing, not a module it imports.
    if (error?.code === "ERR_MODULE_NOT_FOUND" && error.url === url) return { data: () => ({}), languages: [], renderer: false };
    throw error;
  }
  if (typeof data !== "function") {
    throw new BlyssError(`Cannot build ${location}: its default export must be a function that returns values for the template.`);
  }
  if (!Array.isArray(languages) || !languages.every(language => typeof language === "string" && /^\S+$/.test(language))) {
    throw new BlyssError(`Cannot build ${location}: its languages must be a list of the languages of the code blocks that ` +
      'the component shows, each without a space, such as ["mermaid"].');
  }
  if (typeof renderer !== "boolean") {
    throw new BlyssError(`Cannot build ${location}: its renderer must be true or false. With true, the build publishes ` +
      "the renderer of Blyss with the website, for a script of the component that reads Markdown in the browser.");
  }
  return { data, languages, renderer };
}

// A name that starts with a dot or an underscore marks what the browser does not need, such as a module that a data
// file imports, notes or the files of an editor: such a file or directory of a component is not published, wherever
// it lies in the directory of the component, and such a directory beside the components is no component. Neither is
// a file that the operating system writes there (see isSystemFile).
const isPublished = file => !/^[._]/.test(basename(file)) && !isSystemFile(file);

// A component is a directory components/<name>/ with a template, <name>.html, which {{<name>}} shows in the templates
// of the website and in its Markdown. The placeholders of that template are, each replacing an earlier one of its
// name:
// - {{basePath}}: the path below which the website is hosted, for the URLs that the component writes outside href
//   and src, which get that path by themselves (see withBasePath in build.js); the data file receives it as well;
// - {{<key>Label}}: the labels of the page's language;
// - {{<setting>}}: the component's settings, components.<name> in blyss.config.js;
// - {{<field>}} and {{content}}: the front matter and the text of _content/<language>/components/<name>.md;
// - the values that its data file, <name>.data.js, returns for these settings, that front matter, that text and the
//   texts that its ### headings start;
// - {{id}}: unique on the page, for the ids of its elements.
// In Markdown, a fenced code block with {{<name>}} as its language is an instance of the component with a text and
// settings of its own, which the block holds in place of that file and of blyss.config.js (see valuesOf below). The
// hero and the overlay show the components of hero.md and of overlay.md in this way (see regions.js).
// A component whose data file names languages shows the fenced code blocks in these languages, each as an instance
// with the code as its text. Its text is code wherever it comes from: {{content}} is that code, escaped for HTML.
// A component whose data file asks for the renderer has it at /components/blyss-renderer/, where a script of the
// component finds the modules that read Markdown, to read in the browser what a visitor writes there.
// Every other file of the directory, such as a stylesheet or a script, is published at /components/<name>/, unless
// its name or that of one of its directories starts with a dot or an underscore (see isPublished above).
export async function loadComponents(projectDir, config, directory, texts) {
  const location = relative(projectDir, directory);
  const entries = await readdir(directory, { withFileTypes: true }).catch(error => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const components = new Map();
  const languages = new Map(); // the component that shows the code blocks of each language
  let inBrowser = false; // whether a component asks for the renderer of Blyss in the browser
  // Sorted names make the build independent of the file system. A directory whose name starts with a dot or an
  // underscore is no component: it can hold what the data files of several components import.
  for (const name of entries.filter(entry => entry.isDirectory() && isPublished(entry.name)).map(entry => entry.name).sort()) {
    const path = join(directory, name);
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name)) {
      throw new BlyssError(`Cannot build ${join(location, name)}: templates use its name as a placeholder, so it must start with a ` +
        "Latin letter and contain only Latin letters and digits, such as componentSlider.");
    }
    const template = await readFile(join(path, `${name}.html`), "utf8").catch(error => {
      if (error.code !== "ENOENT") throw error;
      throw new BlyssError(`Cannot build ${join(location, name)}: a component needs a template, ${name}.html.`);
    });
    const { data, languages: shown, renderer } = await importData(join(path, `${name}.data.js`), join(location, name, `${name}.data.js`));
    inBrowser ||= renderer;
    for (const language of shown) {
      if (languages.has(language) && languages.get(language) !== name) {
        throw new BlyssError(`Cannot build ${join(location, name)}: ${languages.get(language)} already shows the code blocks in "${language}".`);
      }
      languages.set(language, name);
    }
    const code = shown.length > 0;
    components.set(name, { path, template, data, code, values: {} });
  }

  // The renderer of Blyss for the browser, if a component asks for it.
  const renderer = inBrowser ? await readRenderer() : undefined;

  // A component used to have a variant for the hero and one for the overlay, <name>Hero and <name>Overlay, which
  // hero.md and overlay.md have replaced: what to write instead of such a name, if name is one.
  function former(name) {
    const [, component] = /^(.+)(?:Hero|Overlay)$/.exec(name) ?? [];
    return components.has(component) && !components.has(name)
      ? `${name} was a variant of ${component}, and components have no variants any more.\nWrite ${component} instead: ` +
        "a block gives it a text and settings of its own, also in hero.md and overlay.md"
      : "";
  }

  // What is wrong with the name of a component, if anything.
  const unknown = name => (components.has(name) ? "" : former(name) || `there is no component "${name}" in ${location}/`);

  const settings = config.components ?? {};
  const basePath = basePathOf(config);
  for (const name of Object.keys(settings)) {
    if (unknown(name)) throw new BlyssError(`Cannot use components.${name}: ${unknown(name)}.`);
  }
  for (const { sourceFile, name } of texts) {
    if (unknown(name)) throw new BlyssError(`Cannot build ${relative(projectDir, sourceFile)}: ${unknown(name)}.`);
  }

  // What a block in the Markdown of file holds for its component: front matter and Markdown. A block that is the
  // code of one of the component's languages is taken as it is, without front matter.
  const read = (name, block, file, isCode) => (isCode ? { metadata: {}, written: {}, markdown: block }
    : readFrontMatter(`${block}\n`, file, `the front matter of its {{${name}}} block`));

  // The values of a component's template in a language: for the component's text or, given what a block in the
  // Markdown of file holds, for that block. The front matter of a block adds to that of the component's text and
  // sets settings in place of blyss.config.js, and its Markdown, if it has any, replaces that of the component's
  // text.
  async function valuesOf(name, languageKey, own, file) {
    const text = texts.find(text => text.name === name && text.languageKey === languageKey);
    const metadata = { ...text?.metadata, ...own?.metadata };
    const [markdown, origin] = own?.markdown.trim() ? [own.markdown, file] : [text?.markdown ?? "", text && relative(projectDir, text.sourceFile)];
    const ownSettings = { ...settings[name], ...(own && settingsOf(own)) };
    const { data, code } = components.get(name);
    const { labels } = config.site.languages[languageKey];
    const content = code ? escapeHtml(markdown.replace(/^\n+|\s+$/g, "")) : renderMarkdown(markdown, origin, labels);
    return {
      basePath: escapeHtml(basePath),
      ...labelValues(labels),
      ...scalars(ownSettings),
      ...scalars(metadata),
      content,
      ...await data({
        settings: ownSettings, languageKey, content, texts: code ? [] : splitTexts(markdown, origin, labels).texts, source: markdown,
        frontMatter: metadata, escapeHtml, basePath, labels,
        // Reads a text like that of a page, of a post or of a doc, as the renderer does in the browser.
        renderDocument: text => renderDocument(text, origin ?? join(location, name), labels),
        refuse: (setting, value, requirement) => (own === undefined
          ? refuse(`components.${name}.${setting}`, value, requirement)
          : new BlyssError(`Cannot build ${file}: its {{${name}}} block cannot use ${setting} ${JSON.stringify(value)}, ` +
            `which must be ${requirement}.`))
      })
    };
  }

  // The values of every language are prepared at once, so that invalid settings stop the build before it writes.
  for (const [name, { values }] of components) {
    for (const languageKey of Object.keys(config.site.languages)) {
      values[languageKey] = await valuesOf(name, languageKey);
    }
  }

  return {
    unknown,
    former,
    languages,
    read,
    valuesOf,
    // The placeholders of one page in a language: {{<name>}} shows a component, counted for its {{id}}. Called with
    // a block in the Markdown of file, such a placeholder resolves to the component with the values of that block,
    // which is code of one of the component's languages if isCode is true. Called with the values that valuesOf
    // made of a block, as for the blocks of a region, it shows the component with these.
    placeholders(languageKey, file) {
      return Object.fromEntries([...components].map(([name, { template, values }]) => {
        let count = 0;
        const render = own => applyTemplate(template, { ...own, id: `${name}-${++count}` });
        return [name, (block, isCode) => (typeof block === "string"
          ? valuesOf(name, languageKey, read(name, block, file, isCode), file).then(render)
          : render(block ?? values[languageKey]))];
      }));
    },
    async publish(publicDirectory) {
      for (const [name, { path }] of components) {
        for (const file of await readdir(path)) {
          if (file === `${name}.html` || file === `${name}.data.js` || !isPublished(file)) continue;
          await cp(join(path, file), join(publicDirectory, "components", name, file), { recursive: true, filter: isPublished });
        }
      }
      if (renderer) await publishRenderer(renderer, publicDirectory);
    }
  };
}

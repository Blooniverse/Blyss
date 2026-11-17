import { cp, readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { marked } from "marked";
import { BlyssError } from "../errors.js";
import { applyTemplate, escapeHtml, labelValues, parseFrontMatter } from "./render.js";
import { refuse } from "./settings.js";
import { splitTexts } from "./texts.js";

// Texts, numbers and truth values become placeholders; lists and objects are left to the component's data file.
function scalars(values = {}) {
  return Object.fromEntries(Object.entries(values)
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
    .map(([key, value]) => [key, escapeHtml(value)]));
}

// The front matter of a block sets settings of its component: a value that is JSON, such as 5, true or [1, 2], is
// taken as such, and any other value as a text.
function settingsOf(metadata) {
  const typed = value => {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, Array.isArray(value) ? value.map(typed) : typed(value)]));
}

// A component's optional data file checks its settings and returns further values for its template.
async function importData(file, location) {
  const url = pathToFileURL(file).href;
  let data;
  try {
    ({ default: data } = await import(url));
  } catch (error) {
    // Only the data file itself may be missing, not a module it imports.
    if (error?.code === "ERR_MODULE_NOT_FOUND" && error.url === url) return () => ({});
    throw error;
  }
  if (typeof data === "function") return data;
  throw new BlyssError(`Cannot build ${location}: its default export must be a function that returns values for the template.`);
}

// A component is a directory components/<name>/ with a template, <name>.html, which {{<name>}} shows in the templates
// of the website and in its Markdown. The placeholders of that template are, each replacing an earlier one of its name:
// - {{<key>Label}}: the labels of the page's language;
// - {{<setting>}}: the component's settings, components.<name> in blyss.config.js;
// - {{<field>}} and {{content}}: the front matter and the text of _content/<language>/components/<name>.md;
// - the values that its data file, <name>.data.js, returns for these settings, that front matter, that text and the
//   texts that its ### headings start;
// - {{id}}: unique on the page, for the ids of its elements.
// In Markdown, a fenced code block with {{<name>}} as its language is an instance of the component with a text and
// settings of its own, which the block holds in place of that file and of blyss.config.js (see valuesOf below).
// Every other file of the directory, such as a stylesheet or a script, is published at /components/<name>/.
export async function loadComponents(projectDir, config, directory, texts) {
  const location = relative(projectDir, directory);
  const entries = await readdir(directory, { withFileTypes: true }).catch(error => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const components = new Map();
  for (const name of entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort()) {
    const path = join(directory, name);
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name)) {
      throw new BlyssError(`Cannot build ${join(location, name)}: templates use its name as a placeholder, so it must start with a ` +
        "Latin letter and contain only Latin letters and digits, such as componentSlider.");
    }
    const template = await readFile(join(path, `${name}.html`), "utf8").catch(error => {
      if (error.code !== "ENOENT") throw error;
      throw new BlyssError(`Cannot build ${join(location, name)}: a component needs a template, ${name}.html.`);
    });
    const data = await importData(join(path, `${name}.data.js`), join(location, name, `${name}.data.js`));
    components.set(name, { path, template, data, values: {} });
  }

  const settings = config.components ?? {};
  for (const name of Object.keys(settings)) {
    if (!components.has(name)) throw new BlyssError(`Cannot use components.${name}: there is no component "${name}" in ${location}/.`);
  }
  for (const { sourceFile, name } of texts) {
    if (!components.has(name)) {
      throw new BlyssError(`Cannot build ${relative(projectDir, sourceFile)}: there is no component "${name}" in ${location}/.`);
    }
  }

  // The values of a component's template in a language: for the component's text or, given a block in the Markdown
  // of file, for that block. The front matter of a block adds to that of the component's text and sets settings in
  // place of blyss.config.js, and its Markdown, if it has any, replaces that of the component's text.
  async function valuesOf(name, languageKey, block, file) {
    const text = texts.find(text => text.name === name && text.languageKey === languageKey);
    let own = { metadata: {}, markdown: "" };
    if (block !== undefined) {
      try {
        own = parseFrontMatter(`${block}\n`);
      } catch (error) {
        throw new BlyssError(`Cannot build ${file}: the front matter of its {{${name}}} block lacks its closing ---.`, { cause: error });
      }
    }
    const metadata = { ...text?.metadata, ...own.metadata };
    const markdown = own.markdown.trim() ? own.markdown : text?.markdown ?? "";
    const ownSettings = { ...settings[name], ...settingsOf(own.metadata) };
    const content = marked.parse(markdown);
    return {
      ...labelValues(config.site.languages[languageKey].labels),
      ...scalars(ownSettings),
      ...scalars(metadata),
      content,
      ...await components.get(name).data({
        settings: ownSettings, languageKey, content, texts: splitTexts(markdown).texts, frontMatter: metadata, escapeHtml,
        refuse: (setting, value, requirement) => (block === undefined
          ? refuse(`components.${name}.${setting}`, value, requirement)
          : new BlyssError(`Cannot build ${file}: its {{${name}}} block cannot use ${setting} ${JSON.stringify(value)}, ` +
            `which must be ${requirement}.`))
      })
    };
  }

  // The values of every language are prepared at once, so that invalid settings stop the build before it writes.
  for (const [name, { values }] of components) {
    for (const languageKey of Object.keys(config.site.languages)) values[languageKey] = await valuesOf(name, languageKey);
  }

  return {
    names: [...components.keys()],
    // The placeholders of one page in a language: {{<name>}} shows a component, counted for its {{id}}. Called with
    // a block in the Markdown of file, such a placeholder resolves to the component with the values of that block.
    placeholders(languageKey, file) {
      return Object.fromEntries([...components].map(([name, { template, values }]) => {
        let count = 0;
        const render = own => applyTemplate(template, { ...own, id: `${name}-${++count}` });
        return [name, block => (block === undefined ? render(values[languageKey]) : valuesOf(name, languageKey, block, file).then(render))];
      }));
    },
    async publish(publicDirectory) {
      for (const [name, { path }] of components) {
        for (const file of await readdir(path)) {
          if (file === `${name}.html` || file === `${name}.data.js`) continue;
          await cp(join(path, file), join(publicDirectory, "components", name, file), { recursive: true });
        }
      }
    }
  };
}

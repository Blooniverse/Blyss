import { cp, readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { marked } from "marked";
import { BlyssError } from "../errors.js";
import { applyTemplate, escapeHtml, labelValues } from "./render.js";
import { refuse } from "./settings.js";

// Texts, numbers and truth values become placeholders; lists and objects are left to the component's data file.
function scalars(values = {}) {
  return Object.fromEntries(Object.entries(values)
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
    .map(([key, value]) => [key, escapeHtml(value)]));
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
// - {{<field>}} and {{content}}: the front matter and the text of content/<language>/components/<name>.md;
// - the values that its data file, <name>.data.js, returns for these settings and that text;
// - {{id}}: unique on the page, for the ids of its elements.
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
        "Latin letter and contain only Latin letters and digits, such as heroComponentSlider.");
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

  // The values of every language are prepared at once, so that invalid settings stop the build before it writes.
  for (const [name, { data, values }] of components) {
    for (const [languageKey, { labels }] of Object.entries(config.site.languages)) {
      const text = texts.find(text => text.name === name && text.languageKey === languageKey);
      const content = text ? marked.parse(text.markdown) : "";
      values[languageKey] = {
        ...labelValues(labels),
        ...scalars(settings[name]),
        ...scalars(text?.metadata),
        content,
        ...await data({
          settings: settings[name] ?? {}, languageKey, content, escapeHtml,
          refuse: (setting, value, requirement) => refuse(`components.${name}.${setting}`, value, requirement)
        })
      };
    }
  }

  return {
    // The placeholders of one page in a language: {{<name>}} shows a component, counted for its {{id}}.
    placeholders(languageKey) {
      return Object.fromEntries([...components].map(([name, { template, values }]) => {
        let count = 0;
        return [name, () => applyTemplate(template, { ...values[languageKey], id: `${name}-${++count}` })];
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

import { cp, readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { BlyssError } from "../errors.js";
import { renderMarkdown } from "./markdown.js";
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

// A component's optional data file checks its settings and returns further values for its template. It can also name
// the languages of the fenced code blocks that the component shows, such as export const languages = ["mermaid"].
async function importData(file, location) {
  const url = pathToFileURL(file).href;
  let data;
  let languages;
  try {
    ({ default: data, languages = [] } = await import(url));
  } catch (error) {
    // Only the data file itself may be missing, not a module it imports.
    if (error?.code === "ERR_MODULE_NOT_FOUND" && error.url === url) return { data: () => ({}), languages: [] };
    throw error;
  }
  if (typeof data !== "function") {
    throw new BlyssError(`Cannot build ${location}: its default export must be a function that returns values for the template.`);
  }
  if (!Array.isArray(languages) || !languages.every(language => typeof language === "string" && /^\S+$/.test(language))) {
    throw new BlyssError(`Cannot build ${location}: its languages must be a list of the languages of the code blocks that ` +
      'the component shows, each without a space, such as ["mermaid"].');
  }
  return { data, languages };
}

// The variants of every component, by the suffix of their names: one for each region.
const variants = { Hero: "hero", Overlay: "overlay" };

// A component is a directory components/<name>/ with a template, <name>.html, which {{<name>}} shows in the templates
// of the website and in its Markdown. It has a variant for each region, <name>Hero and <name>Overlay: the same
// component under another name, with settings and a text of its own, so that the hero and the overlay can show it
// differently. Below, <name> is the name of the component or of a variant of it. The placeholders of that template
// are, each replacing an earlier one of its name:
// - {{<key>Label}}: the labels of the page's language;
// - {{<setting>}}: the component's settings, components.<name> in blyss.config.js;
// - {{<field>}} and {{content}}: the front matter and the text of _content/<language>/components/<name>.md;
// - the values that its data file, <name>.data.js, returns for these settings, that front matter, that text and the
//   texts that its ### headings start;
// - {{id}}: unique on the page, for the ids of its elements.
// In Markdown, a fenced code block with {{<name>}} as its language is an instance of the component with a text and
// settings of its own, which the block holds in place of that file and of blyss.config.js (see valuesOf below).
// A component whose data file names languages shows the fenced code blocks in these languages, each as an instance
// with the code as its text. Its text is code wherever it comes from: {{content}} is that code, escaped for HTML.
// Every other file of the directory, such as a stylesheet or a script, is published at /components/<name>/ under the
// name of the component, which its variants share.
export async function loadComponents(projectDir, config, directory, texts) {
  const location = relative(projectDir, directory);
  const entries = await readdir(directory, { withFileTypes: true }).catch(error => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const components = new Map();
  const languages = new Map(); // the component that shows the code blocks of each language
  // In this order, a component comes before any directory whose name starts with the component's name.
  for (const name of entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort()) {
    const path = join(directory, name);
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name)) {
      throw new BlyssError(`Cannot build ${join(location, name)}: templates use its name as a placeholder, so it must start with a ` +
        "Latin letter and contain only Latin letters and digits, such as componentSlider.");
    }
    if (components.has(name)) {
      const { base, region } = components.get(name);
      throw new BlyssError(`Cannot build ${join(location, name)}: ${name} is the name of the ${region}'s variant of ${base}, ` +
        "so the component needs another name.");
    }
    const template = await readFile(join(path, `${name}.html`), "utf8").catch(error => {
      if (error.code !== "ENOENT") throw error;
      throw new BlyssError(`Cannot build ${join(location, name)}: a component needs a template, ${name}.html.`);
    });
    const { data, languages: shown } = await importData(join(path, `${name}.data.js`), join(location, name, `${name}.data.js`));
    for (const language of shown) {
      if (languages.has(language) && languages.get(language) !== name) {
        throw new BlyssError(`Cannot build ${join(location, name)}: ${languages.get(language)} already shows the code blocks in "${language}".`);
      }
      languages.set(language, name);
    }
    const code = shown.length > 0;
    components.set(name, { path, template, data, code, values: {}, errors: {} });
    for (const [suffix, region] of Object.entries(variants)) {
      components.set(`${name}${suffix}`, { base: name, region, path, template, data, code, values: {}, errors: {} });
    }
  }

  // What is wrong with the name of a component or a variant, if anything.
  function unknown(name) {
    if (components.has(name)) return "";
    const base = Object.keys(variants).map(suffix => name.endsWith(suffix) && name.slice(0, -suffix.length)).find(Boolean);
    return `there is no component "${name}"${base ? ` or "${base}"` : ""} in ${location}/`;
  }

  const settings = config.components ?? {};
  for (const name of Object.keys(settings)) {
    if (unknown(name)) throw new BlyssError(`Cannot use components.${name}: ${unknown(name)}.`);
  }
  for (const { sourceFile, name } of texts) {
    if (unknown(name)) throw new BlyssError(`Cannot build ${relative(projectDir, sourceFile)}: ${unknown(name)}.`);
  }

  // The values of a component's template in a language: for the component's text or, given a block in the Markdown
  // of file, for that block. The front matter of a block adds to that of the component's text and sets settings in
  // place of blyss.config.js, and its Markdown, if it has any, replaces that of the component's text. A block that
  // is the code of one of the component's languages is taken as it is, without front matter.
  async function valuesOf(name, languageKey, block, file, isCode) {
    const text = texts.find(text => text.name === name && text.languageKey === languageKey);
    let own = { metadata: {}, markdown: "" };
    if (isCode) {
      own.markdown = block;
    } else if (block !== undefined) {
      try {
        own = parseFrontMatter(`${block}\n`);
      } catch (error) {
        throw new BlyssError(`Cannot build ${file}: the front matter of its {{${name}}} block lacks its closing ---.`, { cause: error });
      }
    }
    const metadata = { ...text?.metadata, ...own.metadata };
    const [markdown, origin] = own.markdown.trim() ? [own.markdown, file] : [text?.markdown ?? "", text && relative(projectDir, text.sourceFile)];
    const ownSettings = { ...settings[name], ...settingsOf(own.metadata) };
    const { data, code } = components.get(name);
    const content = code ? escapeHtml(markdown.replace(/^\n+|\s+$/g, "")) : renderMarkdown(markdown, origin);
    return {
      ...labelValues(config.site.languages[languageKey].labels),
      ...scalars(ownSettings),
      ...scalars(metadata),
      content,
      ...await data({
        settings: ownSettings, languageKey, content, texts: code ? [] : splitTexts(markdown, origin).texts, source: markdown,
        frontMatter: metadata, escapeHtml,
        refuse: (setting, value, requirement) => (block === undefined
          ? refuse(`components.${name}.${setting}`, value, requirement)
          : new BlyssError(`Cannot build ${file}: its {{${name}}} block cannot use ${setting} ${JSON.stringify(value)}, ` +
            `which must be ${requirement}.`))
      })
    };
  }

  // The values of every language are prepared at once, so that invalid settings stop the build before it writes. A
  // variant without settings in blyss.config.js may lack those that its component needs: its error waits until a page
  // shows the variant, which still happens before the build writes.
  for (const [name, { base, values, errors }] of components) {
    for (const languageKey of Object.keys(config.site.languages)) {
      try {
        values[languageKey] = await valuesOf(name, languageKey);
      } catch (error) {
        if (!base || Object.hasOwn(settings, name)) throw error;
        errors[languageKey] = error;
      }
    }
  }

  return {
    unknown,
    languages,
    // The placeholders of one page in a language: {{<name>}} shows a component, counted for its {{id}}. Called with
    // a block in the Markdown of file, such a placeholder resolves to the component with the values of that block,
    // which is code of one of the component's languages if isCode is true.
    placeholders(languageKey, file) {
      return Object.fromEntries([...components].map(([name, { template, values, errors }]) => {
        let count = 0;
        const render = own => applyTemplate(template, { ...own, id: `${name}-${++count}` });
        const shown = () => {
          if (Object.hasOwn(errors, languageKey)) throw errors[languageKey];
          return render(values[languageKey]);
        };
        return [name, (block, isCode) => (block === undefined ? shown() : valuesOf(name, languageKey, block, file, isCode).then(render))];
      }));
    },
    async publish(publicDirectory) {
      for (const [name, { path, base }] of components) {
        if (base) continue;
        for (const file of await readdir(path)) {
          if (file === `${name}.html` || file === `${name}.data.js`) continue;
          await cp(join(path, file), join(publicDirectory, "components", name, file), { recursive: true });
        }
      }
    }
  };
}

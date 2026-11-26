import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { loadConfig } from "../config.js";
import { BlyssError } from "../errors.js";
import { dateAdvice, isDate } from "../build/dates.js";
import { languagesOf } from "../build/languages.js";
import { resolvePaths } from "../build/paths.js";

// The kinds of content that blyss new creates, each with its section in _content/<language>/.
export const kinds = { page: "pages", post: "posts", doc: "book" };

// The part of a URL that a title makes: Latin letters and digits, joined by hyphens, as in "hello-world" for
// "Hello, World!". German umlauts keep their sound, as ä does in "ae".
export function slugOf(title) {
  return title.replace(/[äöüÄÖÜ]/g, letter => `${letter.normalize("NFD")[0]}e`).replace(/ß|ẞ/g, "ss")
    .normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 80).replace(/-+$/, "");
}

// A value of the front matter, in quotes if YAML or the front matter of Blyss would read it otherwise.
function valueOf(text) {
  const plain = text && !/^[\s"'[\]{}>|*&!%@`#,?:-]|: | #|:$|\s$/.test(text);
  return plain ? text : `"${text.replace(/["\\]/g, "\\$&")}"`;
}

// Today in the time zone of this computer, as in 2026-11-26.
function today(now = new Date()) {
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map(part => String(part).padStart(2, "0")).join("-");
}

// Creates the Markdown file of a page, a post or a doc as a draft, with a front matter that a build accepts, and
// returns its path. language is a key of site.languages, the default language if omitted; slug names the file and
// the end of the URL, from the title if omitted; translationKey links it to its translations: that of a page in
// another language, or a new one. The file and the translationKey of a post start with its date, as in
// 261126-hello-world. An existing file is never replaced.
export async function createContent(projectDir, { kind, title, language, slug, translationKey, date = today() } = {}) {
  if (!Object.hasOwn(kinds, kind)) throw new BlyssError(`Cannot create a "${kind}": blyss new creates a page, a post or a doc.`);
  const cleanTitle = String(title ?? "").replace(/\s+/g, " ").trim();
  if (!cleanTitle) throw new BlyssError(`Cannot create a ${kind} without a title: write it after the kind, as in blyss new ${kind} "My title".`);
  if (kind === "post" && !isDate(date)) {
    throw new BlyssError(`Cannot create a post with the date ${JSON.stringify(date)}.\n${dateAdvice}`);
  }
  const config = await loadConfig(projectDir);
  const { languages, defaultLanguage } = languagesOf(config);
  const languageKey = language ?? defaultLanguage;
  if (!Object.hasOwn(languages, languageKey)) {
    throw new BlyssError(`Cannot create a ${kind} in "${languageKey}": site.languages has no such language, ` +
      `only ${Object.keys(languages).join(", ")}.`);
  }
  const name = slug ?? slugOf(cleanTitle);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    throw new BlyssError(`Cannot create a ${kind} with the slug "${name}": a slug consists of lower-case Latin letters, ` +
      'digits and hyphens, such as "my-title".\nGive one with --slug.');
  }
  if (translationKey !== undefined && !/^\S+$/.test(translationKey)) {
    throw new BlyssError(`Cannot create a ${kind} with the translationKey "${translationKey}": a translationKey has no spaces.`);
  }
  const fileName = kind === "post" ? `${date.slice(2, 10).replaceAll("-", "")}-${name}` : name;
  const key = translationKey ?? (kind === "doc" ? `book-${name}` : fileName);
  const { contentDirectory } = resolvePaths(projectDir, config);
  const path = join(contentDirectory, languageKey, kinds[kind], `${fileName}.md`);
  const fields = [
    ["title", valueOf(cleanTitle)],
    ["description", '""'],
    ...(kind === "post" ? [["datePublished", date]] : []),
    ["translationKey", valueOf(key)],
    ["draft", "true"]
  ];
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `---\n${fields.map(([field, value]) => `${field}: ${value}`).join("\n")}\n---\n\n`, { flag: "wx" }).catch(error => {
    if (error.code !== "EEXIST") throw error;
    throw new BlyssError(`Cannot create ${relative(projectDir, path)}: the file exists already, and Blyss never replaces it.\n` +
      "Give the new one another title, or a slug of its own with --slug.");
  });
  return relative(projectDir, path);
}

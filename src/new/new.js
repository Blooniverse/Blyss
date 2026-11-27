import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, sep } from "node:path";
import { loadConfig } from "../config.js";
import { BlyssError } from "../errors.js";
import { dateAdvice, isDate } from "../build/dates.js";
import { parseFrontMatter } from "../build/front-matter.js";
import { languagesOf } from "../build/languages.js";
import { isSystemFile, resolvePaths } from "../build/paths.js";
import { booksOf } from "../build/settings.js";

// The kinds of content that blyss new creates: pages and posts lie in pages/ and posts/ of _content/<language>/, docs in
// the directory of their book.
export const kinds = ["page", "post", "doc"];

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

// The first file of the content, other than path, whose translationKey is key. A key that blyss new makes may be that
// of another page: "Guide setup" in the book "book" and "Setup" in the book "book-guide" both make book-guide-setup.
async function ownerOf(contentDirectory, key, path) {
  const entries = await readdir(contentDirectory, { recursive: true, withFileTypes: true }).catch(error => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const files = entries.filter(entry => entry.isFile() && extname(entry.name).toLowerCase() === ".md" && !isSystemFile(entry.name))
    .map(entry => join(entry.parentPath, entry.name)).filter(file => file !== path).sort();
  for (const file of files) {
    try {
      if (parseFrontMatter(await readFile(file, "utf8")).metadata.translationKey === key) return file;
    } catch {
      // A front matter that cannot be read is for blyss check to report.
    }
  }
}

// Creates the Markdown file of a page, a post or a doc as a draft, with a front matter that a build accepts, and
// returns its path. language is a key of site.languages, the default language if omitted; book is one of books for a
// doc, the first if omitted; slug names the file and the end of the URL, from the title if omitted; translationKey
// links it to its translations: that of a page in another language, or a new one, which starts with the name of the
// book for a doc, as in book-hello-world. The file and the translationKey of a post start with its date, as in
// 261126-hello-world. Only translationKey links translations: a new one that another file has already is refused. An
// existing file is never replaced.
export async function createContent(projectDir, { kind, title, language, book, slug, translationKey, date = today() } = {}) {
  if (!kinds.includes(kind)) throw new BlyssError(`Cannot create a "${kind}": blyss new creates a page, a post or a doc.`);
  if (book !== undefined && kind !== "doc") {
    throw new BlyssError(`Cannot create a ${kind} in the book "${book}": a book holds docs, so --book is for blyss new doc.`);
  }
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
  const books = kind === "doc" ? booksOf(config) : [];
  const section = kind === "doc" ? book ?? books[0] : `${kind}s`;
  if (kind === "doc" && !books.includes(section)) {
    throw new BlyssError(books.length ? `Cannot create a doc in the book "${section}": books has no such book, only ${books.join(", ")}.`
      : "Cannot create a doc: books names no book. Add one, such as \"book\".");
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
  const key = translationKey ?? (kind === "doc" ? `${section}-${name}` : fileName);
  const { contentDirectory } = resolvePaths(projectDir, config);
  const path = join(contentDirectory, languageKey, section, `${fileName}.md`);
  const owner = translationKey === undefined && await ownerOf(contentDirectory, key, path);
  if (owner) {
    const ownerFile = relative(projectDir, owner);
    throw new BlyssError(`Cannot create ${relative(projectDir, path)}: its translationKey "${key}" is that of ${ownerFile} already.\n` +
      (relative(contentDirectory, owner).split(sep)[0] === languageKey
        ? "Give the new one a translationKey of its own with --key, or a slug of its own with --slug."
        : `Give --key ${key} to make the new one the translation of ${ownerFile}, or give it a translationKey of its own with --key.`));
  }
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

import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";
import { loadConfig } from "../config.js";
import { BlyssError, BlyssErrors } from "../errors.js";
import { dateAdvice, isDate } from "./dates.js";
import { loadComponents } from "./components.js";
import { withBasePath } from "./html.js";
import { createListRecords, parseTags, postsKey, tagKey, tagsKey } from "./lists.js";
import { renderFragments } from "./fragments.js";
import { readFrontMatter } from "./front-matter.js";
import { languagesOf } from "./languages.js";
import { isSystemFile, resolvePaths } from "./paths.js";
import { renderRecord } from "./render.js";
import { assertSite, basePathOf, booksOf, isBookName, layoutOf } from "./settings.js";
import { arrangeRegions } from "./regions.js";
import { renderSitemap } from "./sitemap.js";
import { arrangeBooks } from "./book.js";
import { assertMainNavigation, mainNavigationOf } from "./navigation.js";
import { indexTranslations } from "./translations.js";

// The sections of _content/<language>/ that hold published content, and the type of their content: the pages, the
// posts and the docs of each book that config.books names.
const sectionsOf = books => ({ pages: 'page', posts: 'post', ...Object.fromEntries(books.map(book => [book, 'book'])) });

async function findMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findMarkdownFiles(path));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === ".md" && !isSystemFile(entry.name)) files.push(path);
  }
  return files;
}

function createLocator(config, publicDirectory) {
  const absoluteUrl = (pathname) =>
    new URL(pathname.replace(/^\//, ""), `${config.site.baseUrl.replace(/\/$/, "")}/`).href;
  // Pages are published as <urlParts>/index.html at a URL ending in "/"; a fileName publishes a file URL instead.
  return (urlParts, fileName = "") => {
    const url = `/${urlParts.join('/')}/${fileName}`.replace(/\/{2,}/g, '/');
    return { url, outputFile: join(publicDirectory, ...urlParts, fileName || 'index.html'), canonicalUrl: absoluteUrl(url) };
  };
}

// A front matter can hold a list or a group of fields, for the settings of a component. The fields that the pages
// show as they are, are texts.
function assertTexts(file, metadata, fields) {
  const field = fields.find(field => metadata[field] !== undefined && typeof metadata[field] !== "string");
  if (field === undefined) return;
  throw new BlyssError(`Cannot build ${file}: its ${field} holds a list or a group of fields, but it is a text.\n` +
    "Write the text on the line of the field.");
}

function assertDates(file, metadata) {
  for (const field of ["datePublished", "dateModified"]) {
    const date = metadata[field];
    if (date === undefined || date === "") continue;
    if (!isDate(date)) throw new BlyssError(`Cannot build ${file}: its ${field} ${JSON.stringify(date)} is not a date.\n${dateAdvice}`);
  }
}

// Runs work for each item and returns its results. The errors of Blyss that it throws for an item are gathered and
// thrown together, each with the file that it names, once every item has run: a website with several faulty files
// names them all at once. That file is the one of the item, unless the error has one of its own, as that of a
// template has (see applyTemplate in render.js). Any other error stops at once. Sequential work runs for one item
// after the other.
async function eachChecked(items, fileOf, work, { sequential = false } = {}) {
  const settled = [];
  if (!sequential) settled.push(...await Promise.allSettled(items.map(work)));
  else for (const item of items) settled.push(await work(item).then(value => ({ status: "fulfilled", value }), reason => ({ status: "rejected", reason })));
  const failed = settled.filter(result => result.status === "rejected").map(({ reason }) => reason);
  const unexpected = failed.find(error => !(error instanceof BlyssError));
  if (unexpected) throw unexpected;
  if (failed.length) {
    settled.forEach((result, index) => { if (result.status === "rejected") result.reason.file ??= fileOf(items[index]); });
    // An error of a template or of the configuration repeats for each page: it is reported once.
    const distinct = [...new Map(failed.flatMap(error => error.errors ?? [error]).map(error => [error.message, error])).values()];
    throw distinct.length === 1 ? distinct[0] : new BlyssErrors(distinct);
  }
  return settled.map(result => result.value);
}

// draft: true makes a page, a post or a doc a draft: the build leaves it out, as if its file did not exist, unless
// it builds the drafts as well, as blyss build --drafts does. A value other than true or false would publish a page
// that its author takes for a draft, so it stops the build.
function isDraft(file, metadata) {
  const { draft = "" } = metadata;
  if (draft === "true") return true;
  if (draft === "" || draft === "false") return false;
  throw new BlyssError(`Cannot build ${file}: its draft ${JSON.stringify(draft)} is neither true nor false.\n` +
    "Set draft to true to leave the page out of the build, or remove the field to publish it.");
}

// drafts tells whether the build includes the drafts. One that it leaves out is returned with the type "draft".
async function discoverContent(projectDir, config, contentDirectory, locate, drafts) {
  const found = await findMarkdownFiles(contentDirectory).catch(error => {
    if (error.code !== "ENOENT") throw error;
    const directory = join(relative(projectDir, contentDirectory), sep);
    throw new BlyssError(`Cannot build without ${directory}: it holds the content of the website, in a directory for each language ` +
      `such as ${join(directory, config.site.defaultLanguage, sep)}.\nCreate it, or set directories.content to the directory of the content.`);
  });
  // Sorted paths make the output independent of the filesystem.
  const files = found.sort();
  const sections = sectionsOf(config.books);
  return eachChecked(files, sourceFile => relative(projectDir, sourceFile), async sourceFile => {
    const file = relative(projectDir, sourceFile);
    const parts = relative(contentDirectory, sourceFile).split(sep);
    const [languageKey, section] = parts;
    // The content of each language lies in _content/<language>/, named by its key in site.languages.
    if (parts.length < 2 || !Object.hasOwn(config.site.languages, languageKey)) {
      const example = join(relative(projectDir, contentDirectory), config.site.defaultLanguage, sep);
      if (parts.length < 2) throw new BlyssError(`Cannot build ${file}: content lies in the directory of its language, such as ${example}.`);
      throw new BlyssError(`Cannot build ${file}: there is no language "${languageKey}" in site.languages.\n` +
        `Add the language to site.languages, or move the file to the directory of one of its languages, such as ${example}.`);
    }
    const languageConfig = config.site.languages[languageKey];
    const { metadata, markdown } = readFrontMatter(await readFile(sourceFile, "utf8"), file);
    const filename = basename(sourceFile, '.md');
    // Files directly in _content/<language>/, such as heroCards.md, are fragments for templates (see fragments.js).
    // hero.md and overlay.md are none: they show the components of the hero and of the overlay (see regions.js).
    if (parts.length === 2) {
      assertTexts(file, metadata, ["title"]);
      const type = ['hero', 'overlay'].includes(filename) ? 'region' : 'fragment';
      return { sourceFile, languageKey, type, name: filename, metadata, markdown };
    }
    // Those directly in _content/<language>/components/ hold the texts of the components (see components.js).
    if (section === 'components') {
      if (parts.length === 3) return { sourceFile, languageKey, type: 'component', name: filename, metadata, markdown };
      throw new BlyssError(`Cannot build ${file}: the text of a component lies directly in ` +
        `${join(relative(projectDir, contentDirectory), languageKey, 'components')}.`);
    }
    if (!Object.hasOwn(sections, section)) {
      const directories = Object.keys(sections).map(name => join(relative(projectDir, contentDirectory), languageKey, name, sep));
      throw new BlyssError(`Cannot build ${file}: there is no content section "${section}".\n` +
        `Move the file into ${directories.slice(0, -1).join(", ")} or ${directories.at(-1)}` +
        (isBookName(section) ? `, or add "${section}" to books to make it a book.` : "."));
    }
    const type = sections[section];
    const nested = parts.slice(2, -1);
    const draft = isDraft(file, metadata);
    // Nothing else of a draft that is left out is checked: it may lack what a page needs. The translationKeys of the
    // pages that it would make tell that a link of mainNavigation to them is no mistake: its own, those of its tags,
    // and those of the lists, which a language of drafts only lacks.
    if (draft && !drafts) {
      let tags = [];
      try {
        if (type === 'post') tags = parseTags(metadata.tags, languageKey, file);
      } catch {
        // Tags that a page cannot have stop the build of the draft only.
      }
      return { sourceFile, type: 'draft', translationKeys: [metadata.translationKey, postsKey, tagsKey, ...tags.map(tag => tagKey(tag.slug))] };
    }
    assertTexts(file, metadata, ["title", "description", "slug", "translationKey"]);
    assertDates(file, metadata);
    const tags = type === 'post' ? parseTags(metadata.tags, languageKey, file) : [];
    // pages/404.md becomes /<language>/404.html, the file name static hosts expect for "not found" pages.
    if (type === 'page' && !nested.length && filename === '404') {
      return { sourceFile, languageKey, languageConfig, type, metadata, markdown, tags, draft, notFound: true, ...locate([languageKey], '404.html') };
    }
    const slug = metadata.slug || filename;
    // Each of these names is one part of the URL and one directory of the output: with a "/" or as "..", it would
    // lead elsewhere, even out of the output directory, and "?" and "#" end the path of a URL.
    for (const part of [...nested, slug]) {
      if (/[/\\?#]/.test(part) || part === "." || part === "..") {
        throw new BlyssError(`Cannot build ${file}: "${part}" cannot be a part of its URL.\nA slug and the names of a file and ` +
          'of its directories contain no "/", "\\", "?" or "#" and are neither "." nor "..": set slug to a name such as "my-page".');
      }
    }
    // Like their files, pages, posts and docs are published under /<language>/pages/, /<language>/posts/ and the
    // directory of their book, such as /<language>/book/; the index.md of a directory of pages or docs at the URL of
    // the directory, except the home page, pages/index.md, at /<language>/.
    const urlParts = [languageKey, section, ...nested, slug];
    if (type !== 'post' && filename === 'index') urlParts.pop();
    if (type === 'page' && !nested.length && filename === 'index') urlParts.pop();
    return { sourceFile, languageKey, languageConfig, type, ...(type === 'book' ? { book: section } : {}),
      metadata, markdown, tags, draft, ...locate(urlParts) };
  });
}

// Content records precede generated ones, so the first owner of a URL is always a content file.
function assertUniqueUrls(projectDir, records) {
  const owners = new Map();
  for (const record of records) {
    const owner = owners.get(record.url);
    if (!owner) {
      owners.set(record.url, record);
      continue;
    }
    const ownerFile = relative(projectDir, owner.sourceFile);
    const other = record.sourceFile ? relative(projectDir, record.sourceFile) : `the generated page "${record.metadata.title}"`;
    throw new BlyssError(`Cannot build ${record.url}: ${ownerFile} and ${other} have the same URL.\nRename ${ownerFile} or give it a different slug.`);
  }
}

// A translationKey links a page to its translations, one page for each language. A second page of a language with
// the same key would appear twice in the language switcher and among the alternates.
function assertUniqueTranslations(projectDir, records) {
  const owners = new Map();
  const name = record => (record.sourceFile ? relative(projectDir, record.sourceFile) : `the generated page "${record.metadata.title}"`);
  for (const record of records) {
    const key = record.metadata.translationKey;
    if (!key) continue;
    const owner = owners.get(`${record.languageKey}/${key}`);
    if (owner) {
      throw new BlyssError(`Cannot build ${name(record)}: ${name(owner)} has the same translationKey "${key}" in the same language.\n` +
        "Give the page a translationKey of its own: only its translations in the other languages share it.");
    }
    owners.set(`${record.languageKey}/${key}`, record);
  }
}

// Reads, checks and renders the website without writing anything: what blyss build writes and blyss check checks.
// With drafts, it includes the pages, posts and docs that draft: true leaves out of every other build. The errors
// of the files are gathered (see eachChecked), those of the files of the content first: a page of a faulty website
// would show the faults of other files.
export async function prepare(projectDir, configPath = './blyss.config.js', { drafts = false } = {}) {
  const loaded = await loadConfig(projectDir, configPath);
  assertSite(loaded);
  // The whole build uses the checked languages, which have every label and a default language, and the checked books.
  const config = { ...loaded, site: { ...loaded.site, ...languagesOf(loaded) }, books: booksOf(loaded) };
  const { componentsDirectory, contentDirectory, publicDirectory, staticDirectory, templatesDirectory } = resolvePaths(projectDir, config);
  const locate = createLocator(config, publicDirectory);
  const layout = layoutOf(config);
  const mainNavigation = mainNavigationOf(config);
  const basePath = basePathOf(config);

  const readOptionalTemplate = name => readFile(join(templatesDirectory, name), 'utf8').catch(error => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });
  const readTemplate = async name => {
    const template = await readOptionalTemplate(name);
    if (template !== undefined) return template;
    throw new BlyssError(`Cannot build without ${join(relative(projectDir, templatesDirectory), name)}: ` +
      'a website needs the templates document.html, page.html and post.html.\nCreate the template, or set directories.templates to their directory.');
  };
  // home.html and book.html are optional: without them, home pages and docs use page.html. So are hero.html and
  // overlay.html: without them, the website has no hero or no overlay.
  const [discovered, document, page, post, home, book, hero, overlay] = await Promise.all([
    discoverContent(projectDir, config, contentDirectory, locate, drafts),
    readTemplate('document.html'),
    readTemplate('page.html'),
    readTemplate('post.html'),
    readOptionalTemplate('home.html'),
    readOptionalTemplate('book.html'),
    readOptionalTemplate('hero.html'),
    readOptionalTemplate('overlay.html')
  ]);
  const content = discovered.filter(record => ['page', 'post', 'book'].includes(record.type));
  // The files of the drafts that this build leaves out.
  const leftOut = discovered.filter(record => record.type === 'draft').map(record => relative(projectDir, record.sourceFile));
  const fragmentRecords = discovered.filter(record => record.type === 'fragment');
  const fragments = renderFragments(projectDir, fragmentRecords, config.site.languages);
  const components = await loadComponents(projectDir, config, componentsDirectory, discovered.filter(record => record.type === 'component'));
  // The file of a template in messages, such as templates/document.html.
  const templateFile = name => join(relative(projectDir, templatesDirectory), `${name}.html`);
  const regionRecords = discovered.filter(record => record.type === 'region');
  const regions = await arrangeRegions(projectDir, config, { hero, overlay }, templateFile, [...regionRecords, ...fragmentRecords], components);
  const books = arrangeBooks(projectDir, contentDirectory, content, leftOut);
  const records = [...content, ...createListRecords(config, content, locate)];
  assertUniqueUrls(projectDir, records);
  assertUniqueTranslations(projectDir, records);
  const templates = { document, page, post, home, book };
  const translationIndex = indexTranslations(records, config.site.languages);
  assertMainNavigation(mainNavigation, translationIndex, discovered.filter(record => record.type === 'draft').flatMap(record => record.translationKeys));

  // Every page is rendered before anything is written, so that a block with settings that its component refuses, or
  // a template with a placeholder that it lacks, stops the build in time.
  const fileOf = record => record.sourceFile && relative(projectDir, record.sourceFile);
  const pages = await eachChecked(records, fileOf, async record => {
    const html = await renderRecord({
      record, file: fileOf(record), templates, templateFile, translationIndex, site: config.site, records: content, layout, regions, basePath,
      mainNavigation,
      fragments: fragments.get(record.languageKey),
      components: components.placeholders(record.languageKey, fileOf(record)),
      languages: components.languages,
      former: components.former,
      book: books.placeholders(record)
    });
    return { record, html: withBasePath(html, basePath) };
  }, { sequential: true });
  return { config, content, records, pages, leftOut, components, translationIndex, publicDirectory, staticDirectory };
}

// With drafts, the build includes the pages, posts and docs that draft: true leaves out of every other build.
export async function build(projectDir, configPath = './blyss.config.js', { drafts = false } = {}) {
  // Content is read, validated and rendered before the previous output is deleted.
  const { config, records, pages, leftOut, components, translationIndex, publicDirectory, staticDirectory } =
    await prepare(projectDir, configPath, { drafts });

  // Without a static directory, there are no files to copy.
  const hasStatic = await stat(staticDirectory).then(info => info.isDirectory(), error => {
    if (error.code === 'ENOENT') return false;
    throw error;
  });

  await rm(publicDirectory, { recursive: true, force: true });
  await mkdir(publicDirectory, { recursive: true });
  if (hasStatic) await cp(staticDirectory, publicDirectory, { recursive: true, force: true, filter: file => !isSystemFile(file) });
  await components.publish(publicDirectory);

  for (const { record, html } of pages) {
    await mkdir(join(record.outputFile, '..'), { recursive: true });
    await writeFile(record.outputFile, html, 'utf8');
    console.log(`Built ${record.url}${record.draft ? ' (draft)' : ''}`);
    // Hosts look for a single /404.html, so the default language's 404 page is published there as well.
    if (record.notFound && record.languageKey === config.site.defaultLanguage) {
      await writeFile(join(publicDirectory, '404.html'), html, 'utf8');
      console.log('Built /404.html');
    }
  }
  const sitemapRecords = records.filter(record => !record.notFound);
  await writeFile(join(publicDirectory, 'sitemap.xml'), renderSitemap(sitemapRecords, translationIndex, config.site.defaultLanguage), 'utf8');
  console.log('Built /sitemap.xml');
  for (const file of leftOut) console.log(`Left out the draft ${file}`);

  const built = records.filter(record => record.draft).length;
  console.log(`Blyss built ${records.length} localized page(s)${built ? `, including ${built} draft(s)` : ''}.`);
}

import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";
import { loadConfig } from "../config.js";
import { BlyssError } from "../errors.js";
import { loadComponents } from "./components.js";
import { escapeHtml } from "./html.js";
import { createListRecords, parseTags } from "./lists.js";
import { renderFragments } from "./fragments.js";
import { languagesOf } from "./languages.js";
import { resolvePaths } from "./paths.js";
import { parseFrontMatter, renderRecord } from "./render.js";
import { assertSite, basePathOf, layoutOf } from "./settings.js";
import { arrangeRegions } from "./regions.js";
import { renderSitemap } from "./sitemap.js";
import { arrangeBooks } from "./book.js";
import { indexTranslations } from "./translations.js";

// The sections of _content/<language>/ that hold published content, and the type of their content.
const sections = { pages: 'page', posts: 'post', book: 'book' };

async function findMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findMarkdownFiles(path));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === ".md") files.push(path);
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

// A date as in 2026-11-10, or with its time as in 2026-11-10T09:30:00+01:00: the format of <time>, of JSON-LD and
// of sitemap.xml, in which the posts are ordered as well.
const w3cDate = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/;

function assertDates(file, metadata) {
  for (const field of ["datePublished", "dateModified"]) {
    const date = metadata[field];
    if (date === undefined || date === "") continue;
    // Date.parse reads the 30th of February as a day of March, so the day is compared with the one that it returns.
    const isDate = typeof date === "string" && w3cDate.test(date) && !Number.isNaN(Date.parse(date)) &&
      new Date(date.slice(0, 10)).toISOString().startsWith(date.slice(0, 10));
    if (!isDate) {
      throw new BlyssError(`Cannot build ${file}: its ${field} ${JSON.stringify(date)} is not a date.\n` +
        "Write a date as 2026-11-10, or with its time as 2026-11-10T09:30:00+01:00.");
    }
  }
}

async function discoverContent(projectDir, config, contentDirectory, locate) {
  const found = await findMarkdownFiles(contentDirectory).catch(error => {
    if (error.code !== "ENOENT") throw error;
    const directory = join(relative(projectDir, contentDirectory), sep);
    throw new BlyssError(`Cannot build without ${directory}: it holds the content of the website, in a directory for each language ` +
      `such as ${join(directory, config.site.defaultLanguage, sep)}.\nCreate it, or set directories.content to the directory of the content.`);
  });
  // Sorted paths make the output independent of the filesystem.
  const files = found.sort();
  return Promise.all(files.map(async sourceFile => {
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
    const source = await readFile(sourceFile, "utf8");
    let metadata;
    let written;
    let markdown;
    try {
      ({ metadata, written, markdown } = parseFrontMatter(source));
    } catch (error) {
      throw new BlyssError(`Cannot build ${file}: its front matter lacks its closing ---.`, { cause: error });
    }
    // In YAML, > and | start a text of several lines, which the front matter does not have: such a value would be
    // shown as it is, and the lines below it would be lost.
    const [field, sign] = Object.entries(written).find(([, value]) => typeof value === "string" && /^[>|][+-]?$/.test(value)) ?? [];
    if (field) {
      throw new BlyssError(`Cannot build ${file}: its ${field} is "${sign}", which starts a text of several lines in YAML, ` +
        `but a field of the front matter is a single line.\nWrite the text on the line of the field, or "${sign}" in quotes if it is the text itself.`);
    }
    const filename = basename(sourceFile, '.md');
    // Files directly in _content/<language>/, such as heroTexts.md, are fragments for templates (see fragments.js).
    if (parts.length === 2) return { sourceFile, languageKey, type: 'fragment', name: filename, metadata, markdown };
    // Those directly in _content/<language>/components/ hold the texts of the components (see components.js).
    if (section === 'components') {
      if (parts.length === 3) return { sourceFile, languageKey, type: 'component', name: filename, metadata, markdown };
      throw new BlyssError(`Cannot build ${file}: the text of a component lies directly in ` +
        `${join(relative(projectDir, contentDirectory), languageKey, 'components')}.`);
    }
    if (!Object.hasOwn(sections, section)) {
      const [pages, posts, book] = Object.keys(sections).map(name => join(relative(projectDir, contentDirectory), languageKey, name, sep));
      throw new BlyssError(`Cannot build ${file}: there is no content section "${section}".\n` +
        `Move the file into ${pages}, ${posts} or ${book}.`);
    }
    const type = sections[section];
    const nested = parts.slice(2, -1);
    assertDates(file, metadata);
    const tags = type === 'post' ? parseTags(metadata.tags, languageKey, file) : [];
    // pages/404.md becomes /<language>/404.html, the file name static hosts expect for "not found" pages.
    if (type === 'page' && !nested.length && filename === '404') {
      return { sourceFile, languageKey, languageConfig, type, metadata, markdown, tags, notFound: true, ...locate([languageKey], '404.html') };
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
    // Like their files, pages, posts and docs are published under /<language>/pages/, /<language>/posts/ and
    // /<language>/book/; the index.md of a directory of pages or docs at the URL of the directory, except the home page,
    // pages/index.md, at /<language>/.
    const urlParts = [languageKey, section, ...nested, slug];
    if (type !== 'post' && filename === 'index') urlParts.pop();
    if (type === 'page' && !nested.length && filename === 'index') urlParts.pop();
    return { sourceFile, languageKey, languageConfig, type, metadata, markdown, tags, ...locate(urlParts) };
  }));
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

// A website below a path, such as /docs for https://example.com/docs/, finds its pages and its files below that
// path: every href, src, poster and action of a page that starts at the root of the website, with a single "/",
// gets the path. The content, the templates and the components need not know it.
function withBasePath(html, basePath) {
  if (!basePath) return html;
  const path = escapeHtml(basePath);
  return html.replace(/(\s(?:href|src|poster|action)=["'])\/(?!\/)/g, (match, start) => `${start}${path}/`);
}

export async function build(projectDir, configPath = './blyss.config.js') {
  const loaded = await loadConfig(projectDir, configPath);
  assertSite(loaded);
  // The whole build uses the checked languages, which have every label and a default language.
  const config = { ...loaded, site: { ...loaded.site, ...languagesOf(loaded) } };
  const { componentsDirectory, contentDirectory, publicDirectory, staticDirectory, templatesDirectory } = resolvePaths(projectDir, config);
  const locate = createLocator(config, publicDirectory);
  const layout = layoutOf(config);
  const basePath = basePathOf(config);

  // Content is read and validated before the previous output is deleted.
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
    discoverContent(projectDir, config, contentDirectory, locate),
    readTemplate('document.html'),
    readTemplate('page.html'),
    readTemplate('post.html'),
    readOptionalTemplate('home.html'),
    readOptionalTemplate('book.html'),
    readOptionalTemplate('hero.html'),
    readOptionalTemplate('overlay.html')
  ]);
  const content = discovered.filter(record => ['page', 'post', 'book'].includes(record.type));
  const fragmentRecords = discovered.filter(record => record.type === 'fragment');
  const fragments = renderFragments(projectDir, fragmentRecords, Object.keys(config.site.languages));
  const components = await loadComponents(projectDir, config, componentsDirectory, discovered.filter(record => record.type === 'component'));
  const regions = arrangeRegions(projectDir, config, { hero, overlay }, fragmentRecords, components.unknown);
  const books = arrangeBooks(projectDir, contentDirectory, content);
  const records = [...content, ...createListRecords(config, content, locate)];
  assertUniqueUrls(projectDir, records);
  assertUniqueTranslations(projectDir, records);
  const templates = { document, page, post, home, book };
  // The file of a template in messages, such as templates/document.html.
  const templateFile = name => join(relative(projectDir, templatesDirectory), `${name}.html`);
  const translationIndex = indexTranslations(records, config.site.languages);

  // Every page is rendered before the previous output is deleted, so that a block with settings that its component
  // refuses, or a template with a placeholder that it lacks, stops the build in time.
  const pages = [];
  for (const record of records) {
    const file = record.sourceFile && relative(projectDir, record.sourceFile);
    const html = await renderRecord({
      record, file, templates, templateFile, translationIndex, site: config.site, records: content, layout, regions, basePath,
      fragments: fragments.get(record.languageKey),
      components: components.placeholders(record.languageKey, file),
      languages: components.languages,
      book: books.placeholders(record)
    });
    pages.push({ record, html: withBasePath(html, basePath) });
  }

  // Without a static directory, there are no files to copy.
  const hasStatic = await stat(staticDirectory).then(info => info.isDirectory(), error => {
    if (error.code === 'ENOENT') return false;
    throw error;
  });

  await rm(publicDirectory, { recursive: true, force: true });
  await mkdir(publicDirectory, { recursive: true });
  if (hasStatic) await cp(staticDirectory, publicDirectory, { recursive: true, force: true });
  await components.publish(publicDirectory);

  for (const { record, html } of pages) {
    await mkdir(join(record.outputFile, '..'), { recursive: true });
    await writeFile(record.outputFile, html, 'utf8');
    console.log(`Built ${record.url}`);
    // Hosts look for a single /404.html, so the default language's 404 page is published there as well.
    if (record.notFound && record.languageKey === config.site.defaultLanguage) {
      await writeFile(join(publicDirectory, '404.html'), html, 'utf8');
      console.log('Built /404.html');
    }
  }
  const sitemapRecords = records.filter(record => !record.notFound);
  await writeFile(join(publicDirectory, 'sitemap.xml'), renderSitemap(sitemapRecords, translationIndex, config.site.defaultLanguage), 'utf8');
  console.log('Built /sitemap.xml');

  console.log(`Blyss built ${records.length} localized page(s).`);
}

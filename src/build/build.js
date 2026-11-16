import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";
import { loadConfig } from "../config.js";
import { BlyssError } from "../errors.js";
import { loadComponents } from "./components.js";
import { createListRecords, parseTags } from "./lists.js";
import { renderFragments } from "./fragments.js";
import { languagesOf } from "./languages.js";
import { resolvePaths } from "./paths.js";
import { parseFrontMatter, renderRecord } from "./render.js";
import { layoutOf } from "./settings.js";
import { renderSitemap } from "./sitemap.js";
import { arrangeBooks } from "./book.js";
import { indexTranslations } from "./translations.js";

// The sections of content/<language>/ that hold published content, and the type of their content.
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
  const siteUrl = absoluteUrl(`/${config.site.defaultLanguage}/`);
  // Pages are published as <urlParts>/index.html at a URL ending in "/"; a fileName publishes a file URL instead.
  return (urlParts, fileName = "") => {
    const url = `/${urlParts.join('/')}/${fileName}`.replace(/\/{2,}/g, '/');
    return { url, outputFile: join(publicDirectory, ...urlParts, fileName || 'index.html'), canonicalUrl: absoluteUrl(url), siteUrl };
  };
}

async function discoverContent(projectDir, config, contentDirectory, locate) {
  // Sorted paths make the output independent of the filesystem.
  const files = (await findMarkdownFiles(contentDirectory)).sort();
  return Promise.all(files.map(async sourceFile => {
    const parts = relative(contentDirectory, sourceFile).split(sep);
    const [languageKey, section] = parts;
    // The content of each language lies in content/<language>/, named by its key in site.languages.
    if (parts.length < 2 || !Object.hasOwn(config.site.languages, languageKey)) {
      const file = relative(projectDir, sourceFile);
      const example = join(relative(projectDir, contentDirectory), config.site.defaultLanguage, sep);
      if (parts.length < 2) throw new BlyssError(`Cannot build ${file}: content lies in the directory of its language, such as ${example}.`);
      throw new BlyssError(`Cannot build ${file}: there is no language "${languageKey}" in site.languages.\n` +
        `Add the language to site.languages, or move the file to the directory of one of its languages, such as ${example}.`);
    }
    const languageConfig = config.site.languages[languageKey];
    const { metadata, markdown } = parseFrontMatter(await readFile(sourceFile, "utf8"));
    const filename = basename(sourceFile, '.md');
    // Files directly in content/<language>/, such as hero.md, are fragments for templates (see fragments.js).
    if (parts.length === 2) return { sourceFile, languageKey, type: 'fragment', name: filename, metadata, markdown };
    // Those directly in content/<language>/components/ hold the texts of the components (see components.js).
    if (section === 'components') {
      if (parts.length === 3) return { sourceFile, languageKey, type: 'component', name: filename, metadata, markdown };
      throw new BlyssError(`Cannot build ${relative(projectDir, sourceFile)}: the text of a component lies directly in ` +
        `${join(relative(projectDir, contentDirectory), languageKey, 'components')}.`);
    }
    if (!Object.hasOwn(sections, section)) {
      const [pages, posts, book] = Object.keys(sections).map(name => join(relative(projectDir, contentDirectory), languageKey, name, sep));
      throw new BlyssError(`Cannot build ${relative(projectDir, sourceFile)}: there is no content section "${section}".\n` +
        `Move the file into ${pages}, ${posts} or ${book}.`);
    }
    const type = sections[section];
    const nested = parts.slice(2, -1);
    const tags = type === 'post' ? parseTags(metadata.tags, languageKey, relative(projectDir, sourceFile)) : [];
    // pages/404.md becomes /<language>/404.html, the file name static hosts expect for "not found" pages.
    if (type === 'page' && !nested.length && filename === '404') {
      return { sourceFile, languageKey, languageConfig, type, metadata, markdown, tags, notFound: true, ...locate([languageKey], '404.html') };
    }
    const slug = metadata.slug || filename;
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

export async function build(projectDir, configPath = './blyss.config.js') {
  const loaded = await loadConfig(projectDir, configPath);
  // The whole build uses the checked languages, which have every label and a default language.
  const config = { ...loaded, site: { ...loaded.site, ...languagesOf(loaded) } };
  const { componentsDirectory, contentDirectory, publicDirectory, staticDirectory, templatesDirectory } = resolvePaths(projectDir, config);
  const locate = createLocator(config, publicDirectory);
  const layout = layoutOf(config);

  // Content is read and validated before the previous output is deleted.
  const readTemplate = name => readFile(join(templatesDirectory, name), 'utf8');
  // home.html and book.html are optional: without them, home pages and docs use page.html.
  const readOptionalTemplate = name => readTemplate(name).catch(error => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });
  const [discovered, document, page, post, home, book] = await Promise.all([
    discoverContent(projectDir, config, contentDirectory, locate),
    readTemplate('document.html'),
    readTemplate('page.html'),
    readTemplate('post.html'),
    readOptionalTemplate('home.html'),
    readOptionalTemplate('book.html')
  ]);
  const content = discovered.filter(record => ['page', 'post', 'book'].includes(record.type));
  const fragments = renderFragments(projectDir, discovered.filter(record => record.type === 'fragment'));
  const components = await loadComponents(projectDir, config, componentsDirectory, discovered.filter(record => record.type === 'component'));
  const books = arrangeBooks(projectDir, contentDirectory, content);
  const records = [...content, ...createListRecords(config, content, locate)];
  assertUniqueUrls(projectDir, records);
  const templates = { document, page, post, home, book };
  const translationIndex = indexTranslations(records, config.site.languages);

  await rm(publicDirectory, { recursive: true, force: true });
  await mkdir(publicDirectory, { recursive: true });
  await cp(staticDirectory, publicDirectory, { recursive: true, force: true });
  await components.publish(publicDirectory);

  for (const record of records) {
    const html = renderRecord({
      record, templates, translationIndex, site: config.site, records: content, layout,
      fragments: fragments.get(record.languageKey), components: components.placeholders(record.languageKey),
      book: books.placeholders(record)
    });
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
  await writeFile(join(publicDirectory, 'sitemap.xml'), renderSitemap(sitemapRecords, translationIndex), 'utf8');
  console.log('Built /sitemap.xml');

  console.log(`Blyss built ${records.length} localized page(s).`);
}

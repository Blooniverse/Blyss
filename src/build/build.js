import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";
import { loadConfig } from "../config.js";
import { BlyssError } from "../errors.js";
import { createListRecords, parseTags } from "./lists.js";
import { resolvePaths } from "./paths.js";
import { parseFrontMatter, renderRecord } from "./render.js";
import { renderSitemap } from "./sitemap.js";
import { indexTranslations } from "./translations.js";

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
  // Sorted paths make the output, including the order of translations, independent of the filesystem.
  const files = (await findMarkdownFiles(contentDirectory)).sort();
  return Promise.all(files.map(async sourceFile => {
    const parts = relative(contentDirectory, sourceFile).split(sep);
    const [languageKey, section] = parts;
    const languageConfig = config.site.languages[languageKey];
    if (!languageConfig) throw new Error(`Unknown language directory: ${languageKey}`);
    if (!['pages', 'posts'].includes(section)) throw new Error(`Unknown content section: ${section}`);
    const { metadata, markdown } = parseFrontMatter(await readFile(sourceFile, "utf8"));
    const type = section === 'posts' ? 'post' : 'page';
    const filename = basename(sourceFile, '.md');
    const nested = parts.slice(2, -1);
    const tags = type === 'post' ? parseTags(metadata.tags, languageKey, relative(projectDir, sourceFile)) : [];
    // pages/404.md becomes /<language>/404.html, the file name static hosts expect for "not found" pages.
    if (type === 'page' && !nested.length && filename === '404') {
      return { sourceFile, languageKey, languageConfig, type, metadata, markdown, tags, notFound: true, ...locate([languageKey], '404.html') };
    }
    const slug = metadata.slug || filename;
    const urlParts = type === 'post' ? [languageKey, 'posts', ...nested, slug] : [languageKey, ...nested, slug];
    if (type === 'page' && filename === 'index') urlParts.pop();
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
  const config = await loadConfig(projectDir, configPath);
  const { contentDirectory, publicDirectory, staticDirectory, templatesDirectory } = resolvePaths(projectDir, config);
  const locate = createLocator(config, publicDirectory);

  // Content is read and validated before the previous output is deleted.
  const readTemplate = name => readFile(join(templatesDirectory, name), 'utf8');
  const [content, document, page, post, home] = await Promise.all([
    discoverContent(projectDir, config, contentDirectory, locate),
    readTemplate('document.html'),
    readTemplate('page.html'),
    readTemplate('post.html'),
    // home.html is optional: without it, home pages use page.html.
    readTemplate('home.html').catch(error => {
      if (error.code === 'ENOENT') return undefined;
      throw error;
    })
  ]);
  const records = [...content, ...createListRecords(config, content, locate)];
  assertUniqueUrls(projectDir, records);
  const templates = { document, page, post, home };
  const translationIndex = indexTranslations(records);

  await rm(publicDirectory, { recursive: true, force: true });
  await mkdir(publicDirectory, { recursive: true });
  await cp(staticDirectory, publicDirectory, { recursive: true, force: true });

  for (const record of records) {
    const html = renderRecord({ record, templates, translationIndex, site: config.site, records: content });
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

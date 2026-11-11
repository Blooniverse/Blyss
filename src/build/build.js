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
  return urlParts => {
    const url = `/${urlParts.join('/')}/`.replace(/\/{2,}/g, '/');
    return { url, outputFile: join(publicDirectory, ...urlParts, 'index.html'), canonicalUrl: absoluteUrl(url), siteUrl };
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
    const slug = metadata.slug || filename;
    const nested = parts.slice(2, -1);
    const urlParts = type === 'post' ? [languageKey, 'posts', ...nested, slug] : [languageKey, ...nested, slug];
    if (type === 'page' && filename === 'index') urlParts.pop();
    const tags = type === 'post' ? parseTags(metadata.tags, languageKey, relative(projectDir, sourceFile)) : [];
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
  const [content, document, page, post] = await Promise.all([
    discoverContent(projectDir, config, contentDirectory, locate),
    readFile(join(templatesDirectory, 'document.html'), 'utf8'),
    readFile(join(templatesDirectory, 'page.html'), 'utf8'),
    readFile(join(templatesDirectory, 'post.html'), 'utf8')
  ]);
  const records = [...content, ...createListRecords(config, content, locate)];
  assertUniqueUrls(projectDir, records);
  const templates = { document, page, post };
  const translationIndex = indexTranslations(records);

  await rm(publicDirectory, { recursive: true, force: true });
  await mkdir(publicDirectory, { recursive: true });
  await cp(staticDirectory, publicDirectory, { recursive: true, force: true });

  for (const record of records) {
    const html = renderRecord({ record, templates, translationIndex, site: config.site, records: content });
    await mkdir(join(record.outputFile, '..'), { recursive: true });
    await writeFile(record.outputFile, html, 'utf8');
    console.log(`Built ${record.url}`);
  }
  await writeFile(join(publicDirectory, 'sitemap.xml'), renderSitemap(records, translationIndex), 'utf8');
  console.log('Built /sitemap.xml');

  console.log(`Blyss built ${records.length} localized page(s).`);
}

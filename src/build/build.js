import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";
import config from "../../blyss.config.js";
import { contentDirectory, publicDirectory, staticDirectory, templatesDirectory } from "./paths.js";
import { parseFrontMatter, renderRecord } from "./render.js";
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

function absoluteUrl(pathname) {
  return new URL(pathname.replace(/^\//, ""), `${config.site.baseUrl.replace(/\/$/, "")}/`).href;
}

async function discoverContent() {
  const files = await findMarkdownFiles(contentDirectory);
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
    const url = `/${urlParts.join('/')}/`.replace(/\/{2,}/g, '/');
    const outputFile = join(publicDirectory, ...urlParts, 'index.html');
    return {
      sourceFile, languageKey, languageConfig, type, metadata, markdown,
      url, outputFile, canonicalUrl: absoluteUrl(url), siteUrl: absoluteUrl(`/${config.site.defaultLanguage}/`)
    };
  }));
}

async function build() {
  await rm(publicDirectory, { recursive: true, force: true });
  await mkdir(publicDirectory, { recursive: true });
  await cp(staticDirectory, publicDirectory, { recursive: true, force: true });

  const [records, document, page, post] = await Promise.all([
    discoverContent(),
    readFile(join(templatesDirectory, 'document.html'), 'utf8'),
    readFile(join(templatesDirectory, 'page.html'), 'utf8'),
    readFile(join(templatesDirectory, 'post.html'), 'utf8')
  ]);
  const templates = { document, page, post };
  const translationIndex = indexTranslations(records);

  for (const record of records) {
    const html = renderRecord({ record, templates, translationIndex, site: config.site });
    await mkdir(join(record.outputFile, '..'), { recursive: true });
    await writeFile(record.outputFile, html, 'utf8');
    console.log(`Built ${record.url}`);
  }

  console.log(`Blyss built ${records.length} localized page(s).`);
}

await build();

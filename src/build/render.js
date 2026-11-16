import { marked } from "marked";
import { createJsonLd, renderJsonLd } from "./json-ld.js";
import { renderAlternateLinks, renderLanguageSwitcher } from "./translations.js";

export function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function parseFrontMatter(source) {
  const normalized = source.replaceAll("\r\n", "\n");
  if (!normalized.startsWith("---\n")) return { metadata: {}, markdown: normalized };
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) throw new Error("Front matter is missing its closing --- delimiter.");
  const metadata = {};
  let listKey; // a key without a value, which may start a YAML block list such as "tags:" and "  - Blyss"
  for (const line of normalized.slice(4, end).split("\n")) {
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item && listKey) {
      metadata[listKey] = [...(metadata[listKey] || []), item[1].trim()];
      continue;
    }
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key) metadata[key] = value;
    listKey = key && !value ? key : undefined;
  }
  return { metadata, markdown: normalized.slice(end + 5) };
}

// A value can be a function, which is called for each of its placeholders.
export function applyTemplate(template, values) {
  return template.replace(/{{([a-zA-Z][a-zA-Z0-9]*)}}/g, (_, key) => {
    const value = Object.hasOwn(values, key) ? values[key] : undefined;
    return (typeof value === "function" ? value() : value) ?? "";
  });
}

// Every label of a language is available as {{<key>Label}}, such as {{postsLabel}}.
export function labelValues(labels) {
  return Object.fromEntries(Object.entries(labels).map(([key, value]) => [`${key}Label`, escapeHtml(value)]));
}

const compare = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

// Undated posts come last; posts with the same date are ordered by URL for reproducible output.
export function newestFirst(posts) {
  const date = post => post.metadata.datePublished || "";
  return [...posts].sort((left, right) => compare(date(right), date(left)) || compare(left.url, right.url));
}

export function renderRecentPosts(record, records) {
  const posts = newestFirst(records.filter(item => item.type === "post" && item.languageKey === record.languageKey)).slice(0, 3);

  if (!posts.length) return "";

  const listItems = posts.map(item => {
    const title = item.metadata.title || item.slug || item.url;
    return `    <li><a href="${escapeHtml(item.url)}">${escapeHtml(title)}</a></li>`;
  }).join("\n");

  return `\n<section aria-label="${escapeHtml(record.languageConfig.labels.recentPosts)}">\n  <h2>${escapeHtml(record.languageConfig.labels.recentPosts)}</h2>\n  <ul>\n${listItems}\n  </ul>\n</section>\n`;
}

const idsOf = html => [...html.matchAll(/\sid="([^"{}]+)"/g)].map(match => match[1]);

// Like GitHub, gives each heading an id from its text, such as "getting-started", "getting-started-1" for the next of
// that text and "section" for one without letters or digits. The ids of the templates, such as "overlay", are taken,
// and so are those of the HTML blocks and components in the text.
function identifyHeadings(tokens, takenIds) {
  for (const token of tokens) if (token.type === "html") idsOf(token.text).forEach(id => takenIds.add(id));
  const headings = [];
  for (const [index, token] of tokens.entries()) {
    if (token.type !== "heading") continue;
    const html = marked.Parser.parseInline(token.tokens);
    const text = html.replace(/<[^>]*>/g, "").trim();
    const slug = text.replace(/&#?\w+;/g, "").toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "").replaceAll(" ", "-") || "section";
    let id = slug;
    for (let number = 1; takenIds.has(id); number++) id = `${slug}-${number}`;
    takenIds.add(id);
    tokens[index] = { type: "html", block: true, raw: token.raw, text: `<h${token.depth} id="${id}">${html}</h${token.depth}>\n` };
    headings.push({ depth: token.depth, id, text });
  }
  return headings;
}

// The table of contents of a doc links to its ## headings, each with the ### headings that follow it.
function renderToc(headings, label) {
  const items = [];
  for (const { depth, id, text } of headings.filter(heading => heading.depth === 2 || heading.depth === 3)) {
    const link = `<a href="#${id}">${text}</a>`;
    if (depth === 3 && items.length) items.at(-1).children.push(link);
    else items.push({ link, children: [] });
  }
  if (!items.length) return "";
  const list = items.map(({ link, children }) => (children.length
    ? `  <li>${link}\n    <ul>\n${children.map(child => `      <li>${child}</li>`).join("\n")}\n    </ul>\n  </li>` : `  <li>${link}</li>`));
  return `<nav aria-label="${escapeHtml(label)}">\n<p>${escapeHtml(label)}</p>\n<ul>\n${list.join("\n")}\n</ul>\n</nav>\n`;
}

// A paragraph that consists of {{<name>}} alone shows the component of that name; code keeps the placeholder as text.
// With takenIds, the headings get ids (see identifyHeadings), which are returned with the headings.
function renderBody(record, records, components, takenIds) {
  if (record.type === "list") return { html: record.html, headings: [] };
  const tokens = marked.lexer(record.markdown.replace(/{{recentPosts}}/g, renderRecentPosts(record, records)));
  for (const [index, token] of tokens.entries()) {
    const name = token.type === "paragraph" && /^{{([a-zA-Z][a-zA-Z0-9]*)}}$/.exec(token.text.trim())?.[1];
    if (name && Object.hasOwn(components, name)) tokens[index] = { type: "html", block: true, raw: token.raw, text: components[name]() };
  }
  const headings = takenIds ? identifyHeadings(tokens, takenIds) : [];
  return { html: marked.parser(tokens), headings };
}

// "home" is the index page of a language; templates can style each kind, e.g. with <body data-kind="{{kind}}">.
function kindOf(record) {
  if (record.notFound) return "not-found";
  return record.type === "page" && record.url === `/${record.languageKey}/` ? "home" : record.type;
}

function renderTags(record) {
  if (!record.tags?.length) return "";
  const links = record.tags.map(tag => `<a href="${escapeHtml(tag.url)}" rel="tag">${escapeHtml(tag.name)}</a>`);
  return `    <p>${escapeHtml(record.languageConfig.labels.tags)}: ${links.join(", ")}</p>`;
}

// components holds a function for each component of the website, which renders it in the language of the record;
// techdoc holds the navigation and the pager of a doc (see techdoc.js).
export function renderRecord({ record, templates, translationIndex, site, records = [], layout, fragments = {}, components = {}, techdoc = {} }) {
  const metadata = record.metadata;
  const title = metadata.title || site.name;
  const description = metadata.description || record.languageConfig.description;
  const kind = kindOf(record);
  const home = kind === "home";
  const isTechdoc = record.type === "techdoc";
  const dateBlock = metadata.datePublished
    ? `    <p><time datetime="${escapeHtml(metadata.datePublished)}">${escapeHtml(metadata.datePublished)}</time></p>` : "";
  // Without a home.html or a techdoc.html template, home pages and docs use page.html.
  const innerTemplate = (record.type === "post" && templates.post) || (isTechdoc && templates.techdoc) || (home && templates.home) || templates.page;
  const takenIds = isTechdoc ? new Set(idsOf(templates.document + innerTemplate)) : undefined;
  const body = renderBody(record, records, components, takenIds);
  const content = applyTemplate(innerTemplate, {
    ...components,
    ...techdoc,
    techdocToc: isTechdoc ? renderToc(body.headings, record.languageConfig.labels.onThisPage) : "",
    title: escapeHtml(title), description: escapeHtml(description), dateBlock, tags: renderTags(record),
    content: body.html
  });
  const pageTitle = title === site.name ? title : `${title} | ${site.name}`;

  // The components and the fragments of the language, such as {{heroTitle}}, cannot replace the labels or the
  // placeholders below.
  return applyTemplate(templates.document, {
    ...components,
    ...fragments,
    ...labelValues(record.languageConfig.labels),
    locale: escapeHtml(record.languageConfig.locale),
    pageTitle: escapeHtml(pageTitle),
    description: escapeHtml(description),
    canonicalUrl: escapeHtml(record.canonicalUrl),
    alternateLinks: renderAlternateLinks(record, translationIndex),
    jsonLd: renderJsonLd(createJsonLd({ site, record })),
    languageKey: escapeHtml(record.languageKey),
    kind,
    languageSwitcher: site.languageSwitcher ? renderLanguageSwitcher(record, translationIndex, site) : "",
    layoutMargin: escapeHtml(layout.margin),
    layoutPaddingHero: escapeHtml(layout.paddingHero),
    layoutAlign: home ? layout.alignHome : layout.alignOther,
    layoutAlignHero: home ? layout.alignHeroHome : layout.alignHeroOther,
    content
  });
}

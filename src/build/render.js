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
export function labelValues(labels = {}) {
  return Object.fromEntries(Object.entries({ ...labels, posts: labels.posts || "Posts", tags: labels.tags || "Tags" })
    .map(([key, value]) => [`${key}Label`, escapeHtml(value)]));
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

  return `\n<section aria-label="${escapeHtml(record.languageConfig.labels.recentPosts || "Recent posts")}">\n  <h2>${escapeHtml(record.languageConfig.labels.recentPosts || "Recent posts")}</h2>\n  <ul>\n${listItems}\n  </ul>\n</section>\n`;
}

// A paragraph that consists of {{<name>}} alone shows the component of that name; code keeps the placeholder as text.
function renderBody(record, records, components) {
  if (record.type === "list") return record.html;
  const tokens = marked.lexer(record.markdown.replace(/{{recentPosts}}/g, renderRecentPosts(record, records)));
  for (const [index, token] of tokens.entries()) {
    const name = token.type === "paragraph" && /^{{([a-zA-Z][a-zA-Z0-9]*)}}$/.exec(token.text.trim())?.[1];
    if (name && Object.hasOwn(components, name)) tokens[index] = { type: "html", block: true, raw: token.raw, text: components[name]() };
  }
  return marked.parser(tokens);
}

// "home" is the index page of a language; templates can style each kind, e.g. with <body data-kind="{{kind}}">.
function kindOf(record) {
  if (record.notFound) return "not-found";
  return record.type === "page" && record.url === `/${record.languageKey}/` ? "home" : record.type;
}

function renderTags(record) {
  if (!record.tags?.length) return "";
  const links = record.tags.map(tag => `<a href="${escapeHtml(tag.url)}" rel="tag">${escapeHtml(tag.name)}</a>`);
  return `    <p>${escapeHtml(record.languageConfig.labels.tags || "Tags")}: ${links.join(", ")}</p>`;
}

// components holds a function for each component of the website, which renders it in the language of the record.
export function renderRecord({ record, templates, translationIndex, site, records = [], layout, fragments = {}, components = {} }) {
  const metadata = record.metadata;
  const title = metadata.title || site.name;
  const description = metadata.description || record.languageConfig.description;
  const kind = kindOf(record);
  const home = kind === "home";
  const dateBlock = metadata.datePublished
    ? `    <p><time datetime="${escapeHtml(metadata.datePublished)}">${escapeHtml(metadata.datePublished)}</time></p>` : "";
  // Without a home.html template, home pages use page.html.
  const innerTemplate = record.type === "post" ? templates.post : (home && templates.home) || templates.page;
  const content = applyTemplate(innerTemplate, {
    ...components,
    title: escapeHtml(title), description: escapeHtml(description), dateBlock, tags: renderTags(record),
    content: renderBody(record, records, components)
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
    languageSwitcher: renderLanguageSwitcher(record, translationIndex, site),
    layoutMargin: escapeHtml(layout.margin),
    layoutPaddingHero: escapeHtml(layout.paddingHero),
    layoutAlign: home ? layout.alignHome : layout.alignOther,
    layoutAlignHero: home ? layout.alignHeroHome : layout.alignHeroOther,
    content
  });
}

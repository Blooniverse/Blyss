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

export function applyTemplate(template, values) {
  return template.replace(/{{([a-zA-Z][a-zA-Z0-9]*)}}/g, (_, key) => values[key] ?? "");
}

const compare = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

// Undated posts come last; posts with the same date are ordered by URL for reproducible output.
export function newestFirst(posts) {
  const date = post => post.metadata.datePublished || "";
  return [...posts].sort((left, right) => compare(date(right), date(left)) || compare(left.url, right.url));
}

export function renderRecentPosts(record, records) {
  const posts = newestFirst(records.filter(item => item.type === "post" && item.languageKey === record.languageKey))
    .slice(0, 3);

  if (!posts.length) return "";

  const listItems = posts.map(item => {
    const title = item.metadata.title || item.slug || item.url;
    return `    <li><a href="${escapeHtml(item.url)}">${escapeHtml(title)}</a></li>`;
  }).join("\n");

  return `\n<section aria-label="${escapeHtml(record.languageConfig.labels.recentPosts || "Recent posts")}">\n  <h2>${escapeHtml(record.languageConfig.labels.recentPosts || "Recent posts")}</h2>\n  <ul>\n${listItems}\n  </ul>\n</section>\n`;
}

function renderTags(record) {
  if (!record.tags?.length) return "";
  const links = record.tags.map(tag => `<a href="${escapeHtml(tag.url)}" rel="tag">${escapeHtml(tag.name)}</a>`);
  return `    <p>${escapeHtml(record.languageConfig.labels.tags || "Tags")}: ${links.join(", ")}</p>`;
}

export function renderRecord({ record, templates, translationIndex, site, records = [] }) {
  const metadata = record.metadata;
  const title = metadata.title || site.name;
  const description = metadata.description || record.languageConfig.description;
  const bodyHtml = record.type === "list" ? record.html
    : marked.parse(record.markdown.replace(/{{recentPosts}}/g, renderRecentPosts(record, records)));
  const dateBlock = metadata.datePublished
    ? `    <p><time datetime="${escapeHtml(metadata.datePublished)}">${escapeHtml(metadata.datePublished)}</time></p>` : "";
  const innerTemplate = record.type === "post" ? templates.post : templates.page;
  const content = applyTemplate(innerTemplate, { title: escapeHtml(title), dateBlock, tags: renderTags(record), content: bodyHtml });
  const pageTitle = title === site.name ? title : `${title} | ${site.name}`;

  return applyTemplate(templates.document, {
    locale: escapeHtml(record.languageConfig.locale),
    pageTitle: escapeHtml(pageTitle),
    description: escapeHtml(description),
    canonicalUrl: escapeHtml(record.canonicalUrl),
    alternateLinks: renderAlternateLinks(record, translationIndex),
    jsonLd: renderJsonLd(createJsonLd({ site, record })),
    languageKey: escapeHtml(record.languageKey),
    mainNavigationLabel: escapeHtml(record.languageConfig.labels.mainNavigation),
    homeLabel: escapeHtml(record.languageConfig.labels.home),
    postsLabel: escapeHtml(record.languageConfig.labels.posts || "Posts"),
    tagsLabel: escapeHtml(record.languageConfig.labels.tags || "Tags"),
    aboutLabel: escapeHtml(record.languageConfig.labels.about),
    languageSwitcher: renderLanguageSwitcher(record, translationIndex, site),
    generatedByLabel: escapeHtml(record.languageConfig.labels.generatedBy),
    content
  });
}

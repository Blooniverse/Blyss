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
  const posts = newestFirst(records.filter(item => item.type === "post" && item.languageKey === record.languageKey)).slice(0, 3);

  if (!posts.length) return "";

  const listItems = posts.map(item => {
    const title = item.metadata.title || item.slug || item.url;
    return `    <li><a href="${escapeHtml(item.url)}">${escapeHtml(title)}</a></li>`;
  }).join("\n");

  return `\n<section aria-label="${escapeHtml(record.languageConfig.labels.recentPosts || "Recent posts")}">\n  <h2>${escapeHtml(record.languageConfig.labels.recentPosts || "Recent posts")}</h2>\n  <ul>\n${listItems}\n  </ul>\n</section>\n`;
}

function renderBody(record, records) {
  if (record.type === "list") return record.html;
  return marked.parse(record.markdown.replace(/{{recentPosts}}/g, renderRecentPosts(record, records)));
}

// Each step is placed at its value along the slider; the last step that the initial value reaches is current.
function renderSliderSteps(slider, languageKey) {
  const reached = slider.steps.findLast(step => step.value <= slider.value);
  const items = slider.steps.map(step => {
    const position = +((step.value - slider.start) / (slider.end - slider.start) * 100).toFixed(2);
    const current = step === reached ? ' aria-current="step"' : "";
    return `  <li style="--position: ${position}%"${current}><data value="${step.value}">${step.value}</data> ` +
      `${escapeHtml(step.description[languageKey])}</li>`;
  });
  return items.length ? `<ol>\n${items.join("\n")}\n</ol>` : "";
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

export function renderRecord({ record, templates, translationIndex, site, records = [], layout, heroComponent, fragments = {} }) {
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
    title: escapeHtml(title), description: escapeHtml(description), dateBlock, tags: renderTags(record), content: renderBody(record, records)
  });
  const pageTitle = title === site.name ? title : `${title} | ${site.name}`;
  // Every label of the language is available as {{<key>Label}}, such as {{postsLabel}}.
  const { labels } = record.languageConfig;
  const labelValues = Object.entries({ ...labels, posts: labels.posts || "Posts", tags: labels.tags || "Tags" })
    .map(([key, value]) => [`${key}Label`, escapeHtml(value)]);

  // The fragments of the language, such as {{heroTitle}}, cannot replace the labels or the placeholders below.
  return applyTemplate(templates.document, {
    ...fragments,
    ...Object.fromEntries(labelValues),
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
    layoutAlign: home ? layout.alignHome : layout.alignOther,
    layoutAlignHero: home ? layout.alignHeroHome : layout.alignHeroOther,
    heroComponentSliderStart: String(heroComponent.slider.start),
    heroComponentSliderEnd: String(heroComponent.slider.end),
    heroComponentSliderValue: String(heroComponent.slider.value),
    heroComponentSliderSteps: renderSliderSteps(heroComponent.slider, record.languageKey),
    content
  });
}

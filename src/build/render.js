import { BlyssError } from "../errors.js";
import { escapeHtml } from "./html.js";
import { createJsonLd, renderJsonLd } from "./json-ld.js";
import { lexDocument, renderInlineTokens, renderTokens } from "./markdown.js";
import { renderMainNavigation } from "./navigation.js";
import { renderAlternateLinks, renderLanguageSwitcher } from "./translations.js";

export { escapeHtml };

// A value can be a function, which is called for each of its placeholders. file names a template of the website:
// one of its placeholders that has no value, as a misspelt one, stops the build instead of leaving a gap in the
// pages, with an error whose file is that template and not the page that was rendered with it; renamed tells the
// name that such a placeholder has now, if it had another one. Without file, as for the template of a component,
// whose values depend on its texts, such a placeholder is empty.
export function applyTemplate(template, values, file, renamed = {}) {
  return template.replace(/{{([a-zA-Z][a-zA-Z0-9]*)}}/g, (placeholder, key) => {
    if (!Object.hasOwn(values, key)) {
      if (!file) return "";
      throw Object.assign(new BlyssError(`Cannot build with ${file}: there is no placeholder ${placeholder}.\n` +
        (Object.hasOwn(renamed, key) ? `It is {{${renamed[key]}}} now: rename it.` : "Correct its name or remove it.")), { file });
    }
    const value = values[key];
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
// that text and "section" for one without letters or digits; a heading with a label has that as its id. The ids of
// the templates, such as "overlay", are taken, and so are the labels of the text and the ids of its HTML blocks
// and components.
function identifyHeadings(tokens, takenIds) {
  for (const token of tokens) if (token.type === "html") idsOf(token.text).forEach(id => takenIds.add(id));
  const headings = [];
  for (const [index, token] of tokens.entries()) {
    if (token.type !== "heading") continue;
    const html = renderInlineTokens(token.tokens);
    // The numbers of footnotes are not part of the text of a heading.
    const text = html.replace(/<sup class="footnote-ref">.*?<\/sup>|<[^>]*>/g, "").trim();
    const slug = text.replace(/&#?\w+;/g, "").toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "").replaceAll(" ", "-") || "section";
    let id = token.label ?? slug;
    for (let number = 1; token.label === undefined && takenIds.has(id); number++) id = `${slug}-${number}`;
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

// The component that a block of Markdown shows, if it shows one. A paragraph that consists of {{<name>}} alone shows
// the component of that name; a fenced code block with {{<name>}} as its language shows it with the text and the
// settings that the block holds (see components.js). A fenced code block in a language of a component, such as
// mermaid, shows that component with the code as its text. Returns the name, which may be that of no component, the
// text of a block and whether it is code. languages names the component that shows the code blocks of a language.
export function componentOf(token, languages) {
  const block = token.type === "code" ? token.text : undefined;
  const language = block === undefined ? "" : token.lang ?? "";
  const shown = languages.get(language.split(/\s/)[0]);
  const placeholder = token.type === "paragraph" ? token.text : language;
  return { name: shown ?? /^{{([a-zA-Z][a-zA-Z0-9]*)}}$/.exec(placeholder.trim())?.[1], block, isCode: Boolean(shown) };
}

// A paragraph that consists of {{recentPosts}} alone lists the newest posts of the page's language, and a block
// that shows a component is replaced by it (see componentOf above). Other code and running text keep a placeholder
// as it is written; former tells what to write instead of a name that no longer shows a component. takenIds are
// the ids of the templates, which no label of the text can be. In a doc, the headings get ids (see
// identifyHeadings), which are returned with the headings.
async function renderBody(record, file, records, components, languages, former, takenIds, isBook) {
  if (record.type === "list") return { html: record.html, headings: [], contributions: [] };
  const { tokens, ids, contributions } = lexDocument(record.markdown, file, record.languageConfig.labels);
  for (const id of ids) {
    if (takenIds.has(id)) {
      throw new BlyssError(`Cannot build ${file}: its label "${id}" is the id of an element of its templates, so it needs another name.`);
    }
    takenIds.add(id);
  }
  for (const [index, token] of tokens.entries()) {
    const { name, block, isCode } = componentOf(token, languages);
    if (name === "recentPosts" && token.type === "paragraph") {
      tokens[index] = { type: "html", block: true, raw: token.raw, text: renderRecentPosts(record, records) };
    } else if (name && Object.hasOwn(components, name)) {
      tokens[index] = { type: "html", block: true, raw: token.raw, text: await components[name](block, isCode) };
    } else if (name && former(name)) {
      throw new BlyssError(`Cannot build ${file}: ${former(name)}.`);
    }
  }
  const headings = isBook ? identifyHeadings(tokens, takenIds) : [];
  return { html: renderTokens(tokens), headings, contributions };
}

// The kinds of pages: "home" is the index page of a language, "list" an archive or tag page. Templates can style each
// kind, e.g. with <body data-kind="{{kind}}">.
export const kinds = ["home", "page", "post", "book", "list", "not-found"];

function kindOf(record) {
  if (record.notFound) return "not-found";
  return record.type === "page" && record.url === `/${record.languageKey}/` ? "home" : record.type;
}

function renderTags(record) {
  if (!record.tags?.length) return "";
  const links = record.tags.map(tag => `<a href="${escapeHtml(tag.url)}" rel="tag">${escapeHtml(tag.name)}</a>`);
  return `    <p>${escapeHtml(record.languageConfig.labels.tags)}: ${links.join(", ")}</p>`;
}

// file names the record's Markdown file in errors, and templateFile the file of a template, such as
// templates/document.html for "document"; components holds a function for each component of the website, which
// renders it in the language of the record, and resolves to it for a block of the record's Markdown; languages
// names the component that shows the code blocks of a language, and former tells what to write instead of a name
// that no longer shows a component; regions tells which of the hero and the overlay the page shows (see
// regions.js); book holds the navigation and the pager of a doc (see book.js), and trail the pages that its
// BreadcrumbList leads through (see json-ld.js); mainNavigation holds the links of the top bar (see navigation.js); basePath
// is the path below which the website is hosted, {{basePath}} in every template.
export async function renderRecord({ record, file, templates, templateFile = name => `${name}.html`, translationIndex, site, records = [],
  layout, fragments = {}, components = {}, languages = new Map(), former = () => "", regions = { of: () => ({}) }, book = {},
  trail = [], mainNavigation = [], basePath = "" }) {
  const metadata = record.metadata;
  const title = metadata.title || site.name;
  const description = metadata.description || record.languageConfig.description;
  const kind = kindOf(record);
  const home = kind === "home";
  const isBook = record.type === "book";
  const dateBlock = metadata.datePublished
    ? `    <p><time datetime="${escapeHtml(metadata.datePublished)}">${escapeHtml(metadata.datePublished)}</time></p>` : "";
  // Without a home.html or a book.html template, home pages and docs use page.html.
  const inner = (record.type === "post" && templates.post && "post") || (isBook && templates.book && "book") || (home && templates.home && "home") || "page";
  const innerTemplate = templates[inner];
  const shown = regions.of(kind, record.languageKey);
  const regionTemplates = Object.values(shown).map(region => region?.template ?? "").join("");
  const takenIds = new Set(idsOf(templates.document + innerTemplate + regionTemplates));
  const body = await renderBody(record, file, records, components, languages, former, takenIds, isBook);
  const copyTitle = isBook && metadata.title
    ? `# ${String(metadata.title).replaceAll("&", "&amp;").replace(/[\\`*_[\]<>#~@]/g, "\\$&")
      .replace(/\b(https?|ftp):(?=\/\/)/gi, "$1\\:").replace(/\bwww\.(?=\S)/gi, "www\\.")}\n${record.markdown.startsWith("\n") ? "" : "\n"}`
    : "";
  const content = applyTemplate(innerTemplate, {
    ...components,
    ...book,
    ...(inner === "book" ? Object.fromEntries(
      ["copyMarkdown", "markdownCopied", "markdownCopyFailed", "markdownCopyUnavailable"]
        .map(key => [`${key}Label`, escapeHtml(record.languageConfig.labels[key])])
    ) : {}),
    bookToc: isBook ? renderToc(body.headings, record.languageConfig.labels.onThisPage) : "",
    bookMarkdownBase64: isBook ? Buffer.from(copyTitle + record.markdown, "utf8").toString("base64") : "",
    title: escapeHtml(title), description: escapeHtml(description), dateBlock, tags: renderTags(record),
    basePath: escapeHtml(basePath),
    content: body.html
  }, templateFile(inner));
  const pageTitle = title === site.name ? title : `${title} | ${site.name}`;

  // The components and the fragments of the language, such as {{heroCardsTitle}}, cannot replace the labels or the
  // placeholders below.
  const values = {
    ...components,
    ...fragments,
    ...labelValues(record.languageConfig.labels),
    locale: escapeHtml(record.languageConfig.locale),
    pageTitle: escapeHtml(pageTitle),
    description: escapeHtml(description),
    // Hosts show a not-found page at any missing URL, with the status 404; under its own URL, search engines leave it out.
    robots: record.notFound ? '  <meta name="robots" content="noindex">' : "",
    canonicalUrl: escapeHtml(record.canonicalUrl),
    alternateLinks: renderAlternateLinks(record, translationIndex, site.defaultLanguage),
    jsonLd: renderJsonLd(createJsonLd({ site, record, contributions: body.contributions, trail })),
    languageKey: escapeHtml(record.languageKey),
    kind,
    mainNavigation: renderMainNavigation(record, mainNavigation, translationIndex),
    languageSwitcher: site.languageSwitcher ? renderLanguageSwitcher(record, translationIndex, site) : "",
    layoutMargin: escapeHtml(layout.margin),
    layoutPaddingHero: escapeHtml(layout.paddingHero),
    layoutPaddingOverlay: escapeHtml(layout.paddingOverlay),
    layoutAlign: home ? layout.alignHome : layout.alignOther,
    layoutAlignHero: layout.alignHero,
    layoutAlignOverlay: layout.alignOverlay,
    basePath: escapeHtml(basePath),
    content
  };
  // {{hero}} and {{overlay}} show the regions of the page, each rendered by its template, which has the placeholders
  // above and {{components}}, {{componentsBelow}}, {{cardsTitle}} and {{cards}}; the last two used to be
  // {{textsTitle}} and {{texts}}. A region that the page lacks is empty. Each component of a region is shown with
  // the values that the region has prepared for it, if any.
  const show = ({ name, values: own }) => components[name](own);
  const regionValues = Object.entries(shown).map(([name, region]) => [name, region ? () => applyTemplate(region.template, {
    ...values,
    components: () => region.above.map(show).join(""),
    componentsBelow: () => region.below.map(show).join(""),
    cardsTitle: region.cardsTitle,
    cards: region.cards
  }, templateFile(name), { textsTitle: "cardsTitle", texts: "cards" }) : ""]);
  return applyTemplate(templates.document, { ...values, ...Object.fromEntries(regionValues) }, templateFile("document"));
}

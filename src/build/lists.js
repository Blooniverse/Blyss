import { BlyssError } from "../errors.js";
import { escapeHtml, newestFirst } from "./render.js";

// ASCII slugs keep tag URLs portable: "Über Blyss" becomes "uber-blyss".
function slugify(name) {
  return name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replaceAll("ß", "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Accepts "tags: [Blyss, Markdown]", "tags: Blyss, Markdown" or a YAML block list.
export function parseTags(value, languageKey, source) {
  const names = Array.isArray(value) ? value : String(value ?? "").replace(/^\[(.*)\]$/, "$1").split(",");
  const tags = new Map();
  for (const name of names.map(item => item.trim().replace(/^(["'])(.*)\1$/, "$2").trim()).filter(Boolean)) {
    const slug = slugify(name);
    if (!slug) throw new BlyssError(`Cannot build ${source}: the tag "${name}" needs a Latin letter or digit for its URL.`);
    if (!tags.has(slug)) tags.set(slug, { name, slug, url: `/${languageKey}/tags/${slug}/` });
  }
  return [...tags.values()];
}

function renderList(items) {
  return items.length ? `<ul>\n${items.map(item => `  <li>${item}</li>`).join("\n")}\n</ul>\n` : "";
}

function renderPostItem(post) {
  const date = post.metadata.datePublished;
  const time = date ? `<time datetime="${escapeHtml(date)}">${escapeHtml(date)}</time> ` : "";
  return `${time}<a href="${escapeHtml(post.url)}">${escapeHtml(post.metadata.title || post.url)}</a>`;
}

function renderPager(labels, newerUrl, olderUrl) {
  const links = [
    newerUrl && `<a href="${escapeHtml(newerUrl)}" rel="prev">${escapeHtml(labels.newerPosts || "Newer posts")}</a>`,
    olderUrl && `<a href="${escapeHtml(olderUrl)}" rel="next">${escapeHtml(labels.olderPosts || "Older posts")}</a>`
  ].filter(Boolean);
  return links.length ? `<nav aria-label="${escapeHtml(labels.pagination || "Pagination")}">\n${renderList(links)}</nav>\n` : "";
}

function pageSizeOf(config) {
  const pageSize = config.pagination?.pageSize ?? 10;
  if (Number.isInteger(pageSize) && pageSize > 0) return pageSize;
  throw new BlyssError(`Cannot use pagination.pageSize ${JSON.stringify(pageSize)}: it must be a whole number greater than 0.`);
}

// Creates the post archive, the tag index and one page per tag for every language with content.
// Tag pages share a translationKey across languages when their slugs match.
// Like Hugo, long post lists are split into pages: the first keeps the list's URL, later ones add /page/<n>/.
export function createListRecords(config, records, locate) {
  const pageSize = pageSizeOf(config);
  const lists = [];
  for (const languageKey of new Set(records.map(record => record.languageKey))) {
    const languageConfig = config.site.languages[languageKey];
    const { labels } = languageConfig;
    const addList = (urlParts, title, translationKey, html = "") => {
      const list = { languageKey, languageConfig, type: "list", metadata: { title, translationKey }, html, ...locate(urlParts) };
      lists.push(list);
      return list;
    };
    const addPostLists = (urlParts, title, translationKey, posts) => {
      const pages = [];
      for (let start = 0; start < posts.length || !pages.length; start += pageSize) {
        const number = pages.length + 1;
        const list = number === 1 ? addList(urlParts, title, translationKey)
          : addList([...urlParts, "page", String(number)], `${title} – ${labels.page || "Page"} ${number}`, `${translationKey}/page/${number}`);
        pages.push({ list, posts: posts.slice(start, start + pageSize) });
      }
      pages.forEach(({ list, posts: listed }, index) => {
        list.html = renderList(listed.map(renderPostItem)) + renderPager(labels, pages[index - 1]?.list.url, pages[index + 1]?.list.url);
      });
    };

    const posts = newestFirst(records.filter(record => record.type === "post" && record.languageKey === languageKey));
    const tags = new Map();
    for (const post of posts) {
      // Every page uses the spelling of a tag's newest post, so "blyss" in an older post is shown as "Blyss".
      post.tags = post.tags.map(tag => {
        if (!tags.has(tag.slug)) tags.set(tag.slug, { ...tag, posts: [] });
        const { name, slug, url, posts: tagged } = tags.get(tag.slug);
        tagged.push(post);
        return { name, slug, url };
      });
    }
    const sortedTags = [...tags.values()].sort((left, right) => left.name.localeCompare(right.name, languageConfig.locale));

    addPostLists([languageKey, "posts"], labels.posts || "Posts", "blyss:posts", posts);
    addList([languageKey, "tags"], labels.tags || "Tags", "blyss:tags", renderList(sortedTags.map(tag =>
      `<a href="${escapeHtml(tag.url)}">${escapeHtml(tag.name)}</a> (${tag.posts.length})`)));
    for (const tag of sortedTags) {
      addPostLists([languageKey, "tags", tag.slug], `${labels.tag || "Tag"}: ${tag.name}`, `blyss:tags/${tag.slug}`, tag.posts);
    }
  }
  return lists;
}

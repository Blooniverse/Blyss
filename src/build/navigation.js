import { BlyssError } from "../errors.js";
import { escapeHtml } from "./html.js";
import { isWebAddress, listOf, refuse } from "./settings.js";

const isObject = value => typeof value === "object" && value !== null && !Array.isArray(value);
const fields = ["translationKey", "href", "label"];

// mainNavigation lists the links of the top bar, {{mainNavigation}} in templates/document.html, in their order. A
// link has a translationKey, which links the page of that key in the language of each page, or an href, which links
// another website. label names one of the labels of site.languages, which is its text in each language; a link to a
// page shows the title of that page without one. Returns the links, checked against the labels of config.site, which
// every language has alike (see languages.js).
export function mainNavigationOf(config) {
  const { mainNavigation = [] } = config;
  if (!Array.isArray(mainNavigation)) {
    throw refuse("mainNavigation", mainNavigation, 'a list of links, such as [{ translationKey: "home", label: "home" }]');
  }
  const labels = Object.keys(Object.values(config.site.languages)[0].labels);
  return mainNavigation.map((link, index) => {
    const setting = `mainNavigation[${index}]`;
    if (!isObject(link) || Object.hasOwn(link, "translationKey") === Object.hasOwn(link, "href")) {
      throw refuse(setting, link, 'a link with either a translationKey or an href, such as { translationKey: "about", label: "about" }');
    }
    const unknown = Object.keys(link).filter(field => !fields.includes(field));
    if (unknown.length) throw new BlyssError(`Cannot use ${setting}: a link has no ${listOf(unknown)}, only ${listOf(fields, "and")}.`);
    const { translationKey, href, label } = link;
    if (href === undefined && (typeof translationKey !== "string" || !/^\S+$/.test(translationKey))) {
      throw refuse(`${setting}.translationKey`, translationKey, 'the translationKey of a page, a post, a doc or a list, such as "about" or "blyss:posts"');
    }
    if (translationKey === undefined && !isWebAddress(href)) {
      throw refuse(`${setting}.href`, href, 'the URL of another website, such as "https://github.com"');
    }
    if ((label !== undefined || href !== undefined) && !labels.includes(label)) {
      throw refuse(`${setting}.label`, label, `the name of a label of site.languages, such as "home" or "posts"${href === undefined ? "" : ", for the text of the link"}`);
    }
    // A browser reads an address such as https:example.com as a path of the website, so the link gets the parsed one.
    return { translationKey, href: href === undefined ? undefined : new URL(href).href, label };
  });
}

// The archive or the page of a tag of which key is a further page, such as "blyss:posts" of "blyss:posts/page/2"
// (see lists.js).
const listOfPage = key => /^(blyss:posts|blyss:tags\/[^/]+)\/page\/(?:[2-9]|[1-9]\d+)$/.exec(key)?.[1];

// A translationKey that no page has, not even a draft that the build leaves out, is a mistake, such as a misspelt one.
// draftKeys are the translationKeys of the pages that those drafts would make. A further page of the archive or of
// the page of a tag comes and goes with the number of its posts: it is no mistake while its list is none.
export function assertMainNavigation(links, translationIndex, draftKeys) {
  const known = key => key !== undefined && (translationIndex.has(key) || draftKeys.includes(key));
  links.forEach(({ translationKey }, index) => {
    if (translationKey === undefined || known(translationKey) || known(listOfPage(translationKey))) return;
    throw new BlyssError(`Cannot use mainNavigation[${index}].translationKey "${translationKey}": no page has it.\n` +
      'Correct it or remove the link, or give this translationKey to a page; "blyss:posts" is the key of the archive, "blyss:tags" ' +
      'that of the tags, and "blyss:tags/" followed by the slug of a tag that of its page.');
  });
}

// The top bar of record: a link whose page its language lacks, as a draft or an untranslated page, is left out. The
// link to the page itself is the current page, and a link to a page that holds it, such as the start page of its book
// or the archive of the posts, is current as well, except the home page, which holds every page.
export function renderMainNavigation(record, links, translationIndex) {
  const { labels } = record.languageConfig;
  const items = links.flatMap(({ translationKey, href, label }) => {
    if (href !== undefined) return [`<li><a href="${escapeHtml(href)}">${escapeHtml(labels[label])}</a></li>`];
    const page = translationIndex.get(translationKey)?.find(item => item.languageKey === record.languageKey);
    if (!page) return [];
    const current = page.url === record.url ? ' aria-current="page"'
      : page.url !== `/${record.languageKey}/` && record.url.startsWith(page.url) ? ' aria-current="true"' : "";
    const text = label === undefined ? page.metadata.title || page.url : labels[label];
    return [`<li><a href="${escapeHtml(page.url)}"${current}>${escapeHtml(text)}</a></li>`];
  });
  if (!items.length) return "";
  return `<nav aria-label="${escapeHtml(labels.mainNavigation)}">\n      <ul>\n        ${items.join("\n        ")}\n      </ul>\n    </nav>`;
}

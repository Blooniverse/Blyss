import { BlyssError } from "../errors.js";
import { listOf, refuse } from "./settings.js";

// The labels of what Blyss generates itself, in English; the labels of a language can translate them.
const defaultLabels = {
  language: "Language",
  recentPosts: "Recent posts",
  posts: "Posts",
  tags: "Tags",
  tag: "Tag",
  page: "Page",
  pagination: "Pagination",
  newerPosts: "Newer posts",
  olderPosts: "Older posts",
  book: "Book",
  onThisPage: "On this page",
  previous: "Previous",
  next: "Next",
  footnotes: "Footnotes",
  backToText: "Back to the text",
  // The titles of the callouts, by their kinds (see directives.js).
  attention: "Attention",
  caution: "Caution",
  danger: "Danger",
  error: "Error",
  hint: "Hint",
  important: "Important",
  note: "Note",
  seealso: "See also",
  tip: "Tip",
  warning: "Warning"
};

const isObject = value => typeof value === "object" && value !== null && !Array.isArray(value);

// Intl accepts every well-formed language tag, such as "en" or "pt-BR", but not "en_US".
function isLocale(value) {
  try {
    return typeof value === "string" && Intl.getCanonicalLocales(value).length === 1;
  } catch {
    return false;
  }
}

// site.languages lists any number of languages, in the order of the language switcher and of the alternates; the key
// of each is its directory in _content/ and the start of its URLs, such as /en/. site.defaultLanguage, the first language
// unless set, is the one of / and /404.html; site.languageSwitcher, true unless set, shows the language switcher.
// Returns these settings, checked, with the default labels added to each language.
export function languagesOf(config) {
  const { languages, defaultLanguage, languageSwitcher = true } = config.site ?? {};
  if (!isObject(languages) || !Object.keys(languages).length) {
    throw refuse("site.languages", languages, 'an object with at least one language, such as { en: { label: "English", locale: "en" } }');
  }
  for (const [key, language] of Object.entries(languages)) {
    const setting = `site.languages.${key}`;
    if (!/^[a-z0-9-]+$/.test(key)) {
      throw new BlyssError(`Cannot use ${setting}: URLs use its key as a directory, so it must contain only lower-case Latin ` +
        'letters, digits and hyphens, such as "en" or "pt-br".');
    }
    if (!isObject(language)) throw refuse(setting, language, 'an object, such as { label: "English", locale: "en" }');
    const { label, locale, labels = {} } = language;
    if (typeof label !== "string" || !label.trim()) throw refuse(`${setting}.label`, label, 'the name of the language, such as "Deutsch"');
    if (!isLocale(locale)) throw refuse(`${setting}.locale`, locale, 'a language tag, such as "en" or "en-GB"');
    if (!isObject(labels)) throw refuse(`${setting}.labels`, labels, 'an object of texts, such as { search: "Search" }');
  }
  // Each label of one language is a placeholder on the pages of every language, so all languages translate the same ones.
  const names = [...new Set(Object.values(languages).flatMap(({ labels = {} }) => Object.keys(labels)))];
  for (const [key, { labels = {} }] of Object.entries(languages)) {
    const missing = names.filter(name => !Object.hasOwn(labels, name));
    if (missing.length) {
      throw new BlyssError(`Cannot use site.languages.${key}.labels: every language needs the same labels, but it lacks ${listOf(missing, "and")}.`);
    }
  }
  const keys = Object.keys(languages);
  if (!keys.includes(defaultLanguage ?? keys[0])) throw refuse("site.defaultLanguage", defaultLanguage, listOf(keys));
  if (typeof languageSwitcher !== "boolean") throw refuse("site.languageSwitcher", languageSwitcher, "true or false");
  return {
    languages: Object.fromEntries(Object.entries(languages).map(([key, language]) =>
      [key, { ...language, labels: { ...defaultLabels, ...language.labels } }])),
    defaultLanguage: defaultLanguage ?? keys[0],
    languageSwitcher
  };
}

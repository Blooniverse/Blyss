function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// Translations follow the order of site.languages, as do the language switcher and the alternates.
export function indexTranslations(records, languages) {
  const order = Object.keys(languages);
  const index = new Map();
  for (const record of records) {
    const key = record.metadata.translationKey;
    if (!key) continue;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(record);
  }
  for (const translations of index.values()) {
    translations.sort((left, right) => order.indexOf(left.languageKey) - order.indexOf(right.languageKey));
  }
  return index;
}

// Shared by the HTML head and sitemap.xml so that both declare the same alternates: the translations of the page
// and, as x-default for the visitors of any other language, its translation in the default language, if it has one.
export function alternatesFor(record, translationIndex, defaultLanguage) {
  const translations = translationIndex.get(record.metadata.translationKey) || [record];
  const fallback = translations.find(item => item.languageKey === defaultLanguage);
  return translations
    .map(item => ({ hreflang: item.languageConfig.locale, href: item.canonicalUrl }))
    .concat(fallback ? { hreflang: "x-default", href: fallback.canonicalUrl } : []);
}

export function renderAlternateLinks(record, translationIndex, defaultLanguage) {
  return alternatesFor(record, translationIndex, defaultLanguage)
    .map(({ hreflang, href }) => `  <link rel="alternate" hreflang="${escapeHtml(hreflang)}" href="${escapeHtml(href)}">`)
    .join("\n");
}

export function renderLanguageSwitcher(record, translationIndex, site) {
  const translations = translationIndex.get(record.metadata.translationKey) || [record];
  const links = translations.map(item => {
    const language = site.languages[item.languageKey];
    const current = item.languageKey === record.languageKey ? ' aria-current="page"' : "";
    return `<li><a lang="${escapeHtml(language.locale)}" hreflang="${escapeHtml(language.locale)}" href="${escapeHtml(item.url)}"${current}>${escapeHtml(language.label)}</a></li>`;
  }).join("\n        ");
  return `<nav aria-label="${escapeHtml(record.languageConfig.labels.language)}">\n      <ul>\n        ${links}\n      </ul>\n    </nav>`;
}

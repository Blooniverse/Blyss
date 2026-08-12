function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function indexTranslations(records) {
  const index = new Map();
  for (const record of records) {
    const key = record.metadata.translationKey;
    if (!key) continue;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(record);
  }
  return index;
}

export function renderAlternateLinks(record, translationIndex) {
  const translations = translationIndex.get(record.metadata.translationKey) || [record];
  return translations
    .map(item => `  <link rel="alternate" hreflang="${escapeHtml(item.languageConfig.locale)}" href="${escapeHtml(item.canonicalUrl)}">`)
    .concat(`  <link rel="alternate" hreflang="x-default" href="${escapeHtml(record.siteUrl)}">`)
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

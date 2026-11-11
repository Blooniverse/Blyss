import { alternatesFor } from "./translations.js";

const w3cDate = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/;

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export function renderSitemap(records, translationIndex) {
  const entries = [...records].sort((left, right) => (left.url < right.url ? -1 : 1)).map(record => {
    const lines = [`    <loc>${escapeXml(record.canonicalUrl)}</loc>`];
    const lastmod = [record.metadata.dateModified, record.metadata.datePublished].find(date => date && w3cDate.test(date));
    if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
    for (const { hreflang, href } of alternatesFor(record, translationIndex)) {
      lines.push(`    <xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(href)}"/>`);
    }
    return `  <url>\n${lines.join("\n")}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join("\n")}\n</urlset>\n`;
}

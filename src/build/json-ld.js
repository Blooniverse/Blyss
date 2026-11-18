function absoluteUrl(baseUrl, pathname = "/") {
  return new URL(pathname.replace(/^\//, ""), `${baseUrl.replace(/\/$/, "")}/`).href;
}

export function createJsonLd({ site, record }) {
  const siteUrl = absoluteUrl(site.baseUrl, "/");
  const canonicalUrl = absoluteUrl(site.baseUrl, record.url);
  const publisherId = `${siteUrl}#publisher`;
  const websiteId = `${siteUrl}#website`;
  const pageId = `${canonicalUrl}#webpage`;
  const pageType = record.metadata.type || { post: "BlogPosting", book: "TechArticle", list: "CollectionPage" }[record.type] || "WebPage";

  const graph = [
    {
      "@type": site.publisher.type,
      "@id": publisherId,
      name: site.publisher.name,
      url: site.publisher.url
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      url: siteUrl,
      name: site.name,
      inLanguage: Object.values(site.languages).map(({ locale }) => locale),
      publisher: { "@id": publisherId }
    },
    {
      "@type": pageType,
      "@id": pageId,
      url: canonicalUrl,
      name: record.metadata.title || site.name,
      description: record.metadata.description || record.languageConfig.description,
      inLanguage: record.languageConfig.locale,
      isPartOf: { "@id": websiteId },
      publisher: { "@id": publisherId }
    }
  ];

  const page = graph[2];
  // Posts and docs are articles: they have a headline, an author, who is the publisher of the website, and dates, and
  // they are the main entity of their page.
  if (record.type === "post" || record.type === "book") {
    page.headline = page.name;
    page.author = { "@id": publisherId };
    if (record.metadata.datePublished) page.datePublished = record.metadata.datePublished;
    if (record.metadata.dateModified) page.dateModified = record.metadata.dateModified;
    if (record.tags?.length) page.keywords = record.tags.map(tag => tag.name);
    page.mainEntityOfPage = { "@id": pageId };
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

// Unicode escapes keep "</script>" and "<!--" in values from ending or altering the script element.
export function renderJsonLd(data) {
  const json = JSON.stringify(data, null, 2)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

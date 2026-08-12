function absoluteUrl(baseUrl, pathname = "/") {
  return new URL(pathname.replace(/^\//, ""), `${baseUrl.replace(/\/$/, "")}/`).href;
}

export function createJsonLd({ site, record }) {
  const siteUrl = absoluteUrl(site.baseUrl, "/");
  const canonicalUrl = absoluteUrl(site.baseUrl, record.url);
  const publisherId = `${siteUrl}#publisher`;
  const websiteId = `${siteUrl}#website`;
  const pageId = `${canonicalUrl}#webpage`;
  const pageType = record.metadata.type || (record.type === "post" ? "BlogPosting" : "WebPage");

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
  if (record.type === "post") {
    if (record.metadata.datePublished) page.datePublished = record.metadata.datePublished;
    if (record.metadata.dateModified) page.dateModified = record.metadata.dateModified;
    page.mainEntityOfPage = { "@id": pageId };
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

export function renderJsonLd(data) {
  const json = JSON.stringify(data, null, 2)
    .replaceAll("<", "\u003c")
    .replaceAll(">", "\u003e")
    .replaceAll("&", "\u0026");
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

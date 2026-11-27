function absoluteUrl(baseUrl, pathname = "/") {
  return new URL(pathname.replace(/^\//, ""), `${baseUrl.replace(/\/$/, "")}/`).href;
}

// The contributors of a page, once each: the authors of its contributions (see directives.js). A human without a name
// is the publisher of the website; an agent is software, named as its contribution names it or by its kind.
function contributorsOf(contributions, publisherId) {
  const contributors = new Map();
  for (const { by, author, word } of contributions) {
    const contributor = by === "agent" ? { "@type": "SoftwareApplication", name: author || word }
      : author ? { "@type": "Person", name: author } : { "@id": publisherId };
    contributors.set(JSON.stringify(contributor), contributor);
  }
  return [...contributors.values()];
}

const typeOf = record => record.metadata.type || { post: "BlogPosting", book: "TechArticle", list: "CollectionPage" }[record.type] || "WebPage";

// trail names the pages from the top of a page's part of the website to the page itself: for a doc, the start pages
// of its book and of its sections (see book.js); for a post or a list, the lists above it, from the archive or the
// tags (see lists.js). A BreadcrumbList follows a trail of two pages or more. A doc is part of the start page above
// it, up to the start page of its book, which is part of the website; a post is only listed in the archive, so it
// and every other page are part of the website.
export function createJsonLd({ site, record, contributions = [], trail = [] }) {
  const siteUrl = absoluteUrl(site.baseUrl, "/");
  const canonicalUrl = absoluteUrl(site.baseUrl, record.url);
  const publisherId = `${siteUrl}#publisher`;
  const websiteId = `${siteUrl}#website`;
  const pageId = `${canonicalUrl}#webpage`;
  const urlOf = item => absoluteUrl(site.baseUrl, item.url);
  const nameOf = item => item.metadata.title || site.name;
  const above = record.type === "book" ? trail.slice(0, -1) : [];
  // What the page at a depth below the start page of the book is part of; the start page itself is part of the website.
  const partOf = depth => ({ "@id": depth ? `${urlOf(above[depth - 1])}#webpage` : websiteId });

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
      "@type": typeOf(record),
      "@id": pageId,
      url: canonicalUrl,
      name: nameOf(record),
      description: record.metadata.description || record.languageConfig.description,
      inLanguage: record.languageConfig.locale,
      isPartOf: partOf(above.length),
      publisher: { "@id": publisherId }
    },
    ...above.map((item, depth) => ({
      "@type": typeOf(item),
      "@id": `${urlOf(item)}#webpage`,
      url: urlOf(item),
      name: nameOf(item),
      isPartOf: partOf(depth)
    }))
  ];
  if (trail.length > 1) {
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${canonicalUrl}#breadcrumb`,
      itemListElement: trail.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: nameOf(item), item: urlOf(item) }))
    });
  }

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
  if (contributions.length) page.contributor = contributorsOf(contributions, publisherId);

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

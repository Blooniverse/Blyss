export function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// A website below a path, such as /docs for https://example.com/docs/, finds its pages and its files below that
// path: every href, src, poster and action of a page that starts at the root of the website, with a single "/",
// gets the path. The content, the templates and the components need not know it.
export function withBasePath(html, basePath) {
  if (!basePath) return html;
  const path = escapeHtml(basePath);
  return html.replace(/(\s(?:href|src|poster|action)=["'])\/(?!\/)/g, (match, start) => `${start}${path}/`);
}

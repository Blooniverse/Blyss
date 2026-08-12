const mimeTypes = {
  ".css": "text/css; charset=utf-8", ".gif": "image/gif", ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon", ".jpeg": "image/jpeg", ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp", ".xml": "application/xml; charset=utf-8"
};
export function contentTypeFor(extension) {
  return mimeTypes[extension.toLowerCase()] ?? "application/octet-stream";
}

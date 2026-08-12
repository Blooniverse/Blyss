# Blyss Development Instructions

Blyss is a lean bilingual Markdown transformer and static-site server.

## Principles

- Keep the implementation small and understandable.
- Prefer built-in Node.js APIs.
- Do not introduce dependencies without a demonstrated requirement.
- Preserve compatibility with Node.js 25 and newer.
- Keep authored content, static assets, source code, templates, and generated output separate.
- Treat public/ as disposable generated output.
- Preserve English and German language support.
- Preserve clean localized URLs.
- Preserve translation relationships through translationKey.
- Preserve Schema.org JSON-LD using @graph.
- Do not generate public/index.html.
- The server must redirect / to the configured default language with HTTP 302.
- Prevent filesystem access outside public/.

## Validation

For every code change:

1. Run node --check on all JavaScript files.
2. Run npm run build.
3. Validate generated JSON-LD by parsing it as JSON.
4. Verify English and German routes.
5. Verify the root 302 redirect.
6. Verify a missing route returns 404.
7. Check that recent posts are ordered by datePublished.
8. Confirm that no generated template placeholders remain.

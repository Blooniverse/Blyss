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
- `blyss init` must never overwrite or delete files that existed before it ran.
- Keep the starter in starters/lean/ buildable and free of unreplaced tokens.
- Keep this repository engine-only: website content, static assets and templates belong in starters/lean/; the root blyss.config.js only previews the starter.

## Validation

For every code change:

1. Run node --check on all JavaScript files.
2. Run npm run build (it renders starters/lean/ into public/).
3. Validate generated JSON-LD by parsing it as JSON.
4. Verify English and German routes.
5. Verify the root 302 redirect.
6. Verify a missing route returns 404.
7. Check that recent posts are ordered by datePublished.
8. Confirm that no generated template placeholders remain.
9. Check that public/sitemap.xml lists every generated page.
10. Run npm test.

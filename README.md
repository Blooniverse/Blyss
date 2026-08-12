# Blyss 0.4

Blyss is a lean bilingual Markdown transformer and static-site server for Node.js.

## Features

- English and German content trees
- clean localized URLs under `/en/` and `/de/`
- root language selector at `/`
- front matter and localized slugs
- translation matching via `translationKey`
- visible language switchers and `hreflang` alternate links
- Schema.org JSON-LD using a future-proof `@graph`
- static asset copying
- dependency-free Node.js static server

## Commands

```bash
npm {install|ci} && run build
npm start
```

Open `http://localhost:3000` locally.

## Hosting

Set `site.baseUrl`, publisher data, and language details in `blyss.config.js` before production deployment.

## Content

Keep translations linked with the same `translationKey`.

Titles come from front matter, so Markdown body text should begin below the title rather than with another H1.

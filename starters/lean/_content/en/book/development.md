---
title: Developing Blyss
description: Work on the engine and bundled starter.
order: 8
translationKey: book-development
---

The Blyss repository contains the engine in `bin/` and `src/`, the bundled website starter in `starters/lean/`, and tests in `test/`. Its root configuration previews the starter; it is not itself a website.

```bash
npm install     # install engine dependencies
npm run build   # render the starter into public/
npm start       # serve public/ on localhost:3000
npm test        # build and run the test suite
```

Keep website content, assets, templates and components in the starter, from which `blyss init` copies them. `public/` is disposable.

The engine uses `marked` for Markdown, `temml` for MathML and `highlight.js` for code, in `src/build/markdown.js`. It is tested with `marked` 18; versions before 16.3.0 lack a required hook. Temml is pinned to an exact version because the starter ships its stylesheet and font. When updating Temml, copy `Temml-Local.css` and `Temml.woff2` from `node_modules/temml/dist/` into `starters/lean/static/assets/temml/`; a test checks this.

Blyss was initially developed with assistance from Microsoft 365 Copilot in August 2026 and is co-developed by Blooniverse and GitHub Copilot.

# My Website

A bilingual website generated with [Blyss](https://github.com/Blooniverse/Blyss). The starter's book is available in [English](_content/en/book/index.md) and [German](_content/de/book/index.md); once built, visit `/en/book/` or `/de/book/`.

## Workflow

```bash
npm install     # install Blyss
npm run build   # generate public/
npm start       # serve http://localhost:3000
```

See [installation and commands](_content/en/book/installation.md) and [writing](_content/en/book/writing/index.md). `public/` is disposable: each build recreates it.

## Customize

Edit `_content/` for pages, posts, docs and texts; `templates/`, `components/` and `static/` for the theme; and the commented `blyss.config.js` for settings. The book covers [templates](_content/en/book/templates.md), [components](_content/en/book/components.md) and [languages](_content/en/book/configuration.md#languages). Component blocks can give each occurrence its own text and settings.

Replace the values marked `CHANGE BEFORE PRODUCTION`, the sitemap URL in `static/robots.txt`, the placeholder logo and gallery images before publishing. See [deployment and SEO](_content/en/book/deployment.md) for privacy, hosting, the root redirect and 404 configuration.

The starter's documentation is also example content: adapt or replace it for your own website.

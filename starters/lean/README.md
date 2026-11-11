# My Website

A bilingual (English and German) website generated with [Blyss](https://github.com/Blooniverse/Blyss).

## Workflow

```bash
npm install     # install Blyss
npm run build   # generate the website into dist/
npm start       # serve dist/ on http://localhost:3000
```

## Structure

| Path | Purpose |
| --- | --- |
| `content/en/pages/`, `content/en/posts/` | English Markdown pages and posts |
| `content/de/pages/`, `content/de/posts/` | German Markdown pages and posts |
| `templates/` | HTML templates: `document.html`, `page.html`, `post.html` |
| `static/` | Static files such as `static/assets/css/main.css` and `static/robots.txt`, copied unchanged into `dist/` |
| `blyss.config.js` | Site, language and directory configuration |
| `dist/` | Generated website — do not edit |

## Content

Every Markdown file starts with front matter:

```markdown
---
title: Hello World
slug: hello-world
description: The first post of this website.
datePublished: 2026-11-10
translationKey: hello-world
---
```

- Pages in `content/<language>/pages/` are published at `/<language>/<slug>/`; `index.md` becomes `/<language>/`.
- Posts in `content/<language>/posts/` are published at `/<language>/posts/<slug>/`.
- `slug` defaults to the file name. Give each language its own slug for localized URLs.
- Translations are associated by giving them the same `translationKey`. Blyss links them in the language switcher and with `hreflang` alternate links.
- A page containing `{{recentPosts}}` lists the three newest posts of its language, ordered by `datePublished`.
- Keep `index.md` and `about.md` in both languages without a different slug: the navigation in `templates/document.html` links to `/<language>/` and `/<language>/about/`.

## Generated output

`npm run build` deletes and recreates `dist/`. Never edit files in `dist/` manually; change `content/`, `templates/`, `static/` or `blyss.config.js` and rebuild instead. `dist/` is excluded from Git by `.gitignore`.

## Before production

Replace the values marked `CHANGE BEFORE PRODUCTION` in `blyss.config.js`:

- `site.name`
- `site.baseUrl` — the public URL used for canonical, `hreflang` and JSON-LD links
- `site.publisher` — `type`, `name` and `url`
- `site.languages.en.description` and `site.languages.de.description`

Blyss does not generate `dist/index.html`. When deploying `dist/` to a static host, redirect `/` to `/en/` as `npm start` does.

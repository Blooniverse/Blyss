# My Website

A bilingual (English and German) website generated with [Blyss](https://github.com/Blooniverse/Blyss).

## Workflow

```bash
npm install     # install Blyss
npm run build   # generate the website into public/
npm start       # serve public/ on http://localhost:3000
```

## Structure

| Path | Purpose |
| --- | --- |
| `content/en/pages/`, `content/en/posts/` | English Markdown pages and posts |
| `content/de/pages/`, `content/de/posts/` | German Markdown pages and posts |
| `templates/` | HTML templates: `document.html`, `page.html`, `post.html` |
| `static/` | Static files such as `static/assets/css/main.css`, `static/robots.txt` and `static/staticwebapp.config.json`, copied unchanged into `public/` |
| `blyss.config.js` | Site, language, pagination and directory configuration |
| `public/` | Generated website — do not edit |

## Content

Every Markdown file starts with front matter:

```markdown
---
title: Hello World
slug: hello-world
description: The first post of this website.
datePublished: 2026-11-10
translationKey: hello-world
tags: [Blyss, Markdown]
---
```

- Pages in `content/<language>/pages/` are published at `/<language>/<slug>/`; `index.md` becomes `/<language>/`.
- Posts in `content/<language>/posts/` are published at `/<language>/posts/<slug>/`.
- `slug` defaults to the file name. Give each language its own slug for localized URLs.
- Translations are associated by giving them the same `translationKey`. Blyss links them in the language switcher and with `hreflang` alternate links.
- A page containing `{{recentPosts}}` lists the three newest posts of its language, ordered by `datePublished`.
- Posts can have `tags`. Blyss generates the archive `/<language>/posts/`, the tag index `/<language>/tags/` and one page per tag, such as `/en/tags/markdown/`. Do not create content at these URLs.
- The archive and tag pages show `pagination.pageSize` posts (10 by default, set in `blyss.config.js`). Older posts continue on `/<language>/posts/page/2/`, `/<language>/tags/<tag>/page/2/` and so on, linked by “Newer posts” and “Older posts”.
- `pages/404.md` is the “not found” page. It is published at `/<language>/404.html`; the default language's page, English, is also published as `/404.html`, which `npm start` and most static hosts show for every missing URL. Because it appears at any URL, link from it with absolute paths such as `/en/`.
- Keep `index.md` and `about.md` in both languages without a different slug: the navigation in `templates/document.html` links to `/<language>/` and `/<language>/about/`.

## Generated output

`npm run build` deletes and recreates `public/`, including `public/sitemap.xml` and `public/404.html`. Never edit files in `public/` manually; change `content/`, `templates/`, `static/` or `blyss.config.js` and rebuild instead. `public/` is excluded from Git by `.gitignore`. Blyss refuses to build into the website's root or into a directory that contains or lies inside `content/`, `static/` or `templates/`.

## Before production

Replace the values marked `CHANGE BEFORE PRODUCTION` in `blyss.config.js`:

- `site.name`
- `site.baseUrl` — the public URL used for canonical, `hreflang` and JSON-LD links
- `site.publisher` — `type`, `name` and `url`
- `site.languages.en.description` and `site.languages.de.description`

Also replace the `Sitemap:` URL in `static/robots.txt`, which is marked the same way.

If you change `site.defaultLanguage`, also change the `/en/` redirect in `static/staticwebapp.config.json` and in your deployment workflow.

## Deployment

Blyss does not generate `public/index.html`. When deploying `public/` to a static host, redirect `/` to `/en/` and show `404.html` for missing URLs, as `npm start` does.

### Azure Static Web Apps

`static/staticwebapp.config.json` configures both for [Azure Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/configuration): it redirects `/` to `/en/` (HTTP 302) and answers missing URLs with `/404.html` (HTTP 404).

Azure's own build service may not provide Node.js 25 or newer, which Blyss requires. Build the website in GitHub Actions instead and upload `public/` with `skip_app_build: true`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/* # Blyss requires Node.js 25 or newer
      - run: npm ci
      - run: npm run build
      # The upload fails without public/index.html. Visitors never see this file:
      # staticwebapp.config.json redirects / to /en/ first.
      - run: echo '<!doctype html><title>Redirecting</title><meta http-equiv="refresh" content="0; url=/en/">' > public/index.html
      - uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: upload
          app_location: public
          output_location: ""
          skip_app_build: true
```

Use the name of the deployment token secret that Azure created for your app. `npm ci` requires the `package-lock.json` that `npm install` creates, so commit it.

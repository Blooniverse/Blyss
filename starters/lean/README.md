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
| `content/en/hero.md`, `content/en/heroComponentSlider.md` and the same in `content/de/` | The texts of the hero and its slider (see [Overlay](#overlay)) |
| `templates/` | HTML templates: `document.html`, `home.html`, `page.html`, `post.html` |
| `static/` | Static files such as `static/assets/css/main.css`, `static/assets/img/logo.svg`, `static/assets/js/overlay.js`, `static/robots.txt` and `static/staticwebapp.config.json`, copied unchanged into `public/` |
| `blyss.config.js` | Site, language, pagination, layout, hero component and directory configuration |
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
- The home pages `/<language>/` use `templates/home.html`: the `title` and `description` of `index.md` become the heading and the slogan in their header.
- Posts in `content/<language>/posts/` are published at `/<language>/posts/<slug>/`.
- `slug` defaults to the file name. Give each language its own slug for localized URLs.
- Translations are associated by giving them the same `translationKey`. Blyss links them in the language switcher and with `hreflang` alternate links.
- A page containing `{{recentPosts}}` lists the three newest posts of its language, ordered by `datePublished`.
- Posts can have `tags`. Blyss generates the archive `/<language>/posts/`, the tag index `/<language>/tags/` and one page per tag, such as `/en/tags/markdown/`. Do not create content at these URLs.
- The archive and tag pages show `pagination.pageSize` posts (10 by default, set in `blyss.config.js`). Older posts continue on `/<language>/posts/page/2/`, `/<language>/tags/<tag>/page/2/` and so on, linked by “Newer posts” and “Older posts”.
- Markdown files directly in `content/<language>/`, such as `hero.md`, are fragments: Blyss publishes no page for them, but `templates/document.html` shows them on every page of their language as `{{<name>Title}}`, the `title` of their front matter, and `{{<name>Content}}`, their text, such as `{{heroTitle}}` and `{{heroContent}}`. Their file names must start with a Latin letter and contain only Latin letters and digits.
- `pages/404.md` is the “not found” page. It is published at `/<language>/404.html`; the default language's page, English, is also published as `/404.html`, which `npm start` and most static hosts show for every missing URL. Because it appears at any URL, link from it with absolute paths such as `/en/`.
- Keep `index.md` and `about.md` in both languages without a different slug: the navigation in `templates/document.html` links to `/<language>/` and `/<language>/about/`.

## Layout

`layout` in `blyss.config.js` sets the space around the content and its alignment on every page:

- `margin` is the space between the coloured frame and the content on every side: a CSS length in `px`, `rem`, `vw`, `vh`, `vmin` or `vmax`, such as `"2vmin"` (the default) or `"2rem"`. The top bar spans the side margins.
- `align` is `"left"` (the default) or `"center"`, which centers everything below the top bar: the text column, headings, paragraphs, lists and the overlay. Code blocks stay left-aligned.

`templates/document.html` passes both to `static/assets/css/main.css` through `<body data-align="…" style="--site-margin: …">`.

## Top bar

`templates/document.html` starts every page with a bar that stays at the top of the window while the page scrolls. It holds the logo, the navigation, a search field and the language switcher.

- `static/assets/img/logo.svg` is a placeholder logo in the stylesheet's dark blue, `#005180`. Replace it with your own, and adjust the `alt`, `width` and `height` of its `<img>` in `templates/document.html`.
- The search field has no function yet: it belongs to no form, so nothing is sent. The label `search` in `blyss.config.js` holds its text.
- On narrow screens, the bar wraps into two or three rows.

## Overlay

`templates/document.html` contains an overlay with the hero component, so far a slider, and the texts of `content/<language>/hero.md`.

- On the home pages, the overlay is open and serves as the hero below the page, which starts with the site's title and slogan, centered. On screens of at least 1024×640 pixels, the page stops below the top bar, or once its end is in view if it is taller than the window, while the hero slides up over it and fades it out. Keyboard focus in the page turns this effect off, so that the hero never covers the focused element. With reduced motion, on smaller screens and in browsers without scroll-driven animations, the hero is a static block below the page.
- On every other page, it is collapsed into a bar at the bottom of the window. Its button opens the overlay as a panel; the Close button, the Escape key or a click outside closes it again. The browser's [Popover API](https://developer.mozilla.org/docs/Web/API/Popover_API) does this without JavaScript.
- `content/<language>/hero.md` holds the hero's texts: its `title` is their heading, and each `###` heading starts a text that runs up to the next one. The hero shows up to seven texts in full length, side by side in as many columns as fit. Blyss refuses more than seven and any content before the first `###` heading, except comments. The starter has three texts in each language.
- The hero component is the interactive part of the overlay. Its variant, the slider, is centered below its heading, with its value above it and its steps and text below it; the `title` and text of `content/<language>/heroComponentSlider.md` are its heading and text. `heroComponent.slider` in `blyss.config.js` sets its whole-number `start` and `end` and its `steps`: each step has a `value` from `start` to `end` and a `description` in every language, and both appear below the slider at that value. The starter defines four steps; change, add or remove them as you like. The slider starts halfway between `start` and `end`.
- `static/assets/js/overlay.js` shows the slider's value above it and highlights the last step it has reached.
- The labels `overlay` and `close` in `blyss.config.js` hold the texts of the overlay's buttons. Templates can use every label as `{{<key>Label}}`, such as `{{overlayLabel}}`.
- `templates/document.html` sets `<body data-kind="…">` to `home`, `page`, `post`, `list` or `not-found`; `static/assets/css/main.css` uses it to style the overlay per kind of page.

## Fonts

`templates/document.html` loads the font Titillium Web from Google Fonts. Each visit then sends the visitor's IP address to Google, which a German court held to violate the GDPR without consent (Landgericht München I, 3 O 17493/20, 20 January 2022). To host the font yourself, download it from [Google Fonts](https://fonts.google.com/specimen/Titillium+Web), put the `.woff2` files into `static/assets/fonts/`, declare them with `@font-face` in `static/assets/css/main.css` and remove the three Google Fonts `<link>` elements.

## Generated output

`npm run build` deletes and recreates `public/`, including `public/sitemap.xml` and `public/404.html`. Never edit files in `public/` manually; change `content/`, `templates/`, `static/` or `blyss.config.js` and rebuild instead. `public/` is excluded from Git by `.gitignore`. Blyss refuses to build into the website's root or into a directory that contains or lies inside `content/`, `static/` or `templates/`.

## Before production

Replace the values marked `CHANGE BEFORE PRODUCTION` in `blyss.config.js`:

- `site.name`
- `site.baseUrl` — the public URL used for canonical, `hreflang` and JSON-LD links
- `site.publisher` — `type`, `name` and `url`
- `site.languages.en.description` and `site.languages.de.description`

Also replace the `Sitemap:` URL in `static/robots.txt`, which is marked the same way, and the placeholder logo `static/assets/img/logo.svg` (see [Top bar](#top-bar)).

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

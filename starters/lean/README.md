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
| `content/en/hero.md` and `content/de/hero.md` | The texts of the hero (see [Overlay](#overlay)) |
| `content/en/components/`, `content/de/components/` | The texts of the components |
| `components/` | The [components](#components) `heroComponentSlider/` and `heroComponentGallery/`, each with its template, stylesheet and script |
| `templates/` | HTML templates: `document.html`, `home.html`, `page.html`, `post.html` |
| `static/` | Static files such as `static/assets/css/main.css`, `static/assets/img/logo.svg`, the gallery's images in `static/assets/img/gallery/`, `static/robots.txt` and `static/staticwebapp.config.json`, copied unchanged into `public/` |
| `blyss.config.js` | Site, language, pagination, layout, component and directory configuration |
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
- A paragraph that consists of the name of a component in double curly braces alone, such as `{{heroComponentSlider}}`, shows that [component](#components) in a page or post.
- Posts can have `tags`. Blyss generates the archive `/<language>/posts/`, the tag index `/<language>/tags/` and one page per tag, such as `/en/tags/markdown/`. Do not create content at these URLs.
- The archive and tag pages show `pagination.pageSize` posts (10 by default, set in `blyss.config.js`). Older posts continue on `/<language>/posts/page/2/`, `/<language>/tags/<tag>/page/2/` and so on, linked by “Newer posts” and “Older posts”.
- Markdown files directly in `content/<language>/`, such as `hero.md`, are fragments: Blyss publishes no page for them, but `templates/document.html` shows them on every page of their language as `{{<name>Title}}`, the `title` of their front matter, and `{{<name>Content}}`, their text, such as `{{heroTitle}}` and `{{heroContent}}`. Their file names must start with a Latin letter and contain only Latin letters and digits.
- `pages/404.md` is the “not found” page. It is published at `/<language>/404.html`; the default language's page, English, is also published as `/404.html`, which `npm start` and most static hosts show for every missing URL. Because it appears at any URL, link from it with absolute paths such as `/en/`.
- Keep `index.md` and `about.md` in both languages without a different slug: the navigation in `templates/document.html` links to `/<language>/` and `/<language>/about/`.

## Layout

`layout` in `blyss.config.js` sets the space around the content and its alignment, separately for the home pages and for all other pages: pages, posts, lists and not-found pages.

- `margin` is the space between the coloured frame and the content on every side: a CSS length in `px`, `rem`, `vw`, `vh`, `vmin` or `vmax`, such as `"2vmin"` (the default) or `"2rem"`. The top bar spans the side margins.
- `paddingHero` is the space above and below the content of the hero and of the opened overlay: a CSS length like `margin`, `"1rem"` by default.
- `alignHome` aligns the title, slogan and text of the home pages and their footer: `"center"` (the default) or `"left"`.
- `alignOther` aligns the content of all other pages and their footer: `"left"` (the default), `"center"`, or `"centerLeft"`, which centers the text column but keeps its text left-aligned; the footer lines up with the column.
- `alignHeroHome` and `alignHeroOther` align the hero of the home pages and the overlay of all other pages: `"centerExtra"` (the default) centers everything but the texts of `hero.md`, which stay left-aligned with their headings, `"center"` centers everything and `"left"` nothing, not even the slider.

Centered lists keep their markers next to their items, and code blocks stay left-aligned. `templates/document.html` passes the margin, the hero's padding and each page's alignments to `static/assets/css/main.css` through `<body data-align="…" data-align-hero="…" style="--site-margin: …; --hero-padding: …">`.

## Top bar

`templates/document.html` starts every page with a bar that stays at the top of the window while the page scrolls. It holds the logo, the navigation, a search field and the language switcher.

- `static/assets/img/logo.svg` is a placeholder logo in the stylesheet's dark blue, `#005180`. Replace it with your own, and adjust the `alt`, `width` and `height` of its `<img>` in `templates/document.html`.
- The search field has no function yet: it belongs to no form, so nothing is sent. The label `search` in `blyss.config.js` holds its text.
- On narrow screens, the bar wraps into two or three rows.

## Overlay

`templates/document.html` contains an overlay with two [components](#components), a slider and a gallery, and the texts of `content/<language>/hero.md`.

- On the home pages, the overlay is open and serves as the hero below the page, which starts with the site's title and slogan. On screens of at least 1024×640 pixels, the page stops below the top bar, or once its end is in view if it is taller than the window, while the hero slides up over it and fades it out. A hero that is shorter than the window then stops below the top bar, and the footer follows it into the window. Keyboard focus in the page turns this effect off, so that the hero never covers the focused element. With reduced motion, on smaller screens and in browsers without scroll-driven animations, the hero is a static block below the page.
- On every other page, it is collapsed into a bar at the bottom of the window. Its button opens the overlay as a panel; the Close button, the Escape key or a click outside closes it again. The browser's [Popover API](https://developer.mozilla.org/docs/Web/API/Popover_API) does this without JavaScript.
- The hero is as tall as its content. `layout.paddingHero` in `blyss.config.js` sets the space above and below that content (see [Layout](#layout)).
- `{{heroComponentSlider}}` and `{{heroComponentGallery}}` in `templates/document.html` show the two components. Remove one of these lines to drop its component from the overlay, or swap them to change their order.
- `content/<language>/hero.md` holds the hero's texts: its `title` is their heading, and each `###` heading starts a text that runs up to the next one. The hero shows as many texts as the file has, each in full length, side by side in as many columns as fit. Blyss refuses any content before the first `###` heading, except comments. The starter has three texts in each language.
- All headings in the overlay are `<h3>`: the hero's title, the headings of the slider and of the gallery and the headings of the texts. As the overlay is on every page, its headings rank below each page's own `<h1>` and `<h2>`.
- The labels `overlay` and `close` in `blyss.config.js` hold the texts of the overlay's buttons. Templates can use every label as `{{<key>Label}}`, such as `{{overlayLabel}}`.
- `templates/document.html` sets `<body data-kind="…">` to `home`, `page`, `post`, `list` or `not-found`; `static/assets/css/main.css` uses it to style the overlay per kind of page.

## Components

A component is a part of a page that brings what it needs. Each has a directory of its own in `components/`:

| File or setting | Purpose |
| --- | --- |
| `components/<name>/<name>.html` | Its template, which links to its stylesheet and its script |
| `components/<name>/<name>.css` and `<name>.js` | Its stylesheet and its script for the browser, published at `/components/<name>/` |
| `components/<name>/<name>.data.js` | Checks its settings during the build and prepares values for its template |
| `content/<language>/components/<name>.md` | Its texts in each language |
| `components.<name>` in `blyss.config.js` | Its settings |

- `{{<name>}}` shows a component in a template, as `templates/document.html` shows both in the overlay.
- A paragraph that consists of `{{<name>}}` alone shows it in a page or post. The post “Templates and styles” shows the slider this way.
- A component can appear several times on a page. Each is a custom element, `<hero-component-slider>` or `<hero-component-gallery>`, which its script sets up wherever it appears, so that every slider and every gallery works on its own.
- Their class `hero-component` lets `static/assets/css/main.css` place them: centered where the text around them is centered.
- For a component of your own, create `components/<name>/<name>.html`; every other file is optional. The [Blyss README](https://github.com/Blooniverse/Blyss#components) lists the placeholders of a component's template.

### Slider

The slider follows its heading, with its value above it and its steps and its text below it.

- The `title` and the text of `content/<language>/components/heroComponentSlider.md` are its heading and its text.
- `components.heroComponentSlider` in `blyss.config.js` sets its whole-number `start` and `end`, 0 and 100 without them, and its `steps`: each step has a `value` from `start` to `end` and a `description` in every language, and both appear below the slider at that value. The starter defines four steps; change, add or remove them as you like. The slider starts halfway between `start` and `end`.
- Its script shows the slider's value above it and highlights the last step it has reached. Without JavaScript, the slider moves all the same.

### Gallery

The gallery shows any number of images side by side in a strip that visitors move sideways. The strip stops with an image in its centre, which grows without a frame.

- `content/<language>/components/heroComponentGallery.md` lists the images: each item of its Markdown list is an image with its description in that language, such as `- ![A sun rising over blue hills](/assets/img/gallery/sunrise.svg)`. Its `title` is the gallery's heading, and `previous` and `next` name the two arrows for screen readers.
- The images live in `static/assets/img/gallery/`, in any format that browsers show, such as SVG, PNG, JPEG, WebP, AVIF or GIF, and in any proportions. Blyss copies them unchanged. The starter's seven images are placeholders.
- Visitors move through the images with the arrows at both ends of the strip, with the arrow keys once the gallery has the focus, and by swiping or scrolling sideways. The first and the last image reach the centre too.
- `components.heroComponentGallery` in `blyss.config.js` sets:
  - `heightOverall`: the height of the images, a CSS length in `px`, `rem`, `vw`, `vh`, `vmin` or `vmax`, `"8rem"` by default. Each image is as wide as its proportions make it.
  - `heightCenter`: the height of the image in the centre, a percentage of `heightOverall` from `100%` up; the default `"130%"` enlarges it by 30%.
  - `animationSpeedScrolling`: the time an arrow or an arrow key takes to bring the next image to the centre, in `ms` or `s`, `"400ms"` by default.
  - `animationSpeedImgEnlargement`: the time the image in the centre takes to grow, in `ms` or `s`, `"300ms"` by default.
- The gaps between the images keep an enlarged image of up to three by two clear of its neighbours; a wider one covers part of them.
- The browser loads an image only when the gallery is shown and the image comes near, so many images do not slow a page down. With reduced motion, the images change without animation. Without JavaScript, the gallery is a strip with a scrollbar, without arrows and without the enlarged image.

## Fonts

`templates/document.html` loads the font Titillium Web from Google Fonts. Each visit then sends the visitor's IP address to Google, which a German court held to violate the GDPR without consent (Landgericht München I, 3 O 17493/20, 20 January 2022). To host the font yourself, download it from [Google Fonts](https://fonts.google.com/specimen/Titillium+Web), put the `.woff2` files into `static/assets/fonts/`, declare them with `@font-face` in `static/assets/css/main.css` and remove the three Google Fonts `<link>` elements.

## Generated output

`npm run build` deletes and recreates `public/`, including `public/sitemap.xml` and `public/404.html`. Never edit files in `public/` manually; change `content/`, `components/`, `templates/`, `static/` or `blyss.config.js` and rebuild instead. `public/` is excluded from Git by `.gitignore`. Blyss refuses to build into the website's root or into a directory that contains or lies inside `components/`, `content/`, `static/` or `templates/`.

## Before production

Replace the values marked `CHANGE BEFORE PRODUCTION` in `blyss.config.js`:

- `site.name`
- `site.baseUrl` — the public URL used for canonical, `hreflang` and JSON-LD links
- `site.publisher` — `type`, `name` and `url`
- `site.languages.en.description` and `site.languages.de.description`

Also replace the `Sitemap:` URL in `static/robots.txt`, which is marked the same way, the placeholder logo `static/assets/img/logo.svg` (see [Top bar](#top-bar)) and the gallery's placeholder images in `static/assets/img/gallery/` with their descriptions in `content/<language>/components/heroComponentGallery.md` (see [Gallery](#gallery)).

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

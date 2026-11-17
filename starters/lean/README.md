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
| `_content/en/pages/`, `_content/en/posts/`, `_content/en/book/` | English Markdown pages, posts and docs |
| `_content/de/pages/`, `_content/de/posts/`, `_content/de/book/` | German Markdown pages, posts and docs |
| `_content/en/heroTexts.md` and `_content/de/heroTexts.md` | The texts of the [hero](#hero) |
| `_content/en/overlayTexts.md` and `_content/de/overlayTexts.md` | The texts of the [overlay](#overlay) |
| `_content/en/components/`, `_content/de/components/` | The texts of the components |
| `components/` | The [components](#components) `componentSlider/`, `componentGallery/` and `componentFlower/`, each with its template, stylesheet and script |
| `templates/` | HTML templates: `document.html`, `home.html`, `page.html`, `post.html`, `book.html`, `hero.html`, `overlay.html` |
| `static/` | Static files such as `static/assets/css/main.css`, `static/assets/img/logo.svg`, the gallery's images in `static/assets/img/gallery/`, `static/robots.txt` and `static/staticwebapp.config.json`, copied unchanged into `public/` |
| `blyss.config.js` | Site, language, pagination, layout, hero, overlay, component and directory configuration, in this order |
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

- Pages in `_content/<language>/pages/` are published at `/<language>/pages/<slug>/`, so that the URLs follow the files; only `index.md`, the home page, becomes `/<language>/`.
- The home pages `/<language>/` use `templates/home.html`: the `title` and `description` of `index.md` become the heading and the slogan in their header.
- Posts in `_content/<language>/posts/` are published at `/<language>/posts/<slug>/`.
- Docs in `_content/<language>/book/` are published below `/<language>/book/` (see [Documentation](#documentation)).
- `slug` defaults to the file name. Give each language its own slug for localized URLs.
- Translations are associated by giving them the same `translationKey`. Blyss links them in the language switcher and with `hreflang` alternate links.
- A page containing `{{recentPosts}}` lists the three newest posts of its language, ordered by `datePublished`.
- A paragraph that consists of the name of a component in double curly braces alone, such as `{{componentSlider}}`, shows that [component](#components) in a page, post or doc. A fenced code block with that placeholder as its language, a [block](#blocks), shows it with a text and settings of its own.
- Posts can have `tags`. Blyss generates the archive `/<language>/posts/`, the tag index `/<language>/tags/` and one page per tag, such as `/en/tags/markdown/`. Do not create content at these URLs.
- The archive and tag pages show `pagination.pageSize` posts (10 by default, set in `blyss.config.js`). Older posts continue on `/<language>/posts/page/2/`, `/<language>/tags/<tag>/page/2/` and so on, linked by “Newer posts” and “Older posts”.
- Markdown files directly in `_content/<language>/`, such as `heroTexts.md`, are fragments: Blyss publishes no page for them, but `templates/document.html` can show them on every page of their language as `{{<name>Title}}`, the `title` of their front matter, and `{{<name>Content}}`, their text, such as `{{heroTextsTitle}}` and `{{heroTextsContent}}`. Their file names must start with a Latin letter and contain only Latin letters and digits. `heroTexts.md` and `overlayTexts.md` also hold the texts of the [hero](#hero) and of the [overlay](#overlay).
- `pages/404.md` is the “not found” page. It is published at `/<language>/404.html`; the [default language](#languages)'s page, English, is also published as `/404.html`, which `npm start` and most static hosts show for every missing URL. Because it appears at any URL, link from it with absolute paths such as `/en/`.
- Keep `index.md` and `about.md` in every language without a different slug, and `book/index.md`: the navigation in `templates/document.html` links to `/<language>/`, `/<language>/pages/about/` and `/<language>/book/`.

## Documentation

`_content/<language>/book/` holds a book, here the technical documentation, which the navigation's link “Documentation” opens. The starter's docs explain how it works, in English and in German; replace them with your own.

- Each Markdown file is a doc, such as `_content/en/book/getting-started.md` at `/en/book/getting-started/`. Docs have the front matter of pages, and `order`.
- Each directory is a section, such as `_content/en/book/writing/` at `/en/book/writing/`. Its `index.md` is the start page of the section, and its `title` names the section in the navigation. `_content/<language>/book/index.md` is the start page of the whole documentation. The build stops if a directory with docs lacks its `index.md`.
- `order` places a doc or a section among those beside it: lower numbers first, such as `1`, `2` or `2.5`, those without an order last, and those with the same order by title.
- `templates/book.html` shows the navigation of all docs, the doc's title, a table of contents of its second- and third-level headings, its text, and links to the previous and the next doc in the navigation. The navigation stands beside the doc on wide screens and above it otherwise; `static/assets/css/main.css` styles all of this in its block for docs. Without `templates/book.html`, docs use `templates/page.html`, without navigation, table of contents and links.
- Each heading of a doc gets an id from its text, as on GitHub, so that a link to `#front-matter` leads to the heading “Front matter”.
- The labels `book`, `onThisPage`, `previous` and `next` in `blyss.config.js` name the navigation, the table of contents and the links to the previous and the next doc.
- Docs are described as `TechArticle` in their JSON-LD and listed in `sitemap.xml`, but neither in the archive nor on the tag pages.

## Languages

`site` in `blyss.config.js` configures the languages, English and German in the starter:

- `languages` lists them in the order of the language switcher and of the `hreflang` alternates. The key of a language, such as `en`, names its directory in `_content/` and starts its URLs; it may contain only lower-case Latin letters, digits and hyphens. Each language has a `label`, its name in the language switcher, a `locale`, a language tag such as `"en"` or `"en-GB"`, a `description` for pages without one of their own, and `labels`, the texts of the templates. Every language needs the same labels: the build stops and names any label that a language lacks.
- `defaultLanguage` is the language that `/` redirects to and whose “not found” page is `/404.html`: `"en"`, or the first language if you remove the setting. If you change it, also change the `/en/` redirect in `static/staticwebapp.config.json` and in your deployment workflow (see [Deployment](#deployment)).
- `languageSwitcher: false` hides the language switcher in the top bar. The `hreflang` alternates in each page's head and in `sitemap.xml` remain, so search engines still find the translations.

### Adding a language

To add French, for example:

1. Add `fr` to `site.languages` in `blyss.config.js`: its `label`, `"Français"`, its `locale`, `"fr"`, its `description` and every label of the other languages, translated.
2. Add a French `description` to each step of `components.componentSlider.steps`.
3. Create `_content/fr/` like `_content/en/`: `pages/index.md`, `pages/about.md`, `pages/404.md`, `heroTexts.md`, `overlayTexts.md`, the components' texts in `components/`, `book/index.md` with any docs, and any posts. Give each translation the `translationKey` of its original.
4. Run `npm run build`. The language switcher and the `hreflang` alternates now link the French pages to their translations.

To remove a language, delete its directory in `_content/`, its entry in `site.languages` and its descriptions of the slider's steps; if it was the default language, change `defaultLanguage` too. With a single language left, `languageSwitcher: false` hides the language switcher, which would link only to the current page.

## Layout

`layout` in `blyss.config.js` sets the space around the content and its alignment, separately for the home pages and for all other pages: pages, posts, docs, lists and not-found pages. It does the same for the [hero](#hero) and for the [overlay](#overlay).

- `margin` is the space between the coloured frame and the content on every side: a CSS length in `px`, `rem`, `vw`, `vh`, `vmin` or `vmax`, such as `"2vmin"` (the default) or `"2rem"`. The top bar spans the side margins.
- `alignHome` aligns the title, slogan and text of the home pages and their footer: `"center"` (the default) or `"left"`.
- `alignOther` aligns the content of all other pages and their footer: `"left"` (the default), `"center"`, or `"centerLeft"`, which centers the text column but keeps its text left-aligned; the footer lines up with the column.
- `paddingHero` and `paddingOverlay` are the space above and below the content of the hero and of the opened overlay: CSS lengths like `margin`, `"1rem"` by default.
- `alignHero` and `alignOverlay` align the hero and the overlay: `"centerExtra"` (the default) centers everything but their texts, those of `heroTexts.md` and of `overlayTexts.md`, which stay left-aligned with their headings, `"center"` centers everything and `"left"` nothing, not even the slider.

Centered lists keep their markers next to their items, and code blocks stay left-aligned. `templates/document.html` passes the margin, the paddings and the alignments to `static/assets/css/main.css` through `<body data-align="…" data-align-hero="…" data-align-overlay="…" style="--site-margin: …; --hero-padding: …; --overlay-padding: …">`.

## Top bar

`templates/document.html` starts every page with a bar that stays at the top of the window while the page scrolls. It holds the logo, the navigation, a search field and the language switcher.

- `static/assets/img/logo.svg` is a placeholder logo in the stylesheet's dark blue, `#005180`. Replace it with your own, and adjust the `alt`, `width` and `height` of its `<img>` in `templates/document.html`.
- The search field has no function yet: it belongs to no form, so nothing is sent. The label `search` in `blyss.config.js` holds its text.
- The language switcher links each page to its translations; `site.languageSwitcher: false` hides it (see [Languages](#languages)).
- On narrow screens, the bar wraps into two or three rows.

## Hero

The home pages end with the hero: `{{hero}}` in `templates/document.html` shows `templates/hero.html` below the page, which starts with the site's title and slogan. `hero` in `blyss.config.js` switches each part of the hero on (`true`) or off (`false`):

- `components` lists the [components](#components) of the hero in their order: the slider, the gallery and the flower. Set a component to `false` to drop it, move its line to change the order, or add a component of your own by its name.
- `texts` shows or hides all texts of `_content/<language>/heroTexts.md` at once. The `title` of that file is their heading, and each `###` heading starts a text that runs up to the next one. The hero shows as many texts as the file has, each in full length, side by side in as many columns as fit. Blyss refuses any content before the first `###` heading, except comments. The starter has three texts in each language.
- A hero without a part that is switched on is not shown at all, and neither is a hero whose only part, its texts, has no file in the page's language. Without `templates/hero.html`, the website has no hero.
- On screens of at least 1024×640 pixels, the page stops below the top bar, or once its end is in view if it is taller than the window, while the hero slides up over it and fades it out. A hero that is shorter than the window then stops below the top bar, and the footer follows it into the window. Keyboard focus in the page turns this effect off, so that the hero never covers the focused element. With reduced motion, on smaller screens and in browsers without scroll-driven animations, the hero is a static block below the page.
- The hero is as tall as its content. `layout.paddingHero` sets the space above and below that content and `layout.alignHero` its alignment (see [Layout](#layout)).
- The label `hero` in `blyss.config.js` names the hero for screen readers.

## Overlay

The overlay is a bar at the bottom of the window: `{{overlay}}` in `templates/document.html` shows `templates/overlay.html`. Its button opens the overlay as a panel; the Close button, the Escape key or a click outside closes it again. The browser's [Popover API](https://developer.mozilla.org/docs/Web/API/Popover_API) does this without JavaScript. `overlay` in `blyss.config.js` configures it, independently of the hero:

- `showOn` switches the overlay on or off for each kind of page, but not for a single page or post. The kinds are the three content types, `page` for the pages in `_content/<language>/pages/`, `post` for the posts and `book` for the docs, and `home` for the home pages, `list` for the archive and the tag pages and `"not-found"` for the “not found” pages. A kind that `showOn` does not name has the overlay. The starter switches it off on the home pages, which have the hero.
- `components` and `texts` work like those of the hero: `components` lists the overlay's own components in their order, and `texts` shows or hides all texts of `_content/<language>/overlayTexts.md`, a file like `heroTexts.md`. In the starter, the overlay shows the slider and the gallery, but not the flower.
- An overlay without a part that is switched on is not shown, and neither is its bar. Without `templates/overlay.html`, the website has no overlay.
- `layout.paddingOverlay` sets the space above and below the content of the opened overlay and `layout.alignOverlay` its alignment (see [Layout](#layout)).
- The labels `overlay` and `close` in `blyss.config.js` hold the texts of the overlay's buttons. Templates can use every label as `{{<key>Label}}`, such as `{{overlayLabel}}`.
- All headings in the hero and in the overlay are `<h3>`: the title of their texts, the headings of their components and the headings of the texts. As they accompany the pages, their headings rank below each page's own `<h1>` and `<h2>`.
- `templates/document.html` sets `<body data-kind="…">` to `home`, `page`, `post`, `book`, `list` or `not-found`, the kinds of pages that `showOn` names; `static/assets/css/main.css` can style each kind with it.

### Synchronising the hero and the overlay

`synchroniseHeroOverlay: true` in `blyss.config.js` makes the overlay a copy of the hero, which is the origin: the overlay then shows the components of `hero.components` and, if `hero.texts` is `true`, the texts of `heroTexts.md`. This overrides `overlay.components` and `overlay.texts`, whatever they say, and `overlayTexts.md` is not used. `overlay.showOn` still decides which kinds of pages have the overlay, and `layout.paddingOverlay` and `layout.alignOverlay` how it looks. The setting is `false` in the starter and by default.

## Components

A component is a part of a page that brings what it needs. Each has a directory of its own in `components/`:

| File or setting | Purpose |
| --- | --- |
| `components/<name>/<name>.html` | Its template, which links to its stylesheet and its script |
| `components/<name>/<name>.css` and `<name>.js` | Its stylesheet and its script for the browser, published at `/components/<name>/` |
| `components/<name>/<name>.data.js` | Checks its settings during the build and prepares values for its template |
| `_content/<language>/components/<name>.md` | Its texts in each language |
| `components.<name>` in `blyss.config.js` | Its settings |

- `hero.components` and `overlay.components` in `blyss.config.js` show a component in the [hero](#hero) and in the [overlay](#overlay); `{{components}}` in `templates/hero.html` and `templates/overlay.html` stands for those that are switched on.
- `{{<name>}}` shows a component in any template.
- A paragraph that consists of `{{<name>}}` alone shows it in a page or post. The post “Templates and styles” shows the slider this way.
- A [block](#blocks) shows it in a page or post with a text and settings of its own, as that post shows a second slider.
- A component can appear several times on a page. Each is a custom element, `<component-slider>`, `<component-gallery>` or `<component-flower>`, which its script sets up wherever it appears, so that every slider, every gallery and every flower works on its own.
- Their class `component` lets `static/assets/css/main.css` place them: centered where the text around them is centered.
- For a component of your own, create `components/<name>/<name>.html`; every other file is optional. The [Blyss usage guide](https://github.com/Blooniverse/Blyss/blob/main/USAGE.md#components) lists the placeholders of a component's template.

### Blocks

A fenced code block whose language is the name of a component in double curly braces is a block: it shows that component with a text and settings of its own, in this one place of a page, post or doc.

````markdown
```{{componentGallery}}
---
title: Our trip
heightOverall: 12rem
---

- ![The harbour at dawn](/assets/img/trip/harbour.jpg)
- ![The lighthouse at dusk](/assets/img/trip/lighthouse.jpg)
```
````

- A block holds what `_content/<language>/components/<name>.md` holds: front matter and Markdown, both optional.
- Its front matter adds to the front matter of that file and replaces the fields of the same name: this gallery has a `title` of its own and keeps the names of its arrows, `previous` and `next`.
- A field with the name of a setting sets that setting, in place of `components.<name>` in `blyss.config.js`, as `heightOverall` does here. A value that is JSON, such as `5`, `true` or `[1, 2]`, is taken as such, and any other value as a text. The steps of a slider are such a list: `steps: [{"value": 0, "description": {"en": "Calm"}}]`, or `steps: []` for none.
- Its Markdown replaces the Markdown of that file, here the list of the images. A block without Markdown keeps it, so that a block of front matter alone changes fields and settings only.
- The build stops and names the page if a setting of a block is not what its component needs, as it does for the settings of `blyss.config.js`.
- A block stands on its own, like the paragraph of a component: within a list or a quotation, it stays a code block. A block whose text contains a fenced code block needs a longer fence around it, such as four backticks.

### Slider

The slider follows its heading, with its value above it and its steps and its text below it.

- The `title` and the text of `_content/<language>/components/componentSlider.md` are its heading and its text.
- `components.componentSlider` in `blyss.config.js` sets its whole-number `start` and `end`, 0 and 100 without them, and its `steps`: each step has a `value` from `start` to `end` and a `description` in every language, and both appear below the slider at that value. The starter defines four steps; change, add or remove them as you like. The slider starts halfway between `start` and `end`.
- Its script shows the slider's value above it and highlights the last step it has reached. Without JavaScript, the slider moves all the same.

### Gallery

The gallery shows any number of images side by side in a strip that visitors move sideways. The strip stops with an image in its centre, which grows without a frame.

- `_content/<language>/components/componentGallery.md` lists the images: each item of its Markdown list is an image with its description in that language, such as `- ![A sun rising over blue hills](/assets/img/gallery/sunrise.svg)`. Its `title` is the gallery's heading, and `previous` and `next` name the two arrows for screen readers.
- The images live in `static/assets/img/gallery/`, in any format that browsers show, such as SVG, PNG, JPEG, WebP, AVIF or GIF, and in any proportions. Blyss copies them unchanged. The starter's seven images are placeholders.
- The gallery starts with its middle image in the centre, so that the images before and after it fill the strip.
- Visitors move through the images with the arrows at both ends of the strip, with the arrow keys once the gallery has the focus, and by swiping or scrolling sideways. The first and the last image reach the centre too.
- A click or a touch on the image in the centre, or the Enter or the space key, expands that image above the page: to 70% of the height of the screen, or less on a screen that is too narrow for an image of that height, so that it never outgrows the screen. Another click, touch or key, or the Escape key, shrinks it again.
- `components.componentGallery` in `blyss.config.js` sets:
  - `heightOverall`: the height of the images, a CSS length in `px`, `rem`, `vw`, `vh`, `vmin` or `vmax`, `"8rem"` by default. Each image is as wide as its proportions make it.
  - `heightCenter`: the height of the image in the centre, a percentage of `heightOverall` from `100%` up; the default `"130%"` enlarges it by 30%.
  - `heightExpanded`: the height of the image in the centre after a click or a touch, a percentage of the height of the screen up to `100%`, `"70%"` by default.
  - `animationSpeedScrolling`: the time an arrow or an arrow key takes to bring the next image to the centre, in `ms` or `s`, `"400ms"` by default.
  - `animationSpeedImgEnlargement`: the time the image in the centre takes to grow, to expand and to shrink, in `ms` or `s`, `"300ms"` by default.
- The gaps between the images keep an enlarged image of up to three by two clear of its neighbours; a wider one covers part of them.
- The browser loads an image only when the gallery is shown and the image comes near, so many images do not slow a page down. With reduced motion, the images change without animation. Without JavaScript, the gallery is a strip with a scrollbar, without arrows, without the enlarged image and without its expansion.

### Flower

The flower stands on a short stem above the ground, the bottom of the component. A click or a touch plucks a petal, as do the Enter and the space key: the petal twirls around its own axis, a little askew, and falls to the ground. There it fades, but never completely, while its text comes down like a falling leaf.

- `_content/<language>/components/componentFlower.md` holds the texts of the petals. As in `heroTexts.md`, each `###` heading starts a text that runs up to the next one. The first text belongs to the first petal, the one at the top, the second text to the second petal, the next one clockwise, and so on. A petal without a text falls all the same, and texts beyond the last petal are not shown. The `title` of the file is the flower's heading, and `petal` names the petals for screen readers, as in “Petal 3”; without it, they are called “Petal”.
- `components.componentFlower` in `blyss.config.js` sets:
  - `petals`: the number of petals, a whole number from `3` to `24`, `8` by default.
  - `colourBaseHue`: the hue of the petals, an angle on the HSL colour wheel from `0` to `360`; the default `202` is the blue of `static/assets/css/main.css`.
  - `colourSystem`: how the other colours follow from that hue. `"triadic"` (the default) gives the centre and the stem the hues a third and two thirds of the wheel further on, pink and green for 202; `"complementary"` gives the centre the opposite hue, orange for 202, and the stem a dark shade of the petals' hue.
  - `animationSpeedFalling`: the time a petal takes from the click or the touch to the ground, twirl included, in `ms` or `s`, `"3s"` by default.
  - `animationSpeedText`: the time the text of a fallen petal takes to appear, `"3s"` by default.
  - `animationSpeedFading`: the time a fallen petal takes to fade, `"4s"` by default.
  - `opacityFallen`: what remains visible of a fallen petal, a percentage from `1%` to `100%`, `"30%"` by default.
  - `fontSizeText`: the size of the texts of the petals, a percentage of the default text size, `"60%"` by default.
- The flower has no background, so it takes that of its surroundings. `--size` in `components/componentFlower/componentFlower.css` sets the diameter of the bloom, and the texts take the room they need below the flower from the start, so that nothing moves when a text appears.
- With reduced motion, a plucked petal lies on the ground and its text appears at once. Without JavaScript, the flower shows all its texts, and its petals cannot be plucked.

## Fonts

`templates/document.html` loads the font Titillium Web from Google Fonts. Each visit then sends the visitor's IP address to Google, which a German court held to violate the GDPR without consent (Landgericht München I, 3 O 17493/20, 20 January 2022). To host the font yourself, download it from [Google Fonts](https://fonts.google.com/specimen/Titillium+Web), put the `.woff2` files into `static/assets/fonts/`, declare them with `@font-face` in `static/assets/css/main.css` and remove the three Google Fonts `<link>` elements.

## Generated output

`npm run build` deletes and recreates `public/`, including `public/sitemap.xml` and `public/404.html`. Never edit files in `public/` manually; change `_content/`, `components/`, `templates/`, `static/` or `blyss.config.js` and rebuild instead. `public/` is excluded from Git by `.gitignore`. Blyss refuses to build into the website's root or into a directory that contains or lies inside `components/`, `_content/`, `static/` or `templates/`.

## Before production

Replace the values marked `CHANGE BEFORE PRODUCTION` in `blyss.config.js`:

- `site.name`
- `site.baseUrl` — the public URL used for canonical, `hreflang` and JSON-LD links
- `site.publisher` — `type`, `name` and `url`
- `site.languages.en.description` and `site.languages.de.description`

Also replace the `Sitemap:` URL in `static/robots.txt`, which is marked the same way, the placeholder logo `static/assets/img/logo.svg` (see [Top bar](#top-bar)) and the gallery's placeholder images in `static/assets/img/gallery/` with their descriptions in `_content/<language>/components/componentGallery.md` (see [Gallery](#gallery)).

If you change `site.defaultLanguage`, also change the `/en/` redirect in `static/staticwebapp.config.json` and in your deployment workflow.

## Deployment

Blyss does not generate `public/index.html`. When deploying `public/` to a static host, redirect `/` to the default language, `/en/`, and show `404.html` for missing URLs, as `npm start` does. The components' files are published below `/components/`; GitHub Pages omits paths that start with an underscore unless `public/` contains a `.nojekyll` file.

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

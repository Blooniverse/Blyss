---
title: Templates and the lean theme
description: Customize templates, layout, regions and fonts.
order: 3
translationKey: book-templates
---

## Templates

Blyss has no built-in templates: it renders the content of a page with a content template from `templates/`, and the result inside `document.html`. The starter supplies:

- `document.html`: the document around every page.
- `home.html`: the content template of the home pages.
- `page.html`: that of the pages, and of every other kind of page without a template of its own.
- `post.html`: that of the posts.
- `book.html`: that of the docs.
- `hero.html` and `overlay.html`: the templates of the two regions.

Without `home.html` or `book.html`, Blyss uses `page.html`; without a region template, that region is absent.

Content templates can use these placeholders:

- `{{title}}` and `{{description}}`: the title and the description of the page.
- `{{dateBlock}}`: its `datePublished`, if it has one.
- `{{tags}}`: the tags of a post.
- `{{content}}`: its text.
- `{{basePath}}`: the path of a website [below a path](/en/book/deployment/#below-a-path), and empty otherwise.
- The placeholders of the [components](/en/book/components/).
- In `book.html` also `{{bookNavigation}}`, `{{bookToc}}` and `{{bookPager}}`: the navigation of the book, the table of contents of the doc, and the links to the previous and the next doc. They are empty outside docs. See [Navigation](/en/book/writing/book/navigation/).
- `{{bookMarkdownBase64}}`: the authored body of a doc encoded as UTF-8 Base64, without front matter; empty outside docs. The starter uses it for the Copy Markdown button, whose labels are available in `book.html` as `{{copyMarkdownLabel}}`, `{{markdownCopiedLabel}}`, `{{markdownCopyFailedLabel}}` and `{{markdownCopyUnavailableLabel}}`.

`document.html` can use these placeholders:

- `{{content}}`: the content template with its placeholders filled.
- `{{hero}}` and `{{overlay}}`: the two regions.
- `{{pageTitle}}` and `{{description}}`: the title of the page, followed by the name of the website, and its description.
- `{{robots}}`: asks search engines not to index a not-found page, and is empty on every other page.
- `{{locale}}` and `{{languageKey}}`: the locale and the key of the page's language.
- `{{canonicalUrl}}`, `{{alternateLinks}}` and `{{jsonLd}}`: the canonical URL of the page, the links to its translations and its JSON-LD.
- `{{languageSwitcher}}`: the language switcher, unless `site.languageSwitcher` hides it.
- `{{kind}}`: `home`, `page`, `post`, `book`, `list` or `not-found`.
- `{{basePath}}`: as in the content templates.
- The layout placeholders below.
- The labels of the page's language as `{{<key>Label}}`, fragments as `{{<name>Title}}` and `{{<name>Content}}`, and the placeholders of the components.

Template placeholders take precedence over components and fragments of the same name.

The layout placeholders hold the `layout` settings of `blyss.config.js`, whose comments name the allowed values:

- `{{layoutMargin}}`, `{{layoutPaddingHero}}` and `{{layoutPaddingOverlay}}`: `margin`, `paddingHero` and `paddingOverlay`.
- `{{layoutAlign}}`: `alignHome` on the home pages and `alignOther` on all other pages.
- `{{layoutAlignHero}}` and `{{layoutAlignOverlay}}`: `alignHero` and `alignOverlay`.

The starter passes them, like `{{kind}}`, through body attributes and CSS variables to `static/assets/css/main.css`.

A placeholder that its template cannot fill, such as a misspelt one, stops the build with a message that names the template. A fragment that only some languages have is empty in the others.

## Top bar and fonts

The sticky top bar in `document.html` holds:

- A placeholder logo. Replace `static/assets/img/logo.svg` and adjust its image's alt text and dimensions in the template.
- The navigation.
- A search field, which is not functional and sends nothing.
- The language switcher.

The bar wraps on narrow screens.

The template loads Titillium Web from Google Fonts, exposing visitors' IP addresses to Google. For privacy, host the font yourself:

1. Download the font from [Google Fonts](https://fonts.google.com/specimen/Titillium+Web).
2. Place the `.woff2` files in `static/assets/fonts/`.
3. Declare them with `@font-face` in `static/assets/css/main.css`.
4. Remove the three Google Fonts links from `document.html`.

Formulas use the local Temml stylesheet and font in `static/assets/temml/`, without a remote request:

- The stylesheet uses a system math font when available; Temml's [installation guide](https://temml.org/docs/en/administration.html) describes alternatives.
- The stylesheet and `Temml.woff2` must match Blyss's Temml version; replace them from `node_modules/temml/dist/` when the changelog calls for it.

## Hero and overlay

`{{hero}}` and `{{overlay}}` insert the templates of the two regions in `document.html`:

- The hero follows home-page content.
- The overlay is a bottom bar whose button opens a panel. Close it with its button, Escape or an outside click; the browser's Popover API does this without JavaScript.

The `hero`, `overlay` and `synchroniseHeroOverlay` comments in `blyss.config.js` explain the switches, ordering, page kinds and synchronization. Beyond them:

- A region without enabled content is omitted.
- `overlay.showOn` applies to page kinds, not individual pages; an unnamed kind is enabled.
- Layout settings still apply separately when the regions are synchronized.

Region templates can use these placeholders:

- `{{components}}`: the components of the region that are switched on.
- `{{textsTitle}}` and `{{texts}}`: the heading and the texts of the region.
- The document placeholders other than the two region placeholders.

The texts of the regions are `_content/<language>/heroTexts.md` and `overlayTexts.md`:

- The file's title is the texts' heading.
- Each `###` heading starts a text ending at the next heading.
- Only whitespace and comments may precede the first heading.

On screens at least 1024 by 640 pixels, the hero can slide over and fade the page as it scrolls. It is static:

- while keyboard focus is in the page;
- on smaller screens;
- with reduced motion;
- without scroll-driven animation support.

Region headings are H3s beneath the page's own headings.

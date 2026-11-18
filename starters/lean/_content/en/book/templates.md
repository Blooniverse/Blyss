---
title: Templates and the lean theme
description: Customize templates, layout, regions and fonts.
order: 5
translationKey: book-templates
---

## Templates

Blyss renders a content template inside `templates/document.html`. The starter supplies `home.html`, `page.html`, `post.html`, `book.html`, `hero.html` and `overlay.html`. Without `home.html` or `book.html`, Blyss uses `page.html`; without a region template, that region is absent.

Content templates can use `{{title}}`, `{{description}}`, `{{dateBlock}}`, `{{tags}}`, `{{content}}` and component placeholders. `book.html` also has `{{bookNavigation}}`, `{{bookToc}}` and `{{bookPager}}`; they are empty outside docs. See [Navigation and headings](/en/book/writing/navigation/).

`document.html` has `{{content}}`, `{{hero}}`, `{{overlay}}`, `{{pageTitle}}`, `{{description}}`, `{{locale}}`, `{{languageKey}}`, `{{canonicalUrl}}`, `{{alternateLinks}}`, `{{jsonLd}}`, `{{languageSwitcher}}`, `{{kind}}`, layout placeholders, labels as `{{<key>Label}}`, fragments as `{{<name>Title}}` and `{{<name>Content}}`, and component placeholders. `{{kind}}` is `home`, `page`, `post`, `book`, `list` or `not-found`. Template placeholders take precedence over components and fragments of the same name.

Layout placeholders are `{{layoutMargin}}`, `{{layoutPaddingHero}}`, `{{layoutPaddingOverlay}}`, `{{layoutAlign}}`, `{{layoutAlignHero}}` and `{{layoutAlignOverlay}}`. The starter passes them through body attributes and CSS variables to `static/assets/css/main.css`. See the comments on `layout` in `blyss.config.js` for allowed values.

## Top bar and fonts

The sticky top bar in `document.html` holds a placeholder logo, navigation, a search field and the language switcher. Replace `static/assets/img/logo.svg` and adjust its image's alt text and dimensions in the template. The search field is not functional and sends nothing. The bar wraps on narrow screens.

The template loads Titillium Web from Google Fonts, exposing visitors' IP addresses to Google. For privacy, download the font from [Google Fonts](https://fonts.google.com/specimen/Titillium+Web), place the `.woff2` files in `static/assets/fonts/`, declare them with `@font-face` in `static/assets/css/main.css` and remove the three Google Fonts links.

Formulas use the local Temml stylesheet and font in `static/assets/temml/`, without a remote request. The stylesheet uses a system math font when available; Temml's [installation guide](https://temml.org/docs/en/administration.html) describes alternatives. The stylesheet and `Temml.woff2` must match Blyss's Temml version; replace them from `node_modules/temml/dist/` when the changelog calls for it.

## Hero and overlay

The hero follows home-page content; the overlay is a bottom bar whose button opens a panel. Close it with its button, Escape or an outside click; the browser's Popover API does this without JavaScript. Their templates are inserted by `{{hero}}` and `{{overlay}}` in `document.html`.

The `hero`, `overlay` and `synchroniseHeroOverlay` comments in `blyss.config.js` explain the switches, ordering, page kinds and synchronization. A region without enabled content is omitted. `overlay.showOn` applies to page kinds, not individual pages; an unnamed kind is enabled. Layout settings still apply separately when the regions are synchronized.

Region templates have `{{components}}`, `{{textsTitle}}` and `{{texts}}`, plus the document placeholders other than the two region placeholders. Their texts are `_content/<language>/heroTexts.md` and `overlayTexts.md`: each `###` heading starts a text ending at the next heading. Only whitespace and comments may precede the first heading. The file's title is the texts' heading.

On screens at least 1024 by 640 pixels, the hero can slide over and fade the page as it scrolls; keyboard focus in the page disables the effect. It is static on smaller screens, with reduced motion or without scroll-driven animation support. Region headings are H3s beneath the page's own headings.

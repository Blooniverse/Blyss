---
title: Configuration and languages
description: Configure the website and add languages.
order: 3
translationKey: book-configuration
---

## Configuration

The comments in `blyss.config.js` describe the starter's site, pagination, books, main navigation, layout, hero, overlay, components, directories and server settings, including their values and defaults. Beyond them:

- Paths in `directories` are relative to the website root.
- `pagination.pageSize` must be a positive whole number.
- `books` names the [books](/en/book/authoring/book/#several-books) of the website, `["book"]` by default.
- `mainNavigation` lists the links of the top bar; see [Main navigation](#main-navigation).
- Invalid configuration stops the build before the previous output is deleted.

The starter's placeholder name, public URL, publisher and language descriptions are marked `CHANGE BEFORE PRODUCTION`. `site.baseUrl` is used for canonical, alternate and JSON-LD URLs; with a path, as in `https://example.com/docs`, it places the website [below that path](/en/book/deployment/#below-a-path). See [Deployment](/en/book/deployment/) before publishing.

## Main navigation

`mainNavigation` lists the links of the top bar in their order, and `templates/document.html` shows them with the placeholder `{{mainNavigation}}`. Each link has either a `translationKey` or an `href`:

```js
mainNavigation: [
  { translationKey: "home", label: "home" },
  { translationKey: "blyss:posts", label: "posts" },
  { translationKey: "book", label: "book" },
  { translationKey: "about" },
  { href: "https://github.com/Blooniverse/Blyss", label: "github" }
],
```

- A `translationKey` links the page, post or doc with that [translationKey](/en/book/authoring/translations/) in the language of each page; `blyss:posts` and `blyss:tags` link the archive and the tags, and `blyss:tags/` followed by the slug of a tag, such as `blyss:tags/markdown`, the page of that tag. A language without such a page, or with a draft only, lacks the link.
- An `href` links another website.
- `label` names a label of `site.languages`, such as `home`, which is the text of the link in each language; a label of your own, such as `github`, needs a text in each language. Without a label, a link to a page shows the title of that page; a link to another website needs one.
- The link to the current page has `aria-current="page"`, and a link to a page that holds it, such as the start page of its book or the archive of the posts, has `aria-current="true"`. The home page holds every page, but is marked on itself only.
- A `translationKey` that no page has, such as a misspelt one, stops the build. Without links, the placeholder is empty.

## Languages

`site.languages` defines any number of languages in the order of the language switcher and `hreflang` alternates. Each language needs:

- A key, such as `en` or `pt-br`, which names its directory in `_content/` and begins its URLs; use only lower-case Latin letters, digits and hyphens.
- A `label`.
- A locale, such as `en` or `en-GB`.
- A fallback description.
- The same template labels as the others. Generated labels have English defaults, among them the titles of the [callouts](/en/book/authoring/markdown-spice/#callouts), such as `note` and `warning`; missing required labels stop the build.

Two further settings concern the languages:

- `site.defaultLanguage` selects the `/` redirect and `/404.html`; if omitted it is the first configured language. If you change the default, update the redirect in `static/staticwebapp.config.json` and your deployment workflow too.
- `site.languageSwitcher: false` hides the switcher but keeps `hreflang` alternates.

### Add or remove a language

For example, to add French:

1. Add `fr` to `site.languages`, with its label, locale, description and translated labels.
2. Add French descriptions to the steps of `components.componentSlider`.
3. Create `_content/fr/` like `_content/en/`, including `pages/index.md`, `pages/about.md`, `pages/404.md`, the `index.md` of each book, such as `book/index.md`, the region files `hero.md` and `overlay.md`, their cards `heroCards.md` and `overlayCards.md`, the component texts, and any posts and docs. Give [translations](/en/book/authoring/translations/) the same `translationKey`.
4. Build. The language switcher and alternate links connect translations.

To remove a language, remove its content directory, configuration entry and slider-step descriptions; change the default if necessary. With one language, hide the switcher if desired.

---
title: Configuration and languages
description: Configure the website and add languages.
order: 4
translationKey: book-configuration
---

## Configuration

The comments in `blyss.config.js` describe the starter's site, pagination, layout, hero, overlay, components, directories and server settings, including their values and defaults. Paths in `directories` are relative to the website root. `pagination.pageSize` must be a positive whole number. Invalid configuration stops the build before the previous output is deleted.

The starter's placeholder name, public URL, publisher and language descriptions are marked `CHANGE BEFORE PRODUCTION`. `site.baseUrl` is used for canonical, alternate and JSON-LD URLs. See [Deployment](/en/book/deployment/) before publishing.

## Languages

`site.languages` defines any number of languages in the order of the language switcher and `hreflang` alternates. A language key, such as `en` or `pt-br`, names its directory in `_content/` and begins its URLs; use only lower-case Latin letters, digits and hyphens. Each language needs a `label`, a locale such as `en` or `en-GB`, a fallback description and the same template labels as the others. Generated labels have English defaults; missing required labels stop the build.

`site.defaultLanguage` selects the `/` redirect and `/404.html`; if omitted it is the first configured language. `site.languageSwitcher: false` hides the switcher but keeps `hreflang` alternates. If you change the default, update the redirect in `static/staticwebapp.config.json` and your deployment workflow too.

### Add or remove a language

For example, to add French:

1. Add `fr` to `site.languages`, with its label, locale, description and translated labels.
2. Add French descriptions to the steps of `components.componentSliderHero` and `components.componentSliderOverlay`.
3. Create `_content/fr/` like `_content/en/`, including `pages/index.md`, `pages/about.md`, `pages/404.md`, `book/index.md`, region and component texts, and any posts and docs. Give translations the same `translationKey`.
4. Build. The language switcher and alternate links connect translations.

To remove a language, remove its content directory, configuration entry and slider-step descriptions; change the default if necessary. With one language, hide the switcher if desired.

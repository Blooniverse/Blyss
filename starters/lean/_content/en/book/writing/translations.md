---
title: Translations
description: How Blyss links the versions of a page in several languages.
order: 3
translationKey: book-translations
---

## Linking translations

Each language has its own content in `_content/<language>/`. A page, a post or a doc shares its `translationKey` with its translations in the other languages:

```markdown
---
title: Hello World
translationKey: hello-world
---
```

Blyss links such pages in the language switcher and declares them to search engines as `hreflang` alternates, in the head of each page and in `sitemap.xml`. The translation in the default language is the `x-default` alternate as well, for the visitors of any other language.

The names of the files and of their directories may differ from language to language, and with them the URLs: `/en/posts/hello-world/` is `/de/posts/hallo-welt/` in German.

Within a language, each page has a key of its own: two pages of one language with the same key stop the build. A page without a translation shows only its own language in the language switcher.

## What every language needs

Every language needs its own:

- `pages/index.md`, `pages/about.md` and `book/index.md`, without a different slug: the starter's navigation links to the home page, to the about page and to the start page of the documentation.
- Not-found page, `pages/404.md`.
- Texts of the [hero and the overlay](/en/book/templates/#hero-and-overlay) and of the [components](/en/book/components/).
- Labels in `blyss.config.js`.

## Generated pages

Blyss generates the archive of the posts, the tag index and the tag pages for each language and links them across the languages by itself; the pages of a tag where their URLs end alike, as `/en/tags/blyss/` and `/de/tags/blyss/` do.

## Further languages

[Configuration and languages](/en/book/configuration/#languages) describes `site.languages`, the default language and how to add or remove a language.

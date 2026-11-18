---
title: Pages, posts and translations
description: Write and organize content in the starter.
order: 0
translationKey: book-content
---

## Front matter and URLs

Pages, posts and docs start with front matter. The title is rendered as the page's heading, so begin the body below an H1.

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

Pages in `_content/<language>/pages/` are published at `/<language>/pages/<slug>/`, posts at `/<language>/posts/<slug>/`, and [book docs](/en/book/getting-started/) below `/<language>/book/`. `slug` defaults to the file name; use localized slugs where appropriate. `pages/index.md` is the home page at `/<language>/`, and its title and description are the heading and slogan.

Give translations the same `translationKey` to connect them in the language switcher and `hreflang` links. Keep `pages/index.md`, `pages/about.md` and `book/index.md` in every language without a different slug: the starter's navigation links to them.

`pages/404.md` is published at `/<language>/404.html`; the default language's page is also `/404.html`. Link from it with absolute paths such as `/en/`, since a host can show it at any missing URL. It is not in the sitemap.

## Posts and lists

Posts may have tags as `tags: [Blyss, Markdown]`, a comma-separated value or a YAML block list. Blyss generates `/<language>/posts/`, `/<language>/tags/` and `/<language>/tags/<tag>/`; do not create content at those URLs. Tag URLs use ASCII slugs, and matching slugs link across languages. The newest post determines a tag's displayed spelling.

Archives and tag pages are ordered newest first and paginated by `pagination.pageSize`, with later pages at `page/2/` and so on. A page containing `{{recentPosts}}` lists its three newest posts by `datePublished`. URL collisions stop the build.

## Fragments and components

Markdown directly in `_content/<language>/`, such as `heroTexts.md`, is a fragment, not a page. `templates/document.html` can display its front-matter title and body as `{{<name>Title}}` and `{{<name>Content}}`. Fragment names start with a Latin letter and contain only Latin letters and digits.

A paragraph consisting only of `{{<name>}}` displays a component or variant. A fenced [component block](/en/book/components/#blocks) gives one occurrence its own text and settings. See [Formulas, footnotes, code and diagrams](/en/book/writing/formulas-and-diagrams/) for Markdown extensions.

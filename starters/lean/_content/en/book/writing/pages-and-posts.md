---
title: Pages and posts
description: Write pages and posts, with their front matter, their URLs, their tags and their lists.
order: 2
translationKey: book-pages-and-posts
---

## Front matter and URLs

Pages, posts and docs start with front matter. The title is rendered as the page's heading, so begin the body with text or a second-level heading, not with another H1.

```markdown
---
title: Hello World
description: The first post of this website.
datePublished: 2026-11-10
translationKey: 261110-init-hello-world
tags: [Blyss, Markdown]
---
```

The front matter follows these rules:

- Each field stands on a line of its own as `key: value`, and its value on that line: a text of several lines, which YAML starts with `>` or `|`, stops the build.
- A field without a value holds what the lines below it hold: a list, whose items start with `- `, or a group of fields, indented deeper than the field. The [settings of a component](/en/book/components/#blocks) use this, and `tags` can be such a list.
- A line that is neither a field nor an item of a list stops the build, and so does a field that stands twice; a line that starts with `#` is a comment.
- A value may stand in quotes, as in `title: "Blyss: an introduction"`. In a list, quotes keep a text with a colon from being read as a field: `- "Blyss: an introduction"`.
- `datePublished` and `dateModified` are dates such as `2026-11-10`, or with their time as in `2026-11-10T09:30:00+01:00`; any other value stops the build.
- `translationKey` links a page to its [translations](/en/book/writing/translations/) in the other languages.

Blyss publishes content by its directory in `_content/<language>/`:

- Pages in `pages/` are published at `/<language>/pages/<slug>/`.
- Posts in `posts/` are published at `/<language>/posts/<slug>/`.
- [Docs](/en/book/writing/book/docs/) in `book/` are published below `/<language>/book/`.
- `pages/index.md` is the home page at `/<language>/`, and its title and description are the heading and slogan.

The slug is the name of the file without `.md`: `posts/261110-hello-world.md` is published at `/<language>/posts/261110-hello-world/`, so name the files of each language in that language. The front matter needs a `slug` only for another one, as in `slug: my-first-post`. A slug is one part of a URL, without `/`, `\`, `?` or `#`.

`pages/404.md` is the not-found page of its language:

- It is published at `/<language>/404.html`; the default language's page is also `/404.html`.
- Link from it with absolute paths such as `/en/`, since a host can show it at any missing URL.
- It is not in the sitemap, and the starter's template asks search engines not to index it.

Images and other files of a page lie in `static/`, as in `static/assets/img/`, and a page links to them from the root of the website, as in `![The harbour](/assets/img/harbour.jpg)`; a [figure](/en/book/writing/markdown-spice/#images-and-figures) gives an image a caption, a width and an alignment. Blyss publishes only the Markdown files of `_content/`, not the other files beside them.

## Drafts

`draft: true` in its front matter makes a page, a post or a doc a draft:

```markdown
---
title: Not yet
draft: true
---
```

The build leaves a draft out, as if its file did not exist. A draft:

- has no page of its own;
- appears in no list of posts, on no tag page and in no navigation;
- is not among the translations of another page;
- is not in `sitemap.xml`.

Blyss does not check a draft that it leaves out: an error in its front matter, such as a date that is not one yet, shows only once the draft is built.

`npm run build:drafts` builds the website with its drafts, for a look at them with `npm start`. The build marks each draft that it builds and names each one that it leaves out. Run `npm run build` again before you publish `public/`.

To publish a draft, remove the field or set it to `false`. Any other value stops the build, so that no page is published that its author takes for a draft. Only pages, posts and docs can be drafts, not fragments or the texts of components.

## Posts and lists

Posts may have tags as `tags: [Blyss, Markdown]`, a comma-separated value or a YAML block list. Blyss lists the posts by itself:

- It generates `/<language>/posts/`, `/<language>/tags/` and `/<language>/tags/<tag>/`; do not create content at those URLs.
- Tag URLs use ASCII slugs, and matching slugs link across languages.
- The newest post determines a tag's displayed spelling.
- Archives and tag pages are ordered newest first and paginated by `pagination.pageSize`, with later pages at `page/2/` and so on.
- URL collisions stop the build.

A paragraph that consists of `{{recentPosts}}` alone lists the three newest posts of its language, ordered by `datePublished`. In code and in running text, the placeholder stays as it is written.

## Fragments and components

Markdown directly in `_content/<language>/`, such as `heroCards.md`, is a fragment, not a page:

- `templates/document.html` can display its front-matter title and body as `{{<name>Title}}` and `{{<name>Content}}`.
- In a language that lacks the file, they are empty.
- Fragment names start with a Latin letter and contain only Latin letters and digits.
- The fragments `heroCards.md` and `overlayCards.md` also hold the cards of the [hero and the overlay](/en/book/templates/#hero-and-overlay). `hero.md` and `overlay.md` beside them are no fragments: they show the [components](/en/book/components/#components-of-the-hero-and-the-overlay) of these regions.

A paragraph consisting only of `{{<name>}}` displays a component. A fenced [component block](/en/book/components/#blocks) gives one occurrence its own text and settings. See [Markdown spice](/en/book/writing/markdown-spice/) for formulas, footnotes, highlighted code, task lists, callouts, figures and diagrams.

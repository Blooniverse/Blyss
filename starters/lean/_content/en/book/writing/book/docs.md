---
title: Docs
description: How to add a doc and a section to the documentation.
order: 1
translationKey: book-docs
---

## Adding a doc

Create a Markdown file in `_content/en/book/`, such as `install.md`. Blyss publishes it at `/en/book/install/`, or at the URL of its `slug`, and adds it to the navigation.

### Front matter

Docs have the [front matter of pages](/en/book/writing/pages-and-posts/#front-matter-and-urls), and `order`:

- `title` names the doc in its heading, in the navigation and in the links to the previous and the next doc.
- `order` places it among the docs beside it: lower numbers come first, docs without an order last; docs with the same order are sorted by title.
- `translationKey` links its translations, as on every page.

## Adding a section

A directory, such as `_content/en/book/writing/`, is a section of the documentation. Its `index.md` is the start page of the section, and its title names the section in the navigation; the `order` of this file places the section. A section can hold further sections: this doc lies in `_content/en/book/writing/book/`. Blyss stops with an error if a directory with docs lacks its `index.md`.

## Translating docs

Each language has its own docs in `_content/<language>/book/`. As elsewhere, [translations](/en/book/writing/translations/) share their `translationKey`, while the names of their files and directories may differ: this doc is `/de/book/schreiben/buch/dokumente/` in German.

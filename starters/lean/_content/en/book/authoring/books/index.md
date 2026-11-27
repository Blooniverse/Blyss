---
title: Books
description: The docs of the books of a website and how they are arranged.
order: 2
translationKey: book-authoring-books
---

A book is the documentation of a website, such as this one. Its docs are the Markdown files in `_content/<language>/book/`, published below `/<language>/book/`. Unlike pages and posts, docs are arranged in sections, and Blyss links them: by a navigation, by a table of contents in each doc and by links to the previous and the next doc. A website can have [several books](#several-books).

- [Docs](/en/book/authoring/books/docs/): add a doc or a section and place it among the others.
- [Navigation](/en/book/authoring/books/navigation/): how Blyss links the docs and their headings.

This section is `_content/en/book/authoring/books/`, a section within the section [Authoring](/en/book/authoring/).

## Several books

A website can have more than one book, such as a user guide beside its developer documentation. `books` in `blyss.config.js` names them; without it, the website has the one book `book`:

```js
books: ["book", "guide"],
```

Each name is a directory in `_content/<language>/` and the start of the book's URLs: the docs in `_content/en/guide/` are published below `/en/guide/`. A name consists of lower-case Latin letters, digits and hyphens, and is none of `pages`, `posts`, `tags` and `components`.

Each book needs its own start page, `index.md`, and has its own navigation and its own links to the previous and the next doc, which never lead into another book. In the JSON-LD, its docs are part of its start page, and their breadcrumbs start there. Otherwise all books are alike: their docs use `templates/book.html`, follow `overlay.showOn.book` and are described as TechArticle in the JSON-LD.

To add a book:

1. Add its name to `books`.
2. Create its start page in each language, such as `_content/en/guide/index.md`, with a `translationKey` of its own, such as `guide`.
3. Create its docs, such as with `npx blyss new doc --book guide "A title"`; without `--book`, `blyss new doc` puts a doc into the first book.
4. Add the `translationKey` of its start page to [`mainNavigation`](/en/book/configuration/#main-navigation), as the starter adds `book`. A label of each language in `site.languages`, such as `guide`, can name the link; without one, it shows the title of the start page.

---
title: Navigation
description: How Blyss links the docs and their headings.
order: 2
translationKey: book-navigation
---

## Navigation

The navigation lists the start page of the documentation first, then its docs and sections, each section with its own docs and sections, sorted by `order` and title. It highlights the current doc. The links below each doc lead to the previous and the next doc in the navigation.

## Headings

Each heading of a doc gets an id from its text, as on GitHub: this one is `#headings`. A [label](/en/book/authoring/labels-numbers-references/#labels) above a heading gives it an id of your choice. The table of contents at the top lists the second-level headings, each with its third-level headings.

### Tips

- Start the text below the title with a second-level heading: the title is the doc's first-level heading.
- Keep headings short, since the table of contents lists them.

## Templates

`templates/book.html` arranges the docs: the navigation, the title, the table of contents, the text and the links to the previous and the next doc. Its placeholders are named bookNavigation, bookToc and bookPager, each in double curly braces. Without this template, docs use `templates/page.html`.

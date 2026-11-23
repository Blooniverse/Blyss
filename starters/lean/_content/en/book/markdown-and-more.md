---
title: Markdown and more
description: The core syntax of Markdown, and what Blyss adds to it, and from where.
order: 0
translationKey: book-markdown-and-more
---

Every page, post and doc of a Blyss website is a Markdown file. This doc sums up plain Markdown first, then the superset that Blyss reads on top of it.



## Markdown in brief

Markdown is plain text that reads well as it is and turns into HTML. John Gruber created it in 2004, with help from Aaron Swartz; his website [daringfireball.net](https://daringfireball.net/) has the original description of its syntax. CommonMark, at [commonmark.org](https://commonmark.org/), specifies it unambiguously and offers a short help and a ten-minute tutorial. Blyss follows CommonMark.

| Write | to get |
| --- | --- |
| `*italic*` or `_italic_` | *italic* |
| `**bold**` or `__bold__` | **bold** |
| `` `code` `` | `code` |
| `[a link](https://example.com/)` | [a link](https://example.com/) |
| `![a description](/assets/img/a.svg)` | an image |
| `# Heading 1` to `###### Heading 6` | headings of six levels |
| `> A quotation` | a block quotation |
| `- An item` or `* An item` | a bulleted list |
| `1. An item` or `1) An item` | a numbered list |
| `---` or `***` on a line of its own | a horizontal rule |

A few rules complete the picture:

- **Paragraphs**: an empty line separates two paragraphs. A line break within a paragraph is a space, unless the line ends in a backslash or in two spaces.
- **Code blocks**: a code block stands between two lines of three backticks, or is indented by four spaces. The word after the opening backticks names its language.
- **Nesting**: a list item or a quotation holds further blocks, such as a nested list, when they are indented below it.
- **References**: `[a link][1]`, with `[1]: https://example.com/` on a line of its own anywhere in the file, keeps long URLs out of the text.
- **Escapes**: a backslash before a punctuation character, as in `\*`, shows that character as it is.
- **HTML**: HTML within the Markdown passes through as it is.

Headings in a doc start at the second level: the title in the front matter is the first.



## The superset of Blyss

Blyss reads Markdown with [marked](https://marked.js.org/) and extends it with conventions that have proved themselves elsewhere. It invents little of its own: if another tool already writes something in a certain way, Blyss writes it the same way, so that a text stays portable and readable on GitHub, in an editor and in other tools. Where it reads a convention, it is strict: a mistake stops the build with a message that names the file, rather than showing up on the website.


### Front matter

Every file starts with front matter, as introduced by [Jekyll](https://jekyllrb.com/docs/front-matter/): lines of `key: value` between two lines of `---`, such as the `title`, the `description` and the `translationKey` that links the languages of a text. Blyss reads a simple subset of YAML: each field on a line of its own, with lists and groups of fields indented below a field without a value. See [Pages and posts](/en/book/writing/pages-and-posts/#front-matter-and-urls).


### GitHub Flavored Markdown

[GitHub Flavored Markdown](https://github.github.com/gfm/) is CommonMark with a few additions that most Markdown editors know. Blyss reads them all:

- **Tables** of cells between vertical bars, as above, with a line of hyphens below the header.
- **Strikethrough** between tildes: `~~old~~` gives ~~old~~.
- **Autolinks**: a bare URL such as https://example.com/ becomes a link.
- **Task lists**: a list item that starts with `[ ]` or `[x]` shows a checkbox.
- **Alerts**: a quotation that starts with `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` or `[!CAUTION]` becomes a callout.
- **Heading ids**: each heading of a doc gets an id from its text, as on GitHub, so that links to it look alike on both.

The footnotes of GitHub, a name in square brackets after a caret, go back to [PHP Markdown Extra](https://michelf.ca/projects/php-markdown/extra/) and [Pandoc](https://pandoc.org/MANUAL.html#footnotes). Blyss numbers them in the order of their references and lists them below the text.


### MyST

[MyST](https://mystmd.org/), short for Markedly Structured Text, brings the structure of scientific writing to Markdown. It adopted it from reStructuredText and Sphinx, the tools of the Python documentation. Blyss reads three of its ideas:

- **Directives**: a fenced block that names a directive in single braces, with options below the opening fence. Blyss knows the callouts, such as `{note}` and `{warning}`, as well as `{image}`, `{figure}` and `{math}`. A fence of colons holds a body of Markdown that other tools show as text.
- **Roles**: a word in braces before a code span, such as `{math}`, `{ref}`, `{eq}` and `{numref}`.
- **Labels and references**: a line `(label)=` above a block, or the option `label`, names an element. A link without a text to that label, such as `[](#fig-rings)`, shows its number or its name.

Any other name in braces stays what it is in Markdown, so a MyST text with directives that Blyss does not know still builds.


### Formulae

Mathematics between dollar signs, `$…$` within a text and `$$…$$` on lines of its own, comes from TeX and LaTeX, by way of Pandoc and Jupyter notebooks. [Temml](https://temml.org/) turns each formula into MathML during the build, so that the browser shows it without a script. Blyss's rules for dollar signs keep prices such as $5 and $10 as text.


### Diagrams

As on GitHub, a fenced code block in the language `mermaid` shows a [Mermaid](https://mermaid.js.org/) diagram. Blyss adds `flowchart` for [flowchart.js](https://flowchart.js.org/) and `vega-lite` for [Vega-Lite](https://vega.github.io/vega-lite/) charts. Without JavaScript, and wherever else the text is read, the code of a diagram shows as code.


### Components

The components of a website, such as the slider and the gallery, are what shortcodes are to [Hugo](https://gohugo.io/content-management/shortcodes/): reusable parts that a text places. A component block is a fenced block that names the component in double braces. It can hold front matter of its own, with the settings of that one occurrence, and a body with its text. The double braces set it apart from a directive and match the placeholders of the templates. See [Components](/en/book/components/#blocks).


### Further reading

[Markdown spice](/en/book/writing/markdown-spice/) shows each of these extensions at work, and [Labels, numbers, references](/en/book/writing/labels-numbers-references/) explains the numbering of figures and formulae.

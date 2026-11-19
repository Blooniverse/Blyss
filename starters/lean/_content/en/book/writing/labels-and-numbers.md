---
title: Labels and numbers
description: How to label the elements of a text, and how Blyss numbers its figures, formulae and footnotes.
order: 5
translationKey: book-labels-and-numbers
---

A label names an element of a page, a post or a doc, so that a link leads to it. Blyss numbers the figures and the formulae that have a label, as well as the footnotes: each kind on its own, in the order in which the page shows it, and from 1 on every page.



## Labels

A label becomes the `id` of its element. An element gets its label in one of these ways:

- **Option**: `label`, or `name`, of a callout, an `{image}`, a `{figure}` or a `{math}` [directive](/en/book/writing/markdown-spice/#directives).
- **Line above**: a line `(label)=` above a heading or above any other block, such as a paragraph, a list or a diagram.
- **Formula**: the label in brackets after a formula between `$$`, or `\label{…}` within it.

````markdown
(remark)=
This paragraph has the label `remark`.
````

(remark)=
This paragraph has the label `remark`.

A label follows these rules:

- **Form**: it consists of letters, digits, hyphens, underscores, full stops and colons, and starts with a letter or a digit, as in `fig-rings` or `eq:area`.
- **One element**: it names one element of its page. The build stops at a label that stands twice, and at one that is the `id` of an element of the templates or of a footnote.
- **Headings**: a heading has its label as its `id`, in a doc in place of [the one from its text](/en/book/writing/book/navigation/#headings).



## Figures

A `{figure}` with a label is numbered, and its number starts its caption:

````markdown
```{figure} /assets/img/gallery/rings.svg
:label: fig-rings
:alt: Rings in orange and blue
:width: 30%
:align: center

Rings from the gallery of the starter.
```
````

```{figure} /assets/img/gallery/rings.svg
:label: fig-rings
:alt: Rings in orange and blue
:width: 30%
:align: center

Rings from the gallery of the starter.
```

- **Word**: the label `figure` of the language of the page precedes the number, such as `figure: "Figure"` in `blyss.config.js`.
- **`enumerated`**: this option, or `numbered`, numbers a figure without a label, and `:enumerated: false` leaves one with a label without a number.
- **`{image}`**: an image has no caption and therefore no number, but it can have a label.
- **Style**: the number is a `span` with the class `caption-number`, which the starter's `static/assets/css/main.css` sets in bold.

The images of a [figure without a URL](/en/book/writing/markdown-spice/#images-and-figures) have letters. If the figure has a label, each image has that label and its letter as its `id`, such as `fig-views-b`:

````markdown
:::{figure}
:label: fig-views

![A sun rising over blue hills](/assets/img/gallery/sunrise.svg)
![Blue mountains with a snow-capped peak](/assets/img/gallery/mountains.svg)

Two views from the gallery.
:::
````

:::{figure}
:label: fig-views

![A sun rising over blue hills](/assets/img/gallery/sunrise.svg)
![Blue mountains with a snow-capped peak](/assets/img/gallery/mountains.svg)

Two views from the gallery.
:::



## Formulae

A formula on lines of its own with a label is numbered, and its number stands at the end of its line:

````markdown
$$
A = \pi r^2
$$ (eq-area)
````

$$
A = \pi r^2
$$ (eq-area)

- **Directive**: a `{math}` directive has its label as its option `label`, or `name`. Its option `enumerated`, or `numbered`, numbers a formula without a label, and `:enumerated: false` leaves one with a label without a number.
- **Tags**: a formula with `\tag{…}` shows that tag in place of a number.
- **Within a text**: a formula within a text has no number.
- **Style**: the number has the class `tml-tag`, by which the starter's stylesheet places it at the end of the line.

An environment of LaTeX that numbers its lines, such as `equation`, `align` or `gather`, takes their numbers from the same sequence:

````markdown
$$
\begin{align}
(a + b)^2 &= a^2 + 2ab + b^2 \\
(a - b)^2 &= a^2 - 2ab + b^2
\end{align}
$$
````

$$
\begin{align}
(a + b)^2 &= a^2 + 2ab + b^2 \\
(a - b)^2 &= a^2 - 2ab + b^2
\end{align}
$$

`\nonumber` leaves a line without a number, and so does an environment with a star, such as `align*`.



## Footnotes

Blyss numbers the footnotes of a page in the order of their first references, whatever their names; see [Footnotes](/en/book/writing/markdown-spice/#footnotes). As the footnotes follow the text, a figure or a formula within a footnote is numbered after those of the text.



## Links

A link to a label leads to its element:

- `[Figure 1](#fig-rings)` gives [Figure 1](#fig-rings), and `[formula (1)](#eq-area)` gives [formula (1)](#eq-area).
- `[the mountains](#fig-views-b)` gives [the mountains](#fig-views-b), the second image of its figure.
- From another page, the URL of the page precedes the label, as in `/en/book/writing/labels-and-numbers/#fig-rings`.

Blyss does not fill in the text of such a link, as MyST does for `[](#eq-area)`: write the number yourself, and correct it when the order of the page changes. A link to a part of a page without a text stops the build.



## Other texts

Only pages, posts and docs have labels and numbers. Any other text, such as that of a component, of the hero or of the overlay, can stand on a page more than once, which an `id` must not. In such a text:

- A label or the option `enumerated` stops the build.
- A line `(label)=` stays text.
- An environment of LaTeX shows no numbers.

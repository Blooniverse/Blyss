---
title: Labels and numbers
description: How to label the elements of a text, how Blyss numbers its figures, formulae and footnotes, and how to refer to them.
order: 5
translationKey: book-labels-and-numbers
---

A label names an element of a page, a post or a doc. Blyss numbers the figures and the formulae that have a label, as well as the footnotes: each kind on its own, in the order in which the page shows it, and from 1 on every page. A reference to a label then shows the number or the name of its element.



## Labels

A label becomes the `id` of its element, to which a link or a [reference](#references) leads. An element gets its label in one of these ways:

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



(references)=
## References

A reference is a link without a text to a label of its page. As in [MyST](https://mystmd.org/guide/cross-references), Blyss fills in what the label names, and keeps it right when the order of the page changes:

- `[](#fig-rings)` gives [](#fig-rings), and `[](#fig-views-b)` gives [](#fig-views-b), the second image of its figure.
- `[](#eq-area)` gives [](#eq-area).
- `[](#references)` gives [](#references), as this heading has a label.

What a reference shows depends on its element:

- **Numbered figure**: the label `figure` of the language and its number, as in "Figure 1". An image of it adds its letter, as in "Figure 2b".
- **Numbered formula**: its number in brackets, as in "(1)", or its `\tag{…}`.
- **Name**: the text of a heading, the title of a callout and, for a figure without a number, the first paragraph of its caption.
- **Anything else**, such as a paragraph, a list or an `{image}`, has neither a number nor a name. A link to it needs a text: `[this remark](#remark)` gives [this remark](#remark).

A link with a text keeps it. In that text, `{number}` stands for the number of its element and `{name}` for its name, but not within code:

- `[Fig. {number}](#fig-rings)` gives [Fig. {number}](#fig-rings), and `[formula {number}](#eq-area)` gives [formula {number}](#eq-area).
- `[the section "{name}"](#references)` gives [the section "{name}"](#references).

Three roles of MyST write a reference as well, each before the label in backticks, or before a text and the label in angle brackets:

- `` {ref}`fig-rings` `` gives {ref}`fig-rings`, and `` {eq}`eq-area` `` gives {eq}`eq-area`.
- `` {numref}`Fig. %s <fig-rings>` `` gives {numref}`Fig. %s <fig-rings>`: `%s` stands for the number, like `{number}`.

Blyss is stricter than MyST here:

- **Missing label**: the build stops at a reference to a label that its page lacks. Label the element, or give the link a text.
- **Missing number or name**: the build stops at a reference that asks for a number or a name that its element lacks. MyST shows "??" or the label then.
- **Other links**: only a reference shows a text without having one. Any other link without a text stops the build, also one to a label of another page, as in `[](/en/book/writing/labels-and-numbers/#fig-rings)`. Write the text of such a link yourself, as numbers start anew on every page.



## Other texts

Only pages, posts and docs have labels, numbers and references. Any other text, such as that of a component, of the hero or of the overlay, can stand on a page more than once, which an `id` must not. In such a text:

- A label or the option `enumerated` stops the build.
- A line `(label)=` and a role such as `{ref}` stay text, and a link without a text stays empty.
- An environment of LaTeX shows no numbers.

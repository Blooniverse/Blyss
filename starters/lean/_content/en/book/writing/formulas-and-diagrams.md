---
title: Formulas, footnotes, code and diagrams
description: How to write formulas, footnotes, highlighted code, diagrams and charts in Markdown.
order: 2
translationKey: book-formulas-and-diagrams
---

## Formulas

A formula is LaTeX between dollar signs. Within a text, one dollar sign stands on each side, as in $e^{i\pi} + 1 = 0$. A formula on lines of its own stands between two dollar signs on each side:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

Blyss turns each formula into MathML during the build, which browsers show without a script. The build stops and names a formula that is not valid LaTeX.

No space follows the first dollar sign of a formula, none precedes its second one, and no digit follows that one, so prices such as $5 and $10 stay text. Write `\$` for any other dollar sign that starts no formula. Dollar signs in code remain text; a formula ends before a code span and is not rendered in an image description. Inline `$$…$$` is also supported. [Temml](https://temml.org/docs/en/supported.html) lists supported LaTeX.

Formulas also work in component texts, fragments and region texts. The starter's local Temml assets must match the installed version; see [Templates and the lean theme](/en/book/templates/#top-bar-and-fonts).

## Footnotes

A footnote has a name in square brackets after a caret[^name], and its text follows that name and a colon on a line of its own, anywhere in the file. Blyss numbers the footnotes in the order of their first references[^order] and lists them below the text, each with a link back.

[^name]: This footnote is written as `[^name]: This footnote …`. Its name can be a word or a number.
[^order]: The names do not matter for the numbers, and a footnote can be referred to several times.

    A further paragraph of a footnote is indented by four spaces.

Pages, posts and docs have footnotes; the texts of the components, of the hero and of the overlay have none.

Names contain no spaces. An unreferenced definition is omitted; an undefined reference, or one in link text or an image description, stays as written. The `footnotes` and `backToText` labels provide screen-reader text.

## Code

A fenced code block that names its language is highlighted during the build:

```js
// Greets by name.
const greet = name => `Hello, ${name}!`;
console.log(greet("Blyss"));
```

A block without a language, or in one that the highlighter does not know, stays plain.

The starter's `static/assets/css/main.css` colours the `hljs-…` classes; preserve a contrast of at least 4.5:1 against the code background when changing them.

## Diagrams

A fenced code block in the language of a diagram component shows that diagram instead of its code. The browser draws it once it comes near the window, with a library that it loads then; until that moment, and without JavaScript, the code is shown.

### Mermaid

The language `mermaid` shows a [Mermaid](https://mermaid.js.org/) diagram:

```mermaid
flowchart LR
  write[Write Markdown] --> build[blyss build]
  build --> check{Valid?}
  check -- yes --> publish[Publish public/]
  check -- no --> write
```

### Flowcharts

The languages `flowchart` and `flow` show a [flowchart.js](https://flowchart.js.org/) flowchart:

```flowchart
start=>start: Start
write=>operation: Write Markdown
check=>condition: Does it build?
fix=>operation: Read the message
publish=>end: Publish

start->write->check
check(yes)->publish
check(no)->fix->write
```

### Charts

The language `vega-lite` shows a [Vega-Lite](https://vega.github.io/vega-lite/) chart from its specification in JSON:

```vega-lite
{
  "description": "Posts per month as bars",
  "width": "container",
  "height": 160,
  "data": {
    "values": [
      { "month": "Aug", "posts": 2 },
      { "month": "Sep", "posts": 5 },
      { "month": "Oct", "posts": 3 },
      { "month": "Nov", "posts": 7 }
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": { "field": "month", "type": "nominal", "sort": null, "title": "Month", "axis": { "labelAngle": 0 } },
    "y": { "field": "posts", "type": "quantitative", "title": "Posts" }
  }
}
```

### Settings

`components.componentMermaid`, `components.componentFlowchart` and `components.componentVegaLite` in `blyss.config.js` hold the settings of the diagrams, among them the URLs of their libraries. A block of the component gives a single diagram a title and settings of its own: its front matter holds them, and the code follows it.

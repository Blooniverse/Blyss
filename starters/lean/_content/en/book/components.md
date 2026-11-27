---
title: Components
description: Use, configure and develop reusable components.
order: 4
translationKey: book-components
---

## Files and usage

A component is a directory `components/<name>/`, named with Latin letters and digits starting with a letter. It holds:

- `<name>.html`: its template, the only required file. It can link to its own `<name>.css` and `<name>.js`.
- `<name>.data.js`: optional; it checks settings and prepares template values.
- Other files, which are published under `/components/<name>/`.

A name that starts with `.` or `_` is left out: such a file or directory of a component is not published, wherever it lies in the component's directory, and such a directory in `components/` is no component. Use these names for what the browser does not need: a module that a data file imports, as `_helpers.js` beside it or in `components/_shared/` for several components, or notes such as `_README.md`.

A component gets its values and is shown as follows:

- `_content/<language>/components/<name>.md` supplies localized front matter and Markdown.
- `components.<name>` in `blyss.config.js` supplies settings.
- A template can use `{{<name>}}`.
- A paragraph containing only that placeholder in a page, post or doc displays the component; a block gives one occurrence its own values.
- Components can appear several times on one page.

The starter includes slider, gallery and flower components. Their localized default texts are in `_content/<language>/components/`; `blyss.config.js` explains their settings. Gallery images are in `static/assets/img/gallery/`. Each occurrence is an independent custom element.

## Components of the hero and the overlay

`_content/<language>/hero.md` and `overlay.md` show the components of the two [regions](/en/book/templates/#hero-and-overlay), as a page shows them:

- Every component of the website can stand there, the diagrams and the live demo as well.
- A paragraph `{{<name>}}` shows a component as it is; a [block](#blocks) gives it settings and a text of its own.
- The text of a component of a region stands in its block: `title` among the settings, and the text below the second `---`. A block without them shows the title and the text of `components/<name>.md`, like every other occurrence of the component.
- The components appear in the order of the file, which holds nothing else.
- `regionPosition: below` in the front matter of a block places it below the cards of the region; the default is `above`.
- A line `<!--` above a component and a line `-->` below it hide it, whatever it holds: the arrows of a diagram do not end such a comment. The starter's files hold each of its components in this way, with its settings, and the slider and the flower with a text of their own.
- Each language has its own files, so a region can differ between languages.

For example, a slider below the cards of the English overlay, with a title and a text of its own:

````markdown
```{{componentSlider}}
---
title: Progress
regionPosition: below
start: 0
end: 10
steps:
  - value: 5
    description: Halfway
---

How far along are you?
```
````

A setting that a block leaves out is that of `components.componentSlider` in `blyss.config.js`; the starter's blocks leave the libraries of the diagrams to it. The description of a step is a text here, since the file belongs to one language; in `blyss.config.js` it is an object with a text for every language.

Earlier websites switched the components of a region on and off with `hero.components` and `overlay.components` and named them `<name>Hero` and `<name>Overlay`. The build stops at each of these and tells what to write instead:

1. Name each component of a region in `hero.md` or `overlay.md`, in a block with the settings and the text of its former variant.
2. Rename the settings and the texts that pages still show to `components.<name>` and `components/<name>.md`, and write `{{<name>}}` for `{{<name>Hero}}` and `{{<name>Overlay}}`.
3. In region templates of your own, add `{{componentsBelow}}` below `{{cards}}`.

## Blocks

A fenced block named for a component displays it with text and settings specific to that occurrence:

````markdown
```{{componentGallery}}
---
title: Our trip
heightOverall: 12rem
---

- ![The harbour](/assets/img/trip/harbour.jpg) Arriving at dawn
- ![The lighthouse](/assets/img/trip/lighthouse.jpg)
```
````

The text that follows an image of the gallery in its list item, here "Arriving at dawn", is the text of that image: the gallery shows it below its strip while the image is in the centre, and below the expanded image.

Front matter and body are optional:

- Fields merge with and override the component text's front matter; fields matching settings also override the configuration.
- JSON values such as `5`, `true`, `"5"` and `[1, 2]` keep their types; other values are text.
- A field without a value holds the list or the group of fields on the lines below it, like the `steps` of the slider above; see [front matter](/en/book/authoring/pages-and-posts/#front-matter-and-urls).
- The block body replaces the component's body; without a body it keeps it.
- Invalid settings stop the build with the source file named.

Blocks must stand alone: within a list, a quotation or a directive they remain code. Use a longer outer fence if the body contains fenced code. Double braces name a component of the website; single braces, as in `{note}`, name a [directive](/en/book/authoring/markdown-spice/#directives), which Blyss renders by itself.

## Component templates and data

Template placeholders are resolved in this order, with later values replacing earlier values of the same name:

1. `{{basePath}}`, the path of a website [below a path](/en/book/deployment/#below-a-path).
2. Language labels, `{{<key>Label}}`.
3. Scalar settings, `{{<setting>}}`.
4. Front-matter fields and `{{content}}`.
5. Values returned by the data file.
6. `{{id}}`, unique per occurrence, such as `componentSlider-1`.

Labels, settings and front matter are HTML-escaped; data-file values are inserted as returned. A placeholder without a value is empty, as for a field that a text lacks.

The optional data file exports a function, called for each language and block before the previous output is deleted:

```js
export default function ({ settings, languageKey, content, texts, source, frontMatter, escapeHtml, refuse }) {
  const { columns = 2 } = settings;
  if (!Number.isInteger(columns)) throw refuse("columns", columns, "a whole number");
  return { columns, language: `<p>${escapeHtml(languageKey)}</p>` };
}
```

The function receives, among others:

- `content`: the rendered HTML.
- `source`: the original text.
- `frontMatter`: the fields of the text.
- `texts`: the HTML texts started by `###` headings.
- `basePath`: the path of a website below a path, for a URL that the data file writes.
- `labels`: the labels of the language.
- `renderDocument`: a function that returns the HTML of a Markdown text, read like that of a page, a post or a doc.
- `refuse`: creates a setting error naming the component.

The data file receives block overrides in the same way as ordinary settings and text.

### Markdown in the browser

A component whose script reads Markdown in the browser asks for Blyss's renderer in its data file:

```js
export const renderer = true;
```

The build then publishes the modules with which it reads Markdown itself, and the libraries that they use, at `/components/blyss-renderer/`. A script of the component imports the renderer from there:

```js
const { renderDocument, withBasePath } = await import("../blyss-renderer/renderer.js");
const html = withBasePath(renderDocument(markdown, "this text", labels), basePath);
```

- `renderDocument(markdown, name, labels)` returns the same HTML as the function of that name in the data file. `name` names the text in an error message, and `labels` are those of a language.
- `withBasePath(html, basePath)` gives root-relative URLs the path of a website below a path.
- A text that cannot be read throws an error with the message of the build.

The renderer is about 1 MB of JavaScript, which a script should load only when it needs it. It is published under Blyss's licence, the GPL-3.0, beside the licences of marked, Temml and highlight.js. Without such a component, a website does not publish it. The live demo on the starter's home pages uses it: remove `{{componentLiveDemo}}` from `pages/index.md` to do without it.

## Diagrams and code blocks

The starter includes three diagram components, each for the fenced code blocks of its languages:

- Mermaid: `mermaid`.
- flowchart.js: `flowchart` or `flow`.
- Vega-Lite: `vega-lite`.

See [Markdown spice](/en/book/authoring/markdown-spice/#diagrams) for examples. The browser loads each library only when a diagram comes near the window or its overlay opens; code remains visible without JavaScript or if drawing fails. Localized component files provide error messages and flowchart yes/no labels.

Each diagram's settings and library URLs are documented in `blyss.config.js`. A block named `{{componentMermaid}}`, for example, supplies a title and settings for one diagram, followed by its code. Vega-Lite expects JSON and stops the build if it is invalid; `"width": "container"` makes a chart as wide as the text. Diagrams inherit the surrounding font; flowchart colour is set in `components/componentFlowchart/componentFlowchart.css`.

A component can claim fenced-code languages by exporting `languages`, for example `export const languages = ["mermaid"];` from its data file:

- Code is passed as-is as `source`, escaped as `{{content}}`, and `texts` is empty.
- The ordinary code fence uses the base component's settings and text; a named block supplies overrides.
- A language can belong to only one component, and `languages` must be a list of words.
- Fences inside lists, quotations or directives stay code.

### Host diagram libraries yourself

By default the libraries come from jsDelivr, exposing the visitor's IP address to it. Copy the following into `static/` and point the corresponding settings in `blyss.config.js` at their local `/assets/...` URLs:

| Setting | Source files |
| --- | --- |
| `componentMermaid.library` and `componentLiveDemo.libraryMermaid` | npm `mermaid@12.3.0`: `dist/mermaid.esm.min.mjs` and `dist/chunks/mermaid.esm.min/`, keeping the `chunks/mermaid.esm.min/` path beside it |
| `componentFlowchart.libraryRaphael` | npm `raphael@2.3.0`: `raphael.min.js` |
| `componentFlowchart.libraryFlowchart` | [flowchart.js v1.18.1](https://github.com/adrai/flowchart.js/tree/v1.18.1/release): `release/flowchart.min.js` |
| `componentVegaLite.libraryVega` | npm `vega@6.4.0`: `build/vega.min.js` |
| `componentVegaLite.libraryVegaLite` | npm `vega-lite@6.5.0`: `build/vega-lite.min.js` |

`npm pack mermaid@12.3.0` downloads an archive without installing it. Keep the paired Vega/Vega-Lite and Raphaël/flowchart.js versions compatible when updating. Library URLs must start with `https://` or `/`. On a website below a path, the components put that path before a URL that starts with `/`.

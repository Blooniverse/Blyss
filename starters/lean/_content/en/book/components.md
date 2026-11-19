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

The starter includes slider, gallery and flower components. Their localized text files are `_content/<language>/components/componentSliderHero.md` and `componentSliderOverlay.md`, and similarly for `componentGallery` and `componentFlower`; `blyss.config.js` explains their settings. Gallery images are in `static/assets/img/gallery/`. Each occurrence of these components is an independent custom element.

## Variants

Each component has `<name>Hero` and `<name>Overlay` variants, with separate text files and settings but the same template, data file and assets. A variant does not inherit the base component's text or settings. `hero.components` and `overlay.components` can list components or variants. A component directory cannot have the name of another component's variant.

## Blocks

A fenced block named for a component or variant displays it with text and settings specific to that occurrence:

````markdown
```{{componentGalleryHero}}
---
title: Our trip
heightOverall: 12rem
---

- ![The harbour](/assets/img/trip/harbour.jpg)
- ![The lighthouse](/assets/img/trip/lighthouse.jpg)
```
````

Front matter and body are optional:

- Fields merge with and override the component text's front matter; fields matching settings also override the configuration.
- JSON values such as `5`, `true`, `"5"` and `[1, 2]` keep their types; other values are text.
- The block body replaces the component's body; without a body it keeps it.
- Invalid settings stop the build with the source file named.

Blocks must stand alone: within a list, a quotation or a directive they remain code. Use a longer outer fence if the body contains fenced code. Double braces name a component of the website; single braces, as in `{note}`, name a [directive](/en/book/writing/markdown-spice/#directives), which Blyss renders by itself.

## Component templates and data

Template placeholders are resolved in this order, with later values replacing earlier values of the same name:

1. `{{basePath}}`, the path of a website [below a path](/en/book/deployment/#below-a-path).
2. Language labels, `{{<key>Label}}`.
3. Scalar settings, `{{<setting>}}`.
4. Front-matter fields and `{{content}}`.
5. Values returned by the data file.
6. `{{id}}`, unique per occurrence, such as `componentSliderHero-1`.

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
- `refuse`: creates a setting error naming the component.

The data file receives block overrides in the same way as ordinary settings and text.

## Diagrams and code blocks

The starter includes three diagram components, each for the fenced code blocks of its languages:

- Mermaid: `mermaid`.
- flowchart.js: `flowchart` or `flow`.
- Vega-Lite: `vega-lite`.

See [Markdown spice](/en/book/writing/markdown-spice/#diagrams) for examples. The browser loads each library only when a diagram comes near the window or its overlay opens; code remains visible without JavaScript or if drawing fails. Localized component files provide error messages and flowchart yes/no labels.

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
| `componentMermaid.library` | npm `mermaid@12.3.0`: `dist/mermaid.esm.min.mjs` and `dist/chunks/mermaid.esm.min/`, keeping the `chunks/mermaid.esm.min/` path beside it |
| `componentFlowchart.libraryRaphael` | npm `raphael@2.3.0`: `raphael.min.js` |
| `componentFlowchart.libraryFlowchart` | [flowchart.js v1.18.1](https://github.com/adrai/flowchart.js/tree/v1.18.1/release): `release/flowchart.min.js` |
| `componentVegaLite.libraryVega` | npm `vega@6.4.0`: `build/vega.min.js` |
| `componentVegaLite.libraryVegaLite` | npm `vega-lite@6.5.0`: `build/vega-lite.min.js` |

`npm pack mermaid@12.3.0` downloads an archive without installing it. Keep the paired Vega/Vega-Lite and Raphaël/flowchart.js versions compatible when updating. Library URLs must start with `https://` or `/`. On a website below a path, the components put that path before a URL that starts with `/`.

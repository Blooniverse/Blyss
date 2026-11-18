# Blyss SSG 1.0.1

Blyss is a lean SSG (static site generator):
- **Markdown**: AI & KMS ready for the knowledge management era.
    - **Code highlighting**: Supports nearly 200 languages via [Highlight.js](https://highlightjs.org/).
    - **Formulae**: HTML output in MathML via [Temml.org](https://temml.org/).
    - **Diagrams**: Extensive charting via Flowchart.js, Mermaid & even Vega-Lite.
    - **Footnotes** 
    - **Compatibility**: [Obsidian.md](https://obsidian.md) & [Marktext](https://marktext.me)
- **3 content types**: book, page, post.
- **Themeable**: Blyss comes with a lean starter.
- **Composable**: Markdown components can be used anywhere.
- **Configurable**: Via blyss.config.js and component Markdown.
- **Multilingual**: EN/DE default – can be extended.
- **3 dependencie onlys**: `highlight.js`, `marked`, `temml` (none with dependencies of their own).
- Lightweight Javascript.
- Semantic (RDF graph via JSON-LD).
- **Local-first & Git-based**: For devs & authors.

Option for in-browser content editing:
[Decap CMS](https://decapcms.org/) or
[Tina](https://tina.io/):

```text
Author
  ▼
Git Client (CLI, GUI, CMS)
  ▼
Git Repository
  ├───────────┐
  ▼           │
Blyss SSG     │
  ▼           │
Website       │
              ▼
        Automation Platform
    (Activepieces, Windmill, N8n)
```



## Features

- **Multilingual:** English, German and any further languages in `site.languages`; clean localized URLs (`/en/`, `/de/`); `/` redirects to the configurable default language; front matter, localized `slug`s and `translationKey` links between translations; a language switcher (hidden with `site.languageSwitcher`) and `hreflang` alternates.
- **Content:** pages, posts and books. Posts have `{{recentPosts}}` (the three newest in the current language), a paginated archive and generated tag pages. Books, such as a technical documentation, live in `_content/<language>/book/`: sections by directory, navigation ordered by `order`, a table of contents, heading anchors and previous/next links.
- **Writing:** formulas in LaTeX between `$…$` and `$$…$$`, turned into MathML during the build; footnotes with `[^name]`; fenced code highlighted during the build; code blocks in `mermaid`, `flowchart` and `vega-lite` shown as diagrams and charts by the starter's components, which draw them in the browser.
- **Templates:** optional templates for the home pages and the docs; `{{kind}}` for page-specific styles; `{{<key>Label}}` for every configured label; fragments, the Markdown files directly in `_content/<language>/`, such as `heroTexts.md`; `layout` settings for the site's margin, the paddings of hero and overlay, and the alignments of the home pages, other pages, hero and overlay.
- **Hero and overlay:** a hero for the home pages and an overlay for the kinds of pages you choose, each with its own template, components and texts, switched on or off in `blyss.config.js`.
- **Components:** a directory per component with its template, stylesheet and script, its texts in every language and its settings. Each has a variant for the hero and one for the overlay, with texts and settings of their own. `{{<name>}}` shows one in templates and Markdown; a block gives it a text and settings of its own, and a component can show the code blocks of a language.
- **SEO and output:** localized “not found” pages (served by `blyss serve` for missing URLs), `sitemap.xml` with `lastmod` and `hreflang` alternates, Schema.org JSON-LD using `@graph`, and static asset copying.
- **Getting started:** `blyss init` scaffolds a bilingual starter with a slider, an image gallery, a flower and three kinds of diagrams, ready for Azure Static Web Apps; `blyss serve` is a dependency-free Node.js static server.

## Quick start

```bash
npx @blooniverse/blyss init my-site   # copy the bundled starter into my-site/
cd my-site
npm install                           # install Blyss into the new website
npm run build                         # generate public/
npm start                             # serve public/ on http://localhost:3000
```

`blyss init` only copies files. Installing dependencies, building and serving are separate steps.

## Installation

To add Blyss to an existing website instead:

```bash
npm install @blooniverse/blyss
```


## Documentation

- [USAGE](README_USAGE.md): the CLI, the site structure, `blyss.config.js`, templates, regions, components, hosting and developing Blyss.
- [AUTHORING](README_AUTHORING.md): how to write content: URLs, translations, tags, archives, docs, “not found” pages, formulas, footnotes, code and diagrams.

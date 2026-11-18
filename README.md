# Blyss SSG 1.0.1

Blyss is an ultra lean SSG (static site generator):
- **Markdown**: AI & KMS ready for the knowledge management era.
    - **Code highlighting**: Supports nearly 200 languages via [Highlight.js](https://highlightjs.org/).
    - **Formulae**: HTML output in MathML via [Temml.org](https://temml.org/).
    - **Diagrams**: Extensive charting via Flowchart.js, Mermaid & even Vega-Lite.
    - **Footnotes** 
    - **Compatibility**: [Obsidian.md](https://obsidian.md) & [Marktext.me](https://marktext.me)
- **3 content types**: book, page, post.
- **Themeable**: Blyss comes with a lean starter.
- **Composable**: Markdown components can be used anywhere.
- **Configurable**: Via blyss.config.js and component Markdown.
- **Multilingual**: EN/DE default – can be extended.
- **3 dependencies only**: `highlight.js`, `marked`, `temml` (nor any further dependencies).
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

- **Writing:** Use `$…$` and `$$…$$` for formulas and `[^name]` for footnotes. Starter components render `mermaid`, `flowchart` and `vega-lite` code blocks in the browser.
- **Content:** `{{recentPosts}}` lists up to three recent posts in the current language; posts also have a paginated archive and tag pages. Books offer ordered navigation, a table of contents, heading anchors and previous/next links.
- **Themes:** Optional home and docs templates, Markdown fragments, a home-page hero and an overlay for selected page kinds.
- **Components:** Each has a template and optional stylesheet and script. Embed them in templates or Markdown; blocks provide per-instance text and settings.
- **Configuration:** Adjust margins, padding and alignment, and choose the hero's and overlay's content and visibility in `blyss.config.js`.
- **Multilingual:** `site.languages` sets language order. Localized slugs, `translationKey`, an optional language switcher and `hreflang` alternates support translations; `/` redirects to the configured default.
- **Server:** `blyss serve` is a Node.js static server; it serves the default language's 404 page for missing URLs, when available.
- **Output:** Builds copy static assets, generate `sitemap.xml` with `lastmod`, and add Schema.org JSON-LD using `@graph`.

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

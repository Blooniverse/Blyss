# Blyss SSG 1.0.1

Blyss is an ultra lean SSG (static site generator):
- **Markdown**: AI & KMS ready for the knowledge management era.
    - **Code highlighting**: Supports nearly 200 languages via [Highlight.js](https://highlightjs.org/).
    - **Formulae**: HTML output in MathML via [Temml.org](https://temml.org/).
    - **Diagrams**: Extensive charting via Flowchart.js, Mermaid & even Vega-Lite.
    - **Footnotes**: ^footnote
    - **Compatibility**: [Obsidian.md](https://obsidian.md) & [Marktext.me](https://marktext.me)
- **3 content types**: book, page, post.
- **Themeable**: Blyss comes with a lean starter.
- **Composable**: Markdown components and fragments can be used anywhere.
- **Configurable**: Via blyss.config.js and component Markdown.
- **Multilingual**: EN/DE default – can be extended.
- **AIO & SEO**: Semantic RDF graph (in JSON-LD), plus a classic sitemap.xml.
- Lightweight Javascript.
- **3 dependencies only**: `highlight.js`, `marked`, `temml` (nor any further dependencies).
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

## Quick start

```bash
npx @blooniverse/blyss init my-site   # copy the bundled starter into my-site/
cd my-site
npm install                           # install Blyss into the new website
npm run build                         # generate public/
npm start                             # serve public/ on http://localhost:3000 (dependency-free Node.js static server)
```

`blyss init` only copies files. Installing dependencies, building and serving are separate steps.


## Installation

To add Blyss to an existing website instead:

```bash
npm install @blooniverse/blyss
```

---
## Documentation

- [USAGE](README_USAGE.md): the CLI, the site structure, `blyss.config.js`, templates, regions, components, hosting and developing Blyss.
- [AUTHORING](README_AUTHORING.md): how to write content: URLs, translations, tags, archives, docs, “not found” pages, formulas, footnotes, code and diagrams.

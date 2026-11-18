# Blyss SSG 1.0.1

Blyss is an ultra lean SSG (static site generator):
- **Markdown++**: AI & KMS ready for the knowledge management era.
    - **Code highlighting**: Supports nearly 200 languages via [Highlight.js](https://highlightjs.org/).
    - **Formulae**: HTML output in MathML via [Temml.org](https://temml.org/).
    - **Diagrams**: Extensive charting via Flowchart.js, Mermaid & even Vega-Lite.
    - **Footnotes**: [^footnote]
    - **Compatibility**: [Marktext.me](https://marktext.me) as well as [Obsidian.md](https://obsidian.md)
- **Author with 3 content types**: book doc, page, post.
    - `draft: true` in Frontmatter.
- **Themeable**: Blyss comes with a lean starter.
- **Composable**: Markdown components and their fragments can be used anywhere.
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
npm start                             # serve public/ on localhost:3000
```

`blyss init` only copies files. Installing dependencies, building and serving are separate steps.
The Node.js static server is dependency free!


## Installation

To add Blyss to an existing website instead:

```bash
npm install @blooniverse/blyss
```

---
## Documentation

- [Documentation book](starters/lean/_content/en/book/index.md) ([Deutsch](starters/lean/_content/de/book/index.md)): installation, authoring, configuration, customization and deployment. In a built starter, visit `/en/book/` or `/de/book/`.
- [Usage](README_USAGE.md) and [Authoring](README_AUTHORING.md): topic indexes for the book.

## License

Blyss and its starter are licensed under the [GNU General Public License v3.0](LICENSE). The starter also ships the stylesheet and the font of [Temml](https://temml.org/) under the [MIT License](starters/lean/static/assets/temml/LICENSE.txt).

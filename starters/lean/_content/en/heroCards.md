---
title: Why Blyss
---


#### Markdown++
- **Formulae**: LaTeX in Markdown to MathML in HTML — via [Temml.org](https://temml.org/).
- **Diagrams**: Extensive charting — via [Flowchart.js](https://flowchart.js.org/), [Mermaid](https://mermaid.js.org/), even [Vega-Lite](https://vega.github.io/vega-lite/).
- **Callouts & figures**: Admonitions, images and figures as [MyST](https://mystmd.org/) directives, plus GitHub alerts.
- **Labels, numbers & references**: Numbered figures and formulae, and references that fill in their own text.
- **Code highlighting**: Supports nearly 200 languages — via [Highlight.js](https://highlightjs.org/).
- **Task lists**: `- [x]` and `- [ ]` as checkboxes.
- **Footnotes**: `[^footnote]`
- **Compatibility**: [Marktext.me](https://marktext.me), [Obsidian.md](https://obsidian.md), etc.
 
#### Authoring
- **3 content types**: book doc, page, post.
    - Any number of books, each with its own navigation.
    - `draft: true` in Frontmatter.
    - In-browser content editing via: [Decap CMS](https://decapcms.org/) or [Tina](https://tina.io/).
- **AI co-authoring**: Human and agent turns as attributed, dated `{contribution}` blocks.
- **Themeable**: Blyss comes with a lean starter.
- **Composable**: Markdown components and their fragments can be used anywhere.
- **Configurable**: Via blyss.config.js and component Markdown.
- **Multilingual**: EN/DE are defaults — they can be extended.
- **AIO & SEO**: Semantic RDF graph (in JSON-LD), plus a classic sitemap.xml.

#### Local control & cybersecurity
> [!IMPORTANT]
> - **Local-first**: Full control for devs & authors. Ideal for Git-based workflows.
> - **Cybersecurity**:
>     - 0 (ZERO) dependencies in the Node.js server!
>     - 3 (THREE) dependencies in the SSG engine: `highlight.js`, `marked`, `temml` (nor any further dependencies)!
- **Library API**: `import { build, check, createContent } from "@blooniverse/blyss"`.
- **Live preview & checks**: Rebuild and reload on changes; check content including drafts, with JSON reports for agents and scripts.

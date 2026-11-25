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
    - `draft: true` in Frontmatter.
    - In-browser content editing via: [Decap CMS](https://decapcms.org/) or [Tina](https://tina.io/).
- **Themeable**: Blyss comes with a lean starter.
- **Composable**: Markdown components and their fragments can be used anywhere.
- **Configurable**: Via blyss.config.js and component Markdown.
- **Multilingual**: EN/DE are defaults — they can be extended.
- **AIO & SEO**: Semantic RDF graph (in JSON-LD), plus a classic sitemap.xml.

#### Local control & cybersecurity
- **Local-first**: Full control for devs & authors. Ideal for Git-based workflows.
> [!IMPORTANT]
> - **Cybersecurity**:
>     - 0 (ZERO) dependencies in the Node.js server!
>     - 3 (THREE) dependencies in the SSG engine: `highlight.js`, `marked`, `temml` (nor any further dependencies)!

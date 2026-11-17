# Blyss SSG 1.0.1

Blyss is a lean SSG (static site generator). Essence:
- Markdown based – ideal for Obsidian and other knowledge management systems.
- Local-first & Git-based – for devs as well as for authors.
- Multilingual – EN/DE bilingual per default.
- 3 content types: book, page, post.
- Configurable – via blyss.config.js.
- Composable – via Markdown-based components.
- Themeable.
- Zero dependencies – apart from Node.js' `marked`.
- Lightweight Javascript.
- Semantic (RDF graph via JSON-LD).

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
- **Templates:** optional templates for the home pages and the docs; `{{kind}}` for page-specific styles; `{{<key>Label}}` for every configured label; fragments, the Markdown files directly in `_content/<language>/`, such as `heroTexts.md`; `layout` settings for the site's margin, the paddings of hero and overlay, and the alignments of the home pages, other pages, hero and overlay.
- **Hero and overlay:** a hero for the home pages and an overlay for the kinds of pages you choose, each with its own template, components and texts, switched on or off in `blyss.config.js`.
- **Components:** a directory per component with its template, stylesheet and script, its texts in every language and its settings. `{{<name>}}` shows one in templates and Markdown; a block gives it a text and settings of its own.
- **SEO and output:** localized “not found” pages (served by `blyss serve` for missing URLs), `sitemap.xml` with `lastmod` and `hreflang` alternates, Schema.org JSON-LD using `@graph`, and static asset copying.
- **Getting started:** `blyss init` scaffolds a bilingual starter with a slider, an image gallery and a flower, ready for Azure Static Web Apps; `blyss serve` is a dependency-free Node.js static server.

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

- [USAGE.md](USAGE.md): the CLI, the site structure, `blyss.config.js`, templates, regions, components, hosting and developing Blyss.
- [AUTHORING.md](AUTHORING.md): how to write content: URLs, translations, tags, archives, docs and “not found” pages.

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

- English and German content trees, and as many further languages as `site.languages` lists
- clean localized URLs under `/<language>/`, such as `/en/` and `/de/`
- a configurable default language, which `/` redirects to: `/${site.defaultLanguage}/`
- recent-post placeholders via `{{recentPosts}}` that render the newest three posts for the current language
- fragments for templates: each Markdown file directly in `_content/<language>/`, such as `heroTexts.md` with the hero's texts
- a hero for the home pages and an overlay for the kinds of pages of your choice, each with its own template, components and texts, which `blyss.config.js` switches on or off one by one
- components: a directory per component with its template, stylesheet and script, its texts in every language and its settings, shown by `{{<name>}}` in templates and in Markdown, where a block gives a component a text and settings of its own
- optional templates for the home pages and the docs, and a `{{kind}}` placeholder for page-specific styles
- `layout` settings for templates: the site's margin, the paddings of the hero and of the overlay and the alignments of the home pages, of all other pages, of the hero and of the overlay
- every configured label available in templates as `{{<key>Label}}`
- a paginated post archive and post tags with generated tag pages for each language
- books, such as a technical documentation, in `_content/<language>/book/`: sections by directory, a navigation ordered by `order`, a table of contents, heading anchors and links to the previous and the next doc
- localized “not found” pages, served by `blyss serve` for missing URLs
- `sitemap.xml` with `lastmod` dates and `hreflang` alternates
- front matter and localized slugs
- translation matching via `translationKey`
- a language switcher, which `site.languageSwitcher` shows or hides, and `hreflang` alternate links
- Schema.org JSON-LD using a future-proof `@graph`
- static asset copying
- dependency-free Node.js static server
- `blyss init` scaffolding of a bilingual starter website with a slider, an image gallery and a flower, ready for Azure Static Web Apps

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

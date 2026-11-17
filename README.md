# Blyss 1.0.1

Blyss is a lean SSG (static site generator). It is/has in essence:
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
  │
  ▼
Git Client
(CLI, GUI, CMS)
  │
  ▼
Git Repository
  │
  ├─────────────┐
  ▼             │
Blyss           │
  │             │
  ▼             │
Website         │
                │
                ▼
Automation Platform
(Activepieces, Windmill, N8n)
```



## Features

- English and German content trees, and as many further languages as `site.languages` lists
- clean localized URLs under `/<language>/`, such as `/en/` and `/de/`
- a configurable default language, which `/` redirects to: `/${site.defaultLanguage}/`
- recent-post placeholders via `{{recentPosts}}` that render the newest three posts for the current language
- fragments for templates: each Markdown file directly in `content/<language>/`, such as `heroTexts.md` with the hero's texts
- a hero for the home pages and an overlay for the kinds of pages of your choice, each with its own template, components and texts, which `blyss.config.js` switches on or off one by one
- components: a directory per component with its template, stylesheet and script, its texts in every language and its settings, shown by `{{<name>}}` in templates and in Markdown, where a block gives a component a text and settings of its own
- optional templates for the home pages and the docs, and a `{{kind}}` placeholder for page-specific styles
- `layout` settings for templates: the site's margin, the paddings of the hero and of the overlay and the alignments of the home pages, of all other pages, of the hero and of the overlay
- every configured label available in templates as `{{<key>Label}}`
- a paginated post archive and post tags with generated tag pages for each language
- books, such as a technical documentation, in `content/<language>/book/`: sections by directory, a navigation ordered by `order`, a table of contents, heading anchors and links to the previous and the next doc
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

## Usage

### As a CLI

```bash
blyss init [directory]   # create a starter website in a new or empty directory
blyss build              # generate the website into directories.public
blyss serve              # serve the generated website on PORT or server.fallbackPort
```

Inside a website that depends on Blyss, run these commands with `npx blyss <command>` or through npm scripts. Run `blyss build` and `blyss serve` from the website's root directory, where `blyss.config.js` lives. Without that file, both commands stop and suggest `blyss init`.

Add the scripts to your site's `package.json` (websites created by `blyss init` already have them):

```json
{
  "scripts": {
    "build": "blyss build",
    "start": "blyss serve"
  }
}
```

### blyss init

`blyss init [directory]` copies the lean starter bundled with Blyss into `directory`, or into the current directory when no argument is given.

- A missing directory is created. An existing directory must be empty.
- A non-empty directory is refused and left untouched: Blyss never overwrites files and has no `--force` option.
- If copying fails, Blyss removes only the files and directories it created.
- The new `package.json` gets an npm package name derived from the directory name and depends on the running Blyss version (`^x.y.z`).
- It does not run `npm install`, initialize Git, build, serve or access the network.

The **bundled starter** lives in `starters/lean/` inside the Blyss package and is never modified. The **generated website** is your own copy: edit its content, templates, styles and configuration freely. Its **build output** (`public/`) is recreated by every `blyss build` and must not be edited manually.

### Site structure

A website created by `blyss init` looks like this:

```text
my-site/
├── .gitignore               # ignores node_modules/ and public/
├── README.md
├── blyss.config.js          # site configuration
├── package.json
├── _components/             # one directory per component (see Components below)
│   ├── componentFlower/              # the same four files as below
│   ├── componentGallery/
│   │   ├── componentGallery.html     # its template
│   │   ├── componentGallery.css      # published at /_components/componentGallery/
│   │   ├── componentGallery.js       # published too: its script for the browser
│   │   └── componentGallery.data.js  # optional: checks its settings for the build
│   └── componentSlider/              # the same four files
├── content/                 # one directory per language of site.languages
│   ├── en/
│   │   ├── heroTexts.md     # the title and the texts of the hero, a fragment (see Templates)
│   │   ├── overlayTexts.md  # the title and the texts of the overlay, a fragment too
│   │   ├── components/componentFlower.md  # the flower's title and the texts of its petals
│   │   ├── components/componentGallery.md # the gallery's title and images
│   │   ├── components/componentSlider.md  # the slider's title and text
│   │   ├── pages/index.md
│   │   ├── pages/about.md
│   │   ├── pages/404.md     # "not found" page
│   │   ├── posts/hello-world.md
│   │   ├── posts/templates.md
│   │   ├── posts/translations.md
│   │   ├── book/index.md    # the start page of the book
│   │   ├── book/getting-started.md
│   │   ├── book/writing/index.md # the start page of a section
│   │   └── book/writing/navigation.md
│   └── de/
│       ├── heroTexts.md
│       ├── overlayTexts.md
│       ├── components/componentFlower.md
│       ├── components/componentGallery.md
│       ├── components/componentSlider.md
│       ├── pages/index.md
│       ├── pages/about.md
│       ├── pages/404.md
│       ├── posts/hallo-welt.md
│       ├── posts/uebersetzungen.md
│       ├── posts/vorlagen.md
│       ├── book/index.md
│       ├── book/erste-schritte.md
│       ├── book/schreiben/index.md
│       └── book/schreiben/navigation.md
├── static/                  # copied verbatim into public/
│   ├── assets/css/main.css
│   ├── assets/img/logo.svg  # placeholder logo
│   ├── assets/img/gallery/  # placeholder images of the gallery
│   ├── robots.txt           # references the sitemap
│   └── staticwebapp.config.json  # Azure Static Web Apps redirect and 404 page
├── _templates/              # HTML templates (see Templates below)
│   ├── document.html        # the frame of every page
│   ├── home.html            # optional: the home pages /en/ and /de/
│   ├── page.html
│   ├── post.html
│   ├── book.html            # optional: the docs below /en/book/ and /de/book/
│   ├── hero.html            # optional: the hero of the home pages
│   └── overlay.html         # optional: the overlay
└── public/                  # generated by blyss build
```

### blyss.config.js

```js
export default {
  site: {
    name: "My Site",
    baseUrl: "https://example.com",
    defaultLanguage: "en", // optional: the first language by default
    languageSwitcher: true, // optional: false hides the language switcher
    publisher: {
      type: "Organization",
      name: "My Org",
      url: "https://example.com"
    },
    languages: { // any number of languages, in the order of the language switcher
      en: {
        label: "English", // its name in the language switcher
        locale: "en", // its language tag for lang and hreflang
        description: "My site description.",
        labels: { // the same labels in every language
          mainNavigation: "Main navigation", // any label, used in templates as {{mainNavigationLabel}}
          home: "Home",
          about: "About",
          generatedBy: "Generated by Blyss",
          overlay: "Overlay",
          hero: "Highlights",
          language: "Language", // optional: this label and those below name what Blyss generates, in English by default
          recentPosts: "Recent posts",
          posts: "Posts",
          tags: "Tags",
          tag: "Tag",
          page: "Page",
          pagination: "Pagination",
          newerPosts: "Newer posts",
          olderPosts: "Older posts",
          book: "Documentation", // names the navigation of the docs
          onThisPage: "On this page", // names the table of contents of a doc
          previous: "Previous",
          next: "Next"
        }
      }
    }
  },
  pagination: { pageSize: 10 }, // optional: posts per archive and tag page
  layout: { // optional: the space around the content and the alignments
    margin: "2vmin",
    alignHome: "center", // or "left": the content of the home pages
    alignOther: "left", // or "center" or "centerLeft": the content of all other pages
    paddingHero: "1rem", // the space above and below the content of the hero
    alignHero: "centerExtra", // or "left" or "center"
    paddingOverlay: "1rem", // the space above and below the content of the overlay
    alignOverlay: "centerExtra" // or "left" or "center"
  },
  hero: { // optional: the parts of the hero of the home pages, each on (true) or off (false)
    components: { componentSlider: true, componentGallery: true, componentFlower: true }, // in this order
    texts: true // the texts of content/<language>/heroTexts.md
  },
  overlay: { // optional: the pages and the parts of the overlay
    showOn: { page: true, post: true, book: true, home: false, list: true, "not-found": true }, // by kind of page
    components: { componentSlider: true, componentGallery: true, componentFlower: false },
    texts: true // the texts of content/<language>/overlayTexts.md
  },
  synchroniseHeroOverlay: false, // optional: true gives the overlay the components and the texts of the hero
  components: { // optional: the settings of each component in directories.components, by its name
    componentSlider: { // the starter's slider: its range and the steps marked on it
      start: 1,
      end: 1000,
      steps: [
        { value: 250, description: { en: "Quarter" } } // a description in every language
      ]
    },
    componentGallery: { // the starter's gallery: the heights of its images and the durations of its animations
      heightOverall: "8rem",
      heightCenter: "130%",
      heightExpanded: "70%",
      animationSpeedScrolling: "400ms",
      animationSpeedImgEnlargement: "300ms"
    },
    componentFlower: { // the starter's flower: its petals, its colours, the durations of its animations and its texts
      petals: 8,
      colourSystem: "triadic",
      colourBaseHue: 202,
      animationSpeedFalling: "3s",
      animationSpeedText: "3s",
      animationSpeedFading: "4s",
      opacityFallen: "30%",
      fontSizeText: "60%"
    }
  },
  directories: {
    components: "_components", // optional
    content: "content",
    public: "public",
    static: "static",
    templates: "_templates"
  },
  build: { cleanUrls: true },
  server: { fallbackPort: 3000 }
};
```

`site.languages` lists any number of languages, in the order of the language switcher and of the `hreflang` alternates. The key of a language, such as `en` or `pt-br`, names its directory in `content/` and starts its URLs, so it may contain only lower-case Latin letters, digits and hyphens. Each language needs a `label`, its name in the language switcher, and a `locale`, a language tag such as `"en"` or `"en-GB"`; its `description` serves pages without one of their own. All languages need the same `labels`, so that no page lacks one; the labels of what Blyss generates (`language`, `recentPosts`, `posts`, `tags`, `tag`, `page`, `pagination`, `newerPosts`, `olderPosts`, `book`, `onThisPage`, `previous` and `next`) default to English. `site.defaultLanguage` is the language that `/` redirects to and whose “not found” page is also published as `/404.html`; it defaults to the first language. `site.languageSwitcher` defaults to `true`; `false` leaves `{{languageSwitcher}}` empty, but keeps the `hreflang` alternates. Blyss refuses other values, and content outside the directories of the languages, before it deletes the previous output.

All directories are resolved relative to the website's root. `directories.public` names the generated output directory, which every build deletes and recreates. It must therefore be a subdirectory of the website's root that neither contains nor lies inside `components`, `content`, `static` or `templates`; `blyss build` and `blyss serve` refuse other values, such as `"."`, without deleting anything. `directories.components` defaults to `"_components"`; like `_templates`, its leading underscore marks a directory of building blocks rather than of content, and components are published below `/_components/`; without that directory, a website has no components. `pagination.pageSize` defaults to 10 and must be a whole number greater than 0.

`layout.margin` defaults to `"2vmin"`, and `layout.paddingHero` and `layout.paddingOverlay` to `"1rem"`; all three must be CSS lengths in `px`, `rem`, `vw`, `vh`, `vmin` or `vmax`. The alignments apply to the content of the home pages, to that of all other pages, to the hero and to the overlay: `layout.alignHome` is `"center"` (the default) or `"left"`, `layout.alignOther` is `"left"` (the default), `"center"` or `"centerLeft"`, and `layout.alignHero` and `layout.alignOverlay` are `"centerExtra"` (the default), `"left"` or `"center"`; the templates' stylesheet defines what each value looks like. Blyss refuses other values before it deletes the previous output.

`hero` and `overlay` set the parts of the two [regions](#hero-and-overlay) that accompany the pages, the hero of the home pages and the overlay:

- `hero.components` and `overlay.components` list the [components](#components) of each region by their names, in the order in which they appear. Each is switched on with `true` or off with `false`; a component that is not listed does not appear.
- `hero.texts` and `overlay.texts` show (`true`, the default) or hide (`false`) the texts of the region as a whole, those of `content/<language>/heroTexts.md` or `overlayTexts.md`.
- `overlay.showOn` switches the overlay on or off for each kind of page: `page`, `post` and `book`, the three content types, and `home`, `list` and `"not-found"`. A kind that it does not name has the overlay; a single page or post cannot be switched. The hero belongs to the home pages only.
- `synchroniseHeroOverlay: true` makes the overlay a copy of the hero: it shows the components of `hero.components` and, if `hero.texts` is `true`, the texts of `heroTexts.md`, whatever `overlay.components` and `overlay.texts` say; `overlayTexts.md` is not used. `overlay.showOn` still applies. It defaults to `false`.

A region without a part that is switched on is not shown at all. Blyss refuses switches that are neither `true` nor `false`, components that do not exist and kinds of pages that it does not know before it deletes the previous output.

`components` holds the settings of each [component](#components) under its name; the component defines which settings it has, and the starter's README describes those of its slider, its gallery and its flower. Blyss refuses settings for a component that does not exist, too.

### Templates

Templates belong to each website: Blyss ships no default templates, so customise the ones `blyss init` copies into `_templates/`. Blyss renders each page into a content template, then the result into `document.html`:

| Template | Placeholders |
| --- | --- |
| `home.html` (optional, for `/<language>/`), `page.html`, `post.html` | `{{title}}`, `{{description}}`, `{{dateBlock}}`, `{{tags}}` (a post's tag links), `{{content}}` (the Markdown body), `{{<name>}}` (a component) |
| `book.html` (optional, for docs) | The same, and `{{bookNavigation}}`, `{{bookToc}}`, `{{bookPager}}` (see [Content](#content)) |
| `document.html` | `{{content}}`, `{{hero}}`, `{{overlay}}`, `{{pageTitle}}`, `{{description}}`, `{{locale}}`, `{{languageKey}}`, `{{canonicalUrl}}`, `{{alternateLinks}}`, `{{jsonLd}}`, `{{languageSwitcher}}`, `{{kind}}`, `{{layoutMargin}}`, `{{layoutPaddingHero}}`, `{{layoutPaddingOverlay}}`, `{{layoutAlign}}`, `{{layoutAlignHero}}`, `{{layoutAlignOverlay}}`, `{{<key>Label}}`, `{{<name>Title}}`, `{{<name>Content}}`, `{{<name>}}` (a component) |
| `hero.html`, `overlay.html` (both optional) | `{{components}}`, `{{textsTitle}}`, `{{texts}}` (see [Hero and overlay](#hero-and-overlay)), and those of `document.html` but `{{hero}}` and `{{overlay}}` |

- Without `home.html` or `book.html`, the home pages or the docs use `page.html`.
- `{{kind}}` is `home`, `page`, `post`, `book`, `list` (archive and tag pages) or `not-found`, for kind-specific styles such as `<body data-kind="{{kind}}">`.
- `{{bookNavigation}}` lists all docs of the language as nested lists in a `<nav>`, the current doc marked with `aria-current="page"`. `{{bookToc}}` links to the `##` headings of the doc, each with its `###` headings, and is empty without them. `{{bookPager}}` links to the previous and the next doc of the navigation with `rel="prev"` and `rel="next"`. All three are empty on other pages and take precedence over components of the same name.
- Each Markdown file directly in `content/<language>/`, such as `heroTexts.md`, is a fragment: Blyss publishes no page for it, but `document.html` shows it on every page of that language as `{{<name>Title}}`, its front matter's `title`, and `{{<name>Content}}`, its Markdown as HTML, such as `{{heroTextsTitle}}` and `{{heroTextsContent}}`. Its name must start with a Latin letter and contain only Latin letters and digits. Without the file, both placeholders are empty, and the other placeholders of `document.html`, such as `{{pageTitle}}`, take precedence.
- `{{hero}}` and `{{overlay}}` show the hero and the overlay of the page, rendered by `hero.html` and `overlay.html`, and are empty on a page without them (see [Hero and overlay](#hero-and-overlay)).
- `{{layoutMargin}}`, `{{layoutPaddingHero}}` and `{{layoutPaddingOverlay}}` are `layout.margin`, `layout.paddingHero` and `layout.paddingOverlay`. `{{layoutAlign}}` is the alignment of the page's content, `layout.alignHome` on the home pages and `layout.alignOther` on all other pages, and `{{layoutAlignHero}}` and `{{layoutAlignOverlay}}` are `layout.alignHero` and `layout.alignOverlay`. For example: `<body data-align="{{layoutAlign}}" data-align-hero="{{layoutAlignHero}}" data-align-overlay="{{layoutAlignOverlay}}" style="--site-margin: {{layoutMargin}}; --hero-padding: {{layoutPaddingHero}}; --overlay-padding: {{layoutPaddingOverlay}}">`.
- `{{<name>}}` shows the [component](#components) of that name, such as `{{componentSlider}}`. The other placeholders of a template take precedence.
- `{{languageSwitcher}}` links the page to its translations, in the order of `site.languages`; it is empty if `site.languageSwitcher` is `false`.
- Every label of the language is available as `{{<key>Label}}`, such as `{{postsLabel}}` for `labels.posts`. The labels of what Blyss generates default to English, such as “Posts” and “Tags”.

### Hero and overlay

The hero and the overlay are two regions that accompany the pages. Each is independent of the other, with a template, components and texts of its own:

| | Hero | Overlay |
| --- | --- | --- |
| Appears on | the home pages | the kinds of pages that `overlay.showOn` does not switch off |
| Template, shown in `document.html` | `hero.html` as `{{hero}}` | `overlay.html` as `{{overlay}}` |
| Components | `hero.components` | `overlay.components` |
| Texts | `content/<language>/heroTexts.md`, if `hero.texts` is `true` | `content/<language>/overlayTexts.md`, if `overlay.texts` is `true` |

The template of a region has three placeholders of its own, next to those of `document.html`:

- `{{components}}`: the components of the region that are switched on, one after the other in the order of its settings.
- `{{textsTitle}}`: the `title` of the front matter of its texts.
- `{{texts}}`: its texts, as many as the file has. Each `###` heading starts a text, which runs up to the next one and is never shortened, and each text is a `<div>` that starts with its heading as `<h3>`. Only whitespace and HTML comments may precede the first `###` heading; Blyss refuses other content there.

A region is left out, and its placeholder in `document.html` is empty, on a page that it does not belong to, without its template, and if it has no content: no component that is switched on and no texts, because they are switched off or because the page's language lacks the file. With `synchroniseHeroOverlay: true`, the overlay takes its components and its texts from the hero.

### Components

A component is a self-contained part of a page, such as the starter's slider, its gallery and its flower. Like the templates, it belongs to the website: a directory in `_components/` that has the component's name and holds its template, next to which its stylesheet and its script can live.

| File or setting | Purpose |
| --- | --- |
| `_components/<name>/<name>.html` | The template: the only file that a component needs. |
| `_components/<name>/<name>.data.js` | Optional: checks the settings and prepares further values for the template. |
| Every other file in `_components/<name>/`, such as `<name>.css` and `<name>.js` | Published at `/_components/<name>/`. The template links to its stylesheet and its script itself. |
| `content/<language>/components/<name>.md` | Optional: the texts in that language. |
| `components.<name>` in `blyss.config.js` | Optional: the settings. |

`{{<name>}}` shows the component in every template and, in a paragraph of its own, in the Markdown of a page or post; in code, the placeholder stays as it is. A [block](#blocks) in Markdown shows it with a text and settings of its own. `hero.components` and `overlay.components` show it in the [hero and in the overlay](#hero-and-overlay). A component can appear several times on a page. Its name must start with a Latin letter and contain only Latin letters and digits.

The template has the following placeholders. Each replaces an earlier one of the same name:

- `{{<key>Label}}`: every label of the page's language.
- `{{<setting>}}`: every setting that is a text, a number or a truth value.
- `{{<field>}}` and `{{content}}`: every field of the front matter of the component's text, such as `{{title}}`, and the Markdown below it as HTML. Without the file, they are empty.
- The values that the data file returns.
- `{{id}}`: `<name>-1` where the component first appears on a page, then `<name>-2` and so on, for ids that must be unique.

Blyss escapes labels, settings and front matter for HTML and inserts the values of the data file as they are. The data file exports one function, which Blyss calls for every language, and for every block, before it deletes the previous output:

```js
export default function ({ settings, languageKey, content, texts, frontMatter, escapeHtml, refuse }) {
  const { columns = 2 } = settings; // components.<name> in blyss.config.js, or {}
  if (!Number.isInteger(columns)) throw refuse("columns", columns, "a whole number");
  return { columns, language: `<p>${escapeHtml(languageKey)}</p>` }; // {{columns}} and {{language}}
}
```

`content` is the component's text in that language as HTML. `texts` holds the texts that its `###` headings start, each as HTML from its heading up to the next one, for components such as the starter's flower that show them one by one; it is empty without such headings. `frontMatter` holds the fields of the text's front matter as they are written. `refuse(setting, value, requirement)` creates the error that stops the build with “Cannot use components.\<name>.columns 2.5: it must be a whole number.”

#### Blocks

In the Markdown of a page, post or doc, a fenced code block with `{{<name>}}` as its language is a block of that component: it shows the component with a text and settings of its own, in that one place.

````markdown
```{{componentFlower}}
---
title: Five petals
petals: 5
---

### The first petal

Its text.
```
````

A block holds what the component's text holds, front matter and Markdown, and both are optional:

- Its front matter adds to the front matter of `content/<language>/components/<name>.md` and replaces the fields of the same name.
- Each of its fields also sets the setting of its name, in place of `components.<name>` in `blyss.config.js`. A value that is JSON, such as `5`, `true`, `"5"` or `[1, 2]`, is taken as such, and any other value as a text.
- Its Markdown replaces that of the component's text. A block without Markdown keeps it, so that a block of front matter alone changes fields and settings only, and an empty block is the component as it is.

The template and the data file of the component serve its blocks unchanged: they receive the fields, the settings and the text of the block as they receive those of the component. If the data file refuses a setting of a block, the build stops with “Cannot build content/en/pages/about.md: its {{\<name>}} block cannot use columns 2.5, which must be a whole number.” A block whose text contains a fenced code block needs a longer fence, such as four backticks. A block that names no component stays a code block, and so does one within a list or a quotation: like the paragraph of a component, a block stands on its own.

## Commands

```bash
npm run build   # build into directories.public
npm start       # serve it on http://localhost:3000
```

Open `http://localhost:3000` locally.

## Hosting

Set `site.baseUrl`, publisher data, and language details in `blyss.config.js`, and the `Sitemap:` URL in `static/robots.txt`, before production deployment.

Blyss does not generate `public/index.html`: configure your static host to redirect `/` to the default language and to answer missing URLs with `/404.html`, as `blyss serve` does.

Websites created by `blyss init` include `static/staticwebapp.config.json`, which configures both for Azure Static Web Apps. Azure's build service may lack Node.js 25 or newer, so their README shows a GitHub Actions workflow that builds the website and uploads `public/` with `skip_app_build: true`. Azure's upload requires an `index.html`, so the workflow adds a stub that the `/` redirect keeps out of sight.

## Content

The URLs follow the files: pages in `content/<language>/pages/` are published below `/<language>/pages/`, such as `pages/about.md` at `/en/pages/about/`, posts below `/<language>/posts/` and docs below `/<language>/book/`. Only `pages/index.md`, the home page, is published at `/<language>/`, and `pages/404.md` at `/<language>/404.html` (see below). `slug` replaces the file name in the URL.

Keep translations linked with the same `translationKey`.

Titles come from front matter, so Markdown body text should begin below the title rather than with another H1.

A paragraph that consists of `{{<name>}}` alone shows the [component](#components) of that name in a page, post or doc, and a fenced code block with `{{<name>}}` as its language, a [block](#blocks), shows it with a text and settings of its own.

Posts can have tags, written as `tags: [Blyss, Markdown]`, `tags: Blyss, Markdown` or a YAML block list. Every build also generates:

- `/<language>/posts/`: all posts of the language, newest first;
- `/<language>/tags/`: all tags of the language with their post counts;
- `/<language>/tags/<tag>/`: the posts with that tag;
- `/sitemap.xml`: every page with `lastmod` (from `dateModified` or `datePublished`) and its `hreflang` alternates.

The archive and tag pages show `pagination.pageSize` posts each and continue at `/<language>/posts/page/<n>/` and `/<language>/tags/<tag>/page/<n>/`, linked with `rel="prev"` and `rel="next"`.

Docs, the pages of a book such as a technical documentation, lie in `content/<language>/book/` and are published below `/<language>/book/`, such as `book/writing/navigation.md` at `/en/book/writing/navigation/`. As in Docusaurus or MkDocs, the directories structure the documentation:

- Each directory is a section, and its `index.md` is the section's start page, whose `title` names the section in the navigation; `book/index.md` is the start page of the whole book. A directory with docs but without `index.md` stops the build with an error.
- `order` in the front matter, a number such as `1` or `2.5`, places a doc or a section among those beside it: lower numbers first, those without an order last, and those with the same order by title.
- Each heading of a doc gets an id from its text, as on GitHub: `## Getting started` becomes `<h2 id="getting-started">`, and the next heading of the same text `getting-started-1`. An id that the templates or the doc's HTML blocks and components already use gets a number, too.
- Docs have the JSON-LD type `TechArticle` and appear in the sitemap, but not in the archive, the tags or `{{recentPosts}}`; they have no tags.

A top-level `pages/404.md` is published at `/<language>/404.html` instead of at its slug. The default language's “not found” page is also published as `/404.html`, which `blyss serve` returns with HTTP status 404 for every missing URL. “Not found” pages are left out of the sitemap; link from them with absolute paths, since they appear at any URL.

Tag URLs use ASCII slugs (`Über Blyss` becomes `/en/tags/uber-blyss/`), and tag pages with the same slug are linked across languages. A tag is displayed as spelled in its newest post. A content file whose URL is already taken by another file or a generated page stops the build with an error.

## Developing Blyss

This repository contains the engine (`bin/`, `src/`), the bundled starter (`starters/lean/`) and the tests (`test/`), but no website. Its `blyss.config.js` previews the starter in place:

```bash
npm install     # install the engine's dependencies; nothing is scaffolded
npm run build   # render starters/lean/ into public/ (git-ignored)
npm start       # serve public/ on http://localhost:3000
npm test        # build, then run the test suite
```

Website content, static assets, templates and components belong in `starters/lean/`, from where `blyss init` copies them into new websites.

## Acknowledgments

Blyss was initially developed with assistance from Microsoft 365 Copilot.
All generated code was reviewed and validated by the project maintainer (Blooniverse).

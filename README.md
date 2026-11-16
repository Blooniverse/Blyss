# Blyss 0.5

Blyss is a lean bilingual Markdown transformer and static-site server for Node.js, published as an npm package.

Ideal for **local-first & Git-based** build & content workflows!

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
- fragments for templates: each Markdown file directly in `content/<language>/`, such as `hero.md` with the hero's texts
- components: a directory per component with its template, stylesheet and script, its texts in every language and its settings, shown by `{{<name>}}` in templates and in Markdown
- optional templates for the home pages and the docs, and a `{{kind}}` placeholder for page-specific styles
- `layout` settings for templates: the site's margin, the hero's padding and the alignments of the home pages and of all other pages and of their hero
- every configured label available in templates as `{{<key>Label}}`
- a paginated post archive and post tags with generated tag pages for each language
- technical documentation in `content/<language>/techdoc/`: sections by directory, a navigation ordered by `order`, a table of contents, heading anchors and links to the previous and the next doc
- localized “not found” pages, served by `blyss serve` for missing URLs
- `sitemap.xml` with `lastmod` dates and `hreflang` alternates
- front matter and localized slugs
- translation matching via `translationKey`
- a language switcher, which `site.languageSwitcher` shows or hides, and `hreflang` alternate links
- Schema.org JSON-LD using a future-proof `@graph`
- static asset copying
- dependency-free Node.js static server
- `blyss init` scaffolding of a bilingual starter website with a slider and an image gallery, ready for Azure Static Web Apps

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
├── components/              # one directory per component (see Components below)
│   ├── heroComponentGallery/
│   │   ├── heroComponentGallery.html     # its template
│   │   ├── heroComponentGallery.css      # published at /components/heroComponentGallery/
│   │   ├── heroComponentGallery.js       # published too: its script for the browser
│   │   └── heroComponentGallery.data.js  # optional: checks its settings for the build
│   └── heroComponentSlider/              # the same four files
├── content/                 # one directory per language of site.languages
│   ├── en/
│   │   ├── hero.md          # the hero's title and texts, a fragment (see Templates)
│   │   ├── components/heroComponentGallery.md # the gallery's title and images
│   │   ├── components/heroComponentSlider.md  # the slider's title and text
│   │   ├── pages/index.md
│   │   ├── pages/about.md
│   │   ├── pages/404.md     # "not found" page
│   │   ├── posts/hello-world.md
│   │   ├── posts/templates.md
│   │   ├── posts/translations.md
│   │   ├── techdoc/index.md # the start page of the documentation
│   │   ├── techdoc/getting-started.md
│   │   ├── techdoc/writing/index.md # the start page of a section
│   │   └── techdoc/writing/navigation.md
│   └── de/
│       ├── hero.md
│       ├── components/heroComponentGallery.md
│       ├── components/heroComponentSlider.md
│       ├── pages/index.md
│       ├── pages/about.md
│       ├── pages/404.md
│       ├── posts/hallo-welt.md
│       ├── posts/uebersetzungen.md
│       ├── posts/vorlagen.md
│       ├── techdoc/index.md
│       ├── techdoc/erste-schritte.md
│       ├── techdoc/schreiben/index.md
│       └── techdoc/schreiben/navigation.md
├── static/                  # copied verbatim into public/
│   ├── assets/css/main.css
│   ├── assets/img/logo.svg  # placeholder logo
│   ├── assets/img/gallery/  # placeholder images of the gallery
│   ├── robots.txt           # references the sitemap
│   └── staticwebapp.config.json  # Azure Static Web Apps redirect and 404 page
├── templates/               # HTML templates (see Templates below)
│   ├── document.html        # the frame of every page
│   ├── home.html            # optional: the home pages /en/ and /de/
│   ├── page.html
│   ├── post.html
│   └── techdoc.html         # optional: the docs below /en/techdoc/ and /de/techdoc/
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
          language: "Language", // optional: this label and those below name what Blyss generates, in English by default
          recentPosts: "Recent posts",
          posts: "Posts",
          tags: "Tags",
          tag: "Tag",
          page: "Page",
          pagination: "Pagination",
          newerPosts: "Newer posts",
          olderPosts: "Older posts",
          techdoc: "Documentation", // names the navigation of the docs
          onThisPage: "On this page", // names the table of contents of a doc
          previous: "Previous",
          next: "Next"
        }
      }
    }
  },
  pagination: { pageSize: 10 }, // optional: posts per archive and tag page
  layout: { // optional: the space around the content and the alignments of the home pages and of all other pages
    margin: "2vmin",
    paddingHero: "1rem", // the space above and below the content of the hero
    alignHome: "center", // or "left"
    alignOther: "left", // or "center" or "centerLeft"
    alignHeroHome: "centerExtra", // or "left" or "center"
    alignHeroOther: "centerExtra" // or "left" or "center"
  },
  components: { // optional: the settings of each component in directories.components, by its name
    heroComponentSlider: { // the starter's slider: its range and the steps marked on it
      start: 1,
      end: 1000,
      steps: [
        { value: 250, description: { en: "Quarter" } } // a description in every language
      ]
    },
    heroComponentGallery: { // the starter's gallery: the heights of its images and the durations of its animations
      heightOverall: "8rem",
      heightCenter: "130%",
      animationSpeedScrolling: "400ms",
      animationSpeedImgEnlargement: "300ms"
    }
  },
  directories: {
    components: "components", // optional
    content: "content",
    public: "public",
    static: "static",
    templates: "templates"
  },
  build: { cleanUrls: true },
  server: { fallbackPort: 3000 }
};
```

`site.languages` lists any number of languages, in the order of the language switcher and of the `hreflang` alternates. The key of a language, such as `en` or `pt-br`, names its directory in `content/` and starts its URLs, so it may contain only lower-case Latin letters, digits and hyphens. Each language needs a `label`, its name in the language switcher, and a `locale`, a language tag such as `"en"` or `"en-GB"`; its `description` serves pages without one of their own. All languages need the same `labels`, so that no page lacks one; the labels of what Blyss generates (`language`, `recentPosts`, `posts`, `tags`, `tag`, `page`, `pagination`, `newerPosts`, `olderPosts`, `techdoc`, `onThisPage`, `previous` and `next`) default to English. `site.defaultLanguage` is the language that `/` redirects to and whose “not found” page is also published as `/404.html`; it defaults to the first language. `site.languageSwitcher` defaults to `true`; `false` leaves `{{languageSwitcher}}` empty, but keeps the `hreflang` alternates. Blyss refuses other values, and content outside the directories of the languages, before it deletes the previous output.

All directories are resolved relative to the website's root. `directories.public` names the generated output directory, which every build deletes and recreates. It must therefore be a subdirectory of the website's root that neither contains nor lies inside `components`, `content`, `static` or `templates`; `blyss build` and `blyss serve` refuse other values, such as `"."`, without deleting anything. `directories.components` defaults to `"components"`; without that directory, a website has no components. `pagination.pageSize` defaults to 10 and must be a whole number greater than 0.

`layout.margin` defaults to `"2vmin"` and `layout.paddingHero` to `"1rem"`; both must be CSS lengths in `px`, `rem`, `vw`, `vh`, `vmin` or `vmax`. The alignments apply to the content and to the hero of the home pages or of all other pages: `layout.alignHome` is `"center"` (the default) or `"left"`, `layout.alignOther` is `"left"` (the default), `"center"` or `"centerLeft"`, and `layout.alignHeroHome` and `layout.alignHeroOther` are `"centerExtra"` (the default), `"left"` or `"center"`; the templates' stylesheet defines what each value looks like. `components` holds the settings of each [component](#components) under its name; the component defines which settings it has, and the starter's README describes those of its slider and gallery. Blyss refuses other values, and settings for a component that does not exist, before it deletes the previous output.

### Templates

Templates belong to each website: Blyss ships no default templates, so customise the ones `blyss init` copies into `templates/`. Blyss renders each page into a content template, then the result into `document.html`:

| Template | Placeholders |
| --- | --- |
| `home.html` (optional, for `/<language>/`), `page.html`, `post.html` | `{{title}}`, `{{description}}`, `{{dateBlock}}`, `{{tags}}` (a post's tag links), `{{content}}` (the Markdown body), `{{<name>}}` (a component) |
| `techdoc.html` (optional, for docs) | The same, and `{{techdocNavigation}}`, `{{techdocToc}}`, `{{techdocPager}}` (see [Content](#content)) |
| `document.html` | `{{content}}`, `{{pageTitle}}`, `{{description}}`, `{{locale}}`, `{{languageKey}}`, `{{canonicalUrl}}`, `{{alternateLinks}}`, `{{jsonLd}}`, `{{languageSwitcher}}`, `{{kind}}`, `{{layoutMargin}}`, `{{layoutPaddingHero}}`, `{{layoutAlign}}`, `{{layoutAlignHero}}`, `{{<key>Label}}`, `{{<name>Title}}`, `{{<name>Content}}`, `{{heroTexts}}`, `{{<name>}}` (a component) |

- Without `home.html` or `techdoc.html`, the home pages or the docs use `page.html`.
- `{{kind}}` is `home`, `page`, `post`, `techdoc`, `list` (archive and tag pages) or `not-found`, for kind-specific styles such as `<body data-kind="{{kind}}">`.
- `{{techdocNavigation}}` lists all docs of the language as nested lists in a `<nav>`, the current doc marked with `aria-current="page"`. `{{techdocToc}}` links to the `##` headings of the doc, each with its `###` headings, and is empty without them. `{{techdocPager}}` links to the previous and the next doc of the navigation with `rel="prev"` and `rel="next"`. All three are empty on other pages and take precedence over components of the same name.
- Each Markdown file directly in `content/<language>/`, such as `hero.md`, is a fragment: Blyss publishes no page for it, but `document.html` shows it on every page of that language as `{{<name>Title}}`, its front matter's `title`, and `{{<name>Content}}`, its Markdown as HTML, such as `{{heroTitle}}` and `{{heroContent}}`. Its name must start with a Latin letter and contain only Latin letters and digits. Without the file, both placeholders are empty, and the other placeholders of `document.html`, such as `{{pageTitle}}`, take precedence.
- `{{heroTexts}}` holds the texts of `hero.md`, as many as it has: each `###` heading starts a text, which runs up to the next one and is never shortened. Each text is a `<div>` that starts with its heading as `<h3>`. Only whitespace and HTML comments may precede the first `###` heading; Blyss refuses other content there.
- `{{layoutMargin}}` is `layout.margin` and `{{layoutPaddingHero}}` is `layout.paddingHero`. `{{layoutAlign}}` and `{{layoutAlignHero}}` are the alignments of the page's content and of its hero: `layout.alignHome` and `layout.alignHeroHome` on the home pages, `layout.alignOther` and `layout.alignHeroOther` on all other pages. For example: `<body data-align="{{layoutAlign}}" data-align-hero="{{layoutAlignHero}}" style="--site-margin: {{layoutMargin}}; --hero-padding: {{layoutPaddingHero}}">`.
- `{{<name>}}` shows the [component](#components) of that name, such as `{{heroComponentSlider}}`. The other placeholders of a template take precedence.
- `{{languageSwitcher}}` links the page to its translations, in the order of `site.languages`; it is empty if `site.languageSwitcher` is `false`.
- Every label of the language is available as `{{<key>Label}}`, such as `{{postsLabel}}` for `labels.posts`. The labels of what Blyss generates default to English, such as “Posts” and “Tags”.

### Components

A component is a self-contained part of a page, such as the starter's slider and its gallery. Like the templates, it belongs to the website: a directory in `components/` that has the component's name and holds its template, next to which its stylesheet and its script can live.

| File or setting | Purpose |
| --- | --- |
| `components/<name>/<name>.html` | The template: the only file that a component needs. |
| `components/<name>/<name>.data.js` | Optional: checks the settings and prepares further values for the template. |
| Every other file in `components/<name>/`, such as `<name>.css` and `<name>.js` | Published at `/components/<name>/`. The template links to its stylesheet and its script itself. |
| `content/<language>/components/<name>.md` | Optional: the texts in that language. |
| `components.<name>` in `blyss.config.js` | Optional: the settings. |

`{{<name>}}` shows the component in every template and, in a paragraph of its own, in the Markdown of a page or post; in code, the placeholder stays as it is. A component can appear several times on a page. Its name must start with a Latin letter and contain only Latin letters and digits.

The template has the following placeholders. Each replaces an earlier one of the same name:

- `{{<key>Label}}`: every label of the page's language.
- `{{<setting>}}`: every setting that is a text, a number or a truth value.
- `{{<field>}}` and `{{content}}`: every field of the front matter of the component's text, such as `{{title}}`, and the Markdown below it as HTML. Without the file, they are empty.
- The values that the data file returns.
- `{{id}}`: `<name>-1` where the component first appears on a page, then `<name>-2` and so on, for ids that must be unique.

Blyss escapes labels, settings and front matter for HTML and inserts the values of the data file as they are. The data file exports one function, which Blyss calls for every language before it deletes the previous output:

```js
export default function ({ settings, languageKey, content, escapeHtml, refuse }) {
  const { columns = 2 } = settings; // components.<name> in blyss.config.js, or {}
  if (!Number.isInteger(columns)) throw refuse("columns", columns, "a whole number");
  return { columns, language: `<p>${escapeHtml(languageKey)}</p>` }; // {{columns}} and {{language}}
}
```

`content` is the component's text in that language as HTML. `refuse(setting, value, requirement)` creates the error that stops the build with “Cannot use components.\<name>.columns 2.5: it must be a whole number.”

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

Keep translations linked with the same `translationKey`.

Titles come from front matter, so Markdown body text should begin below the title rather than with another H1.

A paragraph that consists of `{{<name>}}` alone shows the [component](#components) of that name in a page, post or doc.

Posts can have tags, written as `tags: [Blyss, Markdown]`, `tags: Blyss, Markdown` or a YAML block list. Every build also generates:

- `/<language>/posts/`: all posts of the language, newest first;
- `/<language>/tags/`: all tags of the language with their post counts;
- `/<language>/tags/<tag>/`: the posts with that tag;
- `/sitemap.xml`: every page with `lastmod` (from `dateModified` or `datePublished`) and its `hreflang` alternates.

The archive and tag pages show `pagination.pageSize` posts each and continue at `/<language>/posts/page/<n>/` and `/<language>/tags/<tag>/page/<n>/`, linked with `rel="prev"` and `rel="next"`.

Docs, the pages of the technical documentation, lie in `content/<language>/techdoc/` and are published below `/<language>/techdoc/`, such as `techdoc/writing/navigation.md` at `/en/techdoc/writing/navigation/`. As in Docusaurus or MkDocs, the directories structure the documentation:

- Each directory is a section, and its `index.md` is the section's start page, whose `title` names the section in the navigation; `techdoc/index.md` is the start page of the whole documentation. A directory with docs but without `index.md` stops the build with an error.
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

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

- English and German content trees
- clean localized URLs under `/en/` and `/de/`
- default language redirect from `/` to `/${site.defaultLanguage}/`
- recent-post placeholders via `{{recentPosts}}` that render the newest three posts for the current language
- fragments for templates: each Markdown file directly in `content/<language>/`, such as `hero.md`, with up to seven hero texts
- an optional home-page template and a `{{kind}}` placeholder for page-specific styles
- `layout` and `heroComponent` settings for templates: the site's margin and alignment, and a slider's range and described steps
- every configured label available in templates as `{{<key>Label}}`
- a paginated post archive and post tags with generated tag pages for each language
- localized “not found” pages, served by `blyss serve` for missing URLs
- `sitemap.xml` with `lastmod` dates and `hreflang` alternates
- front matter and localized slugs
- translation matching via `translationKey`
- visible language switchers and `hreflang` alternate links
- Schema.org JSON-LD using a future-proof `@graph`
- static asset copying
- dependency-free Node.js static server
- `blyss init` scaffolding of a bilingual starter website, ready for Azure Static Web Apps

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
├── content/
│   ├── en/
│   │   ├── hero.md          # the hero's title and texts, a fragment (see Templates)
│   │   ├── heroComponentSlider.md # the slider's title and text, a fragment
│   │   ├── pages/index.md
│   │   ├── pages/about.md
│   │   ├── pages/404.md     # "not found" page
│   │   ├── posts/hello-world.md
│   │   ├── posts/templates.md
│   │   └── posts/translations.md
│   └── de/
│       ├── hero.md
│       ├── heroComponentSlider.md
│       ├── pages/index.md
│       ├── pages/about.md
│       ├── pages/404.md
│       ├── posts/hallo-welt.md
│       ├── posts/uebersetzungen.md
│       └── posts/vorlagen.md
├── static/                  # copied verbatim into public/
│   ├── assets/css/main.css
│   ├── assets/img/logo.svg  # placeholder logo
│   ├── assets/js/overlay.js # the slider's value and current step
│   ├── robots.txt           # references the sitemap
│   └── staticwebapp.config.json  # Azure Static Web Apps redirect and 404 page
├── templates/               # HTML templates (see Templates below)
│   ├── document.html        # the frame of every page
│   ├── home.html            # optional: the home pages /en/ and /de/
│   ├── page.html
│   └── post.html
└── public/                  # generated by blyss build
```

### blyss.config.js

```js
export default {
  site: {
    name: "My Site",
    baseUrl: "https://example.com",
    defaultLanguage: "en",
    publisher: {
      type: "Organization",
      name: "My Org",
      url: "https://example.com"
    },
    languages: {
      en: {
        label: "English",
        locale: "en",
        description: "My site description.",
        labels: {
          mainNavigation: "Main navigation",
          home: "Home",
          about: "About",
          language: "Language",
          generatedBy: "Generated by Blyss",
          recentPosts: "Recent posts",
          posts: "Posts", // optional labels of the archive and tag pages
          tags: "Tags",
          tag: "Tag",
          page: "Page", // optional labels of paginated lists
          pagination: "Pagination",
          newerPosts: "Newer posts",
          olderPosts: "Older posts",
          overlay: "Overlay" // any further label, used in templates as {{overlayLabel}}
        }
      }
    }
  },
  pagination: { pageSize: 10 }, // optional: posts per archive and tag page
  layout: { margin: "2vmin", align: "left" }, // optional: the space around the content; "center" centers it
  heroComponent: { // optional: the interactive part of a template's hero; so far a slider
    slider: { // its range and the steps marked on it
      start: 1,
      end: 1000,
      steps: [
        { value: 250, description: { en: "Quarter" } } // a description in every language
      ]
    }
  },
  directories: {
    content: "content",
    public: "public",
    static: "static",
    templates: "templates"
  },
  build: { cleanUrls: true },
  server: { fallbackPort: 3000 }
};
```

All directories are resolved relative to the website's root. `directories.public` names the generated output directory, which every build deletes and recreates. It must therefore be a subdirectory of the website's root that neither contains nor lies inside `content`, `static` or `templates`; `blyss build` and `blyss serve` refuse other values, such as `"."`, without deleting anything. `pagination.pageSize` defaults to 10 and must be a whole number greater than 0.

`layout.margin` defaults to `"2vmin"` and must be a CSS length in `px`, `rem`, `vw`, `vh`, `vmin` or `vmax`; `layout.align` is `"left"` (the default) or `"center"`. `heroComponent.slider.start` and `heroComponent.slider.end` are whole numbers, 0 and 100 by default, and `end` must be greater than `start`. Each of the optional `heroComponent.slider.steps` needs a whole-number `value` from `start` to `end` and a `description` for every language. Blyss refuses other values before it deletes the previous output.

### Templates

Templates belong to each website: Blyss ships no default templates, so customise the ones `blyss init` copies into `templates/`. Blyss renders each page into a content template, then the result into `document.html`:

| Template | Placeholders |
| --- | --- |
| `home.html` (optional, for `/<language>/`), `page.html`, `post.html` | `{{title}}`, `{{description}}`, `{{dateBlock}}`, `{{tags}}` (a post's tag links), `{{content}}` (the Markdown body) |
| `document.html` | `{{content}}`, `{{pageTitle}}`, `{{description}}`, `{{locale}}`, `{{languageKey}}`, `{{canonicalUrl}}`, `{{alternateLinks}}`, `{{jsonLd}}`, `{{languageSwitcher}}`, `{{kind}}`, `{{layoutMargin}}`, `{{layoutAlign}}`, `{{heroComponentSliderStart}}`, `{{heroComponentSliderEnd}}`, `{{heroComponentSliderValue}}`, `{{heroComponentSliderSteps}}`, `{{<key>Label}}`, `{{<name>Title}}`, `{{<name>Content}}`, `{{heroTexts}}` |

- Without `home.html`, the home pages use `page.html`.
- `{{kind}}` is `home`, `page`, `post`, `list` (archive and tag pages) or `not-found`, for kind-specific styles such as `<body data-kind="{{kind}}">`.
- Each Markdown file directly in `content/<language>/`, such as `hero.md`, is a fragment: Blyss publishes no page for it, but `document.html` shows it on every page of that language as `{{<name>Title}}`, its front matter's `title`, and `{{<name>Content}}`, its Markdown as HTML, such as `{{heroTitle}}` and `{{heroContent}}`. Its name must start with a Latin letter and contain only Latin letters and digits. Without the file, both placeholders are empty, and the other placeholders of `document.html`, such as `{{pageTitle}}`, take precedence.
- `{{heroTexts}}` holds the texts of `hero.md`, at most seven: each `###` heading starts a text, which runs up to the next one and is never shortened. Each text is a `<div>` that starts with its heading as `<h3>`. Only whitespace and HTML comments may precede the first `###` heading; Blyss refuses other content there and more than seven texts.
- `{{layoutMargin}}` and `{{layoutAlign}}` are `layout.margin` and `layout.align`, for example for `<body data-align="{{layoutAlign}}" style="--site-margin: {{layoutMargin}}">`.
- `{{heroComponentSliderStart}}` and `{{heroComponentSliderEnd}}` are `heroComponent.slider.start` and `heroComponent.slider.end`; `{{heroComponentSliderValue}}` is the whole number halfway between them, the slider's initial value. `{{heroComponentSliderSteps}}` is an `<ol>` of the steps in ascending order, or nothing without steps. Each `<li>` holds the step's value as `<data>` and its description in the page's language and sets `--position` to the value's place on the slider, from `0%` to `100%`; `aria-current="step"` marks the last step that the initial value reaches. The slider's title and text are the fragment `heroComponentSlider.md`.
- Every label of the language is available as `{{<key>Label}}`, such as `{{postsLabel}}` for `labels.posts`. `{{postsLabel}}` and `{{tagsLabel}}` default to “Posts” and “Tags”.

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

Posts can have tags, written as `tags: [Blyss, Markdown]`, `tags: Blyss, Markdown` or a YAML block list. Every build also generates:

- `/<language>/posts/`: all posts of the language, newest first;
- `/<language>/tags/`: all tags of the language with their post counts;
- `/<language>/tags/<tag>/`: the posts with that tag;
- `/sitemap.xml`: every page with `lastmod` (from `dateModified` or `datePublished`) and its `hreflang` alternates.

The archive and tag pages show `pagination.pageSize` posts each and continue at `/<language>/posts/page/<n>/` and `/<language>/tags/<tag>/page/<n>/`, linked with `rel="prev"` and `rel="next"`.

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

Website content, static assets and templates belong in `starters/lean/`, from where `blyss init` copies them into new websites.

## Acknowledgments

Blyss was initially developed with assistance from Microsoft 365 Copilot.
All generated code was reviewed and validated by the project maintainer (Blooniverse).

# Changelog

## Unreleased

### Breaking changes

- **No bundled default templates**: `src/templates/` was removed because it
  duplicated the starter's templates. Each website keeps its own templates;
  `blyss init` copies them into `templates/`. Point a `directories.templates`
  value of `node_modules/@blooniverse/blyss/src/templates` at a local copy.
- **Reserved list URLs**: every build now generates `/<language>/posts/`,
  `/<language>/tags/` and `/<language>/tags/<slug>/`. A content file at one of
  these URLs stops the build with an error; give it a different slug.
- **Paginated lists**: the archive and each tag page list at most
  `pagination.pageSize` posts (default 10). Older posts continue at
  `<list>/page/<n>/`, which is reserved like the other list URLs.
- **Safe output directory**: `blyss build` and `blyss serve` refuse a
  `directories.public` that is the website's root, lies outside it, or
  contains or lies inside `directories.content`, `static` or `templates`.
  Every build deletes this directory, so `public: "."` used to delete the
  whole website.
- **Not-found page URL**: a top-level `pages/404.md` is published at
  `/<language>/404.html` instead of `/<language>/404/`.

### New features

- **`blyss init [directory]`**: copies the bundled bilingual starter website
  into a new or empty directory (default: the current directory). Non-empty
  directories are refused without changes; a failed copy removes only what it
  created. The new `package.json` gets a name derived from the directory and
  depends on the running Blyss version. It does not install, build, serve,
  initialize Git or access the network.
- **Lean starter**: `starters/lean/` with English and German pages and posts,
  matching `translationKey` values, localized post slugs, templates and one
  small stylesheet. It is published in the npm package and builds into
  `public/`, the conventional output directory of static-site generators
  such as Hugo.
- **Missing configuration**: `blyss build` and `blyss serve` report a missing
  `blyss.config.js` with its absolute path and suggest `blyss init` instead of
  printing `ERR_MODULE_NOT_FOUND`.
- **Tests**: `npm test` runs the CLI test suite in `test/` with `node:test`
  after the build.
- **Post archive**: every build generates `/<language>/posts/`, listing all
  posts of a language newest first.
- **Tags**: posts accept `tags` front matter (`[a, b]`, `a, b` or a YAML block
  list). Posts show them through the `{{tags}}` placeholder and as JSON-LD
  `keywords`; `/<language>/tags/` lists all tags with their post counts and
  `/<language>/tags/<slug>/` lists the posts of each tag.
- **Sitemap**: every build writes `sitemap.xml`, listing every generated
  page with the same `hreflang` alternates as its HTML and, for dated posts,
  `lastmod`.
- **Pagination**: `pagination.pageSize` sets the posts per archive and tag
  page. Pages link to each other with `rel="prev"` and `rel="next"`, using the
  optional labels `page`, `pagination`, `newerPosts` and `olderPosts`.
- **Not-found pages**: `pages/404.md` becomes `/<language>/404.html`, and the
  default language's also `/404.html`. `blyss serve` answers missing URLs with
  `/404.html` and HTTP status 404, or plain text if it does not exist.
  Not-found pages are left out of the sitemap.
- **Azure Static Web Apps**: the starter's `static/staticwebapp.config.json`
  redirects `/` to `/en/` and answers missing URLs with `/404.html`, like
  `blyss serve`. The starter's README shows a GitHub Actions workflow that
  builds with Node.js 25 or newer and uploads `public/` with
  `skip_app_build: true`, adding the `index.html` stub Azure's upload requires.
- **Home template**: an optional `templates/home.html` renders the home pages
  `/<language>/`; without it, they use `page.html`. Content templates also
  receive `{{description}}`.
- **Page kinds**: `{{kind}}` in `document.html` is `home`, `page`, `post`,
  `list` or `not-found`, for example for `<body data-kind="{{kind}}">`.
- **Fragments**: each Markdown file directly in `content/<language>/`, such
  as `hero.md`, is not published as a page; instead, `document.html` shows it
  on every page of its language as `{{<name>Title}}`, the `title` of its
  front matter, and `{{<name>Content}}`. Its name must consist of Latin
  letters and digits and start with a letter.
- **Hero texts**: `{{heroTexts}}` splits `hero.md` at its `###` headings into
  at most seven texts, each a `<div>` in full length. More texts or content
  before the first `###` heading stop the build before the previous output
  is deleted.
- **Labels**: every label of a language is available in templates as
  `{{<key>Label}}`, such as `{{overlayLabel}}`; previously only six labels
  were.
- **Layout**: `layout.margin` sets the space around the content and
  `layout.align: "center"` centers it. Templates receive them as
  `{{layoutMargin}}` and `{{layoutAlign}}`; the defaults are `"2vmin"` and
  `"left"`.
- **Hero component**: `heroComponent.slider` sets the whole-number `start`
  and `end` of a slider, the hero component's first variant, and the `steps`
  marked on it, each with a description in every language. Templates receive
  `{{heroComponentSliderStart}}`, `{{heroComponentSliderEnd}}`,
  `{{heroComponentSliderValue}}` (halfway between them) and
  `{{heroComponentSliderSteps}}`. Invalid layout and hero component settings
  stop the build before the previous output is deleted.

### Changes

- **Engine-only repository**: the repository's own website (root `content/`,
  `static/` and the production deploy workflow) was removed. The root
  `blyss.config.js` now previews `starters/lean/` in place: `npm run build`
  renders it into `public/` and `npm start` serves it.
- **Starter**: adds `static/robots.txt` with a `Sitemap` line, navigation
  links to the archive and tag index, the optional labels `posts`, `tags` and
  `tag`, and sample tags. It also adds English and German not-found pages,
  `static/staticwebapp.config.json`, pagination labels and
  `pagination: { pageSize: 10 }`.
- **Starter design**: a new stylesheet modelled on philippschaffner.ch, with
  the font Titillium Web from Google Fonts and a `70ch` text column. The home
  pages start with the site's title and slogan, centered. Below the page
  follows the hero, an overlay with a slider and the texts of `hero.md`,
  which slides up over the page on large screens and fades it out; elsewhere
  the overlay collapses into a bar that opens it as a panel. Each language
  has two more sample posts. `<main>` moved from `document.html` into the
  content templates, and the footer follows the overlay.
- **Top bar**: the starter's navigation bar stays at the top of the window on
  every page. It shows a placeholder logo, `static/assets/img/logo.svg`, next
  to the navigation and a search field without a function yet, whose text is
  the new label `search`.
- **Starter slider**: the overlay's slider is centered below its heading, an
  `<h2>` with the `title` of `heroComponentSlider.md`, with its value above
  it and its steps and the text of `heroComponentSlider.md` below it. It runs
  from 1 to 1000 with four described steps, all set in `blyss.config.js`, and
  `overlay.js` highlights the last step reached.
- **Starter layout**: `blyss.config.js` sets `layout: { margin: "2vmin",
  align: "left" }`. The margin now applies on every side, replacing the fixed
  `3vmin` at the top and `1.5vmin` and `2vmin` at the sides, and
  `align: "center"` centers everything below the top bar.
- **Build**: content is read and validated before the previous output is
  deleted, and files are processed in sorted order for reproducible output.
  Two content files with the same URL stop the build with an error instead of
  one silently overwriting the other. Generated list pages use the JSON-LD
  type `CollectionPage`.
- **Tests**: recent posts are checked to be the three newest of each language,
  ordered by `datePublished`; the archive, tags, sitemap, JSON-LD escaping and
  build errors are covered too, as are pagination, not-found pages, the Azure
  configuration, refused output directories, the home template and its
  fallback, page kinds, the hero texts, fragments and the layout and hero
  component settings.

### Fixes

- **JSON-LD escaping**: `<`, `>` and `&` are now written as `\u003c`,
  `\u003e` and `\u0026`. The previous replacement was a no-op, so a title
  containing `</script>` could end the JSON-LD script element.

## 0.5.0 — 2026-10-28

### Breaking changes

- `src/build/paths.js` no longer exports path constants. It now exports
  `resolvePaths(projectDir, config)` which resolves all directories relative
  to `projectDir`.
- `src/build/build.js` no longer runs on import. Export `build(projectDir,
  configPath)` and call it explicitly (e.g. from `bin/blyss.js`).
- `src/server/server.js` no longer starts a server on import. Export
  `serve(projectDir, config)` and call it explicitly.

### New features

- **npm package**: published as `@blooniverse/blyss`.
- **CLI**: `bin/blyss.js` provides the `blyss build` and `blyss serve`
  commands; `projectDir` defaults to `process.cwd()`.
- **`package.json`**: `bin`, `files`, and `name` fields set for publishing.
- **`.gitignore`**: `node_modules/` and `public/` excluded from version
  control.
- README updated with installation instructions and site-structure examples.

## 0.4.0

Initial release.

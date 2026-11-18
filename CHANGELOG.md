# Changelog

## 1.0.1 — unreleased

### Breaking changes

- **Checked dates**: a `datePublished` or a `dateModified` that is not a date
  such as `2026-11-10`, or one with its time such as
  `2026-11-10T09:30:00+01:00`, stops the build with a message that names the
  file. Such a value used to be shown as it was written, ordered the posts as
  a text and was left out of `sitemap.xml`.
- **Checked placeholders**: a placeholder that a template of the website
  cannot fill, such as a misspelt `{{pageTitel}}` in `document.html` or a
  label in `page.html`, stops the build with a message that names the
  template; it used to leave a gap in every page. A fragment that only some
  languages have is still empty in the others, and so is a placeholder
  without a value in the template of a component.
- **`x-default`**: the `x-default` alternate of a page, in its head and in
  `sitemap.xml`, is its translation in the default language; a page without
  such a translation has none. It used to be the home page of the default
  language on every page.
- **Arguments of `build` and `serve`**: `blyss build` and `blyss serve` take
  no arguments and end with a message for one, as `blyss init` does for an
  option; they used to ignore arguments such as `--port 4000`.
- **Front matter on single lines**: a field whose value is `>` or `|`, with
  which YAML starts a text of several lines, stops the build with a message
  that names the file; the page used to show the sign and lose the text.
- **Requests other than `GET` and `HEAD`**: `blyss serve` answers them with
  405 instead of the page.
- **Recent posts in a paragraph of their own**: `{{recentPosts}}` lists the
  newest posts only where it is a paragraph of its own, like the placeholder
  of a component. Within a text and in code it stays as it is written, so
  that a page can name it; it used to be replaced everywhere, also in code.
  Give it a line of its own between blank lines.
- **Checked slugs**: a `slug`, or the name of a file or of one of its
  directories, that contains `/`, `\`, `?` or `#` or is `.` or `..` stops the
  build with a message that names the file. Such a slug used to give a broken
  URL, and `slug: ../../page` wrote the page outside the output directory.
- **One page of a language for each `translationKey`**: two pages of one
  language with the same `translationKey` stop the build with a message that
  names both. They used to appear twice in the language switcher and among
  the `hreflang` alternates.
- **Quoted front matter**: a value in quotes, such as
  `title: "Blyss: an introduction"`, is now the text between the quotes, as
  in YAML; it used to keep them. In the front matter of a block, a value such
  as `"5"` still sets the text `5`, not the number.
- **Directories renamed**: `_components/` and `_templates/` are now
  `components/` and `templates/`, published at `/components/<name>/`, and
  `content/` is now `_content/`. Rename them in existing websites and set
  `directories.components`, `directories.templates` and `directories.content`.
- **Page URLs follow their files**: pages in `content/<language>/pages/` are
  published below `/<language>/pages/`, such as `pages/about.md` at
  `/en/pages/about/` instead of `/en/about/`. Only `pages/index.md`, the home
  page, stays at `/<language>/`, and `pages/404.md` at `/<language>/404.html`.
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
  contains or lies inside `directories.components`, `content`, `static` or
  `templates`.
  Every build deletes this directory, so `public: "."` used to delete the
  whole website.
- **Not-found page URL**: a top-level `pages/404.md` is published at
  `/<language>/404.html` instead of `/<language>/404/`.
- **Checked languages**: `blyss build` and `blyss serve` refuse a
  `site.languages` without a language, a language key other than lower-case
  Latin letters, digits and hyphens, a language without a `label` or a
  well-formed `locale` (such as `"en-GB"`, not `"en_GB"`), languages whose
  `labels` differ, a `site.defaultLanguage` that is not one of the languages
  and a `site.languageSwitcher` other than `true` or `false`.
- **Hero and overlay variants in the starter**: the starter's
  `blyss.config.js` switches `componentSliderHero`, `componentGalleryHero`
  and `componentFlowerHero` on or off in the hero and the corresponding
  `…Overlay` variants in the overlay, and holds the settings of each variant
  in `components` instead of `componentSlider`, `componentGallery` and
  `componentFlower`. Their texts moved from `<name>.md` in
  `_content/<language>/components/` to `<name>Hero.md` and `<name>Overlay.md`.
  Rename these settings and files in websites made from the starter.
- **Component names ending in Hero or Overlay**: a component directory named
  like the variant of another, such as `components/componentSliderHero/` next
  to `components/componentSlider/`, stops the build; rename it.
- **Dollar signs start formulas**: in every Markdown text, `$…$` and `$$…$$`
  are now LaTeX formulas. A text between two dollar signs is read as a formula
  if no space follows the first one, no space precedes the second one and no
  digit follows it, and the build stops if it is not valid LaTeX. Write `\$`
  for such a dollar sign; prices such as `$5 and $10` and dollar signs in code
  need no change.
- **Footnote syntax**: in pages, posts and docs, `[^name]` and
  `[^name]: Text` are now footnotes. Previously they were a link and its
  reference definition.
- **Highlighted code**: a fenced code block in a language that highlight.js
  knows now holds `<span class="hljs-…">` elements around the parts of its
  code. Existing websites need the colours of these classes in their
  stylesheet, and Temml's stylesheet and font for formulas: copy
  `static/assets/temml/` and the blocks for formulas, highlighted code and
  footnotes of `static/assets/css/main.css` from the starter, and link
  `/assets/temml/Temml-Local.css` in `templates/document.html`.
- **Dependencies**: Blyss now depends on `temml` and `highlight.js` besides
  `marked`, of which it needs version 18; none of them has
  dependencies of its own.

### New features

- **Further languages**: a third or any further language needs its entry in
  `site.languages`, its directory in `content/` and the texts of its
  components; the starter's README shows how to add one. The language
  switcher and the `hreflang` alternates of the pages and of the sitemap
  follow the order of `site.languages`.
- **Default language**: `site.defaultLanguage` is optional and defaults to the
  first language. `/` redirects to it, its not-found page becomes `/404.html`,
  and the `x-default` alternates point to its home page.
- **Language switcher**: `site.languageSwitcher: false` hides the language
  switcher by leaving `{{languageSwitcher}}` empty, while the `hreflang`
  alternates remain. It defaults to `true`, which the starter sets.
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
  `book`, `list` or `not-found`, for example for
  `<body data-kind="{{kind}}">`.
- **Fragments**: each Markdown file directly in `content/<language>/`, such
  as `heroTexts.md`, is not published as a page; instead, `document.html`
  shows it on every page of its language as `{{<name>Title}}`, the `title` of
  its front matter, and `{{<name>Content}}`. Its name must consist of Latin
  letters and digits and start with a letter.
- **Hero and overlay**: two independent regions accompany the pages, the
  hero on the home pages and the overlay on the kinds of pages of your
  choice. Each has an optional template, `hero.html` or `overlay.html`,
  which `{{hero}}` or `{{overlay}}` shows in `document.html`, and settings of
  its own in `blyss.config.js`: `hero.components` and `overlay.components`
  list its components in their order, each switched on with `true` or off
  with `false`, and `hero.texts` and `overlay.texts` switch its texts on or
  off as a whole. The texts are those of `content/<language>/heroTexts.md`
  and `overlayTexts.md`: each `###` heading starts a text, a `<div>` in full
  length, and content before the first `###` heading stops the build. The
  templates receive them as `{{components}}`, `{{textsTitle}}` and
  `{{texts}}`. A region without a part that is switched on is not shown at
  all.
- **Overlay per kind of page**: `overlay.showOn` switches the overlay on or
  off for the content types `page`, `post` and `book` and for the further
  kinds of pages `home`, `list` and `not-found`, but not for a single page.
- **Synchronised hero and overlay**: `synchroniseHeroOverlay: true` gives the
  overlay the components and the texts of the hero, whatever
  `overlay.components` and `overlay.texts` say; `overlay.showOn` still
  applies. It defaults to `false`.
- **Labels**: every label of a language is available in templates as
  `{{<key>Label}}`, such as `{{overlayLabel}}`; previously only six labels
  were.
- **Layout**: `layout.margin` sets the space around the content, `"2vmin"`
  by default, and `layout.paddingHero` and `layout.paddingOverlay` the space
  above and below the content of the hero and of the overlay, `"1rem"` by
  default. `layout.alignHome` (`"center"` or `"left"`) and
  `layout.alignOther` (`"left"`, `"center"` or `"centerLeft"`) align the
  content of the home pages and of all other pages, `layout.alignHero` and
  `layout.alignOverlay` (`"centerExtra"`, `"left"` or `"center"`) the hero
  and the overlay; the first value is the default. Templates receive the
  margin as `{{layoutMargin}}`, the paddings as `{{layoutPaddingHero}}` and
  `{{layoutPaddingOverlay}}` and the alignments as `{{layoutAlign}}`, that of
  the current page, `{{layoutAlignHero}}` and `{{layoutAlignOverlay}}`.
- **Components**: a directory `_components/<name>/` holds a component: its
  template `<name>.html`, an optional data file `<name>.data.js`, which checks
  its settings and prepares values for the template, and further files such
  as its stylesheet and its script, which are published at
  `/_components/<name>/`. Its texts are `content/<language>/components/<name>.md`
  and its settings `components.<name>` in `blyss.config.js`; the data file
  also receives the front matter of that text and the texts that its `###`
  headings start. `{{<name>}}` shows the component in every template and, in
  a paragraph of its own, in the Markdown of pages and posts, any number of
  times per page; `{{id}}` in its template is unique on the page.
  `directories.components` names the directory, `"_components"` by default.
  Invalid layout, hero, overlay and component settings stop the build before
  the previous output is deleted.
- **Component blocks**: in the Markdown of a page, post or doc, a fenced code
  block with `{{<name>}}` as its language shows a component with a text and
  settings of its own, in that one place. The block holds what the
  component's text holds: its front matter adds to the fields of that text
  and sets the settings of the same names in place of `components.<name>`,
  where a value that is JSON, such as `5`, `true` or `[1, 2]`, is taken as
  such, and its Markdown, if it has any, replaces that of the text. The
  component needs no change for it. A setting of a block that the component
  refuses stops the build with the name of the page before the previous
  output is deleted.
- **Component variants for the hero and the overlay**: every component
  `<name>` has a variant `<name>Hero` and a variant `<name>Overlay`, the same
  component with a text, `_content/<language>/components/<variant>.md`, and
  settings, `components.<variant>`, of its own, so that the hero and the
  overlay show it differently. A variant shares the component's template,
  data file, stylesheet and script and can appear wherever the component can:
  in `hero.components` and `overlay.components`, as `{{<variant>}}` in
  templates and Markdown and in blocks. Its `{{id}}` and the errors of its
  data file carry the variant's name; a variant without settings that its
  data file requires stops only a build that shows it.
- **Books**: the content type `book` publishes each
  Markdown file in `content/<language>/book/` below
  `/<language>/book/`. Each directory is a section whose `index.md` is its
  start page and names it in the navigation; a directory with docs but
  without `index.md` stops the build. The optional template `book.html`
  receives `{{bookNavigation}}`, all docs of the language ordered by the
  new front matter field `order` and by title, `{{bookToc}}`, a table of
  contents of the doc's `##` and `###` headings, and `{{bookPager}}`, the
  links to the previous and the next doc; without it, docs use `page.html`.
  The headings of docs get ids from their text, as on GitHub, numbered where
  the page already uses one. Docs have the kind `book` and the JSON-LD
  type `TechArticle`; the archive, the tags and `{{recentPosts}}` leave them
  out. The new labels `book`, `onThisPage`, `previous` and `next` default
  to English.
- **Formulas**: `$…$` within a text and `$$…$$` on lines of its own are
  LaTeX formulas, which Temml turns into MathML during the build; browsers
  show it without a script. They appear in every Markdown text: in pages,
  posts and docs, in the texts of components, in fragments and in the texts
  of the hero and of the overlay. As in Pandoc, no space follows the first
  dollar sign of a formula within a text or precedes its second one, and no
  digit follows that one; such a formula ends before a code span, and `\$` is
  a dollar sign that starts none. In the description of an image, a formula
  stays as it is written. A formula that is not valid LaTeX stops the build
  with the name of its file before the previous output is deleted.
- **Footnotes**: in pages, posts and docs, `[^name]` refers to the footnote
  that `[^name]: Text` defines on a line of its own; further lines and
  paragraphs of a footnote are indented by four spaces. The footnotes are
  numbered in the order of their first references and follow the text as a
  list, each with a link back to each of its references. A reference stays as
  it is written without a footnote, in the text of a link and in the
  description of an image. Their ids are `fn:1` and `fnref:1`, which no
  heading can have. The new labels `footnotes` and `backToText` name the list
  and the links back for screen readers and default to English.
- **Highlighted code**: highlight.js highlights fenced code in the languages
  it knows during the build; other code stays plain.
- **Code blocks shown by components**: a component's data file can name the
  languages of the fenced code blocks that the component shows, such as
  `export const languages = ["mermaid"]`. A code block in such a language is
  a block of the component with the code as its text, taken as it is, without
  front matter. Such a component takes code instead of Markdown in its
  `{{<name>}}` blocks and in its text file, too: `{{content}}` is the code,
  escaped for HTML. Every data file now also receives `source`, its text as
  it is written. Two components that name the same language stop the build.
- **Diagrams in the starter**: the components `componentMermaid`,
  `componentFlowchart` and `componentVegaLite` show the code blocks in
  `mermaid`, in `flowchart` or `flow` and in `vega-lite` as Mermaid diagrams,
  flowchart.js flowcharts and Vega-Lite charts. The browser draws a diagram
  once it comes near the window and loads its library only then, from the
  URLs in `components.<name>` in `blyss.config.js`: jsDelivr by default, or a
  copy in `static/`, as the starter's README describes. Until then, without
  JavaScript and if a diagram cannot be drawn, its code is shown. A
  `{{<name>}}` block gives one diagram a title and settings of its own, such
  as Mermaid's `theme`; the build stops if the code of a Vega-Lite chart is
  not JSON.
- **Websites below a path**: a website can be hosted below a path of its
  domain, as a GitHub Pages project site is at
  `https://user.github.io/repository/`. With a `site.baseUrl` that has a
  path, the build puts that path before every `href`, `src`, `poster` and
  `action` of a page that starts with a single `/`, so that the content, the
  templates and the components stay as they are, and `blyss serve` serves the
  website below the path, to which `/` redirects. `{{basePath}}` holds the
  path in every template and in the template of a component, whose data file
  receives it as `basePath`, for URLs elsewhere; the starter's diagrams add
  it to their libraries in `static/`. The docs have a workflow for GitHub
  Pages.
- **Help and version**: `blyss --help` lists the commands, and
  `blyss --version` shows the version of Blyss.
- **`blyss init` after `git init`**: a directory that holds nothing but
  `.git` counts as empty, so that a new repository can take the starter.
- **Not-found pages kept out of search engines**: `{{robots}}` in
  `document.html` is `<meta name="robots" content="noindex">` on the
  not-found pages and empty on every other page. Existing websites add the
  placeholder to the head of their `templates/document.html`.

### Changes

- **Order of the starter's book**: the docs follow the way of a new website:
  installation, configuration, templates, components, writing, deployment
  and development. "Writing" holds the section "Book" with the docs "Docs",
  the former "Getting started", and "Navigation", then "Pages and posts",
  the new doc "Translations" and "Markdown spice", the former "Formulas,
  footnotes, code and diagrams". The start page lists the chapters and tells
  about the documentation itself.
- **Tables in the starter**: `static/assets/css/main.css` formats tables as
  GitHub does, with lines around the cells, a bold head and a shade on every
  second row. Existing websites copy the rules for `table`, `th`, `td` and
  `tr` and the two `--table-…` colours.
- **Articles in JSON-LD**: the `BlogPosting` of a post and the `TechArticle`
  of a doc have a `headline`, the title, and an `author`, the publisher of
  the website.
- **Starter home pages**: their title, their slogan and their heading no
  longer end with "(H1)", "(H2)" and "(H3)".
- **Underscored building blocks**: the starter keeps its components and
  templates in `_components/` and `_templates/`: the leading underscore sets
  these building blocks apart from content and static files.
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
  pages start with the site's title and slogan. Below the page follows the
  hero with a slider, a gallery, a flower and the texts of `heroTexts.md`,
  which slides up over the page on large screens and fades it out. The hero
  is as tall as its content with `layout.paddingHero` above and below it; if
  it is shorter than the window, it stops below the top bar while the footer
  follows it. On all other pages, the overlay is a bar at the bottom of the
  window that opens a panel with a slider, a gallery and the texts of
  `overlayTexts.md`. `blyss.config.js` lists its settings in the order of
  their sections, which its first lines name. Each language has two more
  sample posts. `<main>` moved from `document.html` into the content
  templates, and the footer follows the hero and the overlay.
- **Top bar**: the starter's navigation bar stays at the top of the window on
  every page. It shows a placeholder logo, `static/assets/img/logo.svg`, next
  to the navigation and a search field without a function yet, whose text is
  the new label `search`.
- **Starter slider**: the component `componentSlider` follows its
  heading, the `title` of `components/componentSlider.md`, with its value
  above it and its steps and the text of that file below it. It runs from 1
  to 1000 with four described steps, set as `components.componentSlider`
  in `blyss.config.js`, and its script highlights the last step reached. The
  post “Templates and styles” shows a second slider in its text and a third
  in a block, with a title, a range and a text of its own. All headings
  in the hero and in the overlay are `<h3>`, so that they rank below each
  page's own `<h1>` and `<h2>`.
- **Starter gallery**: the component `componentGallery` shows the images
  listed in `components/componentGallery.md` in a strip that its arrows,
  the arrow keys, swiping and scrolling move sideways, and enlarges the image
  in its centre. It starts with its middle image in the centre, so that
  images fill the strip on both sides. A click or a touch on the image in the
  centre, or the Enter or the space key, expands it above the page to 70% of
  the height of the screen, or less if the screen is too narrow for that, so
  that it never outgrows the screen. `components.componentGallery` sets
  `heightOverall`, `heightCenter` (`"130%"` of it by default),
  `heightExpanded` (`"70%"` of the screen by default),
  `animationSpeedScrolling` and `animationSpeedImgEnlargement`. Images load
  lazily, and seven placeholder images come with the starter.
- **Starter flower**: the component `componentFlower` draws a flower with a
  short stem on a transparent background. A click, a touch or the Enter or
  the space key plucks a petal: it twirls around its own axis, a little
  askew, falls to the ground, the bottom of the component, and fades there to
  `opacityFallen`, while its text comes down like a falling leaf. The texts
  are those that the `###` headings of `components/componentFlower.md` start:
  the first belongs to the first petal, and so on.
  `components.componentFlower` sets `petals` (`8`), `colourSystem`
  (`"triadic"` or `"complementary"`), `colourBaseHue` (`202`),
  `animationSpeedFalling` (`"3s"`), `animationSpeedText` (`"3s"`),
  `animationSpeedFading` (`"4s"`), `opacityFallen` (`"30%"`) and
  `fontSizeText` (`"60%"`).
- **Starter layout**: `blyss.config.js` sets `layout.margin` to `"2vmin"`,
  which now applies on every side, replacing the fixed `3vmin` at the top and
  `1.5vmin` and `2vmin` at the sides. The home pages are centered and all
  other pages left-aligned, each with its footer; `"centerLeft"` centers the
  text column but keeps its text left-aligned. The hero and the overlay are
  centered except for their texts, which stay left-aligned with their
  headings (`"centerExtra"`).
- **Starter documentation**: the starter documents the docs in its own
  English and German docs in `content/<language>/book/`, rendered by
  `_templates/book.html` with the navigation beside the doc on wide screens
  and above it otherwise. The top bar links to the documentation, and
  `blyss.config.js` translates its labels.
- **Build**: content is read, validated and rendered before the previous
  output is deleted, and files are processed in sorted order for reproducible
  output.
  Two content files with the same URL stop the build with an error instead of
  one silently overwriting the other. Generated list pages use the JSON-LD
  type `CollectionPage`.
- **Server**: `blyss serve` sends AVIF images as `image/avif`, `.woff2` fonts
  as `font/woff2` and `.mjs` modules as JavaScript, which browsers require of
  modules such as a copy of Mermaid in `static/`.
- **Language order**: the language switcher and the `hreflang` alternates
  list the languages in the order of `site.languages` instead of the
  alphabetical order of their directories, so the starter's switcher now
  shows English before Deutsch.
- **Default labels**: the labels of what Blyss generates (`language`,
  `recentPosts`, `posts`, `tags`, `tag`, `page`, `pagination`, `newerPosts`,
  `olderPosts`, `book`, `onThisPage`, `previous`, `next`, `footnotes` and
  `backToText`) default to English for every use, including their
  `{{<key>Label}}` placeholders; previously only `{{postsLabel}}` and
  `{{tagsLabel}}` had defaults, and the language switcher had none.
- **Starter formulas, footnotes and code**: `templates/document.html` links
  Temml's stylesheet, `static/assets/temml/Temml-Local.css`, which the
  starter ships with its font and its licence, in the version of Temml that
  Blyss uses. `static/assets/css/main.css` styles formulas on lines of their
  own, which scroll sideways if they are wider than the text, footnotes and
  highlighted code, in colours with a contrast of at least 4.5 to 1.
  `blyss.config.js` translates the labels `footnotes` and `backToText` and
  holds the settings of the diagrams. The new doc “Formulas, footnotes, code
  and diagrams” shows all of them in English and in German.
- **Tests**: recent posts are checked to be the three newest of each language,
  ordered by `datePublished`; the archive, tags, sitemap, JSON-LD escaping and
  build errors are covered too, as are pagination, not-found pages, the Azure
  configuration, refused output directories, the home template and its
  fallback, page kinds, the hero and the overlay with their switches, their
  texts and their synchronisation, fragments, components and their blocks,
  the layout and component settings and the language settings: a third
  language, a default language other than the first, a hidden language
  switcher and refused values. Further tests cover the docs: their
  navigation, order, links to the previous and the next doc, heading ids,
  table of contents, JSON-LD, the fallback to `page.html` and refused docs;
  and formulas, footnotes, highlighted code, code blocks shown by components
  and the starter's diagrams, with a check that the starter ships the
  stylesheet and the font of the installed version of Temml.
- **Licence**: `package.json` names the licence of the `LICENSE` file, the
  GNU General Public License v3.0 (`GPL-3.0-only`), instead of MIT, and the
  README states it. It covers the starter as well.
- **Package**: `package.json` has a `repository`, a `homepage`, `bugs` and
  `keywords`, describes Blyss as multilingual, and publishes the scoped
  package publicly (`publishConfig.access`).
- **Tests**: the tests of the starter read its titles, headings and layout
  from the starter, so that a change of its wording no longer fails them, and
  the workflow runs them for `main` and for pull requests to it.
- **Node.js 24 and marked 18**: Blyss runs on Node.js 24 and newer instead
  of 25 and newer, and is tested on the LTS versions 24 and 26. It uses
  `marked` 18.
- **Accessibility of the starter**: the grey of the footer, the dates and the
  captions and the dimmed bar of the overlay have a contrast of at least
  4.5 to 1. A code block has `tabindex="0"`, so that the keyboard can reach
  and scroll it, as has the code of a diagram. Existing websites copy
  `--color202grey` and the `opacity` of `.overlay` from
  `static/assets/css/main.css`.
- **Optional `static/`**: a website without a static directory builds; it
  has no files to copy.
- **Docs**: the docs name `npx @blooniverse/blyss` for `init`, since
  `npx blyss` outside a website fetches an unrelated package of that name.
  The starter's texts and comments name `_content/` and the docs of the book.

### Fixes

- **Directories without their final slash**: `blyss serve` answered a
  request such as `/en` with 404. Like static hosts, it now leads to `/en/`
  with a redirect, which keeps the query and never names another host.
- **Files outside `public/` on Windows**: for a request path that names
  another drive, such as `/D:/notes.txt`, `blyss serve` served that file. It
  now answers every path that leaves `public/` with the "not found" page.
- **Server crashes**: `blyss serve` ended with an error if a request met a
  file that a build was just replacing or that it could not read. Such a
  request is now answered with the "not found" page. A port that is in use is
  named in a message instead of a stack trace.
- **Docs wider than the window**: with `layout.alignOther` set to
  `"centerLeft"` or `"center"`, a doc with a long line of code, a wide table
  or a diagram was wider than its column and the page scrolled sideways. In
  the starter's stylesheet, the doc is now as wide as its column, a wide
  table scrolls sideways like code, and a long word breaks. Existing
  websites copy the rules for `main`, `table` and `.book > main` of
  `static/assets/css/main.css`.
- **Front matter**: a byte order mark at the start of a file no longer hides
  its front matter, the closing `---` may end the file, and a front matter
  without its closing `---` stops the build with the name of its file
  instead of a stack trace.
- **Missing settings and directories**: a website without `site.name`,
  `site.baseUrl`, `site.publisher` or one of its `directories`, without its
  content directory or without `document.html`, `page.html` or `post.html`
  stops the build with a message that names what is missing, before the
  previous output is deleted, instead of a stack trace or of pages titled
  "undefined". Without `server.fallbackPort`, `blyss serve` uses port 3000.
- **Build without `static/`**: the build deleted the previous output and
  then failed.
- **Unbuilt website**: `blyss serve` says in the terminal and in its answer
  that there is no `public/` yet and how to build it, instead of only
  "404 Not Found".
- **Languages**: a language without `labels` no longer crashes the build, a
  missing `site.defaultLanguage` no longer yields `x-default` URLs ending in
  `/undefined/`, and content in a directory that is not a language, such as
  `content/fr/` without `site.languages.fr`, stops the build with an
  actionable message instead of a stack trace.
- **Content sections**: a file in a directory of a language other than
  `pages/`, `posts/`, `book/` and `components/`, such as
  `content/en/docs/`, stops the build with a message that names the file and
  the sections instead of a stack trace after `Unknown content section`.
- **JSON-LD escaping**: `<`, `>` and `&` are now written as `\u003c`,
  `\u003e` and `\u0026`. The previous replacement was a no-op, so a title
  containing `</script>` could end the JSON-LD script element.
- **Empty front matter**: a front matter without fields, `---` followed at
  once by `---`, no longer stops the build as if it lacked its closing
  delimiter.
- **Recent posts**: a `$` in the title of a post, as in `$&`, `$$` or `"$"`,
  no longer corrupts the list of `{{recentPosts}}`; the title is shown as it
  is instead of `{{recentPosts}}`, a single `$` or the text before the list.

## 0.5.0 — 2026-10-28

### Breaking changes

- **Directories renamed**: `_components/` and `_templates/` are now
  `components/` and `templates/`, published at `/components/<name>/`, and
  `content/` is now `_content/`. Rename them in existing websites and set
  `directories.components`, `directories.templates` and `directories.content`.
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

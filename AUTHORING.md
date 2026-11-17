# Authoring content

The URLs follow the files: pages in `_content/<language>/pages/` are published below `/<language>/pages/`, such as `pages/about.md` at `/en/pages/about/`, posts below `/<language>/posts/` and docs below `/<language>/book/`. Only `pages/index.md`, the home page, is published at `/<language>/`, and `pages/404.md` at `/<language>/404.html` (see below). `slug` replaces the file name in the URL.

Keep translations linked with the same `translationKey`.

Titles come from front matter, so Markdown body text should begin below the title rather than with another H1.

A paragraph that consists of `{{<name>}}` alone shows the [component](USAGE.md#components) of that name in a page, post or doc, and a fenced code block with `{{<name>}}` as its language, a [block](USAGE.md#blocks), shows it with a text and settings of its own.

Posts can have tags, written as `tags: [Blyss, Markdown]`, `tags: Blyss, Markdown` or a YAML block list. Every build also generates:

- `/<language>/posts/`: all posts of the language, newest first;
- `/<language>/tags/`: all tags of the language with their post counts;
- `/<language>/tags/<tag>/`: the posts with that tag;
- `/sitemap.xml`: every page with `lastmod` (from `dateModified` or `datePublished`) and its `hreflang` alternates.

The archive and tag pages show `pagination.pageSize` posts each and continue at `/<language>/posts/page/<n>/` and `/<language>/tags/<tag>/page/<n>/`, linked with `rel="prev"` and `rel="next"`.

Docs, the pages of a book such as a technical documentation, lie in `_content/<language>/book/` and are published below `/<language>/book/`, such as `book/writing/navigation.md` at `/en/book/writing/navigation/`. As in Docusaurus or MkDocs, the directories structure the documentation:

- Each directory is a section, and its `index.md` is the section's start page, whose `title` names the section in the navigation; `book/index.md` is the start page of the whole book. A directory with docs but without `index.md` stops the build with an error.
- `order` in the front matter, a number such as `1` or `2.5`, places a doc or a section among those beside it: lower numbers first, those without an order last, and those with the same order by title.
- Each heading of a doc gets an id from its text, as on GitHub: `## Getting started` becomes `<h2 id="getting-started">`, and the next heading of the same text `getting-started-1`. An id that the templates or the doc's HTML blocks and components already use gets a number, too.
- Docs have the JSON-LD type `TechArticle` and appear in the sitemap, but not in the archive, the tags or `{{recentPosts}}`; they have no tags.

A top-level `pages/404.md` is published at `/<language>/404.html` instead of at its slug. The default language's “not found” page is also published as `/404.html`, which `blyss serve` returns with HTTP status 404 for every missing URL. “Not found” pages are left out of the sitemap; link from them with absolute paths, since they appear at any URL.

Tag URLs use ASCII slugs (`Über Blyss` becomes `/en/tags/uber-blyss/`), and tag pages with the same slug are linked across languages. A tag is displayed as spelled in its newest post. A content file whose URL is already taken by another file or a generated page stops the build with an error.


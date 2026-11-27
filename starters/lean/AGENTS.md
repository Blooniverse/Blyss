# Working on this website as an agent

This website is built with [Blyss](https://github.com/Blooniverse/Blyss), a static site generator that turns Markdown into HTML. You write content with a human: each of you adds to it in turns, and every turn stays visible on the page. These rules keep the build passing and the co-authoring visible.

## Where things are

| Path | Holds | You may |
| --- | --- | --- |
| `_content/<language>/pages/`, `posts/`, `book/` and each further book of `books` | Pages, posts and docs, one Markdown file each | Write |
| `_content/<language>/*.md`, `components/` | Fragments of the templates and texts of components | Write if asked |
| `_authoring/` | Briefs, the style guide and the glossary; never published | Read; write briefs if asked |
| `templates/`, `components/`, `static/`, `blyss.config.js` | The design and the settings | Change only if asked |
| `public/` | The output of the last build | Never edit: each build replaces it |

The languages are the keys of `site.languages` in `blyss.config.js`, such as `en` and `de`. Read `_authoring/style-guide.md` and `_authoring/glossary.md` before you write.

## Commands

```bash
npx blyss new post --lang en "A title"   # also page or doc; creates a draft with a valid front matter
npx blyss new post --lang de --key <translationKey> "Ein Titel"   # the translation of a page in another language
npx blyss new doc --book <name> "A title"   # a doc in another book than the first of books in blyss.config.js
npx blyss check --json                   # check everything, drafts included, without writing; exit code 1 on problems
npm run dev                              # serve with drafts on http://localhost:3000, rebuild and reload on each change
```

Run `npx blyss check --json` after every change and fix each entry in `errors`; each names its `file` and, for a front matter, its `line`. The `warnings` list missing translations, which do not stop the build. Create files with `blyss new` rather than by hand: it chooses the file name, the URL and the `translationKey`, and never replaces a file.

## Front matter

Each file starts with a front matter between two lines of `---`. Blyss reads a strict subset of YAML:

- One field per line as `key: value`, its value on that line. `>`, `|` and texts of several lines stop the build.
- Put a value in double quotes if it contains `: ` or ` #`, or starts with a character such as `"`, `[`, `{`, `-` or `#`: `title: "Blyss: an introduction"`.
- Lists are `tags: [Blyss, Markdown]` or items that start with `- `, indented with spaces, never with tabs.
- No field may appear twice.

| Field | For | Value |
| --- | --- | --- |
| `title` | all | The heading of the page. Do not repeat it as `# Heading` in the text. |
| `description` | all | One sentence for search engines and link previews. |
| `translationKey` | all | The same key in every language links the translations. Unique per language. |
| `datePublished`, `dateModified` | posts mostly | `2026-11-26` or `2026-11-26T09:30:00+01:00` |
| `tags` | posts | `[Tag one, Tag two]` |
| `order` | docs | A number that places the doc in the navigation. |
| `slug` | all | Only for a URL other than the file name: lower-case letters, digits, hyphens. |
| `draft` | all | `true` keeps the page out of the build. Only `true` or `false`. |

## Co-authoring in turns

A text that a human and an agent write together consists of contributions, one per turn:

```markdown
:::{contribution}
:by: human
:author: Ada
:date: 2026-11-26
The human's text, in Markdown.
:::

:::{contribution}
:by: agent
:author: Claude
:date: 2026-11-27
Your text, in Markdown.
:::
```

- `:by:` is required: `human` or `agent`. Always write `:by: agent` for your own turns, with your name as `:author:` and today's `:date:`.
- Add your turn below the last one. Never change, shorten or reorder another author's contribution, and never write a turn as `:by: human`.
- Reply to a particular turn by giving it a label on the line above, `(reply-1)=`, and linking to it: `[the question above](#reply-1)`.
- Keep a new post or page as `draft: true` until the human publishes it. Leave publishing to the human.
- Text outside contributions belongs to the human who owns the page. Change it only if asked.

## Markdown

Blyss reads GitHub Flavored Markdown with a few additions; the starter's book documents them in `_content/en/book/writing/`:

- Callouts: `:::{note}` … `:::`, also `tip`, `warning`, `important`, `caution` and the other kinds of MyST, or `> [!NOTE]`.
- Images and figures: `:::{figure} /assets/img/name.jpg` with `:alt:` and a caption as the body. Files lie in `static/`, linked from `/`.
- Formulas: `$…$` within a line, `$$…$$` on lines of their own.
- Diagrams: code blocks in `mermaid`, `flowchart` or `vega-lite`.
- Components: a paragraph of the component's name in double curly braces, or a code block with that as its language for a text and settings of its own.
- Footnotes `[^1]`, labels `(name)=` and references `[](#name)`.

An unknown option of a directive, a link without a text and an invalid date stop the build, and the message tells what to change. Do not write a component's name in double curly braces in running text unless you mean to show it.

## Before you finish

1. `npx blyss check --json` reports `"ok": true`.
2. Every new page has a `translationKey`; translations share it.
3. Your turns are `{contribution}` blocks with `:by: agent`, and no other author's turn has changed.
4. Nothing in `public/` was edited by hand.

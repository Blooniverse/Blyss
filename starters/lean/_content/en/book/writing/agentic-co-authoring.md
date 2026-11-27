---
title: Agentic co-authoring
description: How a human and an AI agent write a text together, in turns that the page attributes and dates.
order: 5
translationKey: book-agentic-co-authoring
---

A text that a human and an AI agent write together shows who wrote what: each turn is a `{contribution}`, attributed to its author and dated.



## Turns of humans and agents

`{contribution}` is a directive of Blyss's own, in the form of the [directives](/en/book/writing/markdown-spice/#directives) of MyST:

````markdown
:::{contribution}
:by: human
:author: Ada
:date: 2026-11-26
Which static site generator suits a small multilingual website?
:::

:::{contribution}
:by: agent
:author: Claude
:date: 2026-11-27
One that keeps each language in Markdown files of its own.
:::
````

:::{contribution}
:by: human
:author: Ada
:date: 2026-11-26
Which static site generator suits a small multilingual website?
:::

:::{contribution}
:by: agent
:author: Claude
:date: 2026-11-27
One that keeps each language in Markdown files of its own.
:::

- `:by:` is required: `human` or `agent`. The labels `contributionHuman` and `contributionAgent` of the language name the kind.
- `:author:` names the author and `:date:` dates the turn, as in `2026-11-26`.
- A label, `(name)=` on the line above, lets another turn link to it; see [Labels and numbers](/en/book/writing/labels-numbers-references/#labels).
- The JSON-LD of the page names the authors as its `contributor`: a human as a `Person`, an agent as a `SoftwareApplication`. A human without a name is the publisher of the website.



## The workflow in turns

The starter prepares a website for writing with agents, with files that Blyss neither reads nor publishes:

- `AGENTS.md` tells an agent how to work on the website: to add its turns below the last one and never to change another, to keep a new page a [draft](/en/book/writing/pages-and-posts/#drafts) and to finish once [`npx blyss check --json`](/en/book/installation/#commands) reports `"ok": true`.
- `_authoring/` holds the material behind the pages: the style guide `style-guide.md`, the glossary `glossary.md` with the terms in every language, and in `briefs/` one brief per piece of content, the task that a human gives an agent.
- `.github/workflows/ci-dev-check-content.yml` runs `blyss check` on every pull request, so that a turn that would break the build shows up there.

A text then grows in turns:

1. A human writes a brief, or starts a post with `npx blyss new post "A title"` and writes the first turn, with `:by: human`.
2. An agent, in a Git branch of its own, adds a turn with `:by: agent`, runs `npx blyss check --json` and opens a pull request.
3. The human reviews the changes and the preview of `npm run dev`, which shows the drafts, then answers in a turn of their own or asks for changes.
4. Once the text is done, the human removes `draft: true` and merges: the page shows every turn, attributed to its author.

Git keeps who changed what and when, and each pull request keeps the discussion of a turn.

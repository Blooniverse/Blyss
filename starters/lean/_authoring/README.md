# Authoring

What you and the agents you work with need to write the content of this website. Blyss neither reads nor publishes this directory: it holds no pages, only the material behind them.

- [`style-guide.md`](style-guide.md): the voice, the tone and the conventions of the website, in every language.
- [`glossary.md`](glossary.md): the terms of the website and their translations.
- [`briefs/`](briefs/): one brief per piece of content, the task that a human gives an agent. Copy [`briefs/_template.md`](briefs/_template.md) to start one.

[`AGENTS.md`](../AGENTS.md) tells an agent how to work on this website, and points it here.

## The workflow in turns

1. A human writes a brief, or starts a post with `npx blyss new post "A title"` and writes the first `{contribution}` block with `:by: human`.
2. An agent, in its own Git branch, adds a turn as a `{contribution}` block with `:by: agent`, runs `npx blyss check --json` and opens a pull request.
3. The human reviews the diff and the preview of `npm run dev`, which shows the drafts, then answers in a turn of their own or asks for changes.
4. Once the text is done, the human removes `draft: true` and merges: the pages show every turn, attributed to its author.

The Git history shows who changed what and when, and the pull requests keep the discussion of each turn. A tool such as n8n, Activepieces or Windmill, or a GitHub Actions workflow, can start the agent's turn when a pull request or an issue gets a label, and the `blyss check` workflow in `.github/workflows/` checks every pull request.

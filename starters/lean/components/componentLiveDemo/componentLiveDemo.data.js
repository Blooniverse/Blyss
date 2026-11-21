// Shows Markdown beside what Blyss makes of it, for a visitor to edit: checks the settings of the component, those of
// a block or of components.componentLiveDemo in blyss.config.js, and prepares the values of its template. The text
// of the component holds its note, the text before its first ### heading, and its examples: each ### heading names
// one, and the first fenced code block below it holds the Markdown of that example, taken as it is. A fence within
// an example is shorter than the fence around it, or of the other kind.
//
// The build reads every example like the text of a page, so that the page shows its result from the start. In the
// browser, the script of the component reads what a visitor writes with the renderer of Blyss, which the build
// publishes for it, and draws the Mermaid diagrams with Mermaid, loaded from libraryMermaid: a URL that starts with
// https:// or, for a copy in static/, with /. Such a copy lies below the path of a website that is hosted below one.
//
// The demo supports what the renderer reads, like the text of a page, of a post or of a doc: Markdown with tables
// and task lists, highlighted code, formulas, callouts, images and figures, footnotes, labels, numbers and
// references. It draws Mermaid diagrams itself. It does not support other components, {{recentPosts}} and front
// matter, which it shows as they are written. In the browser, code is highlighted in the languages that
// highlight.js calls common, and the message of an error is that of the build, in English.
export const renderer = true;

const themes = ["default", "neutral", "dark", "forest", "base"];

// The texts of the controls and of the messages, each of which the front matter of the component's text can set.
const defaults = {
  examples: "Examples",
  editor: "Markdown",
  result: "Result",
  reset: "Reset",
  loading: "Loading the renderer …",
  unavailable: "The live preview cannot be loaded. The examples still show their results.",
  failed: "This text cannot be shown.",
  diagramFailed: "This diagram cannot be shown.",
  diagramUnavailable: "Mermaid cannot be loaded, so the diagram stays code."
};

// The note and the examples of a text.
function partsOf(source) {
  const note = [];
  const examples = [];
  let fence; // of the fenced code block that is being read: the line that closes it, its indentation and its lines
  for (const line of source.replaceAll("\r\n", "\n").split("\n")) {
    const inNote = !examples.length;
    const [, indentation, opening] = /^( {0,3})(`{3,}|~{3,})/.exec(line) ?? [];
    const [, name] = /^ {0,3}###[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/.exec(line) ?? [];
    if (fence) {
      if (fence.closing.test(line)) fence = undefined;
      else fence.lines?.push(line.replace(fence.indentation, ""));
    } else if (opening) {
      fence = {
        closing: new RegExp(`^ {0,3}${opening[0]}{${opening.length},}[ \\t]*$`),
        indentation: new RegExp(`^ {0,${indentation.length}}`)
      };
      // Only the first block below a heading is the Markdown of its example.
      const example = examples.at(-1);
      if (example && !example.lines) fence.lines = example.lines = [];
    } else if (name) {
      examples.push({ name });
      continue;
    }
    if (inNote) note.push(line);
  }
  return { note: note.join("\n"), examples };
}

export default function ({ settings, source, frontMatter, labels, renderDocument, escapeHtml, refuse, basePath = "" }) {
  const { rows = 7, libraryMermaid = "https://cdn.jsdelivr.net/npm/mermaid@12.3.0/dist/mermaid.esm.min.mjs", themeMermaid = "dark" } = settings;
  if (!Number.isInteger(rows) || rows < 2 || rows > 40) throw refuse("rows", rows, "a whole number from 2 to 40");
  if (typeof libraryMermaid !== "string" || !/^(?:https:\/\/|\/(?!\/))\S+$/.test(libraryMermaid)) {
    throw refuse("libraryMermaid", libraryMermaid,
      'the URL of Mermaid, starting with https:// or with /, such as "/assets/mermaid/mermaid.esm.min.mjs"');
  }
  if (!themes.includes(themeMermaid)) throw refuse("themeMermaid", themeMermaid, '"default", "neutral", "dark", "forest" or "base"');

  const { note, examples } = partsOf(source);
  const missing = examples.find(example => !example.lines);
  if (missing) throw refuse("example", missing.name, "a ### heading above a fenced code block that holds its Markdown");
  // Without the script, each example is shown as code. Its result waits in a template, which the script shows.
  const items = examples.map(({ name, lines }) => {
    const markdown = lines.join("\n");
    return `    <li>\n      <h4>${escapeHtml(name)}</h4>\n      <pre tabindex="0"><code>${escapeHtml(markdown)}</code></pre>\n` +
      `      <template>${renderDocument(markdown)}</template>\n    </li>`;
  });
  return {
    ...Object.fromEntries(Object.entries(defaults).map(([key, text]) => [key, escapeHtml(frontMatter[key] || text)])),
    rows,
    libraryMermaid: escapeHtml(libraryMermaid.startsWith("/") ? basePath + libraryMermaid : libraryMermaid),
    themeMermaid,
    // The labels of the language, with which the renderer titles callouts, figures and footnotes in the browser.
    labels: escapeHtml(JSON.stringify(labels)),
    note: renderDocument(note),
    exampleItems: items.join("\n")
  };
}

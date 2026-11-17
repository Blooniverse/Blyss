import hljs from "highlight.js";
import { Marked } from "marked";
import temml from "temml";
import { BlyssError } from "../errors.js";
import { escapeHtml } from "./html.js";

// Every Markdown text of a website is read here, so that formulas and code look the same everywhere.

let origin; // the file whose Markdown is being read, which the errors of its formulas name

// Formulas are LaTeX, which Temml turns into MathML. As in Pandoc, $…$ is a formula within a text: no space follows
// its first $ or precedes its second, and no digit follows that one, so that "$5 and $10" stays a text; it ends
// before a code span, whose ` it cannot contain. $$…$$ is a formula on lines of its own, or one within a text that is
// shown like it.
const displayed = /\$\$((?:\\[\s\S]|[^\\$]|\$(?!\$))+?)\$\$/.source;
const withinText = /\$(?![\s$])((?:\\[\s\S]|[^\\$`])+?)(?<!\s)\$(?!\d)/.source;
const onOwnLines = ` {0,3}${displayed}[ \\t]*(?:\\n+|$)`;
const blockMath = new RegExp(`^${onOwnLines}`);
const inlineMath = new RegExp(`^(?:${displayed}|${withinText})`);
const anyMath = new RegExp(`${displayed}|${withinText}`, "g");

// The MathML of a formula, which is checked only where it is shown.
function toMathMl({ raw, latex, display, file }) {
  try {
    return temml.renderToString(latex, { displayMode: display, throwOnError: true });
  } catch (error) {
    const [written, reason] = [raw, error.message].map(text => text.trim().replace(/\s+/g, " "));
    throw new BlyssError(`Cannot build ${file}: its formula ${written} is not valid LaTeX.\n${reason}\n` +
      "Write \\$ for a dollar sign that starts no formula.", { cause: error });
  }
}

// The start of the first block that matches pattern within the paragraph at the start of src, which ends at the next
// blank line: marked asks for every paragraph, so that the search must not run to the end of the text. Marked reads
// the paragraph from the lines above that start, which must be whole: it knows a line that opens a code block, whose
// code the lines below it are, by the end of that line.
function interrupts(pattern) {
  const next = new RegExp(`\\n(?:[ \\t]*\\n|${pattern})`);
  return src => {
    const match = next.exec(src);
    return match && /\S/.test(match[0]) ? match.index + 1 : -1;
  };
}

const math = {
  extensions: [{
    name: "blockMath",
    level: "block",
    start: interrupts(onOwnLines),
    tokenizer(src) {
      const match = blockMath.exec(src);
      if (match) return { type: "blockMath", raw: match[0], latex: match[1], display: true, file: origin };
    },
    renderer: token => `<div class="math">${toMathMl(token)}</div>\n`
  }, {
    name: "inlineMath",
    level: "inline",
    // The next $ that the text of marked would run over. That text stops by itself before each of the other
    // characters below; only a run of ` or ~ at its start belongs to it.
    start(src) {
      const run = /^[`~]*/.exec(src)[0].length;
      const next = src.slice(run).search(/[$\\<![`*~_]/);
      return next >= 0 && src[run + next] === "$" ? run + next : -1;
    },
    tokenizer(src) {
      const match = inlineMath.exec(src);
      if (match) return { type: "inlineMath", raw: match[0], latex: match[1] ?? match[2], display: match[1] !== undefined, file: origin };
    },
    renderer: toMathMl
  }],
  // The * and _ of a formula neither start nor end an emphasis.
  hooks: {
    emStrongMask: src => src.replace(anyMath, formula => "a".repeat(formula.length))
  },
  // The description of an image is plain text, in which a formula stays as it is written.
  renderer: {
    image(token) {
      token.tokens = token.tokens?.map(part => (part.type === "inlineMath" ? { type: "text", raw: part.raw, text: part.raw } : part));
      return false; // marked shows the image
    }
  }
};

// Code in a language that highlight.js knows is highlighted: the stylesheet colours its hljs-… classes.
const code = {
  renderer: {
    code({ text, lang }) {
      const language = lang?.match(/^\S+/)?.[0];
      const source = text.replace(/\n$/, "");
      const highlighted = language && hljs.getLanguage(language) ? hljs.highlight(source, { language, ignoreIllegals: true }).value : escapeHtml(source);
      return `<pre><code${language ? ` class="language-${escapeHtml(language)}"` : ""}>${highlighted}\n</code></pre>\n`;
    }
  }
};

// Footnotes, as on GitHub: [^name] in a text refers to the footnote that "[^name]: Text" defines on a line of its own,
// whatever the case of the name; further lines and paragraphs of a footnote are indented by four spaces.
const definition = / {0,3}\[\^([^\]\s]+)\]:/.source;
const footnote = new RegExp(`^${definition}[ \\t]*(.*(?:\\n+(?: {4}|\\t).*)*)(?:\\n+|$)`);
const footnotes = {
  extensions: [{
    name: "footnote",
    level: "block",
    start: interrupts(definition),
    tokenizer(src) {
      const match = footnote.exec(src);
      if (!match) return undefined;
      const tokens = this.lexer.blockTokens(match[2].replace(/^(?: {4}|\t)/gm, ""), []);
      return { type: "footnote", raw: match[0], label: match[1].toLowerCase(), tokens };
    },
    renderer: () => "" // shown at the end of the text, see lexDocument
  }, {
    name: "footnoteRef",
    level: "inline", // marked's text stops before every [, so that no start is needed
    // The text of a link and the description of an image cannot hold a link, so a reference stays as it is written.
    tokenizer(src) {
      const match = !this.lexer.state.inLink && /^\[\^([^\]\s]+)\]/.exec(src);
      if (match) return { type: "footnoteRef", raw: match[0], label: match[1].toLowerCase() };
    },
    // So does a reference without a footnote.
    renderer: ({ raw, number, id }) => (number
      ? `<sup class="footnote-ref"><a href="#fn:${number}" id="${id}" role="doc-noteref">${number}</a></sup>` : escapeHtml(raw))
  }]
};

const texts = new Marked(math, code);
const documents = new Marked(math, code, footnotes);

function read(file, lex) {
  origin = file;
  return lex();
}

// The tokens of a Markdown text, and the HTML of such tokens or of the whole text. file names the text in errors.
export const lexMarkdown = (markdown, file) => read(file, () => texts.lexer(markdown));
export const renderTokens = tokens => documents.parser(tokens);
export const renderInlineTokens = tokens => documents.Parser.parseInline(tokens, documents.defaults);
export const renderMarkdown = (markdown, file) => renderTokens(lexMarkdown(markdown, file));

// Calls visit for every token of a text but those within a footnote, which count only once the footnote is shown.
// Unlike marked's walkTokens, it takes no longer for each further token of a long text.
function walk(tokens, visit) {
  for (const token of tokens) {
    visit(token);
    // The tokens within a token: its own, those of the items of a list and those of the cells of a table.
    const parts = token.type === "footnote" ? [] : [token, ...token.items ?? [], ...token.header ?? [], ...(token.rows ?? []).flat()];
    for (const part of parts) if (part.tokens) walk(part.tokens, visit);
  }
}

// The tokens of the text of a page, a post or a doc, which alone has footnotes. They are numbered in the order of
// their first references and follow the text as a list, each with links back to its references. Their ids, fn:1 and
// fnref:1, differ from those of headings, which have no colon. labels are those of the text's language.
export function lexDocument(markdown, file, labels) {
  const tokens = read(file, () => documents.lexer(markdown));
  const defined = new Map();
  walk(tokens, token => {
    if (token.type === "footnote" && !defined.has(token.label)) defined.set(token.label, token);
  });
  const notes = [];
  const refer = reference => {
    const note = reference.type === "footnoteRef" && defined.get(reference.label);
    if (!note) return;
    if (!note.references) Object.assign(note, { number: notes.push(note), references: [] });
    reference.number = note.number;
    reference.id = `fnref:${note.number}${note.references.length ? `:${note.references.length + 1}` : ""}`;
    note.references.push(reference);
  };
  walk(tokens, refer);
  for (const note of notes) walk(note.tokens, refer); // a footnote can refer to further ones
  if (!notes.length) return tokens;
  const items = notes.map(({ number, references, tokens: text }) => {
    const back = references.map(({ id }, count) =>
      `<a href="#${id}" role="doc-backlink" aria-label="${escapeHtml(labels.backToText)}">↩︎${count ? `<sup>${count + 1}</sup>` : ""}</a>`).join(" ");
    const html = renderTokens(text);
    // The links back follow the text of the footnote in its last paragraph, if it ends with one.
    return `<li id="fn:${number}">\n${html.endsWith("</p>\n") ? `${html.slice(0, -5)} ${back}</p>\n` : `${html}<p>${back}</p>\n`}</li>`;
  });
  tokens.push({ type: "html", block: true, raw: "",
    text: `<section class="footnotes" role="doc-endnotes" aria-label="${escapeHtml(labels.footnotes)}">\n<ol>\n${items.join("\n")}\n</ol>\n</section>\n` });
  return tokens;
}

import { BlyssError } from "../errors.js";
import { parseFrontMatter } from "./front-matter.js";
import { escapeHtml } from "./html.js";
import { listOf } from "./settings.js";

// Blyss reads the directives of MyST (https://mystmd.org) for callouts, which MyST calls admonitions, for images,
// for figures and for formulas. A directive is a block between two fences, lines of at least three backticks or of
// at least three colons:
//
//   ```{figure} /assets/img/harbour.jpg          :::{note} A title
//   :alt: Boats at a quay                        The text of the callout.
//   :width: 50%                                  :::
//
//   The caption of the figure.
//   ```
//
// The opening fence names the directive in braces and may give it an argument, such as a title or a URL. Its
// options follow at once: lines of :key: value or, like the front matter of a file, lines of key: value between two
// lines of ---. The rest is its body. The closing fence is at least as long as the opening one, so that a longer
// fence holds a directive or a code block with the same kind of fence. A fence with any other name is what it is in
// Markdown: the start of a code block if it is of backticks, and text if it is of colons.

// The kinds of callouts. The label of a language with the name of a kind is the title of such a callout.
const kinds = ["attention", "caution", "danger", "error", "hint", "important", "note", "seealso", "tip", "warning"];

const refuse = ({ name, file }, option, value, requirement) =>
  new BlyssError(`Cannot build ${file}: its {${name}} directive cannot use ${option} ${JSON.stringify(value)}, which must be ${requirement}.`);

// A directive has only the options that Blyss knows: any other, such as a label, stops the build rather than be
// ignored, so that a page never lacks what its text asks for.
function assertOptions({ name, options, file }, known) {
  const unknown = Object.keys(options).find(option => !known.includes(option));
  if (unknown === undefined) return;
  throw new BlyssError(`Cannot build ${file}: its {${name}} directive has the option "${unknown}", which Blyss does not know.\n` +
    `A {${name}} directive ${known.length ? `can have ${listOf(known, "and")}` : "has no options"}; ` +
    "a line of text that starts like an option follows an empty line.");
}

// The blocks of a text of a directive, read like those of a page whatever holds the directive: within an item of a
// list, marked takes a paragraph for a line of text.
function blocksOf(lexer, markdown) {
  const { top } = lexer.state;
  lexer.state.top = true;
  const tokens = lexer.blockTokens(markdown, []);
  lexer.state.top = top;
  return tokens;
}

// A callout: the text after its name is its title, the first of its blocks. As in MyST, a callout without lines of
// its own takes that text as its text, and one without a title takes it from its first block (see the renderer
// below).
function admonition(directive, lexer) {
  const { name, argument, body, labels } = directive;
  assertOptions(directive, []);
  const title = body && argument ? [{ type: "admonitionTitle", raw: argument, tokens: lexer.inline(argument) }] : [];
  return { type: "admonition", kind: name, label: labels[name], tokens: [...title, ...blocksOf(lexer, body || argument)] };
}

const alignments = ["left", "center", "right"];
// A width is a number, in pixels unless a unit of CSS follows it; a percentage is one of the width of the text.
const cssWidth = /^(?:\d+(?:\.\d+)?|\.\d+)(%|px|em|rem|ch|ex|vw|vh|vmin|vmax|cm|mm|in|pt|pc)?$/;

// An image, whose URL follows the name of the directive, and a figure, which is an image with the body of the
// directive as its caption.
function picture(directive, lexer) {
  const { name, argument, options, body, file } = directive;
  assertOptions(directive, ["alt", "align", "width"]);
  if (!argument) {
    throw new BlyssError(`Cannot build ${file}: its {${name}} directive lacks the URL of its image, which follows its name, ` +
      `as in {${name}} /assets/img/harbour.jpg.`);
  }
  if (name === "image" && body) {
    throw new BlyssError(`Cannot build ${file}: its {image} directive has a text, which an image does not show.\n` +
      "Write the description of the image as :alt:, or its caption in a {figure} directive.");
  }
  const { alt = "", align, width } = options;
  if (typeof alt !== "string") throw refuse(directive, "alt", alt, "a text");
  if (align !== undefined && !alignments.includes(align)) throw refuse(directive, "align", align, listOf(alignments));
  const [length, unit] = (typeof width === "string" && cssWidth.exec(width)) || [];
  if (width !== undefined && !length) {
    throw refuse(directive, "width", width, 'a number, alone or with a unit of CSS, such as "50%", "300px" or "300"');
  }
  return {
    type: "figure",
    name,
    // As in an image of Markdown, a character that a URL cannot hold, such as a space, is encoded.
    url: encodeURI(argument).replace(/%25/g, "%"),
    alt,
    align,
    width: length && (unit ? length : `${length}px`),
    tokens: blocksOf(lexer, body)
  };
}

// A formula on lines of its own, like one between $$ and $$ (see markdown.js).
function math(directive) {
  const { argument, body, file } = directive;
  assertOptions(directive, []);
  if (argument) {
    throw new BlyssError(`Cannot build ${file}: its {math} directive has ${JSON.stringify(argument)} after its name, ` +
      "but its formula stands on the lines below it.");
  }
  if (!body) throw new BlyssError(`Cannot build ${file}: its {math} directive has no formula.`);
  return { type: "blockMath", latex: body, display: true, file };
}

const handlers = { ...Object.fromEntries(kinds.map(kind => [kind, admonition])), image: picture, figure: picture, math };

const named = `[ \\t]*\\{[ \\t]*(${Object.keys(handlers).join("|")})[ \\t]*\\}`;
const opening = new RegExp(`^( {0,3})(\`{3,}|:{3,})${named}([^\\n]*)(?:\\n|$)`);
const option = /^:([^:\s]+):[ \t]*(.*?)[ \t]*$/;

// The options at the start of the content of a directive, and its body: the rest, without the blank lines around it.
function partsOf(content, name, file) {
  let options = {};
  let body = content;
  if (content.startsWith("---\n")) {
    try {
      ({ metadata: options, markdown: body } = parseFrontMatter(content));
    } catch (error) {
      throw new BlyssError(`Cannot build ${file}: the options of its {${name}} directive lack their closing ---.`, { cause: error });
    }
  } else {
    const lines = content.split("\n");
    let count = 0;
    for (let match; (match = option.exec(lines[count] ?? "")); count++) options[match[1]] = match[2];
    body = lines.slice(count).join("\n");
  }
  return { options, body: body.replace(/^(?:[ \t]*\n)+/, "").trimEnd() };
}

const titled = html => `<p class="admonition-title">${html}</p>\n`;

const renderers = {
  admonitionTitle({ tokens }) {
    return titled(this.parser.parseInline(tokens));
  },
  // As in MyST, a callout without a title takes it from its first block, if that is a heading or a paragraph that
  // is bold as a whole, and is otherwise titled by the label of its kind.
  admonition({ kind, label, tokens }) {
    const [first, ...rest] = tokens;
    const bold = first?.type === "paragraph" && first.tokens.length === 1 && first.tokens[0].type === "strong";
    const own = first?.type === "heading" ? first.tokens : bold ? first.tokens[0].tokens : undefined;
    const blocks = first?.type === "admonitionTitle" ? this.parser.parse(tokens)
      : own ? titled(this.parser.parseInline(own)) + this.parser.parse(rest)
        : titled(escapeHtml(label)) + this.parser.parse(tokens);
    return `<div class="admonition ${kind}" role="note">\n${blocks}</div>\n`;
  },
  // The stylesheet of the website places an image or a figure by its class, such as align-center.
  figure({ name, url, alt, align, width, tokens }) {
    const image = `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}"${width ? ` style="width: ${width}"` : ""}>`;
    const aligned = align ? ` class="align-${align}"` : "";
    if (name === "image") return `<p${aligned}>${image}</p>\n`;
    const caption = tokens.length ? `<figcaption>\n${this.parser.parse(tokens)}</figcaption>\n` : "";
    return `<figure${aligned}>\n${image}\n${caption}</figure>\n`;
  }
};

// The extension of marked that reads the directives. reading holds the file of the text that is being read, which
// the errors name, and the labels of its language; interrupts tells where a block starts within a paragraph (see
// markdown.js).
export function directives(reading, interrupts) {
  return {
    extensions: [{
      name: "directive",
      level: "block",
      // A fence of backticks ends a paragraph by itself.
      start: interrupts(` {0,3}:{3,}${named}`),
      tokenizer(src) {
        const match = opening.exec(src);
        if (!match) return undefined;
        const [line, indent, fence, name, argument] = match;
        // As for a code block, the line of a fence of backticks holds no further backtick.
        if (fence[0] === "`" && argument.includes("`")) return undefined;
        const below = src.slice(line.length);
        const closing = new RegExp(`^ {0,3}${fence[0]}{${fence.length},}[ \\t]*(?:\\n|$)`, "m").exec(below);
        // Like the lines of a code block, those of a directive lose the indentation of its opening fence.
        const content = (closing ? below.slice(0, closing.index) : below).replace(new RegExp(`^ {0,${indent.length}}`, "gm"), "");
        const directive = { name, argument: argument.trim(), ...partsOf(content, name, reading.file), ...reading };
        return {
          raw: closing ? src.slice(0, line.length + closing.index + closing[0].length) : src,
          ...handlers[name](directive, this.lexer)
        };
      }
    }, ...Object.entries(renderers).map(([name, renderer]) => ({ name, renderer }))]
  };
}

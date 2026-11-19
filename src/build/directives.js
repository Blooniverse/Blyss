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

// A directive has only the options that Blyss knows: any other stops the build rather than be ignored, so that a
// page never lacks what its text asks for.
function assertOptions({ name, options, file }, known) {
  const unknown = Object.keys(options).find(option => !known.includes(option));
  if (unknown === undefined) return;
  throw new BlyssError(`Cannot build ${file}: its {${name}} directive has the option "${unknown}", which Blyss does not know.\n` +
    `A {${name}} directive ${known.length ? `can have ${listOf(known, "and")}` : "has no options"}; ` +
    "a line of text that starts like an option follows an empty line.");
}

// An option that is on by itself, as in :open:, and by true, and off by false.
function flagOf(directive, option) {
  const value = directive.options[option];
  if (value === undefined) return undefined;
  if (value === "" || value === "true" || value === "false") return value !== "false";
  throw refuse(directive, option, value, "true or false");
}

// A label names an element of a page as its id, so that a link such as [Figure 1](#fig-harbour) leads to it. A figure
// or a formula with a label is numbered in the order of its page, and so is one whose option enumerated, or
// numbered, is on; that option can also switch the number off. Only the text of a page, of a post or of a doc has
// labels and numbers, as it alone has footnotes: any other text, such as that of a component, can stand on a page
// several times.
const labelName = /^[\p{L}\p{N}][\p{L}\p{N}_.:-]*$/u;
const onlyDocuments = "but only the text of a page, of a post or of a doc has labels and numbers";

function labelOf(directive) {
  const { name, options, file, document } = directive;
  const label = options.label ?? options.name;
  const enumerated = flagOf(directive, options.enumerated === undefined ? "numbered" : "enumerated");
  if ((label !== undefined || enumerated !== undefined) && !document) {
    throw new BlyssError(`Cannot build ${file}: its {${name}} directive has a label or a number, ${onlyDocuments}.`);
  }
  return { label, enumerated };
}

// The classes of a callout, its option class: names for the stylesheet of the website.
function classesOf(directive) {
  const value = directive.options.class ?? "";
  const classes = typeof value === "string" ? value.split(/\s+/).filter(Boolean) : [];
  if (typeof value !== "string" || !classes.every(name => /^-?[_a-zA-Z][\w-]*$/.test(name))) {
    throw refuse(directive, "class", value, 'the names of classes, each of letters, digits, hyphens and underscores, such as "dropdown"');
  }
  return classes;
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
// below). {admonition} is a callout without a kind of its own: it has the title that it is given, or none, and
// the colour of the kind that one of its classes names. The class dropdown makes a callout one that opens at a
// click, and so does the option open, which tells whether it is open from the start.
function admonition(directive, lexer) {
  const { name, argument, body, labels } = directive;
  assertOptions(directive, ["class", "open", "label", "name"]);
  const ownKind = name !== "admonition";
  const open = flagOf(directive, "open");
  const classes = new Set(["admonition", ...(ownKind ? [name] : []), ...classesOf(directive), ...(open === undefined ? [] : ["dropdown"])]);
  const title = body && argument ? [{ type: "admonitionTitle", raw: argument, tokens: lexer.inline(argument) }] : [];
  return {
    type: "admonition",
    ownKind,
    classes: [...classes],
    open: open === true,
    title: ownKind ? labels[name] : undefined,
    label: labelOf(directive).label,
    tokens: [...title, ...blocksOf(lexer, body || argument)]
  };
}

// As on GitHub, a quotation that starts with [!NOTE], [!TIP], [!IMPORTANT], [!WARNING] or [!CAUTION] is a callout
// of that kind, titled by the label of its kind. Each of its lines starts with >.
const alert = /^ {0,3}>[ \t]?\[!(note|tip|important|warning|caution)\]([^\n]*)((?:\n {0,3}>[^\n]*)*)(?:\n|$)/i;

function alertOf(match, labels, lexer) {
  const kind = match[1].toLowerCase();
  const title = labels[kind];
  const text = `${match[2].trim()}${match[3].replace(/^ {0,3}>[ \t]?/gm, "")}`.replace(/^(?:[ \t]*\n)+/, "");
  return {
    type: "admonition",
    raw: match[0],
    ownKind: true,
    classes: ["admonition", kind],
    open: false,
    title,
    tokens: [{ type: "admonitionTitle", raw: "", tokens: [{ type: "text", raw: title, text: title, escaped: false }] }, ...blocksOf(lexer, text)]
  };
}

const alignments = ["left", "center", "right"];
// A width is a number, in pixels unless a unit of CSS follows it; a percentage is one of the width of the text.
const cssWidth = /^(?:\d+(?:\.\d+)?|\.\d+)(%|px|em|rem|ch|ex|vw|vh|vmin|vmax|cm|mm|in|pt|pc)?$/;

// As in an image of Markdown, a character that a URL cannot hold, such as a space, is encoded.
const urlOf = url => encodeURI(url).replace(/%25/g, "%");

// An image, whose URL follows the name of the directive, and a figure, which is an image with the body of the
// directive as its caption. As in MyST, a figure without a URL shows the images of its body side by side (see
// picturesOf below).
function picture(directive, lexer) {
  const { name, argument, options, body, file, labels } = directive;
  const figure = name === "figure";
  assertOptions(directive, ["alt", "align", "width", "label", "name", ...(figure ? ["enumerated", "numbered"] : [])]);
  if (!argument && !figure) {
    throw new BlyssError(`Cannot build ${file}: its {image} directive lacks the URL of its image, which follows its name, ` +
      "as in {image} /assets/img/harbour.jpg.");
  }
  if (!figure && body) {
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
    file,
    url: argument ? urlOf(argument) : undefined,
    alt,
    align,
    width: length && (unit ? length : `${length}px`),
    word: labels.figure,
    ...labelOf(directive),
    tokens: blocksOf(lexer, body)
  };
}

// The images of a figure without a URL, which are the paragraphs of its body that hold nothing but images, and its
// caption, the rest of its body.
function picturesOf({ url, tokens, file }) {
  if (url !== undefined) return { images: [], caption: tokens };
  const isBlank = part => part.type === "br" || (part.type === "text" && !part.text.trim());
  const holdsImages = token => token.type === "paragraph" && token.tokens.some(part => part.type === "image") &&
    token.tokens.every(part => part.type === "image" || isBlank(part));
  const images = tokens.filter(holdsImages).flatMap(token => token.tokens.filter(part => part.type === "image"));
  if (!images.length) {
    throw new BlyssError(`Cannot build ${file}: its {figure} directive lacks its image: the URL of one follows its name, ` +
      "as in {figure} /assets/img/harbour.jpg, or its body holds images, each as ![description](URL).");
  }
  return { images, caption: tokens.filter(token => !holdsImages(token)) };
}

// A formula on lines of its own, like one between $$ and $$ (see markdown.js).
function math(directive) {
  const { argument, body, file } = directive;
  assertOptions(directive, ["label", "name", "enumerated", "numbered"]);
  if (argument) {
    throw new BlyssError(`Cannot build ${file}: its {math} directive has ${JSON.stringify(argument)} after its name, ` +
      "but its formula stands on the lines below it.");
  }
  if (!body) throw new BlyssError(`Cannot build ${file}: its {math} directive has no formula.`);
  return { type: "blockMath", latex: body, display: true, file, ...labelOf(directive) };
}

const handlers = { ...Object.fromEntries(["admonition", ...kinds].map(kind => [kind, admonition])), image: picture, figure: picture, math };

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
const idOf = label => (label === undefined ? "" : ` id="${escapeHtml(label)}"`);
const classOf = classes => (classes.length ? ` class="${classes.join(" ")}"` : "");

const renderers = {
  // The title of a callout is its first block, the text after its name. As in MyST, a callout of a kind without
  // one takes it from its first block, if that is a heading or a paragraph that is bold as a whole, and is otherwise
  // titled by the label of its kind. A dropdown is a <details>, which opens at a click without a script.
  admonition({ ownKind, classes, open, label, title, tokens }) {
    const [first, ...rest] = tokens;
    const bold = first?.type === "paragraph" && first.tokens.length === 1 && first.tokens[0].type === "strong";
    const own = first?.type === "admonitionTitle" || (ownKind && first?.type === "heading") ? first.tokens
      : ownKind && bold ? first.tokens[0].tokens : undefined;
    const heading = own ? this.parser.parseInline(own) : title === undefined ? undefined : escapeHtml(title);
    const blocks = this.parser.parse(own ? rest : tokens);
    if (classes.includes("dropdown")) {
      const summary = heading === undefined ? "" : `<summary class="admonition-title">${heading}</summary>\n`;
      return `<details${classOf(classes)}${idOf(label)}${open ? " open" : ""}>\n${summary}${blocks}</details>\n`;
    }
    return `<div${classOf(classes)} role="note"${idOf(label)}>\n${heading === undefined ? "" : titled(heading)}${blocks}</div>\n`;
  },
  // The stylesheet of the website places an image or a figure by its class, such as align-center. A numbered figure
  // starts its caption with its number, and the images of one without a URL are figures within it, each with a
  // letter and its description as its caption.
  figure(token) {
    const { name, url, alt, align, width, label, number, word } = token;
    const image = (source, description, id = "") =>
      `<img${id} src="${escapeHtml(source)}" alt="${escapeHtml(description)}"${width ? ` style="width: ${width}"` : ""}>`;
    const aligned = align ? [`align-${align}`] : [];
    if (name === "image") return `<p${classOf(aligned)}>${image(url, alt, idOf(label))}</p>\n`;
    const { images, caption } = picturesOf(token);
    let text = this.parser.parse(caption);
    if (number !== undefined) {
      const counted = `<span class="caption-number">${escapeHtml(word)} ${number}${text ? ":" : ""}</span>`;
      text = text.startsWith("<p>") ? `<p>${counted} ${text.slice(3)}` : `<p>${counted}</p>\n${text}`;
    }
    const parts = images.map(({ href, text: description }, index) => {
      const letter = String.fromCharCode(97 + index);
      return `<figure${idOf(label && `${label}-${letter}`)}>\n${image(urlOf(href), description)}\n` +
        `<figcaption><span class="caption-number">(${letter})</span>${description ? ` ${escapeHtml(description)}` : ""}</figcaption>\n</figure>\n`;
    });
    return `<figure${idOf(label)}${classOf([...(images.length ? ["subfigures"] : []), ...aligned])}>\n` +
      `${url === undefined ? parts.join("") : `${image(url, alt)}\n`}${text ? `<figcaption>\n${text}</figcaption>\n` : ""}</figure>\n`;
  },
  // A block with a label that is no heading, callout, figure or formula, which have ids of their own, stands
  // within an element with that id, which the tokens around it open and close: its own token stays where a page
  // finds the block of a component (see renderBody in render.js).
  target: () => ""
};

// The tokens that take a label as their own id.
const labelling = ["heading", "admonition", "figure", "blockMath"];
const html = text => ({ type: "html", block: true, raw: "", text });
// (label)= on a line of its own, which names the block below it.
const target = / {0,3}\(([^()\s]+)\)=[ \t]*(?:\n+|$)/.source;
const targetLine = new RegExp(`^${target}`);

// Gives the text of a page, of a post or of a doc its labels, once it is read: texts are that text and those of its
// footnotes, in the order in which the page shows them. (label)= on a line of its own names the block below it; a
// formula can also name itself by \label{…}. A figure with a label is numbered in that order, and a formula with
// one is to be (see numberFormulas in markdown.js), unless their option enumerated says otherwise. Returns the
// labels, each of which is the id of one element. A link to a part of the page needs a text: unlike MyST, Blyss
// does not fill in the text of a reference.
export function labelDocument(texts, file) {
  const labels = new Set();
  let figures = 0;
  const claim = label => {
    if (typeof label !== "string" || !labelName.test(label)) {
      throw new BlyssError(`Cannot build ${file}: its label ${JSON.stringify(label)} must be a name of letters, digits, hyphens, ` +
        'underscores, full stops and colons, such as "fig-harbour".');
    }
    if (labels.has(label)) {
      throw new BlyssError(`Cannot build ${file}: it has the label "${label}" twice, but a label names one element of a page.`);
    }
    labels.add(label);
  };
  const visit = level => {
    for (const [index, token] of level.entries()) {
      if (token.type === "footnote") continue; // one of the texts, if the page shows it
      if (token.type === "target") {
        const below = level.findIndex((block, at) => at > index && block.type !== "space");
        const block = level[below];
        if (!block || block.type === "target" || block.label !== undefined) {
          throw new BlyssError(`Cannot build ${file}: its label (${token.label})= must stand above a block that has no other label.`);
        }
        if (labelling.includes(block.type)) {
          block.label = token.label;
        } else {
          claim(token.label);
          level.splice(below, 1, html(`<div${idOf(token.label)}>\n`), block, html("</div>\n"));
        }
        continue;
      }
      if (token.type === "link" && !token.tokens?.length && token.href.startsWith("#")) {
        throw new BlyssError(`Cannot build ${file}: its link to ${token.href} has no text.\n` +
          `Blyss does not fill in the text of a reference: write it, as in [Figure 1](${token.href}).`);
      }
      if (token.type === "blockMath" && token.label === undefined) {
        const [command, label] = /\\label\{([^{}]*)\}/.exec(token.latex) ?? [];
        if (command) Object.assign(token, { label, latex: token.latex.replace(command, "") });
      }
      const hasLabel = labelling.includes(token.type) && token.label !== undefined;
      if (hasLabel) claim(token.label);
      if (token.type === "blockMath" && hasLabel) token.enumerated ??= true;
      if (token.type === "figure" && token.name === "figure" && (token.enumerated ?? hasLabel)) token.number = ++figures;
      if (token.type === "figure" && hasLabel) {
        picturesOf(token).images.forEach((image, at) => claim(`${token.label}-${String.fromCharCode(97 + at)}`));
      }
      for (const part of [token, ...token.items ?? [], ...token.header ?? [], ...(token.rows ?? []).flat()]) {
        if (Array.isArray(part.tokens)) visit(part.tokens);
      }
    }
  };
  texts.forEach(visit);
  return labels;
}

// The extension of marked that reads the directives. reading holds the file of the text that is being read, which
// the errors name, the labels of its language, and whether it is the text of a page, of a post or of a doc;
// interrupts tells where a block starts within a paragraph (see markdown.js).
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
    }, {
      name: "alert",
      level: "block", // a quotation ends a paragraph by itself
      tokenizer(src) {
        const match = alert.exec(src);
        if (match) return alertOf(match, reading.labels, this.lexer);
      }
    }, {
      name: "target",
      level: "block",
      start: interrupts(target),
      tokenizer(src) {
        const match = reading.document && targetLine.exec(src);
        if (match) return { type: "target", raw: match[0], label: match[1] };
      }
    }, ...Object.entries(renderers).map(([name, renderer]) => ({ name, renderer }))],
    // A heading with a label has it as its id.
    renderer: {
      heading({ tokens, depth, label }) {
        return label === undefined ? false : `<h${depth}${idOf(label)}>${this.parser.parseInline(tokens)}</h${depth}>\n`;
      }
    }
  };
}

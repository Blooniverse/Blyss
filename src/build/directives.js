import { BlyssError } from "../errors.js";
import { dateAdvice, isDate } from "./dates.js";
import { readFrontMatter } from "./front-matter.js";
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

// The token of a text that Blyss writes itself, such as the title of an alert or the number of a figure.
const words = (text, escaped = false) => ({ type: "text", raw: text, text, escaped });

// A callout: the text after its name is its title, the first of its blocks. As in MyST, a callout without lines of
// its own takes that text as its text, and one without a title takes it from its first block (see titleOf
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
    tokens: [{ type: "admonitionTitle", raw: "", tokens: [words(title)] }, ...blocksOf(lexer, text)]
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

// A turn of a text that several authors write in turns, such as a post that a person starts, an agent extends and
// the person answers: by tells whether a human or an agent wrote it, author names the one who did and date tells
// when. The label of a language for its kind, contributionHuman or contributionAgent, introduces it.
const authors = ["human", "agent"];

function contribution(directive, lexer) {
  const { argument, options, body, file, labels } = directive;
  assertOptions(directive, ["by", "author", "date", "label"]);
  const { by, author, date } = options;
  if (argument) {
    throw new BlyssError(`Cannot build ${file}: its {contribution} directive has ${JSON.stringify(argument)} after its name, ` +
      "but its options name who wrote it, as in :by: agent and :author: Claude.");
  }
  if (by === undefined) {
    throw new BlyssError(`Cannot build ${file}: its {contribution} directive lacks the option by, which tells who wrote it: ` +
      ":by: human or :by: agent.");
  }
  if (!authors.includes(by)) throw refuse(directive, "by", by, listOf(authors));
  if (author !== undefined && !author.trim()) throw refuse(directive, "author", author, "a name, such as \"Claude\"");
  if (date !== undefined && !isDate(date)) throw refuse(directive, "date", date, `a date.\n${dateAdvice}`);
  if (!body) throw new BlyssError(`Cannot build ${file}: its {contribution} directive has no text.`);
  const word = labels[by === "human" ? "contributionHuman" : "contributionAgent"];
  return { type: "contribution", by, author: author?.trim(), date, word, label: labelOf(directive).label, tokens: blocksOf(lexer, body) };
}

const handlers = {
  ...Object.fromEntries(["admonition", ...kinds].map(kind => [kind, admonition])), image: picture, figure: picture, math, contribution
};

const named = `[ \\t]*\\{[ \\t]*(${Object.keys(handlers).join("|")})[ \\t]*\\}`;
const opening = new RegExp(`^( {0,3})(\`{3,}|:{3,})${named}([^\\n]*)(?:\\n|$)`);
const option = /^:([^:\s]+):[ \t]*(.*?)[ \t]*$/;

// The options at the start of the content of a directive, and its body: the rest, without the blank lines around it.
function partsOf(content, name, file) {
  let options = {};
  let body = content;
  if (content.startsWith("---\n")) {
    ({ metadata: options, markdown: body } = readFrontMatter(content, file, `the options of its {${name}} directive`, "lack their"));
    // A front matter can hold a list or a group of fields, but an option is a text.
    const [nested, value] = Object.entries(options).find(([, value]) => typeof value !== "string") ?? [];
    if (nested !== undefined) throw refuse({ name, file }, nested, value, "a text on the line of the option");
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

// The title of a callout, the tokens of a text, and the blocks below it. The title is its first block, the text
// after its name. As in MyST, a callout of a kind without one takes it from its first block, if that is a heading
// or a paragraph that is bold as a whole, and is otherwise titled by the label of its kind.
function titleOf({ ownKind, tokens }) {
  const [first, ...rest] = tokens;
  const bold = first?.type === "paragraph" && first.tokens.length === 1 && first.tokens[0].type === "strong";
  const own = first?.type === "admonitionTitle" || (ownKind && first?.type === "heading") ? first.tokens
    : ownKind && bold ? first.tokens[0].tokens : undefined;
  return { own, blocks: own ? rest : tokens };
}

const renderers = {
  // A dropdown is a <details>, which opens at a click without a script.
  admonition(token) {
    const { classes, open, label, title } = token;
    const { own, blocks } = titleOf(token);
    const heading = own ? this.parser.parseInline(own) : title === undefined ? undefined : escapeHtml(title);
    const text = this.parser.parse(blocks);
    if (classes.includes("dropdown")) {
      const summary = heading === undefined ? "" : `<summary class="admonition-title">${heading}</summary>\n`;
      return `<details${classOf(classes)}${idOf(label)}${open ? " open" : ""}>\n${summary}${text}</details>\n`;
    }
    return `<div${classOf(classes)} role="note"${idOf(label)}>\n${heading === undefined ? "" : titled(heading)}${text}</div>\n`;
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
  // A contribution starts with its kind, its author and its date; the stylesheet of the website tells the kinds apart
  // by their classes, contribution-human and contribution-agent.
  contribution(token) {
    const { by, author, date, word, label } = token;
    const who = `<span class="contribution-by">${escapeHtml(word)}</span>` +
      (author ? ` <span class="contribution-author">${escapeHtml(author)}</span>` : "");
    const when = date ? ` <time datetime="${escapeHtml(date)}">${escapeHtml(date)}</time>` : "";
    return `<section class="contribution contribution-${by}"${idOf(label)}>\n<p class="contribution-meta">${who}${when}</p>\n` +
      `${this.parser.parse(token.tokens)}</section>\n`;
  },
  // A block with a label that is no heading, callout, figure or formula, which have ids of their own, stands
  // within an element with that id, which the tokens around it open and close: its own token stays where a page
  // finds the block of a component (see renderBody in render.js).
  target: () => ""
};

// The tokens that take a label as their own id.
const labelling = ["heading", "admonition", "figure", "blockMath", "contribution"];
const html = text => ({ type: "html", block: true, raw: "", text });
// (label)= on a line of its own, which names the block below it.
const target = / {0,3}\(([^()\s]+)\)=[ \t]*(?:\n+|$)/.source;
const targetLine = new RegExp(`^${target}`);

// Gives the text of a page, of a post or of a doc its labels, once it is read: texts are that text and those of its
// footnotes, in the order in which the page shows them. (label)= on a line of its own names the block below it; a
// formula can also name itself by \label{…}. A figure with a label is numbered in that order, and a formula with
// one is to be (see numberFormulas in markdown.js), unless their option enumerated says otherwise. Returns the
// element of each label, which has the label as its id: a token or, for an image of a figure, its letter and its
// description.
export function labelDocument(texts, file) {
  const targets = new Map();
  let figures = 0;
  const claim = (label, target) => {
    if (typeof label !== "string" || !labelName.test(label)) {
      throw new BlyssError(`Cannot build ${file}: its label ${JSON.stringify(label)} must be a name of letters, digits, hyphens, ` +
        'underscores, full stops and colons, such as "fig-harbour".');
    }
    if (targets.has(label)) {
      throw new BlyssError(`Cannot build ${file}: it has the label "${label}" twice, but a label names one element of a page.`);
    }
    targets.set(label, target);
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
          claim(token.label, block);
          level.splice(below, 1, html(`<div${idOf(token.label)}>\n`), block, html("</div>\n"));
        }
        continue;
      }
      if (token.type === "blockMath" && token.label === undefined) {
        const [command, label] = /\\label\{([^{}]*)\}/.exec(token.latex) ?? [];
        if (command) Object.assign(token, { label, latex: token.latex.replace(command, "") });
      }
      const hasLabel = labelling.includes(token.type) && token.label !== undefined;
      if (hasLabel) claim(token.label, token);
      if (token.type === "blockMath" && hasLabel) token.enumerated ??= true;
      if (token.type === "figure" && token.name === "figure" && (token.enumerated ?? hasLabel)) token.number = ++figures;
      if (token.type === "figure" && hasLabel) {
        picturesOf(token).images.forEach(({ text }, at) => {
          const letter = String.fromCharCode(97 + at);
          claim(`${token.label}-${letter}`, { type: "part", figure: token, letter, text });
        });
      }
      for (const part of [token, ...token.items ?? [], ...token.header ?? [], ...(token.rows ?? []).flat()]) {
        if (Array.isArray(part.tokens)) visit(part.tokens);
      }
    }
  };
  texts.forEach(visit);
  return targets;
}

// What a reference shows of the element with a label: its number, if it has one, its name, the tokens of a text,
// and the text of a reference that has none of its own. As in MyST, a numbered figure is "Figure 1", after the
// label figure of its language, an image of it "Figure 1a" and a numbered formula "(1)". Anything else is its
// name: the text of a heading, the title of a callout, the first paragraph of the caption of a figure and the
// description of one of its images. A paragraph, a list or an image has neither a number nor a name.
function shownOf(target) {
  if (target.type === "blockMath") {
    const { tag } = target; // as the formula shows it, such as "(1)"
    return tag === undefined ? {} : { number: words(tag.replace(/^\((.*)\)$/, "$1"), true), text: [words(tag, true)] };
  }
  const figure = target.type === "part" ? target.figure : target;
  if (figure.type === "figure" && figure.name === "figure") {
    const [caption] = picturesOf(figure).caption;
    const name = target === figure ? (caption?.type === "paragraph" ? caption.tokens : undefined) : target.text ? [words(target.text)] : undefined;
    if (figure.number === undefined) return { name, text: name };
    const number = `${figure.number}${target.letter ?? ""}`;
    return { number: words(number), name, text: [words(`${figure.word} ${number}`)] };
  }
  const name = target.type === "heading" ? target.tokens
    : target.type === "admonition" ? titleOf(target).own ?? (target.title === undefined ? undefined : [words(target.title)]) : undefined;
  return { name, text: name };
}

// The tokens of a name within a link, which holds neither a link nor the reference of a footnote.
const plain = tokens => tokens.flatMap(token => (token.type === "link" ? plain(token.tokens) : token.type === "footnoteRef" ? []
  : Array.isArray(token.tokens) ? [{ ...token, tokens: plain(token.tokens) }] : [token]));

// {number} and {name} in the text of a reference stand for the number and the name of its target, but not in code;
// %s is the {number} of Sphinx.
const fill = (tokens, values) => tokens.flatMap(token => {
  if (Array.isArray(token.tokens)) return [{ ...token, tokens: fill(token.tokens, values) }];
  if (token.type !== "text") return [token];
  return token.text.split(/(\{number\}|\{name\}|%s)/).flatMap(part => (part === "{name}" ? values.name(part)
    : part === "{number}" || part === "%s" ? [values.number(part)] : part ? [{ ...token, raw: part, text: part }] : []));
});

// Fills in the references of the text of a page, of a post or of a doc, once its labels and its numbers are known.
// As in MyST, a reference is a link to a label of the page, as in [](#fig-harbour): without a text, it shows what
// its label names, and with one, the number and the name of that for {number} and {name}. The build stops at a
// reference that names no label, and at one that asks for a number or a name that its element lacks: MyST shows
// "??", the label or the kind of the element then. A link with a text to another part of the page, such as a heading
// of a doc, stays as it is, and any other link without a text stops the build, as it would show nothing.
export function referDocument(texts, targets, file) {
  const naming = new Set();
  const refer = token => {
    const label = token.href.slice(1);
    const target = targets.get(label);
    const refuse = reason => new BlyssError(`Cannot build ${file}: its reference to #${label} ${reason}`);
    if (!target) {
      if (token.tokens?.length && !token.reference) return;
      throw refuse(`names no label of its page.\nLabel the element that it means, as with (${label})= on the line above it` +
        `${token.reference ? "" : ", or give the link a text"}.`);
    }
    const shown = shownOf(target);
    // The name of an element can hold references itself, which are filled in first.
    if (shown.name && !naming.has(target)) {
      naming.add(target);
      visit(shown.name);
      naming.delete(target);
    }
    const lacks = (what, written) => {
      throw refuse(`asks for ${written}, but the element with that label has no ${what}.\nWrite \\${written} to show these characters themselves.`);
    };
    const values = {
      number: written => shown.number ?? lacks("number", written),
      name: written => (shown.name ? plain(shown.name) : lacks("name", written))
    };
    if (token.tokens?.length) {
      token.tokens = fill(token.tokens, values);
    } else if (shown.text) {
      token.tokens = plain(shown.text);
    } else {
      throw refuse("has nothing to show: the element with that label has neither a number nor a name.\n" +
        `Write the text of the reference, as in [this part](#${label}).`);
    }
  };
  const visit = level => {
    for (const token of level) {
      if (token.type === "footnote") continue; // one of the texts, if the page shows it
      if (token.type === "link" && token.href.startsWith("#")) {
        refer(token);
      } else if (token.type === "link" && !token.tokens?.length) {
        throw new BlyssError(`Cannot build ${file}: its link to ${token.href} has no text.\n` +
          "Only a reference needs none: a link to a label of its own page, such as [](#fig-harbour).");
      }
      for (const part of [token, ...token.items ?? [], ...token.header ?? [], ...(token.rows ?? []).flat()]) {
        if (Array.isArray(part.tokens)) visit(part.tokens);
      }
    }
  };
  texts.forEach(visit);
}

// As in MyST, {ref}, {numref} and {eq} before a code span write a reference as well: {ref}`fig-harbour` is
// [](#fig-harbour), and {numref}`Fig. %s <fig-harbour>` is [Fig. %s](#fig-harbour).
const role = /^\{[ \t]*(?:ref|numref|eq)[ \t]*\}(`+)(?!`)([\s\S]+?)(?<!`)\1(?!`)/;

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
    }, {
      name: "reference",
      level: "inline",
      start: src => src.search(/\{[ \t]*(?:ref|numref|eq)[ \t]*\}`/),
      // The code span holds the label, or a text and the label in angle brackets. The text of a link holds no link.
      tokenizer(src) {
        const match = reading.document && !this.lexer.state.inLink && role.exec(src);
        if (!match) return undefined;
        const [, text = "", label = match[2].trim()] = /^([\s\S]*?)\s*<([^<>\s]+)>$/.exec(match[2].trim()) ?? [];
        return { type: "link", raw: match[0], href: `#${label}`, title: null, text, reference: true, tokens: text ? [words(text)] : [] };
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

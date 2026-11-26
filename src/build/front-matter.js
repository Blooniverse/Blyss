import { BlyssError } from "../errors.js";

// The front matter of a text stands at its start, between two lines of ---. A line "key: value" is a field, whose
// value is the text after its colon. A field without a value holds what the lines below it hold: a list, whose items
// start with "- ", or a group of fields. The items of a list are indented alike, and so are the fields of a group,
// deeper than the line of the field that holds them; a list may also be indented like that line, as in YAML. An item
// of a list is a text or, if it starts with a field, a group: its further fields stand below the first one.
// This is the part of YAML that the settings of a component need. Anything else stays the text that it is, such as
// [1, 2] or {"a": 1}. An empty line holds nothing, and neither does a comment, a line that starts with #.

// A value in quotes is the text between them, as in YAML: title: "Blyss: an introduction".
function unquote(value) {
  const double = /^"((?:[^"\\]|\\.)*)"$/.exec(value);
  if (double) return double[1].replace(/\\(["\\])/g, "$1");
  const single = /^'((?:[^']|'')*)'$/.exec(value);
  return single ? single[1].replaceAll("''", "'") : value;
}

// What a front matter holds, with each of its texts changed by change.
function mapTexts(value, change) {
  if (Array.isArray(value)) return value.map(item => mapTexts(item, change));
  if (typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapTexts(item, change)]));
  return change(value);
}

// What is wrong with a front matter. line counts from the opening ---, the first line, and problem tells what is
// wrong with that line and what to write instead; a front matter without its closing --- has neither.
class FrontMatterError extends Error {
  constructor(line, problem) {
    super(line ? `Line ${line} of the front matter ${problem}` : "The front matter lacks its closing ---.");
    Object.assign(this, { line, problem });
  }
}

const isItem = text => /^-(?:\s|$)/.test(text);
// An item starts with a field if it starts with a name, a colon and a space or the end of the line. Any other item
// with a colon is a text, such as one in quotes, a URL or an object of JSON.
const startsField = text => /^[\p{L}_][\p{L}\p{N}_.-]*:(?:\s|$)/u.test(text);

// The fields of the lines between the two ---.
function readFields(source) {
  const fail = ({ line }, problem) => { throw new FrontMatterError(line, problem); };
  const shown = ({ text }) => JSON.stringify(text);
  // The lines that hold something, each with its number, its indentation and its text.
  const lines = [];
  for (const [index, written] of source.split("\n").entries()) {
    const [space] = /^[ \t]*/.exec(written);
    const entry = { line: index + 2, indent: space.length, text: written.slice(space.length).trimEnd() };
    if (!entry.text || entry.text.startsWith("#")) continue;
    if (space.includes("\t")) fail(entry, "is indented with a tab.\nIndent the items of a list and the fields of a group with spaces.");
    lines.push(entry);
  }
  let at = 0; // the line that is read next
  const next = indent => (lines[at]?.indent === indent ? lines[at++] : undefined);

  // What the lines below a line hold for it: a list or a group that is indented deeper than that line or, for a
  // field, a list that is indented like it. Without such lines, the line holds an empty text.
  function below(indent, isField) {
    const line = lines[at];
    if (line?.indent > indent) return isItem(line.text) ? list(line.indent) : group(line.indent);
    return isField && line?.indent === indent && isItem(line.text) ? list(indent) : "";
  }

  function list(indent) {
    const items = [];
    while (lines[at]?.indent === indent && isItem(lines[at].text)) {
      const entry = lines[at++];
      const [, gap, text] = /^-(\s*)(.*)$/.exec(entry.text);
      // The fields of an item are indented like its first one, which follows the dash.
      if (startsField(text)) items.push(group(indent + 1 + gap.length, { ...entry, text }));
      else items.push(text || below(indent, false));
    }
    return items;
  }

  // The fields of a group. first is the field with which an item of a list starts.
  function group(indent, first) {
    const fields = new Map();
    for (let entry = first ?? next(indent); entry; entry = next(indent)) {
      const colon = entry.text.indexOf(":");
      const key = entry.text.slice(0, Math.max(colon, 0)).trim();
      if (!key || isItem(entry.text)) {
        fail(entry, `is ${shown(entry)}, which is no field.\nWrite a field as in "title: Blyss". ` +
          'The items of a list, as in "- Blyss", stand below a field without a value, such as "tags:".');
      }
      if (fields.has(key)) fail(entry, `sets ${JSON.stringify(key)} a second time.\nRemove one of the two lines.`);
      const value = entry.text.slice(colon + 1).trim();
      // In YAML, > and | start a text of several lines: such a value would be shown as it is, without its text.
      if (/^[>|][+-]?$/.test(value)) {
        fail(entry, `sets ${key} to "${value}", which starts a text of several lines in YAML, but a field is a single line.\n` +
          `Write the text on the line of the field, or "${value}" in quotes if it is the text itself.`);
      }
      fields.set(key, value || below(indent, true));
    }
    return Object.fromEntries(fields);
  }

  const fields = group(lines[0]?.indent ?? 0);
  if (at < lines.length) {
    fail(lines[at], `is ${shown(lines[at])}, which fits none of the lines above it.\nIndent the items of a list alike, each ` +
      'starting with "- ", and the fields of a group alike, both deeper than the field without a value that holds them, such as "steps:".');
  }
  return fields;
}

// The front matter of a text and the Markdown below it. metadata holds the values without the quotes around them,
// written holds them as they are written.
export function parseFrontMatter(source) {
  // Some editors start a file with a byte order mark, which is not part of its text.
  const normalized = source.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n");
  if (!normalized.startsWith("---\n")) return { metadata: {}, written: {}, markdown: normalized };
  // The closing --- may follow the opening one at once, so the search starts at the end of the opening line; it may
  // also end the text.
  const closing = /\n---(?:\n|$)/g;
  closing.lastIndex = 3;
  const end = closing.exec(normalized);
  if (!end) throw new FrontMatterError();
  const written = readFields(normalized.slice(4, end.index));
  return { metadata: mapTexts(written, unquote), written, markdown: normalized.slice(end.index + end[0].length) };
}

// The front matter of a text of file, for the build. what names that front matter in the message of an error, and
// lacks tells that it has no end, in the number of that name: "the options of its {note} directive" lack theirs.
export function readFrontMatter(source, file, what = "its front matter", lacks = "lacks its") {
  try {
    return parseFrontMatter(source);
  } catch (error) {
    if (!(error instanceof FrontMatterError)) throw error;
    const problem = error.line ? `line ${error.line} of ${what} ${error.problem}` : `${what} ${lacks} closing ---.`;
    const failure = new BlyssError(`Cannot build ${file}: ${problem}`, { cause: error });
    // The front matter of a file starts on its first line, so that its lines are those of the file.
    if (error.line && what === "its front matter") failure.line = error.line;
    throw failure;
  }
}

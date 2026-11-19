// A value in quotes is the text between them, as in YAML: title: "Blyss: an introduction".
function unquote(value) {
  const double = /^"((?:[^"\\]|\\.)*)"$/.exec(value);
  if (double) return double[1].replace(/\\(["\\])/g, "$1");
  const single = /^'((?:[^']|'')*)'$/.exec(value);
  return single ? single[1].replaceAll("''", "'") : value;
}

// The fields of the front matter of a text, each on a line of its own as key: value, and the Markdown below it.
// metadata holds the values without the quotes around them, written holds them as they are written.
export function parseFrontMatter(source) {
  // Some editors start a file with a byte order mark, which is not part of its text.
  const normalized = source.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n");
  if (!normalized.startsWith("---\n")) return { metadata: {}, written: {}, markdown: normalized };
  // The closing --- may follow the opening one at once, so the search starts at the end of the opening line; it may
  // also end the text.
  const closing = /\n---(?:\n|$)/g;
  closing.lastIndex = 3;
  const end = closing.exec(normalized);
  if (!end) throw new Error("Front matter is missing its closing --- delimiter.");
  const written = {};
  let listKey; // a key without a value, which may start a YAML block list such as "tags:" and "  - Blyss"
  for (const line of normalized.slice(4, end.index).split("\n")) {
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item && listKey) {
      written[listKey] = [...(written[listKey] || []), item[1].trim()];
      continue;
    }
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key) written[key] = value;
    listKey = key && !value ? key : undefined;
  }
  const metadata = Object.fromEntries(Object.entries(written).map(([key, value]) =>
    [key, Array.isArray(value) ? value.map(unquote) : unquote(value)]));
  return { metadata, written, markdown: normalized.slice(end.index + end[0].length) };
}

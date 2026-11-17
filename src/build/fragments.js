import { relative } from "node:path";
import { marked } from "marked";
import { BlyssError } from "../errors.js";
import { escapeHtml } from "./render.js";

// A Markdown file directly in _content/<language>/, such as heroTexts.md, is a fragment: it is not published, but every
// page of its language can show it in document.html as {{<name>Title}} and {{<name>Content}}. Returns these values by
// language. heroTexts.md and overlayTexts.md also hold the texts of the hero and of the overlay (see regions.js).
export function renderFragments(projectDir, fragments) {
  const valuesByLanguage = new Map();
  for (const { sourceFile, languageKey, name, metadata, markdown } of fragments) {
    const file = relative(projectDir, sourceFile);
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name)) {
      throw new BlyssError(`Cannot build ${file}: templates use its name in placeholders, so it must start with a Latin letter ` +
        "and contain only Latin letters and digits, such as heroTexts.md.");
    }
    const values = valuesByLanguage.get(languageKey) ?? {};
    values[`${name}Title`] = escapeHtml(metadata.title);
    values[`${name}Content`] = marked.parse(markdown);
    valuesByLanguage.set(languageKey, values);
  }
  return valuesByLanguage;
}

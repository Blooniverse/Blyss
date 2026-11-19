import { relative } from "node:path";
import { BlyssError } from "../errors.js";
import { renderMarkdown } from "./markdown.js";
import { escapeHtml } from "./render.js";

// A Markdown file directly in _content/<language>/, such as heroTexts.md, is a fragment: it is not published, but every
// page of its language can show it in document.html as {{<name>Title}} and {{<name>Content}}. Returns these values by
// language, empty for a language that lacks a fragment of another one. heroTexts.md and overlayTexts.md also hold the
// texts of the hero and of the overlay (see regions.js). languages are those of site.languages.
export function renderFragments(projectDir, fragments, languages) {
  const valuesByLanguage = new Map(Object.keys(languages).map(languageKey => [languageKey, {}]));
  for (const { name } of fragments) {
    for (const values of valuesByLanguage.values()) Object.assign(values, { [`${name}Title`]: "", [`${name}Content`]: "" });
  }
  for (const { sourceFile, languageKey, name, metadata, markdown } of fragments) {
    const file = relative(projectDir, sourceFile);
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name)) {
      throw new BlyssError(`Cannot build ${file}: templates use its name in placeholders, so it must start with a Latin letter ` +
        "and contain only Latin letters and digits, such as heroTexts.md.");
    }
    const values = valuesByLanguage.get(languageKey);
    values[`${name}Title`] = escapeHtml(metadata.title);
    values[`${name}Content`] = renderMarkdown(markdown, file, languages[languageKey].labels);
  }
  return valuesByLanguage;
}

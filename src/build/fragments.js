import { relative } from "node:path";
import { marked } from "marked";
import { BlyssError } from "../errors.js";
import { escapeHtml } from "./render.js";

// Whitespace, link reference definitions and comments may precede the first text of the hero.
const isBlank = token =>
  token.type === "space" || token.type === "def" || (token.type === "html" && /^(?:\s*<!--[\s\S]*?-->)+\s*$/.test(token.raw));

// Each ### heading of hero.md starts one of the hero's texts, which runs up to the next one and is never shortened.
function renderHeroTexts(markdown, file) {
  const texts = [];
  for (const token of marked.lexer(markdown)) {
    if (token.type === "heading" && token.depth === 3) texts.push([token]);
    else if (texts.length) texts.at(-1).push(token);
    else if (!isBlank(token)) {
      throw new BlyssError(`Cannot build ${file}: each text of the hero starts with a ### heading, but there is content before the first one.`);
    }
  }
  return texts.map(tokens => `<div>\n${marked.parser(tokens)}</div>`).join("\n");
}

// A Markdown file directly in content/<language>/, such as hero.md, is a fragment: it is not published, but every page
// of its language can show it in document.html as {{<name>Title}} and {{<name>Content}}. Returns these values by language.
export function renderFragments(projectDir, fragments) {
  const valuesByLanguage = new Map();
  for (const { sourceFile, languageKey, name, metadata, markdown } of fragments) {
    const file = relative(projectDir, sourceFile);
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name)) {
      throw new BlyssError(`Cannot build ${file}: templates use its name in placeholders, so it must start with a Latin letter ` +
        "and contain only Latin letters and digits, such as hero.md.");
    }
    const values = valuesByLanguage.get(languageKey) ?? {};
    values[`${name}Title`] = escapeHtml(metadata.title);
    values[`${name}Content`] = marked.parse(markdown);
    if (name === "hero") values.heroTexts = renderHeroTexts(markdown, file);
    valuesByLanguage.set(languageKey, values);
  }
  return valuesByLanguage;
}

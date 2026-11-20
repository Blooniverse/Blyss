import { lexMarkdown, renderTokens } from "./markdown.js";

// Each heading of the selected depth starts a text, which runs up to the next one and is never shortened.
// Returns the rendered texts, the tokens before the first one, and the depths of top-level headings.
export function splitTexts(markdown, file, labels, depth = 3) {
  const texts = [];
  const before = [];
  const headings = [];
  for (const token of lexMarkdown(markdown, file, labels)) {
    if (token.type === "heading") headings.push(token.depth);
    if (token.type === "heading" && token.depth === depth) texts.push([token]);
    else (texts.at(-1) ?? before).push(token);
  }
  return { texts: texts.map(renderTokens), before, headings };
}

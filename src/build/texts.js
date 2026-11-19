import { lexMarkdown, renderTokens } from "./markdown.js";

// Each ### heading of a Markdown text starts one of its texts, which runs up to the next one and is never shortened.
// Returns the texts as HTML, each starting with its heading as <h3>, and the tokens before the first one. file names
// the text in errors, and labels are those of its language.
export function splitTexts(markdown, file, labels) {
  const texts = [];
  const before = [];
  for (const token of lexMarkdown(markdown, file, labels)) {
    if (token.type === "heading" && token.depth === 3) texts.push([token]);
    else (texts.at(-1) ?? before).push(token);
  }
  return { texts: texts.map(renderTokens), before };
}

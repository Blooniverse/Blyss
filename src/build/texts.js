import { marked } from "marked";

// Each ### heading of a Markdown text starts one of its texts, which runs up to the next one and is never shortened.
// Returns the texts as HTML, each starting with its heading as <h3>, and the tokens before the first one.
export function splitTexts(markdown) {
  const texts = [];
  const before = [];
  for (const token of marked.lexer(markdown)) {
    if (token.type === "heading" && token.depth === 3) texts.push([token]);
    else (texts.at(-1) ?? before).push(token);
  }
  return { texts: texts.map(tokens => marked.parser(tokens)), before };
}

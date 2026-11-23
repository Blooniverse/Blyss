import assert from "node:assert/strict";
import { test } from "node:test";
import { parseFrontMatter, readFrontMatter } from "../src/build/front-matter.js";

test("reads the fields, the lists and the groups of a front matter, and keeps a text as it is written", () => {
  const { metadata, written, markdown } = parseFrontMatter(`---
# A comment
title: "A: title"
note:*nix & more
mark: !important
list: [1, "two"]
tags:
- Blyss
- "Markdown: the text"
- {"json": true}
- https://example.com/a:b
steps:
  - value: 1
    description:
      en: Start
      de: Anfang
  -   value: 10
      description: End
  -
    value: 20

empty:
---
Body
`);
  assert.deepEqual(metadata, {
    title: "A: title",
    note: "*nix & more",
    mark: "!important",
    list: '[1, "two"]',
    // A list may be indented like its field, and an item with a colon is a field only if it starts with a name.
    tags: ["Blyss", "Markdown: the text", '{"json": true}', "https://example.com/a:b"],
    // The fields of an item stand below its first one, wherever that one is written.
    steps: [{ value: "1", description: { en: "Start", de: "Anfang" } }, { value: "10", description: "End" }, { value: "20" }],
    empty: ""
  });
  assert.equal(written.title, '"A: title"');
  assert.equal(written.tags[1], '"Markdown: the text"');
  assert.equal(markdown, "Body\n");
});

test("names the line of a front matter that it cannot read, and what to write instead", () => {
  for (const [lines, problem] of [
    [["title: A", "just some words"], 'line 3 of its front matter is "just some words", which is no field.\nWrite a field as in "title: Blyss". '],
    [["title: A", "- item"], 'line 3 of its front matter is "- item", which is no field.\n'],
    [["a: 1", "b:", "  c: 2", "  c: 3"], 'line 5 of its front matter sets "c" a second time.\nRemove one of the two lines.'],
    [["title: A", "  sub: B"], 'line 3 of its front matter is "sub: B", which fits none of the lines above it.\nIndent the items of a list alike, '],
    [["a:", "    b: 1", "  c: 2"], 'line 4 of its front matter is "c: 2", which fits none of the lines above it.\n'],
    [["tags:", "  - a", "  b: c"], 'line 4 of its front matter is "b: c", which fits none of the lines above it.\n'],
    [["tags:", "\t- a"], "line 3 of its front matter is indented with a tab.\nIndent the items of a list and the fields of a group with spaces."]
  ]) {
    assert.throws(() => readFrontMatter(`---\n${lines.join("\n")}\n---\n`, "a.md"), error => {
      assert.equal(error.name, "BlyssError");
      assert.ok(error.message.startsWith(`Cannot build a.md: ${problem}`), error.message);
      return true;
    });
  }
});

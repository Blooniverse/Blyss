import { basename, join, relative, sep } from "node:path";
import { BlyssError } from "../errors.js";
import { escapeHtml } from "./render.js";

const compare = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

// order places a doc among the docs beside it: lower numbers first, docs without an order last.
function orderOf(record, file) {
  const { order } = record.metadata;
  if (order === undefined || order === "") return Infinity;
  if (typeof order === "string" && /^-?\d+(?:\.\d+)?$/.test(order)) return Number(order);
  throw new BlyssError(`Cannot build ${file}: its order ${JSON.stringify(order)} is not a number.\n` +
    "Set order to a number, such as 1 or 2.5, or remove it.");
}

function renderItem(doc, current, indent, children = doc.children) {
  const ariaCurrent = doc === current ? ' aria-current="page"' : "";
  const link = `<a href="${escapeHtml(doc.record.url)}"${ariaCurrent}>${escapeHtml(doc.title)}</a>`;
  if (!children.length) return `${indent}<li>${link}</li>`;
  const items = children.map(child => renderItem(child, current, `${indent}    `)).join("\n");
  return `${indent}<li>${link}\n${indent}  <ul>\n${items}\n${indent}  </ul>\n${indent}</li>`;
}

// The start page of the book comes first, followed by its docs and sections, each section with its docs.
function renderNavigation(root, current, labels) {
  const items = [renderItem(root, current, "  ", []), ...root.children.map(doc => renderItem(doc, current, "  "))];
  return `<nav aria-label="${escapeHtml(labels.book)}">\n<ul>\n${items.join("\n")}\n</ul>\n</nav>\n`;
}

function renderPager(previous, next, labels) {
  const links = [
    previous && `<a href="${escapeHtml(previous.record.url)}" rel="prev">${escapeHtml(labels.previous)}: ${escapeHtml(previous.title)}</a>`,
    next && `<a href="${escapeHtml(next.record.url)}" rel="next">${escapeHtml(labels.next)}: ${escapeHtml(next.title)}</a>`
  ].filter(Boolean);
  if (!links.length) return "";
  return `<nav aria-label="${escapeHtml(labels.pagination)}">\n<ul>\n${links.map(link => `  <li>${link}</li>`).join("\n")}\n</ul>\n</nav>\n`;
}

// The docs of a book lie in its directory of a language, such as _content/<language>/book/, and each directory
// within it is a section: its index.md is the start page of the section and names it in the navigation. Like the
// sidebars of Docusaurus or MkDocs, the navigation follows the directories, and the docs beside each other are sorted
// by their order, then by their titles. The previous and the next doc are those before and after a doc in the
// navigation, which never leads into another book. drafts names the files of the drafts that the build leaves out: a
// doc cannot be built if the start page of its section is one of them.
export function arrangeBooks(projectDir, contentDirectory, records, drafts = []) {
  const docs = new Map();
  const sections = new Map();
  // Each book of each language has a navigation of its own, such as en/book or de/guide.
  const bookOf = record => `${record.languageKey}/${record.book}`;
  for (const record of records.filter(item => item.type === "book")) {
    const file = relative(projectDir, record.sourceFile);
    const [, , ...path] = relative(contentDirectory, record.sourceFile).split(sep);
    const directories = path.slice(0, -1);
    const isIndex = basename(record.sourceFile, ".md") === "index";
    const doc = { record, file, title: record.metadata.title || record.url, order: orderOf(record, file), children: [],
      // The directory of the section that lists the doc: the parent directory of a section's start page.
      parent: isIndex ? directories.slice(0, -1) : directories };
    docs.set(record, doc);
    if (isIndex) sections.set(`${bookOf(record)}/${directories.join("/")}`, doc);
  }

  const roots = new Map();
  for (const doc of docs.values()) {
    const { record, file, parent } = doc;
    if (doc === sections.get(`${bookOf(record)}/`)) {
      roots.set(bookOf(record), doc);
      continue;
    }
    const section = sections.get(`${bookOf(record)}/${parent.join("/")}`);
    if (!section) {
      const index = join(relative(projectDir, contentDirectory), record.languageKey, record.book, ...parent, "index.md");
      if (drafts.includes(index)) {
        throw new BlyssError(`Cannot build ${file}: ${index}, the start page of its section, is a draft.\n` +
          "Make the doc a draft as well, or publish the start page: its title names the section in the navigation.");
      }
      throw new BlyssError(`Cannot build ${file}: there is no ${index}, the start page of its section.\n` +
        `Add ${index}: its title names the section in the navigation.`);
    }
    section.children.push(doc);
  }

  const sequences = new Map();
  for (const [book, root] of roots) {
    const sequence = [];
    const arrange = doc => {
      sequence.push(doc);
      doc.children.sort((left, right) => (left.order - right.order) ||
        left.title.localeCompare(right.title, root.record.languageConfig.locale) || compare(left.record.url, right.record.url));
      doc.children.forEach(arrange);
    };
    arrange(root);
    sequences.set(book, sequence);
  }

  return {
    // {{bookNavigation}} and {{bookPager}} of a doc, empty on other pages.
    placeholders(record) {
      const doc = docs.get(record);
      if (!doc) return { bookNavigation: "", bookPager: "" };
      const { labels } = record.languageConfig;
      const sequence = sequences.get(bookOf(record));
      const position = sequence.indexOf(doc);
      return {
        bookNavigation: renderNavigation(roots.get(bookOf(record)), doc, labels),
        bookPager: renderPager(sequence[position - 1], sequence[position + 1], labels)
      };
    }
  };
}

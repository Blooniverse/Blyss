import { relative } from "node:path";
import { BlyssError } from "../errors.js";
import { prepare } from "./build.js";

// The file that an error names, if it names one: that of the file it was found in, else the one its message starts
// with, as in "Cannot build _content/en/pages/about.md: …". A URL, such as that of a generated page, is no file.
function locate(error) {
  const file = error.file ?? /^Cannot build (?!with(?:out)? )([^\s/][^\s:]*):/.exec(error.message)?.[1];
  return { ...(file ? { file } : {}), ...(error.line ? { line: error.line } : {}), message: error.message };
}

// What the content still lacks, which does not stop a build: a page without a translationKey, which links it to no
// translation, and a translationKey without a page in each language.
function warningsOf(projectDir, content, languages) {
  const warnings = [];
  const byKey = new Map();
  for (const record of content) {
    const file = relative(projectDir, record.sourceFile);
    const key = record.metadata.translationKey;
    if (!key) {
      warnings.push({ file, message: "It has no translationKey, which links a page to its translations." });
      continue;
    }
    if (!byKey.has(key)) byKey.set(key, { kind: { book: "doc" }[record.type] ?? record.type, files: new Map() });
    byKey.get(key).files.set(record.languageKey, file);
  }
  const translations = [];
  for (const [translationKey, { kind, files }] of byKey) {
    const missing = Object.keys(languages).filter(language => !files.has(language));
    translations.push({ translationKey, files: Object.fromEntries(files), missing });
    if (!missing.length) continue;
    warnings.push({ file: files.values().next().value,
      message: `Its translationKey "${translationKey}" has no page in ${missing.join(", ")}: ` +
        `create the translation with the same translationKey, as in blyss new ${kind} --lang ${missing[0]} --key ${translationKey} "<title>".` });
  }
  return { warnings, translations };
}

// Checks the whole website as blyss build --drafts would build it, but writes nothing. Returns a report: the
// problems that would stop the build, each with its file and line if known, what the content lacks, the drafts and
// the number of pages. An error that is not one of Blyss, such as a fault in a component, is thrown.
export async function check(projectDir, configPath = "./blyss.config.js") {
  let prepared;
  try {
    prepared = await prepare(projectDir, configPath, { drafts: true });
  } catch (error) {
    if (!(error instanceof BlyssError)) throw error;
    const errors = (error.errors ?? [error]).map(locate);
    return { ok: false, errors, warnings: [], pages: 0, drafts: [], translations: [] };
  }
  const { config, content, records } = prepared;
  const { warnings, translations } = warningsOf(projectDir, content, config.site.languages);
  const drafts = content.filter(record => record.draft).map(record => relative(projectDir, record.sourceFile));
  return { ok: true, errors: [], warnings, pages: records.length, drafts, translations };
}

// The report as the terminal shows it: the problems on stderr, the warnings and the summary on stdout.
export function printReport(report) {
  for (const { message } of report.errors) console.error(`${message}\n`);
  for (const { file, message } of report.warnings) console.log(`Warning: ${file ? `${file}: ` : ""}${message}`);
  if (!report.ok) {
    console.error(`Blyss found ${report.errors.length} problem(s).`);
    return;
  }
  const drafts = report.drafts.length ? `, including ${report.drafts.length} draft(s)` : "";
  const warnings = report.warnings.length ? `, ${report.warnings.length} warning(s)` : "";
  console.log(`Blyss checked ${report.pages} localized page(s)${drafts}: no problems${warnings}.`);
}

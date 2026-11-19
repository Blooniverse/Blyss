import { relative } from "node:path";
import { BlyssError } from "../errors.js";
import { escapeHtml, kinds } from "./render.js";
import { listOf, refuse } from "./settings.js";
import { splitTexts } from "./texts.js";

const isObject = value => typeof value === "object" && value !== null && !Array.isArray(value);

// Whitespace, link reference definitions and comments may precede the first text of a region.
const isBlank = token =>
  token.type === "space" || token.type === "def" || (token.type === "html" && /^(?:\s*<!--[\s\S]*?-->)+\s*$/.test(token.raw));

// An object of switches, such as { page: true, post: false }: each key is on (true) or off (false). unknown tells
// what is wrong with a key, if anything.
function switchesOf(setting, switches = {}, unknown) {
  if (!isObject(switches)) throw refuse(setting, switches, "an object of switches, each true (on) or false (off)");
  for (const [key, on] of Object.entries(switches)) {
    const problem = unknown(key);
    if (problem) throw new BlyssError(`Cannot use ${setting}.${key}: ${problem}.`);
    if (typeof on !== "boolean") throw refuse(`${setting}.${key}`, on, "true (on) or false (off)");
  }
  return switches;
}

// The parts of a region: its components that are switched on, in the order of its settings, and whether it shows its texts.
function partsOf(name, settings = {}, unknownComponent) {
  if (!isObject(settings)) throw refuse(name, settings, "an object, such as { components: {}, texts: true }");
  const { components, texts = true } = settings;
  const switches = switchesOf(`${name}.components`, components, unknownComponent);
  if (typeof texts !== "boolean") throw refuse(`${name}.texts`, texts, "true (on) or false (off)");
  return { components: Object.keys(switches).filter(component => switches[component]), texts };
}

// The texts of the regions by region and language: the title of <region>Texts.md and its texts, each a <div>.
// languages are those of site.languages.
function readTexts(projectDir, fragments, names, languages) {
  const texts = new Map();
  for (const { sourceFile, languageKey, name, metadata, markdown } of fragments) {
    const region = names.find(region => name === `${region}Texts`);
    if (!region) continue;
    const { texts: parts, before } = splitTexts(markdown, relative(projectDir, sourceFile), languages[languageKey].labels);
    if (!before.every(isBlank)) {
      throw new BlyssError(`Cannot build ${relative(projectDir, sourceFile)}: each of its texts starts with a ### heading, ` +
        "but there is content before the first one.");
    }
    texts.set(`${region}/${languageKey}`, { textsTitle: escapeHtml(metadata.title), texts: parts.map(html => `<div>\n${html}</div>`).join("\n") });
  }
  return texts;
}

// The hero and the overlay are the regions of a page: the hero belongs to the home pages and the overlay to the kinds
// of pages that overlay.showOn does not switch off. Each region has
// - a template, <region>.html, which {{<region>}} shows in document.html; without it, the website lacks the region;
// - components, <region>.components in blyss.config.js: each is switched on (true) or off (false), and they appear in
//   the order of that setting; usually they are the region's variants, such as componentSliderHero in the hero (see
//   components.js);
// - texts, _content/<language>/<region>Texts.md, which start at its ### headings and which <region>.texts switches on
//   or off as a whole.
// synchroniseHeroOverlay gives the overlay the components and the texts of the hero instead of its own. unknownComponent
// tells what is wrong with the name of a component, if anything.
export function arrangeRegions(projectDir, config, templates, fragments, unknownComponent) {
  const { synchroniseHeroOverlay = false } = config;
  if (typeof synchroniseHeroOverlay !== "boolean") throw refuse("synchroniseHeroOverlay", synchroniseHeroOverlay, "true (on) or false (off)");
  const parts = {
    hero: partsOf("hero", config.hero, unknownComponent),
    overlay: partsOf("overlay", config.overlay, unknownComponent)
  };
  const showOn = switchesOf("overlay.showOn", config.overlay?.showOn, kind =>
    kinds.includes(kind) ? "" : `there is no kind of page "${kind}", only ${listOf(kinds, "and")}`);
  const regions = {
    hero: { source: "hero", showOn: { home: true } },
    overlay: { source: synchroniseHeroOverlay ? "hero" : "overlay", showOn: { ...Object.fromEntries(kinds.map(kind => [kind, true])), ...showOn } }
  };
  const texts = readTexts(projectDir, fragments, Object.keys(regions), config.site.languages);

  return {
    // The regions of a page of a kind in a language, by name: undefined unless the region has a template, belongs to
    // that kind of page and has content, a component or a text.
    of(kind, languageKey) {
      return Object.fromEntries(Object.entries(regions).map(([name, { source, showOn }]) => {
        const { components, texts: withTexts } = parts[source];
        const { textsTitle = "", texts: html = "" } = (withTexts && texts.get(`${source}/${languageKey}`)) || {};
        const shown = templates[name] !== undefined && showOn[kind] && (components.length || textsTitle || html);
        return [name, shown ? { template: templates[name], components, textsTitle, texts: html } : undefined];
      }));
    }
  };
}

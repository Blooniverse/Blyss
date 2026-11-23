import { join, relative } from "node:path";
import { BlyssError } from "../errors.js";
import { lexMarkdown } from "./markdown.js";
import { componentOf, escapeHtml, kinds } from "./render.js";
import { listOf, refuse } from "./settings.js";
import { splitTexts } from "./texts.js";

const isObject = value => typeof value === "object" && value !== null && !Array.isArray(value);

// Whitespace, link reference definitions and comments may precede the first card of a region, and count for nothing
// among its components.
const isBlank = token =>
  token.type === "space" || token.type === "def" || (token.type === "html" && /^(?:\s*<!--[\s\S]*?-->)+\s*$/.test(token.raw));

// The Markdown of the components of a region without what its comments hide. Such a comment hides what stands
// between a line of <!-- and the next line of -->, whatever that is: the arrows of a diagram, -->, do not end it, as
// they end a comment of HTML. Within a fenced code block, these lines are the text of the block.
function withoutHidden(markdown) {
  const shown = [];
  let hidden = false;
  let closing; // the line that closes the fenced code block that is being read
  for (const line of markdown.split("\n")) {
    if (hidden) {
      hidden = !/^-->[ \t]*$/.test(line);
    } else if (!closing && /^<!--[ \t]*$/.test(line)) {
      hidden = true;
    } else {
      shown.push(line);
      const [, fence] = /^ {0,3}(`{3,}|~{3,})/.exec(line) ?? [];
      if (closing?.test(line)) closing = undefined;
      else if (!closing && fence) closing = new RegExp(`^ {0,3}${fence[0]}{${fence.length},}[ \\t]*$`);
    }
  }
  return shown.join("\n");
}

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

// Whether a region shows its cards. Its setting components used to switch its components on and off, which
// <region>.md shows now, in the content of each language, and its setting cards used to be texts.
function showsCards(name, settings = {}, contentDirectory) {
  if (!isObject(settings)) throw refuse(name, settings, "an object, such as { cards: true }");
  const { components, texts, cards = true } = settings;
  if (components !== undefined) {
    throw new BlyssError(`Cannot use ${name}.components: the ${name} shows the components of ` +
      `${join(contentDirectory, "<language>", `${name}.md`)}, which this setting used to switch on and off.\n` +
      "Remove the setting, and name each component that it switches on in that file.");
  }
  if (texts !== undefined) {
    throw new BlyssError(`Cannot use ${name}.texts: the setting is ${name}.cards now, which switches the cards of ` +
      `${join(contentDirectory, "<language>", `${name}Cards.md`)} on and off.\nRename the setting to cards.`);
  }
  if (typeof cards !== "boolean") throw refuse(`${name}.cards`, cards, "true (on) or false (off)");
  return cards;
}

// The places of the components of a region, each with the placeholder that shows its components in the template of
// the region.
const places = { above: "{{components}}", below: "{{componentsBelow}}" };

// The components of the regions by region and language. <region>.md shows them as a page does (see componentOf in
// render.js), in its order, and holds nothing else; a comment around a component hides it (see withoutHidden above).
// A block names its place with regionPosition in its front matter: "above" the cards of the region, as without that
// field, or "below" them.
// The field is no setting of its component. The values of a block are prepared here, once for all the pages that
// show the region. languages are those of site.languages, and components those of the website (see components.js).
async function readComponents(projectDir, files, names, languages, components) {
  const placed = new Map();
  for (const { sourceFile, languageKey, name: region, markdown } of files) {
    if (!names.includes(region)) continue;
    const file = relative(projectDir, sourceFile);
    const byPlace = { file, above: [], below: [] };
    for (const token of lexMarkdown(withoutHidden(markdown), file, languages[languageKey].labels)) {
      if (isBlank(token)) continue;
      const { name, block, isCode } = componentOf(token, components.languages);
      if (!name) {
        throw new BlyssError(`Cannot build ${file}: it shows the components of the ${region}, but ` +
          `${JSON.stringify(token.raw.trim().split("\n")[0])} shows none.\nShow a component with a paragraph that holds its name in ` +
          `double curly braces alone, or with a fenced code block that has such a name as its language. The text of a component ` +
          `belongs in its block, and the cards of the ${region} in ${region}Cards.md.`);
      }
      if (components.unknown(name)) throw new BlyssError(`Cannot build ${file}: ${components.unknown(name)}.`);
      const own = block === undefined ? undefined : components.read(name, block, file, isCode);
      const { regionPosition: place = "above" } = own?.metadata ?? {};
      if (!Object.hasOwn(places, place)) {
        throw new BlyssError(`Cannot build ${file}: its {{${name}}} block cannot use regionPosition ${JSON.stringify(place)}, ` +
          'which must be "above" or "below".');
      }
      for (const fields of own ? [own.metadata, own.written] : []) delete fields.regionPosition;
      byPlace[place].push({ name, values: own && await components.valuesOf(name, languageKey, own, file) });
    }
    placed.set(`${region}/${languageKey}`, byPlace);
  }
  return placed;
}

// The cards of the regions by region and language: the title of <region>Cards.md and its cards, each a <div>. The
// file used to be <region>Texts.md, which would show nothing under that name. languages are those of site.languages.
function readCards(projectDir, files, names, languages) {
  const cards = new Map();
  for (const { sourceFile, languageKey, name, metadata, markdown } of files) {
    const file = relative(projectDir, sourceFile);
    const former = names.find(region => name === `${region}Texts`);
    if (former) {
      throw new BlyssError(`Cannot build ${file}: the cards of the ${former} are those of ${former}Cards.md now.\n` +
        `Rename the file to ${former}Cards.md.`);
    }
    const region = names.find(region => name === `${region}Cards`);
    if (!region) continue;
    const { texts, before, headings } = splitTexts(markdown, file, languages[languageKey].labels, 4);
    if (headings.includes(3)) {
      throw new BlyssError(`Cannot build ${file}: its cards use a ### heading.\n` +
        "Change each ### heading to #### to start a card below the region's title.");
    }
    if (!before.every(isBlank)) {
      throw new BlyssError(`Cannot build ${file}: each of its cards starts with a #### heading, ` +
        "but there is content before the first one.");
    }
    cards.set(`${region}/${languageKey}`, { cardsTitle: escapeHtml(metadata.title), cards: texts.map(html => `<div>\n${html}</div>`).join("\n") });
  }
  return cards;
}

// The hero and the overlay are the regions of a page: the hero belongs to the home pages and the overlay to the kinds
// of pages that overlay.showOn does not switch off. Each region has
// - a template, <region>.html, which {{<region>}} shows in document.html; without it, the website lacks the region;
// - components, those that _content/<language>/<region>.md shows, in the order of that file: the template shows
//   those above the cards with {{components}} and those below them with {{componentsBelow}};
// - cards, the texts of _content/<language>/<region>Cards.md, which start at its #### headings and which
//   <region>.cards switches on or off as a whole.
// synchroniseHeroOverlay gives the overlay the components and the cards of the hero instead of its own. templateFile
// names the file of a template in a message, files are those directly in the content of a language, and components
// are those of the website (see components.js).
export async function arrangeRegions(projectDir, config, templates, templateFile, files, components) {
  const { synchroniseHeroOverlay = false } = config;
  if (typeof synchroniseHeroOverlay !== "boolean") throw refuse("synchroniseHeroOverlay", synchroniseHeroOverlay, "true (on) or false (off)");
  const withCards = Object.fromEntries(["hero", "overlay"].map(name => [name, showsCards(name, config[name], config.directories.content)]));
  const showOn = switchesOf("overlay.showOn", config.overlay?.showOn, kind =>
    kinds.includes(kind) ? "" : `there is no kind of page "${kind}", only ${listOf(kinds, "and")}`);
  const regions = {
    hero: { source: "hero", showOn: { home: true } },
    overlay: { source: synchroniseHeroOverlay ? "hero" : "overlay", showOn: { ...Object.fromEntries(kinds.map(kind => [kind, true])), ...showOn } }
  };
  const cards = readCards(projectDir, files, Object.keys(regions), config.site.languages);
  const placed = await readComponents(projectDir, files, Object.keys(regions), config.site.languages, components);
  // Without the placeholder of a place, the pages would lack the components that the file of a region shows there.
  for (const [name, { source }] of Object.entries(regions)) {
    for (const [key, { file, ...byPlace }] of placed) {
      if (templates[name] === undefined || !key.startsWith(`${source}/`)) continue;
      const place = Object.keys(places).find(place => byPlace[place].length && !templates[name].includes(places[place]));
      if (place) {
        throw new BlyssError(`Cannot build with ${templateFile(name)}: it lacks ${places[place]}, which shows the components that ` +
          `${file} places ${place} the cards.\nAdd the placeholder to the template.`);
      }
    }
  }

  return {
    // The regions of a page of a kind in a language, by name: undefined unless the region has a template, belongs to
    // that kind of page and has content, a component or a card.
    of(kind, languageKey) {
      return Object.fromEntries(Object.entries(regions).map(([name, { source, showOn }]) => {
        const { above = [], below = [] } = placed.get(`${source}/${languageKey}`) ?? {};
        const { cardsTitle = "", cards: html = "" } = (withCards[source] && cards.get(`${source}/${languageKey}`)) || {};
        const shown = templates[name] !== undefined && showOn[kind] && (above.length || below.length || cardsTitle || html);
        return [name, shown ? { template: templates[name], above, below, cardsTitle, cards: html } : undefined];
      }));
    }
  };
}

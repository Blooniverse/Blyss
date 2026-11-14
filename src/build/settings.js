import { BlyssError } from "../errors.js";

export const refuse = (setting, value, requirement) =>
  new BlyssError(`Cannot use ${setting} ${JSON.stringify(value)}: it must be ${requirement}.`);

// Unlike em or %, these units mean the same on every element, so a top bar can span the margin it is placed in.
const cssLength = /^(?:0|\d*\.?\d+(?:px|rem|vw|vh|vmin|vmax))$/i;

// The alignments of the content and of the hero, on the home pages and on all other pages; the first value is the default.
const alignments = {
  alignHome: ["center", "left"],
  alignOther: ["left", "center", "centerLeft"],
  alignHeroHome: ["centerExtra", "left", "center"],
  alignHeroOther: ["centerExtra", "left", "center"]
};

// Lists values as in '"left", "center" or "centerLeft"'.
const either = values => values.map(value => JSON.stringify(value)).join(", ").replace(/, (?=[^,]*$)/, " or ");

// layout.margin is the space around the content and layout.paddingHero the space above and below the content of the
// hero; each alignment is one of its values above.
export function layoutOf(config) {
  const { margin = "2vmin", paddingHero = "1rem", ...settings } = config.layout ?? {};
  const layout = {};
  for (const [name, value] of Object.entries({ margin, paddingHero })) {
    if (!cssLength.test(String(value))) {
      throw refuse(`layout.${name}`, value, 'a CSS length in px, rem, vw, vh, vmin or vmax, such as "2vmin"');
    }
    // In a stylesheet's calc(), a unitless 0 is a number, not a length.
    layout[name] = String(value) === "0" ? "0px" : String(value);
  }
  for (const [name, values] of Object.entries(alignments)) {
    layout[name] = settings[name] ?? values[0];
    if (!values.includes(layout[name])) throw refuse(`layout.${name}`, layout[name], either(values));
  }
  return layout;
}

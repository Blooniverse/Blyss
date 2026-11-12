import { BlyssError } from "../errors.js";

const refuse = (setting, value, requirement) =>
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

// layout.margin is the space around the content; each alignment is one of its values above.
export function layoutOf(config) {
  const { margin = "2vmin", ...settings } = config.layout ?? {};
  if (!cssLength.test(String(margin))) {
    throw refuse("layout.margin", margin, 'a CSS length in px, rem, vw, vh, vmin or vmax, such as "2vmin"');
  }
  // In a stylesheet's calc(), a unitless 0 is a number, not a length.
  const layout = { margin: String(margin) === "0" ? "0px" : String(margin) };
  for (const [name, values] of Object.entries(alignments)) {
    layout[name] = settings[name] ?? values[0];
    if (!values.includes(layout[name])) throw refuse(`layout.${name}`, layout[name], either(values));
  }
  return layout;
}

// heroComponent holds the settings of each variant of the interactive part of the overlay, so far only its slider.
// The slider runs through the whole numbers from start to end and starts halfway. Its steps mark values on the way,
// each with a description in every language, and are sorted by value.
export function heroComponentOf(config) {
  const { start = 0, end = 100, steps = [] } = config.heroComponent?.slider ?? {};
  const setting = name => `heroComponent.slider.${name}`;
  if (!Number.isInteger(start)) throw refuse(setting("start"), start, "a whole number");
  if (!Number.isInteger(end) || end <= start) {
    throw refuse(setting("end"), end, `a whole number greater than ${setting("start")} (${start})`);
  }
  if (!Array.isArray(steps)) throw refuse(setting("steps"), steps, "a list of steps");
  const languages = Object.keys(config.site.languages);
  const checked = steps.map((step, index) => {
    if (!Number.isInteger(step?.value) || step.value < start || step.value > end) {
      throw refuse(setting(`steps[${index}].value`), step?.value, `a whole number from ${start} to ${end}`);
    }
    const missing = languages.find(language => typeof step.description?.[language] !== "string");
    if (missing) {
      throw new BlyssError(`Cannot use ${setting(`steps[${index}].description`)}: it needs a text for the language "${missing}".`);
    }
    return { value: step.value, description: step.description };
  });
  const slider = { start, end, value: Math.floor((start + end) / 2), steps: checked.sort((left, right) => left.value - right.value) };
  return { slider };
}

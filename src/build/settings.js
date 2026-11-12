import { BlyssError } from "../errors.js";

const refuse = (setting, value, requirement) =>
  new BlyssError(`Cannot use ${setting} ${JSON.stringify(value)}: it must be ${requirement}.`);

// Unlike em or %, these units mean the same on every element, so a top bar can span the margin it is placed in.
const cssLength = /^(?:0|\d*\.?\d+(?:px|rem|vw|vh|vmin|vmax))$/i;

// layout.margin is the space around the content; layout.align "center" centers the content.
export function layoutOf(config) {
  const { margin = "2vmin", align = "left" } = config.layout ?? {};
  if (!cssLength.test(String(margin))) {
    throw refuse("layout.margin", margin, 'a CSS length in px, rem, vw, vh, vmin or vmax, such as "2vmin"');
  }
  if (align !== "left" && align !== "center") throw refuse("layout.align", align, '"left" or "center"');
  // In a stylesheet's calc(), a unitless 0 is a number, not a length.
  return { margin: String(margin) === "0" ? "0px" : String(margin), align };
}

// The slider runs through the whole numbers from start to end and starts halfway. Its steps mark values on the way,
// each with a description in every language, and are sorted by value.
export function sliderOf(config) {
  const { start = 0, end = 100, steps = [] } = config.slider ?? {};
  if (!Number.isInteger(start)) throw refuse("slider.start", start, "a whole number");
  if (!Number.isInteger(end) || end <= start) throw refuse("slider.end", end, `a whole number greater than slider.start (${start})`);
  if (!Array.isArray(steps)) throw refuse("slider.steps", steps, "a list of steps");
  const languages = Object.keys(config.site.languages);
  const checked = steps.map((step, index) => {
    if (!Number.isInteger(step?.value) || step.value < start || step.value > end) {
      throw refuse(`slider.steps[${index}].value`, step?.value, `a whole number from ${start} to ${end}`);
    }
    const missing = languages.find(language => typeof step.description?.[language] !== "string");
    if (missing) throw new BlyssError(`Cannot use slider.steps[${index}].description: it needs a text for the language "${missing}".`);
    return { value: step.value, description: step.description };
  });
  return { start, end, value: Math.floor((start + end) / 2), steps: checked.sort((left, right) => left.value - right.value) };
}

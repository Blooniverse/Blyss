// Checks the slider's settings, components.heroComponentSlider in blyss.config.js, and prepares the values of its
// template. The slider runs through the whole numbers from start to end and starts halfway. Its steps mark values on
// the way, each with a description in every language, and are sorted by value.
export default function ({ settings, languageKey, escapeHtml, refuse }) {
  const { start = 0, end = 100, steps = [] } = settings;
  if (!Number.isInteger(start)) throw refuse("start", start, "a whole number");
  if (!Number.isInteger(end) || end <= start) throw refuse("end", end, `a whole number greater than start (${start})`);
  if (!Array.isArray(steps)) throw refuse("steps", steps, "a list of steps");
  const sorted = steps.map((step, index) => {
    if (!Number.isInteger(step?.value) || step.value < start || step.value > end) {
      throw refuse(`steps[${index}].value`, step?.value, `a whole number from ${start} to ${end}`);
    }
    if (typeof step.description?.[languageKey] !== "string") {
      throw refuse(`steps[${index}].description`, step.description, `an object with a text for the language "${languageKey}"`);
    }
    return step;
  }).sort((left, right) => left.value - right.value);

  // Each step is placed at its value along the slider; the last step that the initial value reaches is current.
  const value = Math.floor((start + end) / 2);
  const reached = sorted.findLast(step => step.value <= value);
  const items = sorted.map(step => {
    const position = +((step.value - start) / (end - start) * 100).toFixed(2);
    const current = step === reached ? ' aria-current="step"' : "";
    return `  <li style="--position: ${position}%"${current}><data value="${step.value}">${step.value}</data> ` +
      `<span>${escapeHtml(step.description[languageKey])}</span></li>`;
  });
  return { start, end, value, steps: items.length ? `<ol class="steps">\n${items.join("\n")}\n</ol>` : "" };
}

// Checks the flower's settings, those of a block or of components.componentFlowerHero, componentFlowerOverlay and so
// on in blyss.config.js, and prepares the values of its template: its colours, its petals, each a button at its angle
// around the centre, their texts and the ground with a place for each fallen petal. The first text of the flower
// belongs to the first petal, the second to the second and so on; a petal without a text falls all the same, and
// texts beyond the last petal are left out.
const percentage = /^\d*\.?\d+%$/;
const duration = /^\d*\.?\d+m?s$/; // in lower case, as the flower's script reads it
// The hues of the centre and of the stem, as angles from the hue of the petals on the colour wheel.
const colourSystems = { complementary: [180, 0], triadic: [120, 240] };

export default function ({ settings, texts, frontMatter, escapeHtml, refuse }) {
  const { petals = 8, colourSystem = "triadic", colourBaseHue = 202, animationSpeedFalling = "3s", animationSpeedText = "3s",
    animationSpeedFading = "4s", opacityFallen = "30%", fontSizeText = "60%" } = settings;
  if (!Number.isInteger(petals) || petals < 3 || petals > 24) throw refuse("petals", petals, "a whole number from 3 to 24");
  if (!Object.hasOwn(colourSystems, colourSystem)) throw refuse("colourSystem", colourSystem, '"complementary" or "triadic"');
  if (typeof colourBaseHue !== "number" || !(colourBaseHue >= 0 && colourBaseHue <= 360)) {
    throw refuse("colourBaseHue", colourBaseHue, "a hue from 0 to 360, such as 202");
  }
  for (const [name, value] of Object.entries({ animationSpeedFalling, animationSpeedText, animationSpeedFading })) {
    if (!duration.test(value)) throw refuse(name, value, 'a duration in ms or s, such as "3s"');
  }
  if (!percentage.test(opacityFallen) || parseFloat(opacityFallen) < 1 || parseFloat(opacityFallen) > 100) {
    throw refuse("opacityFallen", opacityFallen, 'a percentage from 1% to 100%, such as "30%"');
  }
  if (!percentage.test(fontSizeText) || !parseFloat(fontSizeText)) {
    throw refuse("fontSizeText", fontSizeText, 'a percentage of the default text size above 0%, such as "60%"');
  }

  const [centre, stem] = colourSystems[colourSystem].map(angle => (colourBaseHue + angle) % 360);
  const label = escapeHtml(frontMatter.petal || "Petal");
  const numbers = Array.from({ length: petals }, (_, index) => index);
  const angle = index => +(index * 360 / petals).toFixed(2);
  // A fallen petal lies on its side, its tip pointing away from the stem, a little askew and each one differently.
  const lie = index => (angle(index) <= 180 ? 90 : -90) + (index * 37) % 25 - 12;
  return {
    huePetals: colourBaseHue,
    hueCentre: centre,
    hueStem: stem,
    // The width of a petal as a part of its length: neighbours overlap a little where they are widest.
    petalWidth: +Math.min(.9, 1.44 * Math.sin(Math.PI / petals)).toFixed(3),
    animationSpeedFalling,
    animationSpeedText,
    animationSpeedFading,
    opacityFallen: parseFloat(opacityFallen) / 100,
    fontSizeText: parseFloat(fontSizeText) / 100,
    // Without the script, the petals cannot fall and are switched off.
    petalItems: numbers.map(index =>
      `    <button type="button" class="petal" style="--angle: ${angle(index)}deg" aria-label="${label} ${index + 1}" disabled></button>`).join("\n"),
    textItems: texts.slice(0, petals).map(text => `    <li>\n${text}</li>`).join("\n"),
    groundItems: numbers.map(index => `    <span style="--lie: ${lie(index)}deg"></span>`).join("\n")
  };
}

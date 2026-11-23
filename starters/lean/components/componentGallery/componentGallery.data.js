// Checks the gallery's settings, those of a block or of components.componentGallery in blyss.config.js, and prepares
// the values of its template. heightCenter becomes the factor by which the
// image in the centre grows, heightExpanded the height in percent of the screen's to which a click or a touch
// expands it, and fontSizeText the factor by which the texts of the images differ from the default text size.
const length = /^\d*\.?\d+(?:px|rem|vw|vh|vmin|vmax)$/i;
const percentage = /^\d*\.?\d+%$/;
const duration = /^\d*\.?\d+m?s$/; // in lower case, as the gallery's script reads it
// A list item that starts with an image, with what follows the image, also as a paragraph of its own, and what makes
// that more than a text.
const item = /<li>(?:<p>)?(<img [^>]*>)(?:<\/p>\s*<p>|\s*)([\s\S]*?)\s*(?:<\/p>\s*)?<\/li>/g;
const noText = /<\/?(?:img|p|li|ul|ol|div|pre|blockquote|table|h[1-6]|hr|figure|details)\b/;

export default function ({ settings, content, refuse }) {
  const { heightOverall = "8rem", heightCenter = "130%", heightExpanded = "70%", animationSpeedScrolling = "400ms",
    animationSpeedImgEnlargement = "300ms", fontSizeText = "80%" } = settings;
  if (!length.test(heightOverall)) {
    throw refuse("heightOverall", heightOverall, 'a CSS length in px, rem, vw, vh, vmin or vmax, such as "8rem"');
  }
  if (!percentage.test(heightCenter) || parseFloat(heightCenter) < 100) {
    throw refuse("heightCenter", heightCenter, 'a percentage of heightOverall from 100% up, such as "130%"');
  }
  if (!percentage.test(heightExpanded) || !parseFloat(heightExpanded) || parseFloat(heightExpanded) > 100) {
    throw refuse("heightExpanded", heightExpanded, 'a percentage of the height of the screen above 0% and up to 100%, such as "70%"');
  }
  for (const [name, value] of Object.entries({ animationSpeedScrolling, animationSpeedImgEnlargement })) {
    if (!duration.test(value)) throw refuse(name, value, 'a duration in ms or s, such as "400ms"');
  }
  if (!percentage.test(fontSizeText) || !parseFloat(fontSizeText)) {
    throw refuse("fontSizeText", fontSizeText, 'a percentage of the default text size above 0%, such as "80%"');
  }
  return {
    heightOverall,
    scaleCenter: parseFloat(heightCenter) / 100,
    heightExpanded: parseFloat(heightExpanded),
    animationSpeedScrolling,
    animationSpeedImgEnlargement,
    fontSizeText: parseFloat(fontSizeText) / 100,
    // The browser loads an image only when the gallery is shown and the image comes near. The text that follows an
    // image in its list item is the caption of that image.
    content: content.replaceAll("<img ", '<img loading="lazy" ').replace(item, (whole, image, text) =>
      (text && !noText.test(text) ? `<li><figure>${image}<figcaption>${text}</figcaption></figure></li>` : whole))
  };
}

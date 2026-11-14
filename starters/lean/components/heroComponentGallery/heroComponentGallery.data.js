// Checks the gallery's settings, components.heroComponentGallery in blyss.config.js, and prepares the values of its
// template. heightCenter becomes the factor by which the image in the centre grows.
const length = /^\d*\.?\d+(?:px|rem|vw|vh|vmin|vmax)$/i;
const percentage = /^\d*\.?\d+%$/;
const duration = /^\d*\.?\d+m?s$/; // in lower case, as the gallery's script reads it

export default function ({ settings, content, refuse }) {
  const { heightOverall = "8rem", heightCenter = "130%", animationSpeedScrolling = "400ms", animationSpeedImgEnlargement = "300ms" } = settings;
  if (!length.test(heightOverall)) {
    throw refuse("heightOverall", heightOverall, 'a CSS length in px, rem, vw, vh, vmin or vmax, such as "8rem"');
  }
  if (!percentage.test(heightCenter) || parseFloat(heightCenter) < 100) {
    throw refuse("heightCenter", heightCenter, 'a percentage of heightOverall from 100% up, such as "130%"');
  }
  for (const [name, value] of Object.entries({ animationSpeedScrolling, animationSpeedImgEnlargement })) {
    if (!duration.test(value)) throw refuse(name, value, 'a duration in ms or s, such as "400ms"');
  }
  return {
    heightOverall,
    scaleCenter: parseFloat(heightCenter) / 100,
    animationSpeedScrolling,
    animationSpeedImgEnlargement,
    // The browser loads an image only when the gallery is shown and the image comes near.
    content: content.replaceAll("<img ", '<img loading="lazy" ')
  };
}

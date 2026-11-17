// Shows the fenced code blocks in the language mermaid as diagrams, and checks the settings of the component, those
// of a block or of components.componentMermaid in blyss.config.js. Mermaid draws the diagrams in the browser, where
// the component's script loads it from library: a URL that starts with https:// or, for a copy in static/, with /.
export const languages = ["mermaid"];

const themes = ["default", "neutral", "dark", "forest", "base"];

export default function ({ settings, refuse }) {
  const { library = "https://cdn.jsdelivr.net/npm/mermaid@12.3.0/dist/mermaid.esm.min.mjs", theme = "neutral" } = settings;
  if (typeof library !== "string" || !/^(?:https:\/\/|\/(?!\/))\S+$/.test(library)) {
    throw refuse("library", library, 'the URL of Mermaid, starting with https:// or with /, such as "/assets/mermaid/mermaid.esm.min.mjs"');
  }
  if (!themes.includes(theme)) throw refuse("theme", theme, '"default", "neutral", "dark", "forest" or "base"');
  return { library, theme };
}

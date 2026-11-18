// Shows the fenced code blocks in the language vega-lite as charts, and checks the code and the settings of the
// component, those of a block or of components.componentVegaLite in blyss.config.js. Vega-Lite draws the charts in
// the browser with Vega, where the component's script loads both: each from a URL that starts with https:// or, for
// a copy in static/, with /. Such a copy lies below the path of a website that is hosted below one.
export const languages = ["vega-lite"];

const url = /^(?:https:\/\/|\/(?!\/))\S+$/;

export default function ({ settings, source, escapeHtml, refuse, basePath = "" }) {
  const { libraryVega = "https://cdn.jsdelivr.net/npm/vega@6.4.0/build/vega.min.js",
    libraryVegaLite = "https://cdn.jsdelivr.net/npm/vega-lite@6.5.0/build/vega-lite.min.js", renderer = "svg" } = settings;
  for (const [name, value] of Object.entries({ libraryVega, libraryVegaLite })) {
    if (typeof value !== "string" || !url.test(value)) {
      throw refuse(name, value, 'a URL that starts with https:// or with /, such as "/assets/vega/vega.min.js"');
    }
  }
  if (!["svg", "canvas"].includes(renderer)) throw refuse("renderer", renderer, '"svg" or "canvas"');
  // The code is the specification of a chart, which the build checks to be JSON; the browser checks the rest.
  if (source.trim()) {
    try {
      JSON.parse(source);
    } catch (error) {
      const start = source.trim();
      throw refuse("the code", start.length > 40 ? `${start.slice(0, 40)}…` : start, `a Vega-Lite specification in JSON (${error.message})`);
    }
  }
  const located = library => escapeHtml(library.startsWith("/") ? basePath + library : library);
  return { libraryVega: located(libraryVega), libraryVegaLite: located(libraryVegaLite), renderer };
}

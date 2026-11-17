// Shows the fenced code blocks in the languages flowchart and flow as flowcharts, and checks the settings of the
// component, those of a block or of components.componentFlowchart in blyss.config.js. flowchart.js draws the
// flowcharts in the browser with Raphaël, where the component's script loads both: each from a URL that starts with
// https:// or, for a copy in static/, with /.
export const languages = ["flowchart", "flow"];

const url = /^(?:https:\/\/|\/(?!\/))\S+$/;

export default function ({ settings, refuse }) {
  const { libraryRaphael = "https://cdn.jsdelivr.net/npm/raphael@2.3.0/raphael.min.js",
    libraryFlowchart = "https://cdn.jsdelivr.net/gh/adrai/flowchart.js@v1.18.1/release/flowchart.min.js", lineWidth = 2 } = settings;
  for (const [name, value] of Object.entries({ libraryRaphael, libraryFlowchart })) {
    if (typeof value !== "string" || !url.test(value)) {
      throw refuse(name, value, 'a URL that starts with https:// or with /, such as "/assets/flowchart/flowchart.min.js"');
    }
  }
  if (typeof lineWidth !== "number" || !(lineWidth > 0 && lineWidth <= 10)) throw refuse("lineWidth", lineWidth, "a number above 0 and up to 10, such as 2");
  return { libraryRaphael, libraryFlowchart, lineWidth };
}

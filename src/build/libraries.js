// The libraries that read Markdown: marked for Markdown itself, Temml for formulas and highlight.js for code. Only
// this module names them, so that a browser can load the modules that read Markdown as they are: the build publishes
// them with a module of this name that names its copies of the libraries (see browser.js).
export { default as hljs } from "highlight.js";
export { Marked } from "marked";
export { default as temml } from "temml";

// The programming interface of Blyss, for tools that work with a website without its command line, such as an
// editor, a server of the Model Context Protocol or a flow of n8n, Activepieces or Windmill. Each function does
// what the command of its name does; projectDir is the root directory of the website, where blyss.config.js lies.
// Expected problems are a BlyssError, whose message tells what to change; several at once are a BlyssErrors, whose
// errors lists them, each with its file and, for a front matter, its line.
export { build, prepare } from "./build/build.js";
export { check } from "./build/check.js";
export { renderDocument } from "./build/markdown.js";
export { loadConfig } from "./config.js";
export { BlyssError, BlyssErrors } from "./errors.js";
export { init } from "./init/init.js";
export { createContent } from "./new/new.js";
export { serve } from "./server/server.js";

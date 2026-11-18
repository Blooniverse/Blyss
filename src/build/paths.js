import nodePath, { resolve } from "node:path";
import { BlyssError } from "../errors.js";
import { refuse } from "./settings.js";

// True when child is parent itself or lies inside it. On Windows, no relative path leads to another drive: such a
// path is absolute, and the child is outside as well. path is node:path, or its flavour of another platform.
export function within(parent, child, path = nodePath) {
  const fromParent = path.relative(parent, child);
  return fromParent !== ".." && !fromParent.startsWith(`..${path.sep}`) && !path.isAbsolute(fromParent);
}

export function resolvePaths(projectDir, config) {
  const root = resolve(projectDir);
  // The website names its directories; only the one of the components has a default, and may be missing.
  const directories = { ...config.directories, components: config.directories?.components ?? "components" };
  for (const [name, example] of Object.entries({ components: "components", content: "_content", public: "public", static: "static", templates: "templates" })) {
    if (typeof directories[name] !== "string" || !directories[name].trim()) {
      throw refuse(`directories.${name}`, directories[name], `the name of a directory, such as "${example}"`);
    }
  }
  const paths = {
    componentsDirectory: resolve(root, directories.components),
    contentDirectory: resolve(root, directories.content),
    publicDirectory: resolve(root, directories.public),
    staticDirectory: resolve(root, directories.static),
    templatesDirectory: resolve(root, directories.templates)
  };

  // Every build deletes the public directory, so it must not be or contain the website or its sources.
  const { publicDirectory } = paths;
  const refusePublic = requirement => new BlyssError(`Cannot use directories.public "${directories.public}": ` +
    `every build deletes it, so it must be ${requirement}.\nUse a dedicated directory such as "public".`);
  if (publicDirectory === root || !within(root, publicDirectory)) throw refusePublic(`a subdirectory of ${root}`);
  for (const name of ["components", "content", "static", "templates"]) {
    const directory = paths[`${name}Directory`];
    if (within(publicDirectory, directory) || within(directory, publicDirectory)) throw refusePublic(`separate from directories.${name}`);
  }
  return paths;
}

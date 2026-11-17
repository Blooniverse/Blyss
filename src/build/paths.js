import { isAbsolute, relative, resolve, sep } from "node:path";
import { BlyssError } from "../errors.js";

// True when child is parent itself or lies inside it.
function within(parent, child) {
  const path = relative(parent, child);
  return path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

export function resolvePaths(projectDir, config) {
  const root = resolve(projectDir);
  const paths = {
    componentsDirectory: resolve(root, config.directories.components ?? "components"),
    contentDirectory: resolve(root, config.directories.content),
    publicDirectory: resolve(root, config.directories.public),
    staticDirectory: resolve(root, config.directories.static),
    templatesDirectory: resolve(root, config.directories.templates)
  };

  // Every build deletes the public directory, so it must not be or contain the website or its sources.
  const { publicDirectory } = paths;
  const refuse = requirement => new BlyssError(`Cannot use directories.public "${config.directories.public}": ` +
    `every build deletes it, so it must be ${requirement}.\nUse a dedicated directory such as "public".`);
  if (publicDirectory === root || !within(root, publicDirectory)) throw refuse(`a subdirectory of ${root}`);
  for (const name of ["components", "content", "static", "templates"]) {
    const directory = paths[`${name}Directory`];
    if (within(publicDirectory, directory) || within(directory, publicDirectory)) throw refuse(`separate from directories.${name}`);
  }
  return paths;
}

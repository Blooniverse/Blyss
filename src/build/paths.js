import { resolve } from "node:path";

export function resolvePaths(projectDir, config) {
  return {
    contentDirectory: resolve(projectDir, config.directories.content),
    publicDirectory: resolve(projectDir, config.directories.public),
    staticDirectory: resolve(projectDir, config.directories.static),
    templatesDirectory: resolve(projectDir, config.directories.templates)
  };
}

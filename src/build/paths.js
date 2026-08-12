import { resolve } from "node:path";
import config from "../../blyss.config.js";

export const projectRoot = resolve(import.meta.dirname, "../..");
export const contentDirectory = resolve(projectRoot, config.directories.content);
export const publicDirectory = resolve(projectRoot, config.directories.public);
export const staticDirectory = resolve(projectRoot, config.directories.static);
export const templatesDirectory = resolve(projectRoot, config.directories.templates);

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { BlyssError } from "./errors.js";

export async function loadConfig(projectDir, configPath = "blyss.config.js") {
  const configFile = resolve(projectDir, configPath);
  const configUrl = pathToFileURL(configFile).href;
  try {
    const { default: config } = await import(configUrl);
    return config;
  } catch (error) {
    // Only the configuration file itself is reported as missing, not a module it imports.
    if (error?.code !== "ERR_MODULE_NOT_FOUND" || error.url !== configUrl) throw error;
    throw new BlyssError(
      `Blyss configuration not found:\n  ${configFile}\n\nCreate a starter website with:\n  blyss init`,
      { cause: error }
    );
  }
}

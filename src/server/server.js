import { open, stat } from "node:fs/promises";
import { createServer } from "node:http";
import nodePath, { extname, join } from "node:path";
import { pipeline } from "node:stream";
import { languagesOf } from "../build/languages.js";
import { resolvePaths, within } from "../build/paths.js";
import { contentTypeFor } from "./mime-types.js";

// The file that a request path names below public/, or undefined for a path that leaves it: one with "..", or on
// Windows one that names another drive, such as /D:/notes.txt. path is node:path, or its flavour of another platform.
export function fileFor(publicDirectory, pathname, path = nodePath) {
  const filePath = path.resolve(publicDirectory, pathname.replace(/^[/\\]+/, ""));
  return within(publicDirectory, filePath, path) ? filePath : undefined;
}

// The file is opened before the response starts: one that is missing, that cannot be read or that a build has just
// deleted fails here, where the caller can still answer 404, and not in the middle of the response.
async function sendFile(response, status, filePath) {
  const file = await open(filePath);
  try {
    const info = await file.stat();
    if (!info.isFile()) throw new Error("Requested path is not a file.");
    response.writeHead(status, {
      "Content-Type": contentTypeFor(extname(filePath)),
      "Content-Length": info.size,
      "X-Content-Type-Options": "nosniff"
    });
  } catch (error) {
    await file.close();
    throw error;
  }
  // The stream closes the file; if reading fails or the visitor leaves, the response ends without an error.
  pipeline(file.createReadStream(), response, () => {});
}

export function serve(projectDir, config) {
  const port = Number(process.env.PORT) || (config.server?.fallbackPort ?? 3000);
  const { publicDirectory } = resolvePaths(projectDir, config);
  const { defaultLanguage } = languagesOf(config);
  // A website that was never built has no output directory: the server says so, in the terminal and in the browser.
  const unbuilt = `There is no ${config.directories.public}/ yet. Build the website first: npm run build`;
  const isBuilt = () => stat(publicDirectory).then(info => info.isDirectory(), () => false);
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost");
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname === "/") {
        response.writeHead(302, {
          Location: `/${defaultLanguage}/`
        });
        response.end();
        return;
      }
      if (pathname.endsWith("/")) pathname += "index.html";
      const filePath = fileFor(publicDirectory, pathname);
      if (!filePath) throw new Error("Requested path is outside public/.");
      await sendFile(response, 200, filePath);
    } catch {
      // Like static hosts, answer every missing file with the generated 404.html, if there is one.
      await sendFile(response, 404, join(publicDirectory, "404.html")).catch(async () => {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" });
        response.end(await isBuilt() ? "404 Not Found" : `404 Not Found\n\n${unbuilt}\n`);
      });
    }
  });
  // A server that cannot listen, as on a port that is in use, says so without a stack trace.
  server.on("error", error => {
    console.error(error.code === "EADDRINUSE"
      ? `Cannot serve on port ${port}: the port is already in use.\n` +
        `Stop the program that uses it, or set the environment variable PORT to another port, such as ${port + 1}.`
      : `Cannot serve on port ${port}: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, "0.0.0.0", async () => {
    console.log(`Blyss is serving ${config.directories.public}/ on port ${port}`);
    if (!await isBuilt()) console.error(unbuilt);
  });
  return server;
}

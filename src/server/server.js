import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, relative, resolve } from "node:path";
import config from "../../blyss.config.js";
import { contentTypeFor } from "./mime-types.js";

const port = Number(process.env.PORT) || config.server.fallbackPort;
const publicDirectory = resolve(import.meta.dirname, "../../", config.directories.public);
const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    let pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const relativeRequestPath = pathname.replace(/^[/\\]+/, "");
    const filePath = resolve(publicDirectory, relativeRequestPath);
    const pathFromPublic = relative(publicDirectory, filePath);
    if (pathFromPublic === ".." || pathFromPublic.startsWith("../") || pathFromPublic.startsWith("..\\")) {
      throw new Error("Requested path is outside public/.");
    }
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("Requested path is not a file.");
    response.writeHead(200, {
      "Content-Type": contentTypeFor(extname(filePath)),
      "Content-Length": info.size,
      "X-Content-Type-Options": "nosniff"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" });
    response.end("404 Not Found");
  }
});
server.listen(port, "0.0.0.0", () => console.log(`Blyss is serving public/ on port ${port}`));

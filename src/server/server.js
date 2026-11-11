import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, relative, resolve } from "node:path";
import { resolvePaths } from "../build/paths.js";
import { contentTypeFor } from "./mime-types.js";

async function sendFile(response, status, filePath) {
  const info = await stat(filePath);
  if (!info.isFile()) throw new Error("Requested path is not a file.");
  response.writeHead(status, {
    "Content-Type": contentTypeFor(extname(filePath)),
    "Content-Length": info.size,
    "X-Content-Type-Options": "nosniff"
  });
  createReadStream(filePath).pipe(response);
}

export function serve(projectDir, config) {
  const port = Number(process.env.PORT) || config.server.fallbackPort;
  const { publicDirectory } = resolvePaths(projectDir, config);
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost");
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname === "/") {
        response.writeHead(302, {
          Location: `/${config.site.defaultLanguage}/`
        });
        response.end();
        return;
      }
      if (pathname.endsWith("/")) pathname += "index.html";
      const relativeRequestPath = pathname.replace(/^[/\\]+/, "");
      const filePath = resolve(publicDirectory, relativeRequestPath);
      const pathFromPublic = relative(publicDirectory, filePath);
      if (pathFromPublic === ".." || pathFromPublic.startsWith("../") || pathFromPublic.startsWith("..\\")) {
        throw new Error("Requested path is outside public/.");
      }
      await sendFile(response, 200, filePath);
    } catch {
      // Like static hosts, answer every missing file with the generated 404.html, if there is one.
      await sendFile(response, 404, join(publicDirectory, "404.html")).catch(() => {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" });
        response.end("404 Not Found");
      });
    }
  });
  server.listen(port, "0.0.0.0", () => console.log(`Blyss is serving ${config.directories.public}/ on port ${port}`));
  return server;
}

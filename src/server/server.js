import { open, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { isIPv6 } from "node:net";
import nodePath, { extname, join, resolve } from "node:path";
import { pipeline } from "node:stream";
import { languagesOf } from "../build/languages.js";
import { resolvePaths, within } from "../build/paths.js";
import { assertSite, basePathOf, refuse } from "../build/settings.js";
import { contentTypeFor } from "./mime-types.js";
import { rebuildOnChange } from "./watch.js";

const isFile = path => stat(path).then(info => info.isFile(), () => false);

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

// While the server watches the sources, each page that it sends listens to it for the builds (see serve below): it
// reloads after a build and shows the problems of a build that failed, at its bottom, until the next one.
const events = "/__blyss/events";
const listener = `<script>
(() => {
  const source = new EventSource(${JSON.stringify(events)});
  source.addEventListener("built", () => location.reload());
  source.addEventListener("failed", event => {
    let box = document.getElementById("blyss-build-problems");
    if (!box) {
      box = Object.assign(document.createElement("pre"), { id: "blyss-build-problems", role: "alert" });
      box.style.cssText = "position:fixed;inset:auto 0 0 0;z-index:2147483647;max-height:50vh;overflow:auto;margin:0;" +
        "padding:1em;background:#fff5f5;color:#8a1c1c;border-top:3px solid #c62828;font:14px/1.4 monospace;white-space:pre-wrap";
      document.body.append(box);
    }
    box.textContent = JSON.parse(event.data);
  });
})();
</script>
`;

// A page with the listener above at the end of its body.
async function sendPage(response, status, filePath) {
  const html = await readFile(filePath, "utf8");
  const end = html.lastIndexOf("</body>");
  const page = end < 0 ? html + listener : `${html.slice(0, end)}${listener}${html.slice(end)}`;
  response.writeHead(status, {
    "Content-Type": contentTypeFor(".html"),
    "Content-Length": Buffer.byteLength(page),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(page);
}

// The address and port to listen on: a command-line option, then the environment variable, then blyss.config.js.
// An empty environment variable counts as unset, as in a compose.yaml that passes on a variable that is not set.
export function listenAddress(config, options = {}, env = process.env) {
  const hostBind = options.hostBind ?? (env.BLYSS_HOSTBIND || undefined) ?? config.server?.hostBind ?? "127.0.0.1";
  if (typeof hostBind !== "string" || !hostBind.trim()) {
    throw refuse("server.hostBind", hostBind, 'an address to listen on, such as "127.0.0.1" or "0.0.0.0"');
  }
  const port = options.port ?? (Number(env.PORT) || (config.server?.fallbackPort ?? 3000));
  return { hostBind, port };
}

// The address to open in a browser: an address that stands for every interface is reached through localhost.
function urlOf(hostBind, port) {
  const host = ["0.0.0.0", "::"].includes(hostBind) ? "localhost" : isIPv6(hostBind) ? `[${hostBind}]` : hostBind;
  return `http://${host}:${port}/`;
}

// What the server takes from the configuration of a website: the directory of its output, with its name in the
// configuration, the path below which it is served, also as a request names it, the language of /, and the
// directories of its sources, which blyss serve --watch watches. The configuration is checked in the order of a
// build, which so stops at the same fault; only a path that cannot be decoded is a fault to the server alone.
export function servedOf(projectDir, config) {
  assertSite(config);
  const { defaultLanguage } = languagesOf(config);
  const { publicDirectory, ...sources } = resolvePaths(projectDir, config);
  // A website below a path, such as /docs for https://example.com/docs/, is served below that path, as on its host.
  const basePath = basePathOf(config);
  return { publicDirectory, publicName: config.directories.public, basePath, base: decodeURIComponent(basePath), defaultLanguage,
    sources: Object.values(sources) };
}

// With the option watch, the server builds the website first and again whenever its sources change, each time with
// its drafts if the option drafts is set, and the pages that it sends reload after each build. Each build reads the
// configuration afresh (see watch.js): once it succeeds, the server serves what the configuration names by then,
// but for the address and the port, which it listens on from its start.
export function serve(projectDir, config, options = {}) {
  let served = servedOf(projectDir, config);
  const { hostBind, port } = listenAddress(config, options);
  const watching = Boolean(options.watch);
  // The pages that wait for the next build, and how the last one went.
  const listeners = new Set();
  let lastBuild = { ok: true };
  const tell = (response, { ok, message }) => response.write(ok ? "event: built\ndata: {}\n\n" : `event: failed\ndata: ${JSON.stringify(message)}\n\n`);
  const send = (response, status, filePath) =>
    (watching && extname(filePath) === ".html" ? sendPage(response, status, filePath) : sendFile(response, status, filePath));
  // A website that was never built has no output directory: the server says so, in the terminal and in the browser.
  const unbuilt = publicName => `There is no ${publicName}/ yet. Build the website first: npm run build`;
  const isBuilt = publicDirectory => stat(publicDirectory).then(info => info.isDirectory(), () => false);
  const server = createServer(async (request, response) => {
    // The server reads files and changes nothing, so it answers only the requests that read.
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }
    // A request is answered with what is served when it arrives, also if a build replaces that meanwhile.
    const { publicDirectory, publicName, basePath, base, defaultLanguage } = served;
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost");
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (watching && pathname === events) {
        response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
        // A request for the headers alone ends with them: only a page that listens keeps its connection.
        if (request.method === "HEAD") {
          response.end();
          return;
        }
        // A page that opens after a failed build shows its problems at once.
        if (!lastBuild.ok) tell(response, lastBuild);
        else response.write(": watching\n\n");
        listeners.add(response);
        request.on("close", () => listeners.delete(response));
        return;
      }
      if (pathname === "/" || pathname === base || pathname === `${base}/`) {
        response.writeHead(302, {
          Location: `${basePath}/${defaultLanguage}/`
        });
        response.end();
        return;
      }
      if (!pathname.startsWith(`${base}/`)) throw new Error("Requested path is outside the path of the website.");
      pathname = pathname.slice(base.length);
      const filePath = fileFor(publicDirectory, pathname.endsWith("/") ? `${pathname}index.html` : pathname);
      if (!filePath) throw new Error("Requested path is outside public/.");
      // Like static hosts, the server leads a directory that is requested without its final slash, such as /en, to
      // its page. The redirect names the requested path, which starts with a single slash: with two, it would lead
      // to another host.
      if (!pathname.endsWith("/") && await isFile(join(filePath, "index.html"))) {
        response.writeHead(302, {
          Location: `${requestUrl.pathname.replace(/^\/+/, "/")}/${requestUrl.search}`
        });
        response.end();
        return;
      }
      await send(response, 200, filePath);
    } catch {
      // Like static hosts, answer every missing file with the generated 404.html, if there is one.
      await send(response, 404, join(publicDirectory, "404.html")).catch(async () => {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" });
        response.end(await isBuilt(publicDirectory) ? "404 Not Found" : `404 Not Found\n\n${unbuilt(publicName)}\n`);
      });
    }
  });
  // A server that cannot listen, as on a port that is in use, says so without a stack trace.
  server.on("error", error => {
    console.error(error.code === "EADDRINUSE"
      ? `Cannot serve on port ${port}: the port is already in use.\n` +
        `Stop the program that uses it, or set the environment variable PORT to another port, such as ${port + 1}.`
      : error.code === "EADDRNOTAVAIL" || error.code === "ENOTFOUND"
        ? `Cannot serve on ${hostBind}: this computer has no such address.\n` +
          "Set BLYSS_HOSTBIND or server.hostBind to one of its addresses, such as 127.0.0.1."
        : `Cannot serve on ${hostBind}, port ${port}: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, hostBind, async () => {
    console.log(`Blyss is serving ${served.publicName}/ on port ${port} of ${hostBind}: ${urlOf(hostBind, port)}`);
    if (watching) {
      console.log(`Blyss is watching the sources of the website and rebuilds it${options.drafts ? " with its drafts" : ""} after each change.`);
      stopWatching = rebuildOnChange(projectDir, served, resolve(projectDir, "blyss.config.js"), {
        drafts: options.drafts,
        onBuilt: result => {
          if (result.ok && result.served) served = result.served;
          lastBuild = result;
          for (const response of listeners) tell(response, result);
        }
      });
    } else if (!await isBuilt(served.publicDirectory)) {
      console.error(unbuilt(served.publicName));
    }
  });
  // The pages that wait for a build keep their connections open, which would keep the server from closing. A build
  // that is running ends before the callback learns that the server has closed: nothing writes the output after that.
  let stopWatching = () => Promise.resolve();
  const close = server.close.bind(server);
  server.close = callback => {
    const stopped = stopWatching();
    for (const response of listeners) response.end();
    return close(error => stopped.then(() => callback?.(error)));
  };
  return server;
}

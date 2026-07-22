import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const distDirectory = normalize(join(scriptDirectory, "..", "dist"));
const mountPath = "/narration-srt/";
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

createServer((request, response) => {
  const requestPath = new URL(request.url ?? "/", "http://localhost").pathname;
  if (!requestPath.startsWith(mountPath)) {
    response.writeHead(404).end("Not found");
    return;
  }
  const relativePath = decodeURIComponent(requestPath.slice(mountPath.length)) || "index.html";
  const candidate = normalize(join(distDirectory, relativePath));
  if (!candidate.startsWith(distDirectory) || !existsSync(candidate) || statSync(candidate).isDirectory()) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(candidate)] ?? "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  createReadStream(candidate).pipe(response);
}).listen(8080, "0.0.0.0", () => {
  console.log(`Static subpath preview: http://localhost:8080${mountPath}`);
});

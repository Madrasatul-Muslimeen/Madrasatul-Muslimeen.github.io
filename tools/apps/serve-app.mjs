// Local static server for a built app (the same server as QR's serve.js, for any built directory).
//   node tools/apps/serve-app.mjs [dir]        dir defaults to build/qr; PORT defaults to 8082
// As GitHub Pages: a missing address gets the site's own 404.html, with status 404.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = Number(process.env.PORT) || 8082;
const ROOT = path.resolve(process.argv[2] || "build/qr");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath.endsWith("/")) urlPath += "index.html";
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end("Forbidden"); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(ROOT, "404.html"), (err2, page) => {
        if (err2) { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found: " + urlPath); return; }
        res.writeHead(404, { "Content-Type": MIME[".html"] });
        res.end(page);
      });
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, () => console.log(`${ROOT} served at http://localhost:${PORT}/`));

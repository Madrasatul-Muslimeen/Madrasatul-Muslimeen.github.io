// Tiny local static file server for testing the new app/ build in a real
// browser (Google sign-in refuses to work from a plain double-clicked
// file:// address — it needs a real web address, even a local one).
// No dependencies, no build step — just Node's own built-in http module.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = 8080;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const filePath = path.join(ROOT, urlPath === "/" ? "/app/admin-self-check.html" : urlPath);

  // Refuse to serve anything outside the project folder.
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found: " + urlPath);
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Serving this project at http://localhost:${PORT}/`);
  console.log(`Admin self-check screen: http://localhost:${PORT}/app/admin-self-check.html`);
  console.log("Leave this window open while testing. Close it (or Ctrl+C) when done.");
});

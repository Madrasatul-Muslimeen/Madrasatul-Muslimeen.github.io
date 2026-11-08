// Builds index.html from demo.template.html: inlines pause-finder.mjs (minus `export`) and the times found on 8 Nov 2026.
// Run: node docs/reference/2026-11-08-demo1104/build.mjs   (--check: fail if index.html is not what the template makes)
import fs from "node:fs";
const dir = new URL(".", import.meta.url).pathname;
const finder = fs.readFileSync(dir + "pause-finder.mjs", "utf8").replace(/^export /gm, "");
const pauses = fs.readFileSync(dir + "pauses-found.json", "utf8").trim();
const html = fs.readFileSync(dir + "demo.template.html", "utf8").replace("/*__FINDER__*/", () => finder).replace("/*__PAUSES__*/", () => pauses);
if (process.argv.includes("--check")) { const cur = fs.existsSync(dir + "index.html") ? fs.readFileSync(dir + "index.html", "utf8") : ""; if (cur !== html) { console.log("index.html is NOT what the template and finder make"); process.exit(1); } console.log("index.html matches"); }
else fs.writeFileSync(dir + "index.html", html);

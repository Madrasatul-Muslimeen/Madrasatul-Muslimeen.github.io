// Every QR page on a phone (390 wide) and a computer (1400 wide): it loads, has a title,
// throws no page errors, and never scrolls sideways. Light and Night both.
// Run from the root: node tools/apps/qr-verify/pages-browser.mjs   (serves itself on PORT, default 8090)
// QR_BASE=http://localhost:8080 uses a server you already started instead.
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PAGES = ["/", "/app/index.html", "/app/asma.html", "/app/asma-about.html"]; // QR J01 R1: the Asma app (no sign-in); J02 S4: the front page (both addresses)
const WIDTHS = [390, 1400];
const SCHEMES = ["light", "dark"];
const PORT = Number(process.env.PORT) || 8090;
let base = process.env.QR_BASE, server;

let pass = 0, fail = 0;
const check = (ok, what) => { ok ? pass++ : fail++; console.log(`${ok ? "ok  " : "FAIL"} ${what}`); };
const browser = await chromium.launch();
try {
  for (const width of WIDTHS) for (const colorScheme of SCHEMES) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, colorScheme });
    await ctx.addInitScript(() => { try { localStorage.setItem("mm_disable_service_worker", "1"); localStorage.setItem("mm_disable_screensaver", "1"); } catch {} });
    for (const p of PAGES) {
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const tag = `${p} @${width} ${colorScheme}`;
      const res = await page.goto(base + p, { waitUntil: "load" });
      check(res && res.ok(), `${tag} loads (${res && res.status()})`);
      check((await page.title()).trim().length > 0, `${tag} has a title`);
      const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      check(sw <= cw, `${tag} no sideways scroll (${sw} <= ${cw})`);
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      check(bg && bg !== "rgba(0, 0, 0, 0)", `${tag} body has its own background (${bg})`);
      check(errors.length === 0, `${tag} no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
      await page.close();
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server?.kill();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

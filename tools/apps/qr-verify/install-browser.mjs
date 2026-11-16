// PCA J117 (the Owner, 16 Nov 2026: "I rcvd a installed prompt on mobile for MSA … Why can't i have it for QR … too?"):
// QuranRevival installs as its own app, and Asma keeps its own install (J31). Against the built QR, on a phone (390):
//   - the front page (/ and /app/) and the four QR reader pages link qr.webmanifest, which the browser parses with
//     QR's name, id /app/, start /app/quranrevival.html, scope /app/, standalone, QR's colours, and three icons that are
//     served (200) as PNGs of the size they claim; the iPhone's home-screen icon link is there and served;
//   - asma.html and asma-about.html still link asma.webmanifest (Asma's own app), and never QR's;
//   - qr.webmanifest is never MSA's (no "MSA" in its name; MSA's manifest.webmanifest is not in the build).
// Chrome's installability-errors call is NOT used here: measured on 16 Nov 2026, the headless shell reports no error even
// with the manifest missing, so it cannot fail; the parsed manifest can. Full Chromium's real verdict for the front page
// is in asma-store-browser.mjs section 3 (with its own no-manifest control).
//   node tools/apps/qr-verify/install-browser.mjs        (needs serve-app on QR_BASE, default :8082; run-all.sh starts it)
//   --mutate=nomanifest  qr.webmanifest answers 404     -> "links qr.webmanifest, parsed as QuranRevival" FAILS
//   --mutate=noicon      qr-512.png answers 404          -> "icon … is served" FAILS
//   --mutate=asmaqr      asma.html's link points at QR's -> "asma.html keeps Asma's own install" FAILS
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import fs from "node:fs";

const MUTATE = process.argv.find((a) => a.startsWith("--mutate="))?.split("=")[1] ?? null;
if (MUTATE && !["nomanifest", "noicon", "asmaqr"].includes(MUTATE)) throw new Error(`Unknown mutation "${MUTATE}"`);
const base = process.env.QR_BASE;
const { chromium } = await import("../../i18n-verify/harness.mjs");

let pass = 0, fail = 0;
const check = (ok, what, detail = "") => {
  if (ok instanceof Promise) throw new Error(`check() was handed a promise: ${what}`);
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${!ok && detail ? ` ${detail}` : ""}`);
};
// Fetched INSIDE the page (so it goes through the browser, as a phone's would; p.request bypasses context routes and
// let the noicon mutation through on the first run): HTTP status and the PNG's own width x height.
const getPng = (p, href) => p.evaluate(async (h) => {
  const r = await fetch(h, { cache: "no-store" });
  const b = new Uint8Array(await r.arrayBuffer());
  const png = b.length > 24 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const u32 = (i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  return { status: r.status, size: png ? `${u32(16)}x${u32(20)}` : "not a PNG" };
}, href);

check(!fs.existsSync("app/manifest.webmanifest"), "MSA's manifest.webmanifest is not in QR's build");

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  if (MUTATE === "nomanifest") await ctx.route("**/qr.webmanifest", (r) => r.fulfill({ status: 404, body: "" }));
  if (MUTATE === "noicon") await ctx.route("**/qr-512.png", (r) => r.fulfill({ status: 404, body: "" }));
  if (MUTATE === "asmaqr") await ctx.route("**/app/asma.html", async (r) => {
    const res = await r.fetch(); await r.fulfill({ response: res, body: (await res.text()).replace("./asma.webmanifest", "./qr.webmanifest") });
  });
  const manifestOf = async (p) => {
    const c = await ctx.newCDPSession(p);
    const m = await c.send("Page.getAppManifest");
    let data = null; try { data = JSON.parse(m.data || ""); } catch { /* none */ }
    return { url: m.url || "", data };
  };
  for (const u of ["/", "/app/index.html", "/app/quranrevival.html", "/app/ldog-study.html", "/app/journey-map.html", "/app/ayah-poster.html"]) {
    const p = await ctx.newPage();
    await p.goto(base + u, { waitUntil: "domcontentloaded" });
    const { url, data: m } = await manifestOf(p);
    check(url.endsWith("/app/qr.webmanifest") && m?.name === "QuranRevival", `${u} links qr.webmanifest, parsed as QuranRevival`, `${url} ${m?.name}`);
    if (u === "/app/quranrevival.html" && m) {
      check(m.id === "/app/" && m.start_url === "/app/quranrevival.html" && m.scope === "/app/" && m.display === "standalone",
        "QR's manifest: id /app/, starts on quranrevival.html, scope /app/, standalone", JSON.stringify([m.id, m.start_url, m.scope, m.display]));
      check(m.theme_color === "#0f4c4c" && m.background_color === "#0d2225" && !/MSA/.test(m.name + m.short_name), "QR's colours, and nothing called MSA");
      const want = { "qr-192.png": "192x192", "qr-512.png": "512x512", "qr-maskable-512.png": "512x512" };
      check((m.icons || []).length === 3 && m.icons.some((i) => i.purpose === "maskable"), "three icons, one maskable");
      for (const ic of m.icons || []) {
        const r = await getPng(p, new URL(ic.src, url).href);
        const name = ic.src.split("/").pop();
        check(r.status === 200 && r.size === want[name] && ic.sizes === want[name], `icon ${name} is served, a ${want[name]} PNG`, `${r.status} ${r.size}`);
      }
    }
    const apple = await p.evaluate(() => document.querySelector('link[rel="apple-touch-icon"]')?.href || "");
    const ar = apple ? await getPng(p, apple) : null;
    check(/qr-apple-touch-icon\.png$/.test(apple) && ar?.status === 200 && ar.size === "180x180", `${u} has the iPhone home-screen icon (180x180, served)`, `${apple} ${JSON.stringify(ar)}`);
    await p.close();
  }
  for (const u of ["/app/asma.html", "/app/asma-about.html"]) {
    const p = await ctx.newPage();
    await p.goto(base + u, { waitUntil: "domcontentloaded" });
    const { url, data: m } = await manifestOf(p);
    check(url.endsWith("/app/asma.webmanifest") && m?.name === "Asma ul Husna", `${u} keeps Asma's own install (asma.webmanifest)`, `${url} ${m?.name}`);
    await p.close();
  }
  await ctx.close();
} finally {
  await browser.close();
}
console.log(`\n==== QR installs as its own app (PCA J117)${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

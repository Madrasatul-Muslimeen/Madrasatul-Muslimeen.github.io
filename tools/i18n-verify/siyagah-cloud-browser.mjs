// PCF MSA J112 (BWN J27 Stage 2): the second, lazy sign-in to Siyagah's own Firebase project, and the Map's hook for
// it, built before Siyagah's R1 API and kept OFF by app/js/siyagah-cloud-readiness.js. This proves:
//   switch   the declaration is OFF; isSiyagahCloudReady() is true only for a governed decision with a real config,
//            and never for MSA's own project (D1)
//   host     Siyagah's sign-in helper is this site's own /__/auth/ on the self-hosted hosts, firebaseapp.com elsewhere
//   wiring   nothing loads at startup (I9): the readiness module imports nothing; siyagah-cloud.js is reached only by
//            dynamic import; only journey-map.html imports the hook; no page reaches siyagah-cloud.js statically
//   off      on the real Map, with the switch as shipped: no bar, and siyagah-cloud.js is never even requested
//            (POSITIVE CONTROL: the hook and the switch ARE requested, so the page really ran them)
//   on       with the switch served ON (a fake config): the bar shows, Siyagah's named app is started, and the bar fits
//            at 360-1440 px, English and Bangla, text 100/150/200%, with a 40px button and no sideways scroll
// Run from the repository root with serve.js on :8080 (or QR_BASE):
//   node tools/i18n-verify/siyagah-cloud-browser.mjs [--mutate=static-import|always-mount|own-project]
//   static-import  the hook imports siyagah-cloud.js statically      -> "off: siyagah-cloud.js is never requested" FAILS
//   always-mount   the hook forgets to check the switch              -> "off: no Siyagah bar" FAILS
//   own-project    the readiness check stops refusing study-monitoring -> "switch: MSA's own project is refused" FAILS
import fs from "node:fs";
import path from "node:path";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
if (MUTATE && !["static-import", "always-mount", "own-project"].includes(MUTATE)) throw new Error(`unknown mutation ${MUTATE}`);
const read = (p) => fs.readFileSync(p, "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const SHOTS = process.env.SHOTS_DIR || "";

const READY_SRC = read("app/js/siyagah-cloud-readiness.js");
const LINK_SRC = read("app/js/siyagah-map-link.js");
const CLOUD_SRC = read("app/js/siyagah-cloud.js");
function mutated(src, a, b) { if (!src.includes(a)) throw new Error(`mutation anchor missing: ${a}`); return src.split(a).join(b); }
const READY_FOR_PURE = MUTATE === "own-project"
  ? mutated(READY_SRC, 'if (config.projectId === "study-monitoring") return false;', "")
  : READY_SRC;
const LINK_SERVED = MUTATE === "static-import"
  ? mutated(LINK_SRC, 'import { t } from "./i18n.js";', 'import { t } from "./i18n.js";\nimport "./siyagah-cloud.js";')
  : MUTATE === "always-mount"
    ? mutated(LINK_SRC, "  if (!isSiyagahCloudReady(declaration)) return null;\n", "")
    : LINK_SRC;

// ---------------------------------------------------------------------------------------------------------------------
console.log("\n=== switch ===");
const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "siy-cloud-"));
fs.writeFileSync(path.join(tmp, "r.mjs"), READY_FOR_PURE);
const R = await import(path.join(tmp, "r.mjs"));
const CONFIG = { apiKey: "AIzaSyFAKE-for-the-test-only", projectId: "siyagah-test", appId: "1:1:web:test" };
const GOOD = { ready: true, decision: { by: "master-architect", on: "2026-11-10", reference: "docs/reports/x.md" }, config: CONFIG };
// UPDATED IN PLACE for J112 R1 (4 Nov 2026): the switch was OFF until Siyagah's R1 went live; the Master Architect's
// round R1 turned it ON with Siyagah's real config. The check now pins exactly what was switched on.
const SHIPPED = R.SIYAGAH_CLOUD_DECLARATION;
check("the shipped declaration is ON for R1: the master architect's decision, Siyagah's project aaas-notebook, the owner's notebook",
  R.isSiyagahCloudReady() === true && SHIPPED.decision.by === "master-architect" && SHIPPED.config.projectId === "aaas-notebook"
  && SHIPPED.config.authDomain === "aaas-notebook.firebaseapp.com" && SHIPPED.notebookId === "nb-mriuc27o-f44402" && !("appId" in SHIPPED.config));
check("a config without an appId (Siyagah's own has none) is ON; an EMPTY appId is refused",
  R.isSiyagahCloudReady({ ...GOOD, config: { apiKey: "k", projectId: "siyagah-test" } }) === true
  && R.isSiyagahCloudReady({ ...GOOD, config: { ...CONFIG, appId: "" } }) === false);
check("POSITIVE CONTROL a governed decision with a real config is ON", R.isSiyagahCloudReady(GOOD) === true);
check("ready alone is not enough (no decision)", R.isSiyagahCloudReady({ ...GOOD, decision: null }) === false);
check("an outside authority is refused", R.isSiyagahCloudReady({ ...GOOD, decision: { ...GOOD.decision, by: "builder" } }) === false);
check("a bad date is refused", R.isSiyagahCloudReady({ ...GOOD, decision: { ...GOOD.decision, on: "4 Nov" } }) === false);
check("no reference is refused", R.isSiyagahCloudReady({ ...GOOD, decision: { ...GOOD.decision, reference: " " } }) === false);
check("no config is refused", R.isSiyagahCloudReady({ ...GOOD, config: null }) === false);
check("a config without an apiKey is refused", R.isSiyagahCloudReady({ ...GOOD, config: { ...CONFIG, apiKey: "" } }) === false);
check("MSA's own project is refused (the SECOND sign-in is never to study-monitoring, D1)", R.isSiyagahCloudReady({ ...GOOD, config: { ...CONFIG, projectId: "study-monitoring" } }) === false);
check("ready must be the literal true", R.isSiyagahCloudReady({ ...GOOD, ready: "true" }) === false);

console.log("\n=== host ===");
// siyagahAuthDomain is pure; it is read out of the module's source so this file does not load Firebase's URLs in node.
const fnSrc = CLOUD_SRC.match(/export function siyagahAuthDomain\([\s\S]*?\n\}/);
check("POSITIVE CONTROL siyagahAuthDomain() is found in siyagah-cloud.js", !!fnSrc);
const authDomain = fnSrc ? new Function(`${fnSrc[0].replace("export ", "")}; return siyagahAuthDomain;`)() : () => "";
const HOSTS = ["madrasatul-muslimeen.github.io", "quranrevival.github.io"];
check("on MSA's host the helper is MSA's own /__/auth/", authDomain("madrasatul-muslimeen.github.io", HOSTS, "siyagah-test") === "madrasatul-muslimeen.github.io");
check("on QR's host the helper is QR's own /__/auth/", authDomain("quranrevival.github.io", HOSTS, "siyagah-test") === "quranrevival.github.io");
check("elsewhere (localhost) it is Siyagah's firebaseapp.com", authDomain("localhost", HOSTS, "siyagah-test") === "siyagah-test.firebaseapp.com");
check("with no list (the harness's firebase-init stub) it is firebaseapp.com", authDomain("madrasatul-muslimeen.github.io", undefined, "siyagah-test") === "siyagah-test.firebaseapp.com");
const initHosts = JSON.parse(read("app/js/firebase-init.js").match(/export const SELF_HOSTED_AUTH_HOSTS = (\[[^\]]*\]);/)?.[1] || "[]");
check("firebase-init.js exports the same host list the test uses", JSON.stringify(initHosts) === JSON.stringify(HOSTS));

console.log("\n=== wiring (I9) ===");
const staticImports = (src) => [...strip(src).matchAll(/^\s*import\s+(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/gm)].map((m) => m[1]);
check("the readiness module imports nothing", staticImports(READY_SRC).length === 0 && !/import\s*\(/.test(strip(READY_SRC)));
check("siyagah-cloud.js's only static import is the switch", JSON.stringify(staticImports(CLOUD_SRC)) === JSON.stringify(["./siyagah-cloud-readiness.js"]));
check("siyagah-cloud.js loads Firebase and firebase-init.js by dynamic import only", /import\(`\$\{SDK\}firebase-app\.js`\)/.test(CLOUD_SRC) && /import\("\.\/firebase-init\.js"\)/.test(CLOUD_SRC));
check("siyagah-cloud.js returns before loading anything while the switch is off", /if \(!isSiyagahCloudReady\(declaration\)\) return Promise\.resolve\(null\);\n\s*if \(opening\) return opening;\n\s*opening = \(async/.test(CLOUD_SRC));
check("the hook's static imports are the switch and i18n only", JSON.stringify(staticImports(LINK_SRC).sort()) === JSON.stringify(["./i18n.js", "./siyagah-cloud-readiness.js"]));
const pages = fs.readdirSync("app").filter((f) => f.endsWith(".html") && !f.startsWith("_prev"));
const importers = pages.filter((f) => /siyagah-map-link\.js/.test(read(`app/${f}`)));
check("only journey-map.html imports the hook", JSON.stringify(importers) === JSON.stringify(["journey-map.html"]), importers.join(", "));
// Walk every page's STATIC import graph: siyagah-cloud.js must be unreachable by any chain of any length.
function graph(file, seen = new Set()) {
  if (seen.has(file) || !fs.existsSync(file)) return seen;
  seen.add(file);
  const src = strip(read(file));
  const specs = file.endsWith(".html")
    ? [...src.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)].map((m) => m[1]).concat([...src.matchAll(/^\s*import\s+(?:[^"';]*?\s+from\s+)?["'](\.[^"']+)["']/gm)].map((m) => m[1]))
    : staticImports(src).filter((s) => s.startsWith("."));
  for (const s of specs) graph(path.normalize(path.join(path.dirname(file), s.split("?")[0])), seen);
  return seen;
}
const mapGraph = graph("app/journey-map.html");
check("POSITIVE CONTROL the walker reaches records.js from quranrevival.html", graph("app/quranrevival.html").has(path.normalize("app/js/records.js")));
check("POSITIVE CONTROL the walker reaches the hook from journey-map.html", mapGraph.has(path.normalize("app/js/siyagah-map-link.js")));
const reachers = pages.filter((f) => graph(`app/${f}`).has(path.normalize("app/js/siyagah-cloud.js")));
check("no page reaches siyagah-cloud.js through static imports", reachers.length === 0, reachers.join(", "));
check("the app's start page does not reach the hook", !graph("app/index.html").has(path.normalize("app/js/siyagah-map-link.js")));

// ---------------------------------------------------------------------------------------------------------------------
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function openMap({ lang = "en", width = 1024, on = false }) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 } });
  if (!on) {
    // UPDATED IN PLACE for J112 R1: the shipped switch is ON now, so "off" is served off, to keep proving that an off
    // switch adds nothing and loads nothing.
    const body = READY_SRC.replace(/export const SIYAGAH_CLOUD_DECLARATION = Object\.freeze\(\{[\s\S]*?\n\}\);/,
      `export const SIYAGAH_CLOUD_DECLARATION = Object.freeze({ ready: false, decision: null, config: null });`);
    if (body === READY_SRC) throw new Error("could not serve the switch OFF");
    await ctx.route("**/js/siyagah-cloud-readiness.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body }));
  }
  if (on) {
    const body = READY_SRC.replace(/export const SIYAGAH_CLOUD_DECLARATION = Object\.freeze\(\{[\s\S]*?\n\}\);/,
      `export const SIYAGAH_CLOUD_DECLARATION = Object.freeze(${JSON.stringify({ ...GOOD, notebookId: "nb-test" })});`);
    if (body === READY_SRC) throw new Error("could not serve the switch ON");
    await ctx.route("**/js/siyagah-cloud-readiness.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body }));
  }
  if (LINK_SERVED !== LINK_SRC) await ctx.route("**/js/siyagah-map-link.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: LINK_SERVED }));
  const asked = [];
  ctx.on("request", (r) => asked.push(r.url()));
  const { page } = await openPage(ctx, "/app/journey-map.html");
  await page.waitForFunction(() => document.getElementById("app")?.style.display === "block", null, { timeout: 15000 });
  return { ctx, page, asked };
}

console.log("\n=== off (the switch served OFF) ===");
{
  const { ctx, page, asked } = await openMap({});
  await page.waitForTimeout(1200);
  check("off: POSITIVE CONTROL the Map loaded the hook and the switch", asked.some((u) => u.endsWith("/js/siyagah-map-link.js")) && asked.some((u) => u.endsWith("/js/siyagah-cloud-readiness.js")));
  check("off: no Siyagah bar", (await page.$("#siyagahCloudBar")) === null);
  check("off: siyagah-cloud.js is never requested", !asked.some((u) => u.includes("/js/siyagah-cloud.js")));
  check("off: the folders still render", (await page.$("#noteLayout")) !== null);
  await ctx.close();
}

console.log("\n=== on (the switch served ON, a fake config) ===");
for (const lang of ["en", "bn"]) for (const width of [360, 390, 768, 1024, 1440]) for (const pct of [100, 150, 200]) {
  const tag = `${lang}/${width}/${pct}%`;
  const { ctx, page, asked } = await openMap({ lang, width, on: true });
  await page.evaluate((p) => { document.documentElement.style.fontSize = p + "%"; }, pct);
  let shown = true;
  try { await page.waitForSelector("#siyagahCloudBar [data-siyagah-action]", { timeout: 8000 }); } catch { shown = false; }
  check(`${tag}: the bar shows, signed in, with its button`, shown);
  if (!shown) { await ctx.close(); continue; }
  const m = await page.evaluate(() => {
    const bar = document.getElementById("siyagahCloudBar"), btn = bar.querySelector("[data-siyagah-action]");
    const b = bar.getBoundingClientRect(), k = btn.getBoundingClientRect();
    return { text: bar.textContent, before: bar.nextElementSibling?.id, bl: b.left, br: b.right, kl: k.left, kr: k.right, kh: k.height,
      kInside: k.left >= b.left - 0.5 && k.right <= b.right + 0.5, barOverflow: bar.scrollWidth - bar.clientWidth,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, vw: innerWidth,
      fg: getComputedStyle(bar).color, bg: getComputedStyle(bar).backgroundColor };
  });
  if (width === 1024 && pct === 100) {
    check(`${tag}: siyagah-cloud.js loaded only now, on the Map`, asked.some((u) => u.includes("/js/siyagah-cloud.js")));
    check(`${tag}: the bar sits just above the folders`, m.before === "noteLayout");
    check(`${tag}: it says who is connected`, m.text.includes("smahk9@gmail.com"), m.text);
    check(`${tag}: the text is in the reader's language`, lang === "bn" ? /সিয়াগাহ/.test(m.text) && !/Connected as/.test(m.text) : /Siyagah's Mapping My Journey/.test(m.text));
  }
  check(`${tag}: the bar fits the screen`, m.bl >= 0 && m.br <= m.vw + 0.5, JSON.stringify(m));
  check(`${tag}: the button is whole inside the bar and at least 40px tall`, m.kInside && m.kh >= 39.5, JSON.stringify(m));
  check(`${tag}: nothing in the bar runs sideways, and the page does not scroll sideways`, m.barOverflow <= 0 && m.pageOverflow <= 0, JSON.stringify(m));
  if (SHOTS && (width === 360 || width === 1440) && pct !== 150) await (await page.$("#siyagahCloudBar")).screenshot({ path: `${SHOTS}/siyagah-bar-${lang}-${width}-${pct}.png` });
  await ctx.close();
}
await browser.close();
console.log(`\n==== Siyagah cloud (J112)${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

// Decision 81 item 1 (6 Oct 2026, the Owner: "1.yes") -- the startup paint. The landing used to show "Loading…" where
// the wheel goes until three Firestore round trips came back (1.6 s+ at 400 ms a trip; docs/reports/2026-10-06-speed-
// assessment.md item 4). Now the wheel as it was last drawn on this device shows the moment the page is read, dimmed
// and not tappable, and the real wheel replaces it in the same place.
// Run from the repository root with serve.js on :8080. Firestore answers 400 ms a trip here, as on a slow phone.
//   --mutate=no-drop     the real draw leaves the copy up      -> the "replaced" checks fail
//   --mutate=no-keep     nothing is kept after a draw          -> the "kept" and "shown at once" checks fail
//   --mutate=any-uid     another account's copy is shown       -> the "another account" check fails
//   --mutate=no-guard    a copy carrying an event handler runs -> the "tampered" check fails
//   --mutate=any-lang    a copy in the other language is shown -> the "other language" check fails
import { chromium, newContext, BASE } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
let body = fs.readFileSync("app/quranrevival.html", "utf8");
const swap = (a, b) => { const n = body.split(a).length - 1; if (!n) throw new Error(`mutation anchor missing: ${a.slice(0, 70)}`); console.log(`(mutation ${MUTATE}: ${n} occurrence(s) replaced)`); body = body.split(a).join(b); };
if (MUTATE === "no-drop") swap("    function renderWheel() {\n      dropWheelPaintCopy();", "    function renderWheel() {");
else if (MUTATE === "no-keep") swap("      keepWheelPaintCopy();\n", "");
else if (MUTATE === "any-uid") swap("if (!user || wheelPaintCopyUid() !== user.uid) dropWheelPaintCopy();", "if (!user) dropWheelPaintCopy();");
else if (MUTATE === "no-guard") swap("|\\son[a-z]+\\s*=", "");
else if (MUTATE === "any-lang") swap(" || c.lang !== lang ||", " ||");
else if (MUTATE) throw new Error(`unknown mutation ${MUTATE}`);

const KEY = "mmsa.wheelPaint.v1";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of ["en", "bn"]) for (const width of [390, 1280]) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 }, latencyMs: 400 });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body }));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const realWheel = () => page.waitForFunction(() => !!document.querySelector("#wheelContainer svg.mastery-wheel") && getComputedStyle(document.getElementById("wheelContainer")).display !== "none", null, { timeout: 30000 }).catch(() => {}); // a wheel that never comes fails the named checks below, not a throw
  const look = () => page.evaluate(() => {
    const c = document.getElementById("wheelPaintCopy"), w = document.getElementById("wheelContainer");
    const box = (el) => { const r = el?.getBoundingClientRect(); return r ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null; };
    const svg = c?.querySelector("svg");
    return {
      copyShown: !!c && !c.hidden && getComputedStyle(c).display !== "none" && !!svg && svg.getBoundingClientRect().width > 50,
      copySegs: c?.querySelectorAll(".wheel-seg").length ?? 0, copyBox: box(svg), copyInert: !!c?.inert, copyPE: c ? getComputedStyle(c).pointerEvents : "",
      copyFilter: svg ? getComputedStyle(svg).filter : "",
      realShown: !!w?.querySelector("svg.mastery-wheel") && getComputedStyle(w).display !== "none", realBox: box(w?.querySelector("svg.mastery-wheel")),
      containerShown: !!w && getComputedStyle(w).display !== "none", fsReads: (window.__fsLog || []).length,
      appInert: !!document.getElementById("app")?.inert, bootBox: !document.getElementById("bootStatus")?.hidden,
    };
  });

  // 1. A first visit: nothing kept yet, so "Loading…" as before; the real draw keeps a copy.
  await page.goto(`${BASE}/app/quranrevival.html`, { waitUntil: "domcontentloaded" });
  const first = await look();
  check(`${tag}: a first visit has no copy to show`, !first.copyShown && first.containerShown, JSON.stringify(first));
  await realWheel();
  await page.waitForTimeout(300);
  const kept = await page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }, KEY);
  check(`${tag}: the drawn wheel is kept on this device, with its account and language`, !!kept && kept.uid === "test-uid" && kept.lang === lang && kept.html?.startsWith('<svg class="mastery-wheel'), JSON.stringify(kept && { uid: kept.uid, lang: kept.lang, len: kept.html?.length }));
  const realFirst = await look();

  // 2. The next open: the copy shows before Firestore has answered anything, where the wheel will be.
  const t0 = Date.now();
  await page.goto(`${BASE}/app/quranrevival.html`, { waitUntil: "commit" });
  await page.waitForFunction(() => { const c = document.getElementById("wheelPaintCopy"); return !!c && !c.hidden && (c.querySelector("svg")?.getBoundingClientRect().width ?? 0) > 50; }, null, { timeout: 8000, polling: 20 }).catch(() => {});
  const early = await look();
  const tCopy = Date.now() - t0;
  check(`${tag}: on the next open the wheel shows at once, while the real one is still waiting on Firestore`, early.copyShown && early.copySegs >= 10 && !early.realShown, JSON.stringify({ ...early, tCopy }));
  check(`${tag}: ...it is not tappable (inert, no pointer events), and nor is the page until the real reveal`, early.copyInert && early.copyPE === "none" && early.appInert, JSON.stringify(early));
  check(`${tag}: ..."Loading your study…" is not shown above it (nothing moves at the reveal)`, !early.bootBox);
  check(`${tag}: ...it is dimmed like the real wheel`, /blur/.test(early.copyFilter), early.copyFilter);
  check(`${tag}: ..."Loading…" is not shown beside it`, !early.containerShown);
  if (width === 390) { fs.mkdirSync("/tmp/paint-shots", { recursive: true }); await page.screenshot({ path: `/tmp/paint-shots/copy-${lang}-${width}.png` }); }
  await realWheel();
  const tReal = Date.now() - t0;
  const after = await look();
  check(`${tag}: ...and at least one whole Firestore trip (400 ms) sooner than the real wheel (${tCopy} ms vs ${tReal} ms)`, tCopy + 400 <= tReal);
  check(`${tag}: the real wheel replaces it (${tCopy} ms -> ${tReal} ms), and the page can be tapped`, after.realShown && !after.copyShown && after.copySegs === 0 && !after.appInert, JSON.stringify(after));
  const near = (a, b) => a && b && Math.abs(a.x - b.x) <= 3 && Math.abs(a.y - b.y) <= 3 && Math.abs(a.w - b.w) <= 3;
  check(`${tag}: ...in the same place and size (nothing jumps)`, near(early.copyBox, after.realBox) && near(after.realBox, realFirst.realBox), JSON.stringify({ copy: early.copyBox, real: after.realBox }));

  // 3. Another account's copy on this device is taken away as soon as sign-in answers.
  await page.evaluate((k) => { const c = JSON.parse(localStorage.getItem(k)); c.uid = "someone-else"; localStorage.setItem(k, JSON.stringify(c)); }, KEY);
  await page.goto(`${BASE}/app/quranrevival.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window.__fsLog || []).length > 0, null, { timeout: 15000 });
  const other = await look();
  check(`${tag}: another account's copy is taken away before this account's wheel is read`, !other.copyShown && !other.realShown, JSON.stringify(other));
  await realWheel();

  // 4. A copy in the other language is not shown (the reader changed language).
  await page.evaluate((k) => { const c = JSON.parse(localStorage.getItem(k)); c.lang = c.lang === "en" ? "bn" : "en"; localStorage.setItem(k, JSON.stringify(c)); }, KEY);
  await page.goto(`${BASE}/app/quranrevival.html`, { waitUntil: "domcontentloaded" });
  // The inline script decides while the page is read, so by DOMContentLoaded the copy is up or it never will be.
  check(`${tag}: a copy in the other language is not shown`, await page.evaluate(() => document.getElementById("wheelPaintCopy").hidden && !document.querySelector("#wheelPaintCopy svg")));
  await realWheel();

  // 5. A tampered copy (an event handler in it) is refused, never run.
  await page.evaluate((k) => { const c = JSON.parse(localStorage.getItem(k)); c.html = c.html.replace('<svg class="mastery-wheel"', '<svg class="mastery-wheel" onload="window.__paintRan=1"'); localStorage.setItem(k, JSON.stringify(c)); }, KEY);
  await page.goto(`${BASE}/app/quranrevival.html`, { waitUntil: "domcontentloaded" });
  const tampered = await page.evaluate(() => ({ ran: !!window.__paintRan, shown: !document.getElementById("wheelPaintCopy").hidden }));
  check(`${tag}: a copy carrying an event handler is refused and never runs`, !tampered.ran && !tampered.shown, JSON.stringify(tampered));
  await realWheel();

  check(`${tag}: no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Startup paint: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

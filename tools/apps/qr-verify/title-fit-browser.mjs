// v13.15 (QR Lead finding, handover 2 Nov 12:55 am, Next 2): QR's heading on a phone. QR's short name "QuranRevival"
// is 146px against MSA's "MSA" 52px, so in shared header code it (a) ran 5px off a 320px screen at 200% text and
// (b) pushed the Search button onto a second line at ordinary text (72px tall against MSA's 40px). QR's build rule now
// sets three CSS properties (tools/apps/build-app.mjs; MSA sets none, so MSA is unchanged). At 320, 340, 360 and 390,
// English and Bangla, 100/150/200% text:
//   - nothing runs past the screen (no sideways scroll; the name, the version and the button inside the screen);
//   - the version is never split ("v13.15-" / "02.11.26"): it is one line;
//   - at 100% at 320 the Search button keeps the name's line and the heading is at most 60px tall (it was 72);
//   - the name is never made smaller at 100% (the fit only bites when it would not fit).
//   node tools/apps/qr-verify/title-fit-browser.mjs        (needs serve-app on QR_BASE, default :8082; run-all.sh starts it)
//   --mutate=noflex   no --app-title-flex       -> "the Search button keeps the name's line" FAILS at 320 100%
//   --mutate=nofit    no --app-name-em          -> "nothing runs past the screen" FAILS at 320 200%
//   --mutate=nowrap   no --app-version-wrap     -> "the version is one line" FAILS at 320 100%
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import fs from "node:fs";

const MUTATE = process.argv.find((a) => a.startsWith("--mutate="))?.split("=")[1] ?? null;
const PAGE = "app/quranrevival.html";
const MUTATIONS = { noflex: " --app-title-flex: 1 1 min-content;", nofit: " --app-name-em: 7.2;", nowrap: " --app-version-wrap: nowrap;" };
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`Unknown mutation "${MUTATE}"`);
const base = process.env.QR_BASE;
const { chromium, newContext } = await import("../../i18n-verify/harness.mjs");

let pass = 0, fail = 0;
const check = (ok, what, detail = "") => {
  if (ok instanceof Promise) throw new Error(`check() was handed a promise: ${what}`);
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${!ok && detail ? ` ${detail}` : ""}`);
};

const src = fs.readFileSync(PAGE, "utf8");
check(src.split(":root { --app-name-em: 7.2; --app-title-flex: 1 1 min-content; --app-version-wrap: nowrap; }").length === 2, "POSITIVE CONTROL the built page carries QR's three heading settings once");
if (MUTATE && src.split(MUTATIONS[MUTATE]).length !== 2) throw new Error(`mutation anchor not found exactly once: ${MUTATE}`);

const browser = await chromium.launch();
try {
  for (const lang of ["en", "bn"]) for (const width of [320, 340, 360, 390]) for (const size of ["100%", "150%", "200%"]) {
    const tag = `[${lang} ${width} ${size}]`;
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 760 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE) await ctx.route(/\/app\/quranrevival\.html(\?.*)?$/, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(MUTATIONS[MUTATE]).join("") }));
    const page = await ctx.newPage();
    await page.goto(`${base}/app/quranrevival.html`, { waitUntil: "networkidle" });
    await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, size);
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const box = (sel) => { const e = document.querySelector(sel); const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, h: b.height, w: b.width }; };
      const ver = document.querySelector("#appVersion");
      const lineH = parseFloat(getComputedStyle(ver).lineHeight) || parseFloat(getComputedStyle(ver).fontSize) * 1.6;
      const name = document.querySelector(".app-name-short");
      return { W: innerWidth, sw: document.documentElement.scrollWidth, h1: box("h1"), name: box(".app-name-short"), ver: box("#appVersion"), verText: ver.textContent, verRects: ver.getClientRects().length, lineH,
        btn: box("#headSearchBtn"), nameFs: parseFloat(getComputedStyle(name).fontSize), h1Fs: parseFloat(getComputedStyle(document.querySelector("h1")).fontSize), nameShown: getComputedStyle(name).display !== "none" };
    });
    if (width === 320 && size === "100%" && lang === "en") check(m.nameShown && /\d/.test(m.verText), `${tag} POSITIVE CONTROL the short name shows and the version is printed`, JSON.stringify(m.verText));
    const inside = (b) => b.l >= -0.5 && b.r <= m.W + 0.5;
    check(m.sw <= m.W && inside(m.name) && inside(m.ver) && inside(m.btn), `${tag} nothing runs past the screen`, `scrollWidth ${m.sw}/${m.W}, name ${m.name.l.toFixed(0)}-${m.name.r.toFixed(0)}, version ${m.ver.l.toFixed(0)}-${m.ver.r.toFixed(0)}`);
    check(m.verRects === 1, `${tag} the version is one line (never split)`, `${m.verRects} line boxes`);
    if (size === "100%") check(Math.abs(m.nameFs - m.h1Fs) < 0.5, `${tag} at ordinary text the name keeps its full size`, `${m.nameFs} vs ${m.h1Fs}`);
    if (width === 320 && size === "100%") {
      check(m.btn.t < m.name.b, `${tag} the Search button keeps the name's line`, `button top ${m.btn.t.toFixed(0)}, name bottom ${m.name.b.toFixed(0)}`);
      check(m.h1.h <= 60, `${tag} the heading is at most 60px tall (it was 72)`, `${m.h1.h.toFixed(0)}px`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(`\n==== QR heading fits a phone (v13.15)${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

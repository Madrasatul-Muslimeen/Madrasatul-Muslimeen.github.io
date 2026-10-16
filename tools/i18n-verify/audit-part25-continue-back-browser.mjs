// Audit part 25 (PCF MSA J29): the Continue strip's way back (decision 86) and hidden modules no longer using its five places.
//   back   a chip opens its page with back=1; that page shows a rendered ← Back (>=40px, inside the screen, translated) which returns to
//          the page the chip was on; a page opened without back=1 shows none
//   cap    the strip shows up to five VISIBLE places, newest first, however many hidden-module entries are newer
//   empty  with only hidden entries there is no strip and no error
// Mutations: --mutate=noback (chip without back=1), --mutate=capfirst (cap before hiding) must each fail the suite.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part25-continue-back-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, LONLY = arg("lang");
const MUTATIONS = {
  noback: ["app/js/continue-strip.js", "**/continue-strip.js*", '&back=1">', '">', "/app/deen-study.html"],
  capfirst: ["app/js/bookmarks.js", "**/bookmarks.js*", '    .filter((e) => !isHiddenFromQr(e.moduleId)) // hidden modules never use up one of the strip\'s places\n', "", "/app/deen-study.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const BN = /[ঀ-৿]/;
const RESUME = (updatedAt) => ({ position: null, settings: null, updatedAt });
const d = (n) => `2026-10-${String(n).padStart(2, "0")}T00:00:00.000Z`;
const seedOf = (resume) => `
(function () {
  window.__stubApplyBatches = true; window.__DATA = DATA;
  DATA.bookmarks = [{ _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", folders: [], saved: [], resume: ${JSON.stringify(resume)} }];
})();`;
// Four hidden (newest), two visible, three older visible.
const MIXED = {
  "general::none::g": RESUME(d(15)), "naturelife::none::n": RESUME(d(14)), "lifeskill::none::l": RESUME(d(13)), "health::none::h": RESUME(d(12)),
  "hadith::none::hsub": RESUME(d(11)), "deen::none::deen_ethics": RESUME(d(10)),
  "arabic::none::asub": RESUME(d(9)), "quranrevival::none::quran": RESUME(d(8)), "deen::none::deen_other": RESUME(d(7)),
};
const ONLYHIDDEN = { "general::none::g": RESUME(d(15)), "health::none::h": RESUME(d(12)) };

async function open(lang, width, pagePath, resume) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: seedOf(resume) });
  await ctx.route((u) => !["localhost", "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, width, pagePath, resume, fn) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, pagePath, resume), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 90000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const WIDTHS = [320, 390, 820, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
const backInfo = (page) => ev(page, () => {
  const a = document.querySelector("[data-bm-back-link]");
  if (!a) return null;
  const r = a.getBoundingClientRect(), s = getComputedStyle(a);
  return { text: a.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, shown: s.display !== "none" && s.visibility !== "hidden" };
});

for (const lang of LANGS) for (const width of WIDTHS) {
  await flow("cap", lang, width, "/app/deen-study.html", MIXED, async (tag, page, errors) => {
    await page.waitForSelector("#continueStrip .continue-chip", { timeout: 20000 });
    const hrefs = await ev(page, () => [...document.querySelectorAll("#continueStrip .continue-chip")].map((a) => a.getAttribute("href")));
    check(`${tag}: positive control: the strip is drawn`, hrefs.length > 0, JSON.stringify(hrefs));
    check(`${tag}: five visible chips, newest first, though four hidden entries are newer`, hrefs.map((h) => h.split("?")[0] + "?" + h.split("resume=")[1].split("&")[0]).join(",") === "hadith-study.html?hsub,deen-study.html?deen_ethics,arabic-study.html?asub,quranrevival.html?quran,deen-study.html?deen_other", hrefs.join(" "));
    check(`${tag}: no error on the page`, errors.length === 0, errors.join(" | ").slice(0, 200));
  });
  await flow("empty", lang, width, "/app/deen-study.html", ONLYHIDDEN, async (tag, page, errors) => {
    await page.waitForFunction(() => (window.__fsLog || []).some((r) => r.col === "bookmarks"), null, { timeout: 20000 });
    await page.waitForTimeout(800);
    check(`${tag}: only hidden entries -> no strip is drawn`, (await ev(page, () => document.querySelectorAll("#continueStrip .continue-chip").length)) === 0);
    check(`${tag}: no page errors`, errors.length === 0, errors.join(" | ").slice(0, 200));
  });
  await flow("back", lang, width, "/app/deen-study.html", MIXED, async (tag, page, errors) => {
    await page.waitForSelector("#continueStrip .continue-chip", { timeout: 20000 });
    check(`${tag}: a page opened without back=1 shows no ← Back`, (await backInfo(page)) === null);
    const hrefs = await ev(page, () => [...document.querySelectorAll("#continueStrip .continue-chip")].map((a) => a.getAttribute("href")));
    check(`${tag}: every chip carries back=1 and keeps resume=`, hrefs.length > 0 && hrefs.every((h) => /\?resume=[A-Za-z_]+&back=1$/.test(h)), hrefs.join(" "));
    const here = page.url().split("#")[0];
    await page.click('#continueStrip .continue-chip[href^="arabic-study.html"]');
    await page.waitForURL(/arabic-study\.html\?resume=asub&back=1/, { timeout: 15000 });
    await page.waitForSelector("[data-bm-back-link]", { state: "attached", timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1800); // the pill settles above any fixed bar
    const b = await backInfo(page);
    check(`${tag}: the destination shows ← Back, rendered, inside the screen`, !!b && b.shown && b.inside && /^←/.test(b.text), JSON.stringify(b));
    check(`${tag}: it is 40px or more`, !!b && b.h >= 39.5 && b.w >= 39.5, JSON.stringify(b));
    if (lang === "bn") check(`${tag}: it is in Bangla`, !!b && BN.test(b.text), JSON.stringify(b));
    if (b) {
      const clear = await ev(page, () => {
        const r = document.querySelector("[data-bm-back-link]").getBoundingClientRect();
        const nav = document.getElementById("navBar")?.getBoundingClientRect();
        return !nav || r.top >= nav.bottom - 1 || r.bottom <= nav.top + 1;
      });
      check(`${tag}: it is clear of the nav row`, clear);
      await page.click("[data-bm-back-link]");
      await page.waitForURL(/deen-study\.html/, { timeout: 15000 });
      check(`${tag}: tapping it returns to the page the chip was on`, page.url().split("#")[0] === here, page.url());
    }
    check(`${tag}: no page errors`, errors.length === 0, errors.join(" | ").slice(0, 200));
  });
}

await browser.close();
console.log(`\n==== audit-part25${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

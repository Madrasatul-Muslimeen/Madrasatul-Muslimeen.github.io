// J141 (15 Nov 2026, the Owner): (1) tapping the app's title goes to the app's home page; (2) the version is printed
// "v15.05 - 15.Nov.2026". At 390 and 1280, en and bn, on quranrevival.html, hadith-study.html, notes.html and
// hadith-collections.html. Run it against MSA (default :8080) or QR's build (QR_BASE=http://localhost:8082).
//   node tools/i18n-verify/title-home-version-browser.mjs
//   --mutate=nolink     the title's href is "#"            -> "tapping the title goes home" FAILS
//   --mutate=oldlabel   the label built the pre-J141 way    -> "the label matches" FAILS
import { chromium, newContext, BASE } from "./harness.mjs";

const MUTATE = process.argv.find((a) => a.startsWith("--mutate="))?.split("=")[1] ?? null;
if (MUTATE && !["nolink", "oldlabel"].includes(MUTATE)) throw new Error(`Unknown mutation "${MUTATE}"`);
let pass = 0, fail = 0;
const check = (ok, what, detail = "") => {
  if (ok instanceof Promise) throw new Error(`check() was handed a promise: ${what}`);
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${!ok && detail ? ` ${detail}` : ""}`);
};
const LABEL = /^v\d\d\.\d\d - \d{1,2}\.[A-Z][a-z]{2}\.\d{4}$/;
// QR's build carries only some pages (its Hadith pages are not in it): TITLE_PAGES=quranrevival.html limits the run.
const ONLY = (process.env.TITLE_PAGES || "").split(",").filter(Boolean);
const ALL_PAGES = [
  { path: "/app/quranrevival.html", label: "#appVersion" },
  // hadith-collections.html: its "QuranRevival" shell title only shows when the page is mounted inside quranrevival.html
  // (hadith.css: #qrShell is display:none otherwise), so only its label is checked here; the link is checked in the DOM.
  { path: "/app/hadith-collections.html", label: "#qrVersionBadge", hiddenLink: true },
  { path: "/app/hadith-study.html", label: null },
  { path: "/app/notes.html", label: null },
];
const PAGES = ONLY.length ? ALL_PAGES.filter((p) => ONLY.includes(p.path.split("/").pop())) : ALL_PAGES;

const browser = await chromium.launch();
try {
  // POSITIVE CONTROL for the label regex: it must refuse the old shape and accept the new one.
  check(!LABEL.test("v15.04-15.11.26") && LABEL.test("v15.04 - 15.Nov.2026"), "POSITIVE CONTROL the label pattern refuses the old shape and takes the new");
  for (const lang of ["en", "bn"]) for (const width of [390, 1280]) for (const pg of PAGES) {
    const tag = `[${lang} ${width} ${pg.path.split("/").pop()}]`;
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 800 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE === "oldlabel") {
      await ctx.route(/\/js\/version\.js/, async (r) => {
        const t = await (await r.fetch()).text();
        r.fulfill({ status: 200, contentType: "text/javascript", body: t.replace(/export const APP_VERSION_LABEL = .*\n/, "export const APP_VERSION_LABEL = `v${APP_VERSION}-${APP_VERSION_DATE}`;\n") });
      });
    }
    if (MUTATE === "nolink") {
      await ctx.route(new RegExp(pg.path.replace(/[.]/g, "\\.") + "(\\?.*)?$"), async (r) => {
        const t = await (await r.fetch()).text();
        r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: t.split('href="./quranrevival.html"').join('href="#"') });
      });
    }
    const page = await ctx.newPage();
    await page.goto(`${BASE}${pg.path}?x=1`, { waitUntil: "networkidle" });
    const link = page.locator("a.app-title-home").first();
    check(await link.count() === 1, `${tag} POSITIVE CONTROL the title is a link`);
    if (pg.label) {
      await page.waitForFunction((s) => /\d/.test(document.querySelector(s)?.textContent || ""), pg.label, { timeout: 10000 }).catch(() => {});
      const t = (await page.locator(pg.label).first().innerText().catch(() => "")).trim();
      check(LABEL.test(t), `${tag} the label matches (${t || "nothing"})`, t);
    }
    if (pg.hiddenLink) {
      check((await link.getAttribute("href")) === "./quranrevival.html", `${tag} the (mounted-only) shell title links home`, String(await link.getAttribute("href")));
    } else if (await link.count()) {
      const b = await link.boundingBox();
      check(!!b && b.height >= 38, `${tag} the tap area is finger-sized`, JSON.stringify(b));
      await page.evaluate(() => { window.__marker = 1; });
      await Promise.all([page.waitForURL(/\/app\/quranrevival\.html(?!\?x=1)/, { timeout: 8000 }).catch(() => {}), link.click().catch(() => {})]);
      await page.waitForLoadState("networkidle").catch(() => {});
      const u = new URL(page.url());
      const reloaded = (await page.evaluate(() => window.__marker).catch(() => undefined)) === undefined;
      check(u.pathname.endsWith("/app/quranrevival.html") && u.search === "" && (pg.path.endsWith("quranrevival.html") ? reloaded : true), `${tag} tapping the title goes home`, page.url());
    }
    await ctx.close();
  }
} finally { await browser.close(); }
console.log(`\n==== title goes home + version label${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

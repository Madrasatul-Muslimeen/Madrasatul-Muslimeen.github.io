// Audit part 112 (PCF MSA J29, SECURITY): a typed Resource must reach the page as TEXT, and a typed link only opens when
// it is a web or mail link. The harness seeds a link Resource "javascript:window.__xss=1", a text Resource whose body holds an
// <img onerror> payload plus <b>bold</b>, attaches both to curriculum unit u1, gives a Deen Study topic the javascript: Resource,
// and a tagline whose link.url is javascript:. Curriculum (Resources list and unit card), the Deen topic, Taglines and the
// Landing page are opened in en and bn at 390 and 1440: window.__xss is never set, no <img src="x">, no <b> built from the text,
// no a[href^="javascript:"] anywhere, and clicking each would-be link leaves window.__xss unset. Pure cases for safeHref too.
// Mutation: --mutate=escape drops the escape on curriculum.html's Resources list; --mutate=href makes safeHref return its input.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part112-link-safety-browser.mjs [--mutate=escape|href]
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const FILES = { escape: "app/curriculum.html", href: "app/js/html-escape.js" };
const ORIG = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, fs.readFileSync(f, "utf8")]));
if (MUTATE) {
  if (!FILES[MUTATE]) throw new Error("unknown mutation " + MUTATE);
  let m;
  if (MUTATE === "escape") m = ORIG.escape.replace('return r.type !== "link" ? "" : ""', "").replace(/return escapeHtml\(max \? \(r\.body \?\? ""\)\.slice\(0, max\) : \(r\.body \?\? ""\)\);/, 'return max ? (r.body ?? "").slice(0, max) : (r.body ?? "");');
  else m = ORIG.href.replace("export function safeHref(url) {", "export function safeHref(url) {\n  return String(url ?? \"\");");
  if (m === ORIG[MUTATE]) throw new Error("mutation did not apply");
  fs.writeFileSync(FILES[MUTATE], m);
}

const { safeHref } = await import("../../app/js/html-escape.js?" + Date.now());

let fails = 0, runs = 0;
const ok = (c, m) => { if (!c) fails++; console.log(`${c ? "PASS" : "FAIL"}  ${m}`); };

// ---- pure cases
for (const bad of ["javascript:window.__xss=1", "JaVaScRiPt:alert(1)", " \tjavascript:alert(1)", "\u0001javascript:alert(1)", "java\nscript:alert(1)", "data:text/html,<b>x</b>", "vbscript:msgbox(1)"]) {
  ok(safeHref(bad) === "", `safeHref(${JSON.stringify(bad)}) is ""`);
}
for (const good of ["https://a.b", "http://a.b", "mailto:x@y.z", "HTTPS://A.B", "notes.html?x=1", "/app/x.html"]) {
  ok(safeHref(good) === good, `safeHref(${JSON.stringify(good)}) is unchanged`);
}

// ---- browser cases
const BODY = '<img src=x onerror="window.__xss=(window.__xss||0)+1"><b>bold</b>';
const SEED = `
  const JS = "javascript:window.__xss=1";
  DATA.resources.push({ _id: TENANT_ID + "__rjs", tenantId: TENANT_ID, type: "link", url: JS, body: null, addedByPersonId: "p1", status: "active" });
  DATA.resources.push({ _id: TENANT_ID + "__rtx", tenantId: TENANT_ID, type: "text", url: null, body: ${JSON.stringify(BODY)}, addedByPersonId: "p1", status: "active" });
  for (const u of DATA.curriculumUnits) if (u._id.endsWith("__u1")) u.resourceIds = ["r1", "rjs", "rtx"];
  for (const s of DATA.subjects) if (s.subjectId === "deen_ethics") s.resourceIds = ["rjs"];
`;
const TAG = { lines: [{ id: "x", text: { en: "A gentle reminder", bn: "একটি মৃদু স্মরণ" }, link: { url: "javascript:window.__xss=1", target: "internal" }, order: 10, status: "active", holdDays: 7, ayahRef: null }], settings: { motion: "fade", changeAfterSeconds: 2, pauseOnHold: true, scroll: false } };

const PAGES = [
  ["curriculum", "/app/curriculum.html"],
  ["deen topic", "/app/deen-study.html"],
  ["taglines", "/app/taglines.html"],
  ["landing", "/app/quranrevival.html"],
];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const [name, url] of PAGES) for (const lang of ["en", "bn"]) for (const w of [390, 1440]) {
    if (MUTATE === "escape" && name !== "curriculum") continue;
    const ctx = await newContext(browser, { appLang: lang, accountLang: lang, banner: name === "landing" ? false : false, viewport: { width: w, height: 900 }, extraSeedJs: SEED, taglines: TAG });
    const { page } = await openPage(ctx, url);
    await page.waitForTimeout(2000);
    if (name === "curriculum") {
      // the unit card is drawn already; open the Resources list too if it is behind a tab/details
      await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
      await page.waitForTimeout(500);
    }
    if (name === "deen topic") {
      await page.locator(".topic-row-leaf").first().click(); // Ethics, which carries the javascript: Resource
      await page.waitForSelector(".topic-resource", { timeout: 10000 });
      await page.waitForTimeout(500);
    }
    const q = () => page.evaluate(() => ({
      xss: window.__xss ?? null,
      imgs: document.querySelectorAll('img[src="x"]').length,
      bolds: document.querySelectorAll("main b, #resourcesBody b, #unitsBody b, .card b, p b, div b").length,
      js: document.querySelectorAll('a[href^="javascript:" i]').length,
      links: [...document.querySelectorAll("a")].filter((a) => /javascript/i.test(a.getAttribute("href") ?? "") || /javascript:/i.test(a.textContent)).length,
      tag: /gentle reminder|মৃদু স্মরণ/.test(document.body.innerText),
      shown:/javascript:window\.__xss=1|<b>bold<\/b>/.test(document.body.innerText),
    }));
    const r = await q();
    const tag = `${name} ${lang} ${w}`;
    runs++;
    ok(r.xss === null, `${tag}: window.__xss never set (${r.xss})`);
    ok(r.imgs === 0, `${tag}: no <img src="x"> built from the typed text (${r.imgs})`);
    ok(r.bolds === 0, `${tag}: no <b> built from the typed text (${r.bolds})`);
    ok(r.js === 0, `${tag}: no a[href^="javascript:"] (${r.js})`);
    if (name === "curriculum" || name === "deen topic") ok(r.shown, `${tag}: POSITIVE CONTROL the typed text is visible literally`);
    if (name === "taglines" || name === "landing") ok(r.tag, `${tag}: POSITIVE CONTROL the tagline line is drawn`);
    // click each would-be link once
    for (const a of await page.locator("a").all()) {
      const text = (await a.textContent().catch(() => "")) ?? "";
      const href = (await a.getAttribute("href").catch(() => "")) ?? "";
      if (!/javascript|gentle reminder|মৃদু/i.test(text + href)) continue;
      await a.click({ timeout: 1500, noWaitAfter: true }).catch(() => {});
    }
    await page.waitForTimeout(300);
    const after = await q();
    ok(after.xss === null, `${tag}: after clicking each would-be link window.__xss is still unset (${after.xss})`);
    await ctx.close();
  }
} finally {
  if (MUTATE) fs.writeFileSync(FILES[MUTATE], ORIG[MUTATE]);
  await browser.close();
}
console.log(`\n==== Audit part 112: ${runs} browser runs, ${fails} failed ====`);
if (MUTATE) { console.log(`MUTATION ${MUTATE}: ${fails ? "caught (the check CAN fail)" : "NOT caught"}`); process.exit(fails ? 1 : 2); }
process.exit(fails ? 1 : 0);

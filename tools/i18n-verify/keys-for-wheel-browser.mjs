// PCF MSA J03 (the Owner, 5 Nov 2026): Monitor's "Show on wheel" -> quranrevival.html?surah=<s>&keysFor=<personId>&back=1 lands on the
// Marks wheel with THAT student's marks, read-only, with a line naming whose they are and a ← Back that returns to Monitor.
// From monitor.html (the real link): Maryam (p2) shows Difficult 1 / Need practice 1 / Done 2 on sūrah 1's āyāt, Yusuf (p3) Difficult 1 /
// Need practice 0 / Done 1; the head line names the student; tapping a piece opens nothing and writes nothing; the Back pill
// returns to Monitor; at 360 / 768 / 1440, en and bn; a bare keysFor opens sūrah 1; "Show my own marks" leaves the student's view.
//   node tools/i18n-verify/keys-for-wheel-browser.mjs [--mutate=nostep|noback|ownmarks]   (serve.js on :8080)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error("promise"); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MUT = {
  nostep: ['        await step("open a student\'s marks wheel", openKeysForFromQueryString);\n', ""],
  noback: ["      if (params.get(\"back\") === \"1\" && history.length > 1) setAppReturn(t(\"Back\"), \"\", () => history.back());\n    }\n    function renderVocabWheel", "    }\n    function renderVocabWheel"],
  ownmarks: ["surah, marksViewFor)\n        .then((r) => { if (viewMarks.id", "surah, selectedPersonId)\n        .then((r) => { if (viewMarks.id"],
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SEED = `
DATA.tenantPeople.push({ _id: "p3", tenantId: TENANT_ID, personId: "p3", name: lang("Yusuf", "ইউসুফ"), roles: ["student"] });
DATA.ayahKeyMarks = [
  { _id: TENANT_ID + "__p2__1", tenantId: TENANT_ID, scope: "p2", surah: 1, entries: { "ayah:1:1": ["hard"], "ayah:1:2": ["practice", "done"], "ayah:1:3": ["done"] } },
  { _id: TENANT_ID + "__p3__1", tenantId: TENANT_ID, scope: "p3", surah: 1, entries: { "ayah:1:2": ["hard"], "ayah:1:1": ["done"] } },
];
DATA.hadithKeyMarks = [];
`;
const EXPECT = { p2: ["Difficult 1", "Need practice 1", "Done 2"], p3: ["Difficult 1", "Need practice 0", "Done 1"] };
const EXPECT_BN = { p2: [1, 1, 2], p3: [1, 0, 1] };
const browser = await chromium.launch();
async function open(lang, width, url) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) await ctx.route("**/app/quranrevival.html*", async (r) => {
    const res = await r.fetch(); let body = await res.text(); const [from, to] = MUT[MUTATE];
    if (body.split(from).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found once`); body = body.replace(from, to);
    r.fulfill({ response: res, body });
  });
  const { page } = await openPage(ctx, url);
  return { ctx, page };
}
const counts = (page) => page.evaluate(() => ["hard", "practice", "done"].map((k) => document.querySelector(`.mk-count-${k}`)?.textContent?.replace(/\s+/g, " ").trim() ?? null));
const QUICK = process.argv.includes("--quick"); // mutation runs: one case (en 360 p2) and the bare-link case
for (const lang of QUICK ? ["en"] : ["en", "bn"]) for (const width of QUICK ? [360] : [360, 768, 1440]) for (const who of QUICK ? ["p2"] : ["p2", "p3"]) {
  const tag = `[${lang} ${width} ${who}]`;
  // the REAL link, from Monitor
  const { ctx, page } = await open(lang, width, "/app/monitor.html");
  await page.waitForFunction(() => document.getElementById("personSelect")?.options.length > 0, null, { timeout: 15000 });
  if (!(await page.evaluate(() => document.getElementById("keysTeacherSection").open))) await page.click("#keysTeacherSection > summary");
  await page.waitForSelector(`[data-ktv-person="${who}"] [data-ktv-wheel]`, { timeout: 15000 });
  const href = await page.getAttribute(`[data-ktv-person="${who}"] [data-ktv-wheel]`, "href");
  await page.evaluate(() => history.pushState({}, "", location.href));
  await Promise.all([page.waitForNavigation().catch(() => {}), page.click(`[data-ktv-person="${who}"] [data-ktv-wheel]`)]);
  check(`${tag} the link is ?surah=1&keysFor=${who}&back=1`, new RegExp(`quranrevival\\.html\\?surah=1&keysFor=${who}&back=1$`).test(href), href);
  await page.waitForSelector("[data-mk-wheel-for]", { timeout: 25000 }).catch(() => {});
  await page.waitForSelector("[data-mk-wheel]", { timeout: 20000 }).catch(() => {});
  const head = await page.evaluate(() => document.querySelector("[data-mk-wheel-for]")?.textContent.replace(/\s+/g, " ").trim() ?? "");
  const name = await page.evaluate((p) => ([...document.querySelectorAll("#personSelect option")].find((o) => o.value === p)?.textContent || "").trim(), who);
  check(`${tag} the page lands on the Marks wheel of THIS student: counts`, JSON.stringify(await counts(page)).length > 0 && (await counts(page)).every((x, i) => x && (lang === "bn" ? x.includes(String(EXPECT_BN[who][i])) || /[০-৯]/.test(x) : x === EXPECT[who][i])), JSON.stringify(await counts(page)));
  check(`${tag} a plain line names whose marks they are (${name}) and that they are view only`, !!name && head.includes(name) && head.length > name.length + 8, head);
  const pieces = await page.evaluate(() => document.querySelectorAll("[data-mk-wheel] [data-mk-go]").length);
  check(`${tag} the sūrah is Al-Fātiḥah (7 pieces)`, pieces === 7, String(pieces));
  const sw = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  check(`${tag} no sideways scroll`, !sw);
  // read-only: a piece tap opens no card and writes nothing
  await page.evaluate(() => { window.__stubWrites && (window.__stubWrites.length = 0); });
  await page.evaluate(() => document.querySelector("[data-mk-wheel] [data-mk-go]")?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForTimeout(500);
  const opened = await page.evaluate(() => !!document.querySelector("[data-ayah-sheet]"));
  const writes = await page.evaluate(() => (window.__fsLog || []).filter((r) => /set|update|add|delete|write/i.test(r.op || r.kind || "") && /ayahKeyMarks|hadithKeyMarks/.test(r.col || "")).length);
  check(`${tag} read-only: tapping a piece opens no card and writes no mark`, !opened && writes === 0, JSON.stringify({ opened, writes }));
  // the way back
  const pill = await page.evaluate(() => { const b = document.querySelector("#ayahCardBackPill:not([hidden]) [data-ayah-card-back]"); if (!b) return null; const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
  check(`${tag} ← Back is shown, 40px or more`, !!pill && pill.h >= 39.5 && pill.w >= 39.5, JSON.stringify(pill));
  if (pill) { await Promise.all([page.waitForNavigation().catch(() => {}), page.click("#ayahCardBackPill [data-ayah-card-back]")]); await page.waitForTimeout(500); }
  check(`${tag} ← Back returns to Monitor`, /\/app\/monitor\.html/.test(page.url()), page.url());
  await ctx.close();
}
// a bare keysFor opens sūrah 1; "Show my own marks" leaves the student's view
{
  const { ctx, page } = await open("en", 390, "/app/quranrevival.html?keysFor=p2");
  await page.waitForSelector("[data-mk-wheel]", { timeout: 25000 }).catch(() => {});
  check("a bare ?keysFor=p2 opens sūrah 1 on the wheel with p2's counts", (await counts(page)).join("|") === EXPECT.p2.join("|"), JSON.stringify(await counts(page)));
  const noPill = await page.evaluate(() => !document.querySelector("#ayahCardBackPill:not([hidden])"));
  check("no back=1 means no Back pill", noPill);
  await page.click("[data-mk-own]"); await page.waitForTimeout(600);
  check("Show my own marks leaves the student's view", (await page.evaluate(() => !document.querySelector("[data-mk-wheel-for]"))));
  await ctx.close();
}
// the head line is its own full-width row: at 360px with 200% text it must not squeeze the wheel (it was ~125px beside the switch)
for (const [pct, width] of [[100, 360], [200, 360], [200, 390], [150, 768]]) {
  const tag = `[head row ${width}px ${pct}%]`;
  const { ctx, page } = await open("en", width, "/app/quranrevival.html?surah=1&keysFor=p2");
  await page.waitForSelector("[data-mk-wheel]", { timeout: 25000 }).catch(() => {});
  await page.evaluate((p) => { document.documentElement.style.fontSize = p + "%"; }, pct);
  await page.click("[data-mk-view=\"ayat\"]").catch(() => {});
  await page.waitForTimeout(700);
  const m = await page.evaluate(() => {
    const svg = document.querySelector("#wheelContainer svg[data-mk-wheel]"), head = document.querySelector("[data-mk-wheel-for]"), wrap = document.querySelector("#wheelContainer .mk-wheel-wrap"), sw = document.querySelector("[data-mk-view-switch]");
    if (!svg || !head || !wrap || !sw) return { none: true };
    const a = svg.getBoundingClientRect(), h = head.getBoundingClientRect(), w = wrap.getBoundingClientRect(), v = sw.getBoundingClientRect();
    return { wheel: Math.round(a.width), wrap: Math.round(w.width), headW: Math.round(h.width), aboveSwitch: h.bottom <= v.top + 1, headFull: h.width >= w.width - 2, inside: a.left >= -1 && a.right <= innerWidth + 1, over: document.documentElement.scrollWidth - innerWidth };
  });
  check(`${tag} the head line takes its own full-width row, above the view switch`, !m.none && m.aboveSwitch && m.headFull, JSON.stringify(m));
  check(`${tag} the wheel keeps its size (> 150px and most of its row), on screen, no sideways scroll`, !m.none && m.wheel > 150 && m.wheel >= m.wrap * 0.6 && m.inside && m.over <= 0, JSON.stringify(m));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

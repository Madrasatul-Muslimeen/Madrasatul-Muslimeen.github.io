// PCF J25, round Z3 (issue #825) -- Zab pocket KINDS (tasks and links), in a real browser, gate open.
// Written by the Architect in review: the Builder run pushed the code and the pure suite but no browser checks.
//
// What it proves, at 320 / 390 / 820 / 1440px in English and Bangla:
//   tasks -- a quick-typed "! … tomorrow" item is saved with pri 1 and tomorrow's date and the words removed;
//            it sits under Tomorrow; a past date sits under Overdue; a step is added and ticked and the
//            count reads 1/1; the pocket's Kind picker writes ztype.
//   links -- a pasted address becomes `url`; its row opens it in a new tab with rel=noopener; no title fetch.
//   kinds -- a task moved to a plain pocket keeps its fields (they are never stripped).
//   layout -- the item text keeps >= 70% of the panel's width; nothing sideways.
// MUTATE=a..e serves one broken copy of a file, so each check is shown to fail:
//   a: "tomorrow" is not understood            (zab-data.js parseQuickTask)
//   b: a past date is not Overdue              (zab-data.js dueGroup)
//   c: a link opens without rel=noopener       (zab-bar.js)
//   d: a move strips the task's fields         (zab-data.js moveItem / editItem allow-list)
//   e: the kind picker writes nothing          (zab-bar.js savePocket)
// Run from the repository root with `node serve.js` running.
import fs from "node:fs";
import { chromium, newContext, BASE } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);

const READY_OPEN = `
export const ZAB_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const ZAB_DECLARATION = Object.freeze({ ready: true, decision: Object.freeze({ by: "master-architect", on: "2026-10-14", reference: "test-seam" }), gate: "E1", note: "test seam" });
export function isZabReady() { return true; }
export const REASON_ZAB_NOT_DEPLOYED = "zab-rules-not-deployed";
export const REASON_ZAB_DECISION_INCOMPLETE = "zab-readiness-decision-incomplete";
export function zabUnavailableReason() { return null; }
`;
function swap(src, from, to) {
  if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from.slice(0, 70)}`);
  return src.split(from).join(to);
}
async function routeText(ctx, glob, mutate) {
  const file = "app/" + glob.replace("**/", "");
  const src = mutate(fs.readFileSync(file, "utf8"));
  await ctx.route(glob, (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src }));
}
async function routeMutation(ctx) {
  if (!MUTATE) return;
  if (MUTATE === "a") await routeText(ctx, "**/js/zab-data.js", (s) => swap(s, `low === "tomorrow"`, `low === "never-tomorrow"`));
  else if (MUTATE === "b") await routeText(ctx, "**/js/zab-data.js", (s) => swap(s, `if (d < today) return "overdue";`, ``));
  else if (MUTATE === "c") await routeText(ctx, "**/js/zab-bar.js", (s) => swap(s, `target="_blank" rel="noopener"`, `target="_blank"`));
  else if (MUTATE === "d") await routeText(ctx, "**/js/zab-data.js", (s) => swap(s, `const ITEM_KIND_FIELDS = [`, `const ITEM_KIND_FIELDS_UNUSED = [`).replace(`const ARRAY_FIELDS`, `const ITEM_KIND_FIELDS = []; const ARRAY_FIELDS`));
  else if (MUTATE === "e") await routeText(ctx, "**/js/zab-bar.js", (s) => swap(s, `const kind = box.querySelector("[data-zab-f='ztype']").value;`, `const kind = undefined;`));
  else throw new Error(`unknown mutation ${MUTATE}`);
}

const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); const p = (x) => String(x).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const stamp = `createdAt: new Date(), updatedAt: new Date(), createdBy: "uid-1", schemaVersion: 1, addedByPersonId: "p1", tenantId: "t1", status: "active"`;
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__DATA = DATA;
  DATA.zabPockets = [
    { _id: "t1__pk-tasks", pocketId: "pk-tasks", order: 0, name: "Tasks", icon: "✅", ztype: "tasks", ${stamp} },
    { _id: "t1__pk-plain", pocketId: "pk-plain", order: 1, name: "Plain", icon: "📁", ${stamp} },
    { _id: "t1__pk-links", pocketId: "pk-links", order: 2, name: "Links", icon: "🔗", ztype: "links", ${stamp} },
  ];
  DATA.zabItems = [
    { _id: "t1__it-old", itemId: "it-old", pocketId: "pk-tasks", order: 0, text: "Revise Juz 30", done: false, due: "${day(-3)}", pri: 1, ${stamp} },
    { _id: "t1__it-link", itemId: "it-link", pocketId: "pk-links", order: 0, text: "https://quran.com/2/255", url: "https://quran.com/2/255", done: false, ${stamp} },
  ];
})();`;

async function open(browser, { lang, width }) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 860 }, extraSeedJs: SEED });
  await ctx.route((u) => !["localhost", "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  await ctx.route("**/js/zab-readiness.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_OPEN }));
  await routeMutation(ctx);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app/records.html`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  await page.evaluate(() => { for (const el of document.querySelectorAll('[id*="splash"], .mm-splash-overlay')) el.remove(); });
  return { ctx, page };
}
const opener = (w) => (w >= 768 ? "#zabBar [data-zab-open]" : "#zabCorner");
const writes = (page) => page.evaluate(() => (window.__stubWriteData || []).filter((w) => /^zab/.test(w.col || "")));
// The stub never applies an update to its DATA; replay recorded writes so a re-read sees them (as Firestore would).
const settle = (page) => page.evaluate(() => {
  for (const w of window.__stubWriteData || []) {
    if (!/^zab/.test(w.col || "")) continue;
    const rows = (window.__DATA[w.col] = window.__DATA[w.col] || []);
    let row = rows.find((d) => d._id === w.id);
    if (!row) { if (/update/.test(w.kind)) continue; row = { _id: w.id }; rows.push(row); }
    for (const [k, v] of Object.entries(w.data || {})) { if (v && v.__deleteField) delete row[k]; else row[k] = v; }
  }
});
async function openPocket(page, w, id) {
  await page.click(opener(w));
  await page.waitForSelector(`#zabPanel [data-zab-pocket="${id}"]`, { timeout: 8000 });
  await page.click(`#zabPanel [data-zab-pocket="${id}"]`);
  await page.waitForSelector("#zabPanel [data-zab-new-item]", { timeout: 8000 });
}

const browser = await chromium.launch();
for (const lang of ["en", "bn"]) {
  for (const w of [320, 390, 820, 1440]) {
    const tag = `${w}px ${lang}`;
    const { ctx, page } = await open(browser, { lang, width: w });
    try {
      // --- tasks
      await openPocket(page, w, "pk-tasks");
      check(`${tag}: a tasks pocket draws its groups`, (await page.$$eval("#zabPanel [data-zab-group]", (e) => e.length)) >= 1);
      check(`${tag}: a past due date sits under Overdue`, await page.evaluate(() => !!document.querySelector('#zabPanel [data-zab-group="overdue"] [data-zab-item="it-old"]')));
      const typed = lang === "bn" ? "! Read Al-Mulk আগামীকাল" : "! Read Al-Mulk tomorrow";
      await page.fill("#zabPanel [data-zab-new-item]", typed);
      await page.press("#zabPanel [data-zab-new-item]", "Enter");
      await page.waitForTimeout(500);
      const add = (await writes(page)).find((x) => x.col === "zabItems" && (x.data || {}).text === "Read Al-Mulk");
      check(`${tag}: quick typing saves the text without "!" and the day word`, !!add, JSON.stringify((await writes(page)).map((x) => x.data && x.data.text)));
      check(`${tag}: … with high priority and tomorrow's date`, !!add && add.data.pri === 1 && add.data.due === day(1), JSON.stringify(add && add.data));
      check(`${tag}: … and it sits under Tomorrow`, await page.evaluate(() => [...document.querySelectorAll('#zabPanel [data-zab-group="tomorrow"] .zab-text')].some((e) => e.textContent === "Read Al-Mulk")));
      // a step on the overdue task
      await settle(page);
      await page.click('#zabPanel [data-zab-steps="it-old"]');
      await page.fill('#zabPanel [data-zab-new-step="it-old"]', "Surah An-Naba");
      await page.press('#zabPanel [data-zab-new-step="it-old"]', "Enter");
      await page.waitForTimeout(400);
      await settle(page);
      const stepBox = await page.$('#zabPanel [data-zab-step^="it-old:"]');
      check(`${tag}: a step can be added`, !!stepBox);
      if (stepBox) { await stepBox.click(); await page.waitForTimeout(400); }
      check(`${tag}: ticking it makes the count 1/1`, await page.evaluate(() => (document.querySelector('#zabPanel [data-zab-steps="it-old"]') || {}).textContent === "1/1"));
      // layout
      const lay = await page.evaluate(() => { const p = document.getElementById("zabPanel"); const t = p.querySelector('[data-zab-item="it-old"] .zab-main'); return { share: t ? t.getBoundingClientRect().width / p.clientWidth : 0, fits: p.scrollWidth <= p.clientWidth + 1 }; });
      check(`${tag}: a task's text keeps >= 70% of the panel, nothing sideways`, lay.share >= 0.7 && lay.fits, JSON.stringify(lay));
      check(`${tag}: no sideways page scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      // move the task to a plain pocket: its fields are kept
      await page.evaluate(() => { window.__stubWriteData = []; });
      await page.selectOption('#zabPanel [data-zab-imove="it-old"]', "pk-plain");
      await page.waitForTimeout(400);
      const mv = (await writes(page)).find((x) => x.id === "t1__it-old");
      check(`${tag}: a move to a plain pocket keeps due, pri and steps`, !!mv && mv.data.pocketId === "pk-plain" && !("due" in mv.data && mv.data.due && mv.data.due.__deleteField) && !("pri" in mv.data && mv.data.pri && mv.data.pri.__deleteField) && !("steps" in mv.data && mv.data.steps && mv.data.steps.__deleteField), JSON.stringify(mv && mv.data));
      await page.click("#zabPanel [data-zab-close]").catch(() => {});

      // --- links
      await page.evaluate(() => { window.__stubWriteData = []; });
      await openPocket(page, w, "pk-links");
      const a = await page.$('#zabPanel [data-zab-item="it-link"] a.zab-link');
      check(`${tag}: a link row opens it in a new tab with rel=noopener`, !!a && (await a.getAttribute("target")) === "_blank" && /noopener/.test((await a.getAttribute("rel")) || ""), a ? await a.getAttribute("rel") : "no link");
      await page.fill("#zabPanel [data-zab-new-item]", "https://www.example.org/tafsir");
      await page.press("#zabPanel [data-zab-new-item]", "Enter");
      await page.waitForTimeout(500);
      const ln = (await writes(page)).find((x) => x.col === "zabItems" && (x.data || {}).url === "https://www.example.org/tafsir");
      check(`${tag}: a pasted address is saved as the item's url`, !!ln, JSON.stringify((await writes(page)).map((x) => x.data)));
      check(`${tag}: no title is fetched for a link`, !!ln && !("ttl" in ln.data) && !("th" in ln.data));
      await page.click("#zabPanel [data-zab-close]").catch(() => {});

      // --- the Kind picker (once per language, at one width)
      if (w === 1440) {
        await page.evaluate(() => { window.__stubWriteData = []; });
        await page.click(opener(w));
        await page.waitForSelector('#zabPanel [data-zab-pedit="pk-plain"]', { timeout: 8000 });
        await page.click('#zabPanel [data-zab-pedit="pk-plain"]');
        await page.selectOption("#zabPanel [data-zab-f='ztype']", "tasks");
        await page.click("#zabPanel [data-zab-save-pocket]");
        await page.waitForTimeout(400);
        const k = (await writes(page)).find((x) => x.id === "t1__pk-plain");
        check(`${tag}: the Kind picker writes ztype`, !!k && k.data.ztype === "tasks", JSON.stringify(k && k.data));
      }
    } catch (err) {
      check(`${tag}: the flow ran to the end`, false, String(err && err.message || err).slice(0, 300));
    }
    if (w === 390 || w === 1440) await page.screenshot({ path: `/tmp/zab-kinds-${w}-${lang}.png` }).catch(() => {});
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== Zab kinds, tasks and links (Z3): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

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
//   d: a move strips the task's fields         (zab-data.js moveItem)
//   e: the kind picker writes nothing          (zab-bar.js savePocket)
//   f: a squeezed Add button breaks its word   (zab-bar.js)
// Z4 (issue #827) adds ideas (stars, topics, sort) and shopping (qty, shop, groups, Done, kept fields):
//   g: tapping the same star does not clear it   h: a shop name stops at the first space
//   i: Done is not last                          j: stars sort low first
//   k: removing a topic does nothing             l: clearing stars stores 0 instead of removing the field
//   m: a move strips qty and shop                n: a ticked shop item stays in its shop group
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
  else if (MUTATE === "d") await routeText(ctx, "**/js/zab-data.js", (s) => swap(s, "{ pocketId: toPocketId }", "{ pocketId: toPocketId, due: deleteField(), pri: deleteField(), steps: deleteField() }"));
  else if (MUTATE === "e") await routeText(ctx, "**/js/zab-bar.js", (s) => swap(s, `const kind = box.querySelector("[data-zab-f='ztype']").value;`, `const kind = undefined;`));
  else if (MUTATE === "f") await routeText(ctx, "**/js/zab-bar.js", (s) => swap(s, ".zab-add button { flex: 0 0 auto; white-space: nowrap; }", ".zab-add button { flex: 0 1 1px; }"));
  else if (MUTATE === "g") await routeText(ctx, "**/js/zab-data.js", (s) => swap(s, "return current === k ? null : k;", "return k;"));
  else if (MUTATE === "h") await routeText(ctx, "**/js/zab-data.js", (s) => swap(s, "/(^|\\s)@(.*)$/s", "/(^|\\s)@(\\S*)/"));
  else if (MUTATE === "i") await routeText(ctx, "**/js/zab-data.js", (s) => swap(s, "if (done.length) groups.push(", "if (done.length) groups.unshift("));
  else if (MUTATE === "j") await routeText(ctx, "**/js/zab-data.js", (s) => swap(s, "(b.stars || 0) - (a.stars || 0)", "(a.stars || 0) - (b.stars || 0)"));
  else if (MUTATE === "k") await routeText(ctx, "**/js/zab-data.js", (s) => swap(s, ".filter((x) => x !== text)", ".filter(() => true)"));
  else if (MUTATE === "l") await routeText(ctx, "**/js/zab-bar.js", (s) => swap(s, "zab.editItem(db, c, id, { stars: next })", "zab.editItem(db, c, id, { stars: next || 0 })"));
  else if (MUTATE === "m") await routeText(ctx, "**/js/zab-data.js", (s) => swap(s, "{ pocketId: toPocketId }", "{ pocketId: toPocketId, qty: deleteField(), shop: deleteField() }"));
  else if (MUTATE === "n") await routeText(ctx, "**/js/zab-data.js", (s) => swap(s, "if (it.done === true) { done.push(it); continue; }", ""));
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
    { _id: "t1__pk-ideas", pocketId: "pk-ideas", order: 3, name: "Ideas", icon: "💡", ztype: "ideas", ${stamp} },
    { _id: "t1__pk-shop", pocketId: "pk-shop", order: 4, name: "Shopping", icon: "🛒", ztype: "shop", ${stamp} },
  ];
  DATA.zabItems = [
    { _id: "t1__it-old", itemId: "it-old", pocketId: "pk-tasks", order: 0, text: "Revise Juz 30", done: false, due: "${day(-3)}", pri: 1, ${stamp} },
    { _id: "t1__it-link", itemId: "it-link", pocketId: "pk-links", order: 0, text: "https://quran.com/2/255", url: "https://quran.com/2/255", done: false, ${stamp} },
    { _id: "t1__i-a", itemId: "i-a", pocketId: "pk-ideas", order: 0, text: "A study circle for the neighbours with a rather long title to test wrapping", done: false, ${stamp} },
    { _id: "t1__i-b", itemId: "i-b", pocketId: "pk-ideas", order: 1, text: "Tajweed games", stars: 3, done: false, ${stamp} },
    { _id: "t1__s-bread", itemId: "s-bread", pocketId: "pk-shop", order: 0, text: "bread", qty: "3", shop: "Aldi", done: false, ${stamp} },
    { _id: "t1__s-eggs", itemId: "s-eggs", pocketId: "pk-shop", order: 1, text: "eggs", done: false, ${stamp} },
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
      const addBtns = await page.evaluate(() => [...document.querySelectorAll("#zabPanel .zab-add button")].map((b) => { const r = b.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(b).lineHeight) || 20; return { h: r.height, oneLine: b.scrollHeight <= Math.max(r.height, lh * 1.6) + 1 && (b.textContent.length < 3 || b.getClientRects().length === 1) && r.width >= b.scrollWidth - 1, w: Math.round(r.width), sw: b.scrollWidth, text: b.textContent }; }));
      const wordFits = await page.evaluate(() => [...document.querySelectorAll("#zabPanel .zab-add button")].every((b) => { const r = document.createRange(); r.selectNodeContents(b); return r.getClientRects().length <= 1; }));
      check(`${tag}: every Add button keeps its word on one line`, wordFits, JSON.stringify(addBtns));
      if (w === 390 || w === 1440) await page.screenshot({ path: `/tmp/zab-kinds-${w}-${lang}.png` });
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

      // --- ideas (Z4)
      const layout = async (label, sel) => {
        const lay2 = await page.evaluate((s) => { const p = document.getElementById("zabPanel"); const m = p.querySelector(s); return { share: m ? m.getBoundingClientRect().width / p.clientWidth : 0, fits: p.scrollWidth <= p.clientWidth + 1 }; }, sel);
        check(`${tag}: ${label} text keeps >= 70% of the panel, nothing sideways`, lay2.share >= 0.7 && lay2.fits, JSON.stringify(lay2));
        check(`${tag}: ${label} every Add button keeps its word on one line`, await page.evaluate(() => [...document.querySelectorAll("#zabPanel .zab-add button")].every((b) => { const r = document.createRange(); r.selectNodeContents(b); return r.getClientRects().length <= 1; })));
        check(`${tag}: ${label} the row's controls are at least 40px`, await page.evaluate(() => [...document.querySelectorAll("#zabPanel .zab-acts button")].every((b) => { const r = b.getBoundingClientRect(); return r.height >= 39.5 && r.width >= 39.5; })));
        check(`${tag}: ${label} no sideways page scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      };
      await page.evaluate(() => { window.__stubWriteData = []; });
      await openPocket(page, w, "pk-ideas");
      const starBtn = (id, n) => `#zabPanel [data-zab-star="${id}:${n}"]`;
      const sz = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.width, r.height]; }, starBtn("i-a", 2));
      check(`${tag}: a star is at least 32px to tap`, sz[0] >= 31.5 && sz[1] >= 31.5, JSON.stringify(sz));
      await page.click(starBtn("i-a", 2));
      await page.waitForTimeout(400);
      const st = (await writes(page)).filter((x) => x.id === "t1__i-a");
      check(`${tag}: tapping a star sets stars`, st.length === 1 && st[0].data.stars === 2, JSON.stringify(st.map((x) => x.data)));
      await settle(page);
      await page.click(starBtn("i-a", 2));
      await page.waitForTimeout(400);
      const st2 = (await writes(page)).filter((x) => x.id === "t1__i-a");
      check(`${tag}: tapping the same star again clears it (field removed)`, st2.length === 2 && !!(st2[1].data.stars && st2[1].data.stars.__deleteField), JSON.stringify(st2.map((x) => x.data)));
      check(`${tag}: … and the row shows no star set`, await page.evaluate(() => document.querySelectorAll('#zabPanel [data-zab-item="i-a"] .zab-star[aria-pressed="true"]').length === 0));
      await settle(page);
      // topics
      await page.click('#zabPanel [data-zab-topics="i-a"]');
      await page.fill('#zabPanel [data-zab-new-topic="i-a"]', "Fiqh");
      await page.press('#zabPanel [data-zab-new-topic="i-a"]', "Enter");
      await page.waitForTimeout(400);
      const tp = (await writes(page)).filter((x) => x.id === "t1__i-a" && x.data.topics);
      check(`${tag}: a topic is added`, tp.length === 1 && Array.isArray(tp[0].data.topics) && tp[0].data.topics.join() === "Fiqh", JSON.stringify(tp.map((x) => x.data)));
      check(`${tag}: … and shown as a chip`, await page.evaluate(() => [...document.querySelectorAll('#zabPanel [data-zab-item="i-a"] [data-zab-topic]')].some((e) => e.textContent.includes("Fiqh"))));
      await settle(page);
      await page.click('#zabPanel [data-zab-rm-topic^="i-a:"]');
      await page.waitForTimeout(400);
      const tp2 = (await writes(page)).filter((x) => x.id === "t1__i-a" && x.data.topics);
      check(`${tag}: removing the last topic removes the field`, tp2.length === 2 && !!(tp2[1].data.topics && tp2[1].data.topics.__deleteField), JSON.stringify(tp2.map((x) => x.data)));
      check(`${tag}: … and the chip is gone`, await page.evaluate(() => document.querySelectorAll('#zabPanel [data-zab-item="i-a"] [data-zab-topic]').length === 0));
      // sort
      const firstIdea = () => page.evaluate(() => (document.querySelector("#zabPanel [data-zab-item]") || {}).dataset.zabItem);
      check(`${tag}: ideas start in pocket order`, (await firstIdea()) === "i-a");
      await page.selectOption("#zabPanel [data-zab-idea-sort]", "stars");
      check(`${tag}: sorted by stars, the highest comes first`, (await firstIdea()) === "i-b");
      check(`${tag}: the sort is a view setting, not a stored field`, !(await writes(page)).some((x) => x.data && ("sort" in x.data || "ideaSort" in x.data)));
      await layout("an ideas row", '[data-zab-item="i-b"] .zab-main');
      if (w === 390 || w === 1440) await page.screenshot({ path: `/tmp/zab-ideas-${w}-${lang}.png` });
      await page.click("#zabPanel [data-zab-close]").catch(() => {});

      // --- shopping (Z4)
      await page.evaluate(() => { window.__stubWriteData = []; });
      await openPocket(page, w, "pk-shop");
      await page.fill("#zabPanel [data-zab-new-item]", "2 milk @Coles");
      await page.press("#zabPanel [data-zab-new-item]", "Enter");
      await page.waitForTimeout(400);
      const sh = (await writes(page)).find((x) => x.col === "zabItems" && (x.data || {}).text === "milk");
      check(`${tag}: "2 milk @Coles" saves qty, text and shop`, !!sh && sh.data.qty === "2" && sh.data.shop === "Coles", JSON.stringify(sh && sh.data));
      await page.fill("#zabPanel [data-zab-new-item]", "1 rice @Big W");
      await page.press("#zabPanel [data-zab-new-item]", "Enter");
      await page.waitForTimeout(400);
      const sh2 = (await writes(page)).find((x) => x.col === "zabItems" && (x.data || {}).text === "rice");
      check(`${tag}: a shop name may contain spaces`, !!sh2 && sh2.data.shop === "Big W" && sh2.data.qty === "1", JSON.stringify(sh2 && sh2.data));
      await page.fill("#zabPanel [data-zab-new-item]", "salt");
      await page.press("#zabPanel [data-zab-new-item]", "Enter");
      await page.waitForTimeout(400);
      const sh3 = (await writes(page)).find((x) => x.col === "zabItems" && (x.data || {}).text === "salt");
      check(`${tag}: a plain item stores no empty qty or shop`, !!sh3 && !("qty" in sh3.data) && !("shop" in sh3.data), JSON.stringify(sh3 && sh3.data));
      const seq = await page.evaluate(() => [...document.querySelectorAll("#zabPanel [data-zab-group]")].map((g) => g.dataset.zabGroup + (g.dataset.zabShopname ? `:${g.dataset.zabShopname}` : "")));
      check(`${tag}: items group under each shop (A-Z), then No shop`, seq.join("|") === "shop:Aldi|shop:Big W|shop:Coles|noshop", seq.join("|"));
      await page.check('#zabPanel [data-zab-tick="s-eggs"]');
      await page.waitForTimeout(400);
      const seq2 = await page.evaluate(() => [...document.querySelectorAll("#zabPanel [data-zab-group]")].map((g) => g.dataset.zabGroup));
      check(`${tag}: a ticked item goes under Done, last`, seq2[seq2.length - 1] === "done" && (await page.evaluate(() => !!document.querySelector('#zabPanel [data-zab-group="done"] [data-zab-item="s-eggs"]'))), seq2.join("|"));
      await layout("a shopping row", '[data-zab-item="s-bread"] .zab-main');
      if (w === 390 || w === 1440) await page.screenshot({ path: `/tmp/zab-shop-${w}-${lang}.png` });
      // a shop item moved to Plain and back keeps its fields
      await settle(page);
      await page.evaluate(() => { window.__stubWriteData = []; });
      await page.selectOption('#zabPanel [data-zab-imove="s-bread"]', "pk-plain");
      await page.waitForTimeout(400);
      const m1 = (await writes(page)).find((x) => x.id === "t1__s-bread");
      await settle(page);
      await page.click("#zabPanel [data-zab-close]").catch(() => {});
      await openPocket(page, w, "pk-plain");
      await page.selectOption('#zabPanel [data-zab-imove="s-bread"]', "pk-shop");
      await page.waitForTimeout(400);
      const m2 = (await writes(page)).filter((x) => x.id === "t1__s-bread");
      const stripped = (x) => ["qty", "shop"].some((k) => k in x.data);
      check(`${tag}: moving a shop item to Plain and back writes only the pocket`, !!m1 && m2.length === 2 && !stripped(m1) && !stripped(m2[1]) && m2[1].data.pocketId === "pk-shop", JSON.stringify([m1 && m1.data, m2.map((x) => x.data)]));
      await settle(page);
      await page.click("#zabPanel [data-zab-close]").catch(() => {});
      await openPocket(page, w, "pk-shop");
      check(`${tag}: … and the item still shows its qty and shop`, await page.evaluate(() => { const r = document.querySelector('#zabPanel [data-zab-item="s-bread"]'); return !!r && /Aldi/.test((r.querySelector("[data-zab-shop]") || {}).textContent || "") && /3/.test((r.querySelector("[data-zab-qty]") || {}).textContent || ""); }));
      await page.click("#zabPanel [data-zab-close]").catch(() => {});

      // --- the Kind picker offers all five (once per language, at one width)
      if (w === 1440) {
        await page.click(opener(w));
        await page.waitForSelector('#zabPanel [data-zab-pedit="pk-plain"]', { timeout: 8000 });
        await page.click('#zabPanel [data-zab-pedit="pk-plain"]');
        const opts = await page.$$eval("#zabPanel [data-zab-f='ztype'] option", (o) => o.map((x) => x.value));
        check(`${tag}: the Kind picker offers Plain, Tasks, Links, Ideas, Shopping`, opts.join() === "plain,tasks,links,ideas,shop", opts.join());
        await page.click("#zabPanel [data-zab-cancel-edit]");
        await page.click("#zabPanel [data-zab-close]").catch(() => {});
      }

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
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== Zab kinds: tasks, links, ideas, shopping (Z3-Z4): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

// The Owner, 5 Oct 2026: "Make all the panes resizeable". Mapping My Journey at
// the wide tier (1200px and up): drag handles between tree | list | Note (and
// list | Note in Timeline/Path), arrow keys, double-click to reset, minimums,
// remembered per device as fractions; and the pinned panel in a Note window.
// en and bn. Expected values are written by hand. Run from the repository root
// with `node serve.js` running.
//   --mutate=nosave  widths are not remembered   -> the reload checks fail
//   --mutate=nomin   no minimum widths            -> the minimum check fails
//   --mutate=pinw    the pinned panel's handle does nothing -> its checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const ONLY = (process.argv.find((a) => a.startsWith("--lang=")) || "").slice(7);
function swap(src, from, to) { if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from.slice(0, 60)}`); return src.split(from).join(to); }
async function routeMutation(ctx) {
  if (!MUTATE) return;
  const route = async (glob, file, f) => { const body = f(fs.readFileSync(file, "utf8")); await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body })); };
  if (MUTATE === "nosave") await route("**/app/journey-map.html*", "app/journey-map.html", (s) => swap(s, "const saveSplits = () => { try {", "const saveSplits = () => { return; try {"));
  else if (MUTATE === "nomin") await route("**/app/journey-map.html*", "app/journey-map.html", (s) => swap(s, "const SPLIT_MIN = [240, 260, 300];", "const SPLIT_MIN = [1, 1, 1];"));
  else if (MUTATE === "pinw") await route("**/js/note-window.js", "app/js/note-window.js", (s) => swap(s, "      const move = (ev) => setPinW(ev.clientX - left, false);", "      const move = () => {};"));
  else throw new Error(`unknown mutation ${MUTATE}`);
}
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteLinks = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(id, title, day, pinned) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: "<p>" + title + " body.</p>", currentRevisionId: "rev-" + id, status: "active", pinned: !!pinned, createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own)); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  F("fA", "Alpha", null, 0); F("fB", "Beta", null, 1);
  N("n1", "Note One", 1); N("n2", "Note Two", 2); N("n3", "Note Three", 3, true);
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1); P("p3", "n3", "fB", 0);
})();`;

const cols = (page) => page.evaluate(() => {
  const L = document.getElementById("noteLayout");
  return [...L.children].filter((c) => !c.classList.contains("jm-split") && getComputedStyle(c).display !== "none" && c.getBoundingClientRect().width > 0).map((c) => { const r = c.getBoundingClientRect(); return { id: c.id, l: r.left, r: r.right, w: r.width }; });
});
const handles = (page) => page.evaluate(() => [...document.querySelectorAll("#noteLayout > .jm-split")].filter((h) => getComputedStyle(h).display !== "none" && !h.hidden).map((h) => { const r = h.getBoundingClientRect(); return { i: Number(h.dataset.split), cx: r.left + r.width / 2, cy: r.top + Math.min(r.height, 300) / 2, w: r.width, h: r.height }; }));
async function drag(page, x, y, dx) { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx / 2, y, { steps: 3 }); await page.mouse.move(x + dx, y, { steps: 3 }); await page.mouse.up(); await page.waitForTimeout(150); }
const near = (a, b, tol = 3) => Math.abs(a - b) <= tol;
async function waitTree(page) { await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 2 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 }); }
async function openThree(page) {
  await waitTree(page);
  await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
  await page.waitForSelector('#folderNotes [data-note-leaf][data-note-id="n1"]');
  await page.click('#folderNotes [data-note-leaf][data-note-id="n1"] [data-note-open]');
  await page.waitForFunction(() => !document.getElementById("notePane").hidden, null, { timeout: 5000 });
  await page.waitForTimeout(250);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const lang of ["en", "bn"].filter((l) => !ONLY || l === ONLY)) {
  const tag = `${lang}/1280`;
  console.log(`\n=== ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 1280, height: 860 }, extraSeedJs: SEED });
  await routeMutation(ctx);
  const { page } = await openPage(ctx, "/app/journey-map.html");
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await openThree(page);
  let c = await cols(page), h = await handles(page);
  check(`${tag}: three panels side by side`, c.length === 3, JSON.stringify(c));
  check(`${tag}: two handles, each in the gap between two panels`, h.length === 2 && h.every((x, i) => c[i] && c[i + 1] && x.cx > c[i].r - 1 && x.cx < c[i + 1].l + 1), `${JSON.stringify(h)} ${JSON.stringify(c)}`);
  const lbl = await page.getAttribute("#noteLayout > .jm-split", "aria-label");
  check(`${tag}: the handle is named${lang === "bn" ? " in Bangla" : ""}`, lang === "bn" ? /[ঀ-৿]/.test(lbl || "") : /resize/i.test(lbl || ""), lbl);
  // drag the first handle right by 80
  const c0 = c;
  await drag(page, h[0].cx, h[0].cy, 80);
  c = await cols(page);
  check(`${tag}: dragging the first handle widens the tree and narrows the list by the same amount`, near(c[0].w, c0[0].w + 80) && near(c[1].w, c0[1].w - 80) && near(c[2].w, c0[2].w), `${c0.map((x) => x.w | 0)} -> ${c.map((x) => x.w | 0)}`);
  // second handle left by 60
  const c1 = c; h = await handles(page);
  await drag(page, h[1].cx, h[1].cy, -30);
  c = await cols(page);
  check(`${tag}: the second handle moves width between the list and the Note`, near(c[1].w, c1[1].w - 30) && near(c[2].w, c1[2].w + 30) && near(c[0].w, c1[0].w), `${c1.map((x) => x.w | 0)} -> ${c.map((x) => x.w | 0)}`);
  const kept = c;
  // reload: remembered
  await page.reload(); await openThree(page);
  c = await cols(page);
  check(`${tag}: after a reload the widths are kept`, c.length === 3 && c.every((x, i) => near(x.w, kept[i].w, 4)), `${kept.map((x) => x.w | 0)} vs ${c.map((x) => x.w | 0)}`);
  // keyboard
  const k0 = c;
  await page.focus('#noteLayout > .jm-split[data-split="1"]'); await page.keyboard.press("ArrowRight"); await page.waitForTimeout(120);
  c = await cols(page);
  check(`${tag}: → on a focused handle moves it 24px`, near(c[1].w, k0[1].w + 24) && near(c[2].w, k0[2].w - 24), `${k0.map((x) => x.w | 0)} -> ${c.map((x) => x.w | 0)}`);
  // minimum
  h = await handles(page);
  await drag(page, h[0].cx, h[0].cy, -900);
  c = await cols(page);
  check(`${tag}: a panel never goes below its minimum (tree 240px)`, c[0].w >= 239, JSON.stringify(c.map((x) => x.w | 0)));
  // every panel's content still fits at the narrowest the handles allow (a narrowed panel must not spill)
  h = await handles(page);
  await drag(page, h[1].cx, h[1].cy, -900);
  const spill = await page.evaluate(() => [...document.querySelectorAll("#listPane, #folderNotes, #notePane")].filter((e) => e.getBoundingClientRect().width > 0).flatMap((p) => { const pr = p.getBoundingClientRect(); return [...p.querySelectorAll("button, input, select, h2")].filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && getComputedStyle(x).visibility !== "hidden" && (r.right > pr.right + 1 || r.left < pr.left - 1); }).map((x) => `${p.id}:${(x.textContent || x.placeholder || x.tagName).trim().slice(0, 20)}`); }));
  check(`${tag}: at the minimum widths nothing spills out of its panel`, spill.length === 0, JSON.stringify(spill));
  // double-click resets to 4 : 4 : 5
  h = await handles(page);
  await page.mouse.dblclick(h[0].cx, h[0].cy); await page.waitForTimeout(150);
  c = await cols(page);
  const tot = c.reduce((a, x) => a + x.w, 0);
  check(`${tag}: double-click puts the panels back (4 : 4 : 5)`, near(c[0].w / tot, 4 / 13, 0.01) && near(c[2].w / tot, 5 / 13, 0.01), JSON.stringify(c.map((x) => (x.w / tot).toFixed(3))));
  // a wider window keeps the same proportions
  h = await handles(page);
  await drag(page, h[0].cx, h[0].cy, 100);
  c = await cols(page);
  const f1280 = c[0].w / c.reduce((a, x) => a + x.w, 0);
  await page.setViewportSize({ width: 1600, height: 860 }); await page.waitForTimeout(300);
  c = await cols(page);
  const f1600 = c[0].w / c.reduce((a, x) => a + x.w, 0);
  check(`${tag}: on a wider window the tree keeps its share`, near(f1280, f1600, 0.012), `${f1280.toFixed(3)} vs ${f1600.toFixed(3)}`);
  h = await handles(page);
  check(`${tag}: …and the handles follow the gaps`, h.length === 2 && h.every((x, i) => x.cx > c[i].r - 1 && x.cx < c[i + 1].l + 1));
  await page.setViewportSize({ width: 1280, height: 860 }); await page.waitForTimeout(300);
  // Timeline with a Note open: one handle
  await page.click('[data-view="timeline"]'); await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector("#viewTimeline [data-note-open], #viewTimeline .note-card [data-note-open]")?.click());
  await page.waitForTimeout(400);
  c = await cols(page); h = await handles(page);
  check(`${tag}: Timeline with a Note open has two panels and one handle`, c.length === 2 && h.length === 1, `${JSON.stringify(c)} ${JSON.stringify(h)}`);
  if (c.length === 2 && h.length === 1) {
    const t0 = c;
    await drag(page, h[0].cx, h[0].cy, -70);
    c = await cols(page);
    check(`${tag}: its handle works`, near(c[0].w, t0[0].w - 70) && near(c[1].w, t0[1].w + 70), `${t0.map((x) => x.w | 0)} -> ${c.map((x) => x.w | 0)}`);
  }
  check(`${tag}: no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));

  // pinned panel in a Note window
  await page.evaluate(() => localStorage.setItem("mmsa-journey-note-window", JSON.stringify({ x: 40, y: 40, w: 860, h: 600 })));
  await page.click('[data-view="folders"]'); await page.waitForTimeout(300);
  await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]').catch(() => {});
  await page.waitForSelector('#folderNotes [data-note-leaf][data-note-id="n2"]');
  await page.evaluate(() => document.querySelector('#folderNotes [data-note-leaf][data-note-id="n2"] [data-note-window]')?.click());
  await page.waitForSelector('.note-win[data-note-id="n2"]', { timeout: 4000 }).catch(() => {});
  await page.click('.note-win[data-note-id="n2"] [data-win-pins-toggle]').catch(() => {});
  await page.waitForTimeout(200);
  const pw = (p) => p.evaluate(() => document.querySelector('.note-win [data-win-pinned]')?.getBoundingClientRect().width ?? 0);
  const sp = await page.evaluate(() => { const e = document.querySelector(".note-win [data-win-pin-split]"); if (!e || getComputedStyle(e).display === "none") return null; const r = e.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; });
  check(`${tag}: the pinned panel has a handle beside it`, !!sp);
  if (sp) {
    const w0 = await pw(page);
    await drag(page, sp.cx, sp.cy, 60);
    const w1 = await pw(page);
    check(`${tag}: dragging it widens the pinned panel`, near(w1, w0 + 60), `${w0} -> ${w1}`);
    await page.evaluate(() => document.querySelector(".note-win [data-win-close]").click());
    await page.reload(); await waitTree(page);
    await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
    await page.waitForSelector('#folderNotes [data-note-leaf][data-note-id="n2"]');
    await page.evaluate(() => document.querySelector('#folderNotes [data-note-leaf][data-note-id="n2"] [data-note-window]')?.click());
    await page.waitForSelector('.note-win[data-note-id="n2"] [data-win-pinned]', { state: "visible", timeout: 4000 }).catch(() => {});
    check(`${tag}: its width is remembered`, near(await pw(page), w1, 2), `${await pw(page)} vs ${w1}`);
  }
  check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();

  // phone: no handles
  const ctx2 = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 }, extraSeedJs: SEED });
  await routeMutation(ctx2);
  const { page: p2 } = await openPage(ctx2, "/app/journey-map.html");
  await openThree(p2);
  check(`${lang}/390: no panel handles on a phone (one panel at a time)`, (await handles(p2)).length === 0);
  await ctx2.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

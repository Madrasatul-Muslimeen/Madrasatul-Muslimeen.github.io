// The Owner, 8 Oct 2026: "Enable all three columns resizeable on the deck and also
// pop-out, resizeable from every corner, everyside." Mapping My Journey's pop-up:
// tree | list | Note fill the window's whole width and each handle moves width
// between two panels; three panels show from a 900px pop-up (the full page keeps
// 1200px); the pop-up and the Note windows show a gold bracket at every corner and
// a gold line on a side under the pointer, and every one of the eight handles
// resizes. en and bn. Expected values are written by hand. Run from the
// repository root with `node serve.js` running.
//   --mutate=cap     the 46rem reading cap back inside the pop-up  -> the fill checks fail
//   --mutate=tier    the pop-up waits for 1200px like the full page -> the 1000px checks fail
//   --mutate=marks   the corner brackets and side lines removed    -> the visibility checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
function swap(src, from, to) { if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from.slice(0, 60)}`); return src.split(from).join(to); }
async function routeMutation(ctx) {
  if (!MUTATE) return;
  const route = async (glob, file, f) => { const body = f(fs.readFileSync(file, "utf8")); await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body })); };
  if (MUTATE === "cap") await route("**/app/journey-map.html*", "app/journey-map.html", (s) => swap(s, "html.embed body { max-width: none; }", ""));
  else if (MUTATE === "tier") await route("**/app/journey-map.html*", "app/journey-map.html", (s) => swap(s, "const NOTE_PANE_WIDE_FROM_EMBED = 900;", "const NOTE_PANE_WIDE_FROM_EMBED = 1200;"));
  else if (MUTATE === "marks") await route("**/js/float-window.js", "app/js/float-window.js", (s) => swap(s, `.\${cls}::after { content: "";`, `.\${cls}::after { content: none;`));
  else throw new Error(`unknown mutation ${MUTATE}`);
}
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteLinks = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(id, title, day) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: "<p>" + title + " body.</p>", currentRevisionId: "rev-" + id, status: "active", pinned: false, createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own)); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  // a real-length folder name, as the Owner's own tree has
  F("fA", "(03) (000 - 000) :|: Mapping My Journey :|:", null, 0); F("fB", "(04) (001 - 010) Mindfulness (TAQWA) - :|: Being MINDFUL is the KEY :|:", null, 1);
  N("n1", "Mapping My Journey - A bird's-eye view of WHERE you STAND, Where you LACK and Where you NEED to WORK on your Deen", 1); N("n2", "Not only acquiring knowledge but remaining FOCUSed is the KEY to Jannah", 2);
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1);
})();`;

const near = (a, b, tol = 3) => Math.abs(a - b) <= tol;
async function drag(page, x, y, dx, dy = 0) { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 3 }); await page.mouse.move(x + dx, y + dy, { steps: 3 }); await page.mouse.up(); await page.waitForTimeout(150); }
const layout = (frame) => frame.evaluate(() => {
  const L = document.getElementById("noteLayout");
  const cols = [...L.children].filter((c) => !c.classList.contains("jm-split") && getComputedStyle(c).display !== "none" && c.getBoundingClientRect().width > 0).map((c) => { const r = c.getBoundingClientRect(); return { id: c.id, l: r.left, r: r.right, w: r.width }; });
  const handles = [...L.querySelectorAll(":scope > .jm-split")].filter((h) => getComputedStyle(h).display !== "none" && !h.hidden).map((h) => { const r = h.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + Math.min(r.height, 300) / 2 }; });
  return { doc: document.documentElement.clientWidth, body: document.body.getBoundingClientRect().width, cols, handles };
});
async function openTray(page, rect) {
  await page.evaluate((r) => localStorage.setItem("mmsa-journey-tray", JSON.stringify(r)), rect);
  await page.click("#tabJourneyBtn");
  await page.waitForSelector("#journeyTray:not([hidden])");
  const frame = await (await page.$("#journeyTray iframe")).contentFrame();
  await frame.waitForSelector('.folder-row[data-folder-id="fA"] [data-folder-name]', { timeout: 15000 });
  await frame.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
  await frame.waitForSelector('#folderNotes [data-note-leaf][data-note-id="n1"]');
  await frame.click('#folderNotes [data-note-leaf][data-note-id="n1"] [data-note-open]');
  await frame.waitForFunction(() => !document.getElementById("notePane").hidden, null, { timeout: 5000 });
  await page.waitForTimeout(300);
  return frame;
}
const trayBox = (page) => page.evaluate(() => { const r = document.getElementById("journeyTray").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
/** The visible mark a handle draws: its ::after box and whether it can be seen. */
const marks = (page, cls) => page.evaluate((c) => [...document.querySelectorAll(`.${c}`)].filter((h) => h.getClientRects().length).map((h) => {
  const s = getComputedStyle(h, "::after");
  const bw = Math.max(...["Top", "Right", "Bottom", "Left"].map((k) => parseFloat(s[`border${k}Width`]) || 0));
  return { h: h.dataset.h, content: s.content, opacity: Number(s.opacity), bw, colour: s.borderTopColor === "rgba(0, 0, 0, 0)" ? s.borderRightColor : s.borderTopColor };
}), cls);
const GOLD = "rgb(201, 162, 75)";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const lang of ["en", "bn"]) {
  // The Owner's own screen: a 1486 x 924 window, the pop-up 1342px wide.
  let tag = `${lang} 1486px, pop-up 1342px`;
  console.log(`\n=== ${tag} ===`);
  let ctx = await newContext(browser, { appLang: lang, viewport: { width: 1486, height: 924 }, extraSeedJs: SEED });
  await routeMutation(ctx);
  let { page } = await openPage(ctx, "/app/quranrevival.html");
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  let frame = await openTray(page, { x: 72, y: 72, w: 1342, h: 796 });
  let L = await layout(frame);
  check(`${tag}: the page inside the pop-up is as wide as the pop-up (no reading cap)`, near(L.body, L.doc, 1), `body ${L.body} of ${L.doc}`);
  check(`${tag}: three panels side by side`, L.cols.length === 3, JSON.stringify(L.cols.map((c) => c.id)));
  check(`${tag}: the Note panel reaches the pop-up's right side (no empty band)`, L.cols.length === 3 && L.cols[2].r > L.doc - 20, `Note ends at ${L.cols[2]?.r | 0} of ${L.doc}`);
  check(`${tag}: every panel is above its own minimum (240, 260, 300px)`, L.cols.length === 3 && L.cols[0].w > 240 && L.cols[1].w > 260 && L.cols[2].w > 300, L.cols.map((c) => c.w | 0).join());
  check(`${tag}: two handles, each in the gap between two panels`, L.handles.length === 2 && L.handles.every((x, i) => L.cols[i + 1] && x.cx > L.cols[i].r - 1 && x.cx < L.cols[i + 1].l + 1), JSON.stringify(L.handles));
  if (L.handles.length === 2 && L.cols.length === 3) {
    const fb = (await (await page.$("#journeyTray iframe")).boundingBox());
    const c0 = L.cols;
    await drag(page, fb.x + L.handles[0].cx, fb.y + L.handles[0].cy, 90);
    L = await layout(frame);
    check(`${tag}: dragging the first handle 90px widens the tree and narrows the list by 90px`, near(L.cols[0].w, c0[0].w + 90) && near(L.cols[1].w, c0[1].w - 90) && near(L.cols[2].w, c0[2].w), `${c0.map((x) => x.w | 0)} -> ${L.cols.map((x) => x.w | 0)}`);
    const c1 = L.cols;
    await drag(page, fb.x + L.handles[1].cx, fb.y + L.handles[1].cy, -30);
    L = await layout(frame);
    check(`${tag}: dragging the second handle 30px left gives the Note 30px`, near(L.cols[1].w, c1[1].w - 30) && near(L.cols[2].w, c1[2].w + 30) && near(L.cols[0].w, c1[0].w), `${c1.map((x) => x.w | 0)} -> ${L.cols.map((x) => x.w | 0)}`);
    await page.mouse.dblclick(fb.x + L.handles[0].cx, fb.y + L.handles[0].cy); await page.waitForTimeout(150);
  }
  check(`${tag}: no sideways scroll inside the pop-up`, await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));

  // The pop-up's own frame: a gold bracket at each corner, always shown; a side shows its line under the pointer.
  let m = await marks(page, "jt-h");
  const corners = m.filter((x) => x.h.length === 2), sides = m.filter((x) => x.h.length === 1);
  check(`${tag}: the pop-up shows a gold bracket at all four corners`, corners.length === 4 && corners.every((x) => x.content !== "none" && x.opacity >= 0.8 && x.bw >= 2 && x.colour === GOLD), JSON.stringify(corners));
  check(`${tag}: the four sides carry a hidden gold line`, sides.length === 4 && sides.every((x) => x.content !== "none" && x.opacity === 0 && x.bw >= 3 && x.colour === GOLD), JSON.stringify(sides));
  let tb = await trayBox(page);
  await page.mouse.move(tb.x + tb.w - 4, tb.y + tb.h / 2); await page.waitForTimeout(250);
  m = await marks(page, "jt-h");
  check(`${tag}: the pointer on the right side lights its gold line`, m.find((x) => x.h === "e")?.opacity === 1 && m.find((x) => x.h === "w")?.opacity === 0, JSON.stringify(m.filter((x) => x.h.length === 1)));
  // Every one of the eight handles resizes: shrink first so each direction has room.
  await page.evaluate(() => { localStorage.setItem("mmsa-journey-tray", JSON.stringify({ x: 300, y: 200, w: 800, h: 500 })); });
  await page.click(".jt-close"); await page.click("#tabJourneyBtn"); await page.waitForSelector("#journeyTray:not([hidden])"); await page.waitForTimeout(200);
  const expect = { n: [0, -30], s: [0, 30], e: [30, 0], w: [-30, 0], ne: [30, -30], nw: [-30, -30], se: [30, 30], sw: [-30, 30] };
  for (const [h, [dx, dy]] of Object.entries(expect)) {
    tb = await trayBox(page);
    const hb = await page.evaluate((k) => { const r = document.querySelector(`.jt-h[data-h="${k}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, h);
    await drag(page, hb.x, hb.y, dx, dy);
    const ta = await trayBox(page);
    check(`${tag}: the ${h} handle resizes the pop-up`, near(ta.w, tb.w + Math.abs(dx), 2) && near(ta.h, tb.h + Math.abs(dy), 2), `${JSON.stringify(tb)} -> ${JSON.stringify(ta)}`);
  }
  check(`${tag}: no page errors`, errors.length === 0, errors.join(" | "));
  await ctx.close();

  // A laptop-sized pop-up (1000px): three panels now, each resizable.
  tag = `${lang} 1280px, pop-up 1000px`;
  console.log(`\n=== ${tag} ===`);
  ctx = await newContext(browser, { appLang: lang, viewport: { width: 1280, height: 800 }, extraSeedJs: SEED });
  await routeMutation(ctx);
  ({ page } = await openPage(ctx, "/app/quranrevival.html"));
  frame = await openTray(page, { x: 140, y: 40, w: 1000, h: 720 });
  L = await layout(frame);
  check(`${tag}: three panels side by side`, L.cols.length === 3, `doc ${L.doc}: ${L.cols.map((c) => c.id)}`);
  check(`${tag}: two handles`, L.handles.length === 2, JSON.stringify(L.handles));
  check(`${tag}: every panel at or above its minimum`, L.cols.length === 3 && L.cols[0].w >= 239 && L.cols[1].w >= 259 && L.cols[2].w >= 299, L.cols.map((c) => c.w | 0).join());
  const spill = await frame.evaluate(() => [...document.querySelectorAll("#listPane, #folderNotes, #notePane")].filter((e) => e.getBoundingClientRect().width > 0).flatMap((p) => { const pr = p.getBoundingClientRect(); return [...p.querySelectorAll("button, input, select, h2")].filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && getComputedStyle(x).visibility !== "hidden" && (r.right > pr.right + 1 || r.left < pr.left - 1); }).map((x) => `${p.id}:${(x.textContent || x.placeholder || x.tagName).trim().slice(0, 20)}`); }));
  check(`${tag}: nothing spills out of its panel`, spill.length === 0, JSON.stringify(spill));
  check(`${tag}: no sideways scroll inside the pop-up`, await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: `/tmp/journey-tray-panes-${lang}-1000.png` });
  await ctx.close();

  // An 860px pop-up stays one panel at a time (below 900px the minimums do not fit).
  tag = `${lang} 1280px, pop-up 860px`;
  ctx = await newContext(browser, { appLang: lang, viewport: { width: 1280, height: 800 }, extraSeedJs: SEED });
  ({ page } = await openPage(ctx, "/app/quranrevival.html"));
  frame = await openTray(page, { x: 140, y: 40, w: 860, h: 720 });
  L = await layout(frame);
  check(`${tag}: one panel at a time (the Note), no handles`, L.cols.length === 1 && L.cols[0].id === "notePane" && L.handles.length === 0, `doc ${L.doc}: ${L.cols.map((c) => c.id)}`);
  await ctx.close();

  // The full page is unchanged: below 1200px, one panel at a time.
  tag = `${lang} full page 1100px`;
  ctx = await newContext(browser, { appLang: lang, viewport: { width: 1100, height: 800 }, extraSeedJs: SEED });
  ({ page } = await openPage(ctx, "/app/journey-map.html"));
  await page.waitForSelector('.folder-row[data-folder-id="fA"] [data-folder-name]', { timeout: 15000 });
  await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
  await page.waitForTimeout(400);
  L = await layout(page);
  check(`${tag}: the full page still waits for 1200px (one panel, no handles)`, L.cols.length === 1 && L.handles.length === 0, L.cols.map((c) => c.id).join());
  await ctx.close();

  // A Note's own pop-out window: the same brackets and lines.
  tag = `${lang} Note window`;
  ctx = await newContext(browser, { appLang: lang, viewport: { width: 1280, height: 860 }, extraSeedJs: SEED });
  await routeMutation(ctx);
  ({ page } = await openPage(ctx, "/app/journey-map.html"));
  await page.waitForSelector('.folder-row[data-folder-id="fA"] [data-folder-name]', { timeout: 15000 });
  await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
  await page.waitForSelector('#folderNotes [data-note-leaf][data-note-id="n1"]');
  await page.click('#folderNotes [data-note-leaf][data-note-id="n1"] [data-note-open]');
  await page.waitForFunction(() => !document.getElementById("notePane").hidden);
  const popped = await page.evaluate(() => { const b = document.querySelector("#notePane [data-pane-multi], #notePane [data-pane-popout]"); if (b) b.click(); return !!b; });
  await page.waitForTimeout(400);
  m = await marks(page, "nw-h");
  const wc = m.filter((x) => x.h.length === 2);
  check(`${tag}: a popped-out Note shows a gold bracket at all four corners`, popped && wc.length === 4 && wc.every((x) => x.content !== "none" && x.opacity >= 0.8 && x.colour === GOLD), `${popped} ${JSON.stringify(m)}`);
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

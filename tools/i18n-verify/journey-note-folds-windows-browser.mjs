// Note-pane round 3 (the Owner, 5 Oct 2026: "add all functions of the notepane of Siyagah in the notepane"), items
// 21-27 of docs/reference/2026-10-05-siyagah-note-pane-port-list.md: ⇅ fold all while editing, a preview line under a
// folded heading, ⧉ Multi on the pane's bar, ⇲ back into the pane, ✕ Close all (and Ctrl+Shift+X / Ctrl+Shift+P),
// Details remembered, Contents beside the text in a wide window. en and bn, 1280 and 390.
// Run from the repository root with `node serve.js` running.
//   --mutate=fold-edit   ⇅ while editing does nothing            -> the edit-fold checks fail
//   --mutate=no-peek     no preview line is built                 -> the preview checks fail
//   --mutate=no-closeall the Close all button is not drawn        -> the close-all checks fail
//   --mutate=no-toc      the side Contents never shows            -> the side-panel checks fail
//   --mutate=no-details  Details open is not remembered           -> the Details check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const SHOTS = (process.argv.find((a) => a.startsWith("--shots=")) || "").slice(8);
function swap(src, from, to) { if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from.slice(0, 60)}`); return src.split(from).join(to); }
async function routeMutation(ctx) {
  if (!MUTATE) return;
  let body = fs.readFileSync("app/js/note-window.js", "utf8");
  if (MUTATE === "fold-edit") body = swap(body, "    if (!all) for (const h of heads) v.ed.folded.add(h);\n", "");
  else if (MUTATE === "no-peek") body = swap(body, '      sec.querySelector(":scope > .note-sec-h").after(peek);', "");
  else if (MUTATE === "no-closeall") body = swap(body, '    nav.innerHTML = `<button type="button" class="secondary nw-closeall"', '    nav.innerHTML = `<b hidden class="x"');
  else if (MUTATE === "no-toc") body = swap(body, "    const show = wide && secs.length >= TOC_MIN_HEADINGS;", "    const show = false;");
  else if (MUTATE === "no-details") body = swap(body, "saveDetailsOpen(open); return; }", "return; }");
  else throw new Error(`unknown mutation ${MUTATE}`);
  await ctx.route("**/js/note-window.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body }));
}

const LONG = Array.from({ length: 30 }, (_, i) => `<p>Alpha line ${i + 2}.</p>`).join("");
const BODY = `<p>Opening line</p><h2>Alpha</h2><p>Alpha body one is here.</p>${LONG}<h2>Beta</h2><p>Beta body text.</p><h2>Gamma</h2><p>Gamma body.</p>`;
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d); }, toMillis: function () { return new Date(d).getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteLinks = [];
  DATA.noteFolders.push(Object.assign({ _id: "t1__fA", folderId: "fA", name: "Alpha folder", parentFolderId: null, semanticRole: "user", order: 0, status: "active", updatedAt: ts("2024-09-01T10:00:00Z") }, own));
  function note(id, title, body, rev, when, order) {
    DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: rev, status: "active", createdAt: ts(when), updatedAt: ts(when) }, own));
    DATA.noteRevisions.push(Object.assign({ _id: "t1__" + rev, revisionId: rev, noteId: id, previousRevisionId: null, title: title, bodyHtml: body, revisionReason: "content-update", actorUid: "test-uid", createdAt: new Date(when) }, own));
    DATA.notePlacements.push(Object.assign({ _id: "t1__p" + id, placementId: "p" + id, noteId: id, folderId: "fA", order: order, status: "active" }, own));
  }
  note("n1", "Folding Note", ${JSON.stringify(BODY)}, "r1", "2024-09-03T16:45:00Z", 0);
  note("n2", "Second Note", "<p>Two.</p>", "r2", "2024-09-02T16:45:00Z", 1);
})();`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const lang of ["en", "bn"]) for (const width of [1280, 390]) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
  await routeMutation(ctx);
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); localStorage.setItem("mmsa-journey-note-window", JSON.stringify({ x: 40, y: 40, w: 900, h: 700 })); } catch {} });
  const { page: P, errors } = await openPage(ctx, "/app/journey-map.html#folders");
  await P.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 1 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
  const openInPane = async (id) => {
    await P.click('.folder-row[data-folder-id="fA"] [data-folder-name]').catch(() => {});
    await P.waitForSelector(`#folderNotes [data-note-id='${id}'] [data-note-open]`, { state: "visible" });
    // a window may sit over the list: press the row's own button directly (its click handler is what is under test elsewhere)
    await P.evaluate((i) => document.querySelector(`#folderNotes [data-note-id='${i}'] [data-note-open]`).click(), id);
    await P.waitForSelector("#notePane [data-pane-title]", { state: "visible" });
  };
  const S = "#notePane", q = (x) => `${S} ${x}`;
  const vis = (sel) => P.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0 && r.height > 0; }, sel);
  const barOrMenu = async (scope, sel) => {
    if (await vis(`${scope} [data-pane-bar] > ${sel}`)) await P.click(`${scope} [data-pane-bar] > ${sel}`);
    else { await P.click(`${scope} [data-pane-menu-btn]`); await P.click(`${scope} [data-pane-menu] ${sel}`); }
  };
  await openInPane("n1");

  // ---- 22. preview of a folded section ----
  await P.click(q('.note-sec[data-heading-text="Alpha"] [data-sec-toggle]'));
  const peek = await P.evaluate((s) => { const p = document.querySelector(s + ' .note-sec[data-heading-text="Alpha"] > [data-sec-peek]'); const r = p?.getBoundingClientRect(); return p ? { text: p.textContent, shown: getComputedStyle(p).display !== "none" && r.height > 0, oneLine: r.height < 30 } : null; }, S);
  check(`${tag}: a folded heading shows the start of what it hides`, !!peek && peek.shown && peek.text.startsWith("Alpha body one"), JSON.stringify(peek));
  check(`${tag}: ...on one line`, !!peek?.oneLine, JSON.stringify(peek));
  check(`${tag}: an open heading shows no preview`, await P.evaluate((s) => { const p = document.querySelector(s + ' .note-sec[data-heading-text="Beta"] > [data-sec-peek]'); return !!p && getComputedStyle(p).display === "none"; }, S));
  await P.click(q('.note-sec[data-heading-text="Alpha"] [data-sec-toggle]'));

  // ---- 21. ⇅ while editing ----
  await barOrMenu(S, "[data-pane-edit-toggle]");
  await P.waitForSelector(q("[data-edit-body]"), { state: "visible" });
  await P.waitForTimeout(200);
  await barOrMenu(S, "[data-pane-foldall]");
  await P.waitForTimeout(200);
  const ed = await P.evaluate((s) => { const b = document.querySelector(s + " [data-edit-body]"); return { folded: b.querySelectorAll(".ed-folded").length, arrows: [...document.querySelectorAll(s + " [data-sec-fold]")].map((x) => x.textContent) }; }, S);
  check(`${tag}: ⇅ while editing folds every section`, ed.folded >= 3 && ed.arrows.length === 3 && ed.arrows.every((a) => a === "▶"), JSON.stringify(ed));
  await barOrMenu(S, "[data-pane-foldall]");
  await P.waitForTimeout(200);
  check(`${tag}: ⇅ again opens them all`, (await P.evaluate((s) => document.querySelector(s + " [data-edit-body]").querySelectorAll(".ed-folded").length, S)) === 0);
  check(`${tag}: folding while editing saved nothing`, (await P.evaluate(() => window.__DATA.noteRevisions.filter((r) => r.noteId === "n1").length)) === 1);
  await barOrMenu(S, "[data-pane-edit-toggle]");
  await P.waitForFunction((s) => !document.querySelector(s + " [data-edit-body]"), S, { timeout: 8000 }).catch(() => {});

  // ---- 23. ⧉ on the pane's bar ----
  // ⧉ shows on the bar when there is room and is the FIRST thing to fold away (⋯ keeps ⧉ Pop out): it never costs 🔍 its place.
  const bar = await P.evaluate((s) => { const b = document.querySelector(s + " [data-pane-bar]"); const shown = (sel) => { const e = b.querySelector(":scope > " + sel); return !!e && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0; }; return { multi: shown("[data-pane-multi]"), find: shown("[data-pane-find-toggle]"), multiFolded: b.classList.contains("multi-folded"), toolsFolded: b.classList.contains("tools-folded"), menuPop: !!b.querySelector("[data-pane-menu] [data-pane-popout]") }; }, S);
  check(`${tag}: ⧉ is on the bar, or folded first with ⧉ Pop out still in ⋯`, (bar.multi || bar.multiFolded) && bar.menuPop, JSON.stringify(bar));
  check(`${tag}: ⧉ never pushes 🔍 off the bar (🔍 folds only when ⧉ is already gone)`, bar.find || (bar.multiFolded && bar.toolsFolded), JSON.stringify(bar));
  await barOrMenu(S, "[data-pane-popout]");
  await P.waitForSelector(".note-win[data-note-id='n1']", { timeout: 5000 }).catch(() => {});
  check(`${tag}: ⧉ opens the Note in its own window`, !!(await P.$(".note-win[data-note-id='n1']")) && !(await P.evaluate(() => !document.getElementById("notePane").hidden && document.querySelector("#notePane [data-pane-title]")?.textContent === "Folding Note")));
  const W1 = ".note-win[data-note-id='n1']";

  // ---- 27. Contents beside the text in a wide window ----
  const toc = await P.evaluate((w) => { const t = document.querySelector(w + " [data-win-toc]"); return t ? { shown: !t.hidden && t.getBoundingClientRect().width > 0, items: [...t.querySelectorAll("[data-toc-jump]")].map((b) => b.textContent) } : null; }, W1);
  if (width >= 1024) {
    check(`${tag}: a wide window lists the headings beside the text`, !!toc?.shown && JSON.stringify(toc.items) === JSON.stringify(["Alpha", "Beta", "Gamma"]), JSON.stringify(toc));
    const before = await P.evaluate((w) => { const sc = document.querySelector(w + " [data-win-scroll]"), h = document.querySelector(w + ' .note-sec[data-sec-index="1"]'); return { top: sc.scrollTop, below: h.getBoundingClientRect().top > sc.getBoundingClientRect().bottom }; }, W1);
    check(`${tag}: (fixture) Beta starts out of sight below`, before.below && before.top === 0, JSON.stringify(before));
    await P.click(`${W1} [data-toc-jump="1"]`);
    await P.waitForTimeout(300);
    check(`${tag}: tapping one goes there`, await P.evaluate((w) => { const sc = document.querySelector(w + " [data-win-scroll]"), h = document.querySelector(w + ' .note-sec[data-sec-index="1"]'); const a = sc.getBoundingClientRect(), b = h.getBoundingClientRect(); return sc.scrollTop > 0 && b.top >= a.top - 2 && b.bottom <= a.bottom; }, W1), JSON.stringify(await P.evaluate((w) => { const sc = document.querySelector(w + " [data-win-scroll]"), h = document.querySelector(w + ' .note-sec[data-sec-index="1"]'); return { st: sc.scrollTop, sh: sc.scrollHeight, ch: sc.clientHeight, a: sc.getBoundingClientRect().top, b: h.getBoundingClientRect().top }; }, W1)));
    if (SHOTS) await P.screenshot({ path: `${SHOTS}/r3-${tag.replace("/", "-")}-toc.png` });
    // narrowed below 760px it goes away
    await P.evaluate(() => { const b = document.querySelector(".note-win[data-note-id='n1'] .nw-h[data-h='e']"); const r = b.getBoundingClientRect(); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.left + 2, clientY: r.top + 20, button: 0, pointerId: 1 })); window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: r.left - 300, clientY: r.top + 20, pointerId: 1 })); b.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: r.left - 300, clientY: r.top + 20, pointerId: 1 })); window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1 })); b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1 })); });
    await P.waitForTimeout(200);
    const narrow = await P.evaluate((w) => ({ w: document.querySelector(w).getBoundingClientRect().width, hidden: document.querySelector(w + " [data-win-toc]").hidden }), W1);
    check(`${tag}: a narrower window keeps the text to itself`, narrow.w >= 760 || narrow.hidden, JSON.stringify(narrow));
  } else {
    check(`${tag}: on a phone the window shows no side Contents`, !toc?.shown, JSON.stringify(toc));
  }

  // ---- 26. Details remembered ----
  await P.click(`${W1} [data-win-details]`);
  check(`${tag}: Details opens`, await P.evaluate((w) => document.querySelector(w + " .nw-details").classList.contains("open"), W1));

  // ---- 25. a second window, ✕ Close all ----
  await P.keyboard.press("Escape").catch(() => {});
  await P.waitForTimeout(150);
  if (await P.$(W1)) await P.click(`${W1} [data-win-close]`);
  await openInPane("n2");
  await P.keyboard.press("Control+Shift+P");
  await P.waitForSelector(".note-win[data-note-id='n2']", { timeout: 5000 }).catch(() => {});
  check(`${tag}: Ctrl+Shift+P pops the pane's Note out`, !!(await P.$(".note-win[data-note-id='n2']")));
  check(`${tag}: a window opened later remembers Details open`, await P.evaluate(() => document.querySelector(".note-win[data-note-id='n2'] .nw-details")?.classList.contains("open") && document.querySelector(".note-win[data-note-id='n2'] [data-win-details]")?.getAttribute("aria-expanded") === "true"));
  await openInPane("n1");
  await P.keyboard.press("Control+Shift+P"); // a phone's window covers the pane's own ⋯
  await P.waitForSelector(W1, { timeout: 5000 }).catch(() => {});
  const ca = await P.evaluate(() => { const b = document.querySelector("[data-win-closeall]"); const r = b?.getBoundingClientRect(); return b ? { text: b.textContent, h: r.height, inside: r.left >= 0 && r.right <= innerWidth + 1 } : null; });
  check(`${tag}: two windows open: ✕ Close all (2), in sight`, !!ca && /\(2\)|\(২\)/.test(ca.text) && ca.h >= 40 && ca.inside, JSON.stringify(ca));
  if (SHOTS) await P.screenshot({ path: `${SHOTS}/r3-${tag.replace("/", "-")}-closeall.png` });
  if (ca) await P.click("[data-win-closeall]");
  await P.waitForTimeout(200);
  check(`${tag}: Close all closes every window`, (await P.$$(".note-win")).length === 0);

  // Ctrl+Shift+X
  await openInPane("n2");
  await barOrMenu(S, "[data-pane-popout]");
  await P.waitForSelector(".note-win[data-note-id='n2']", { timeout: 5000 }).catch(() => {});
  await P.keyboard.press("Control+Shift+X");
  await P.waitForTimeout(200);
  check(`${tag}: Ctrl+Shift+X closes them too`, (await P.$$(".note-win")).length === 0);

  // ---- 24. ⇲ back into the pane ----
  await openInPane("n1");
  await barOrMenu(S, "[data-pane-popout]");
  await P.waitForSelector(W1, { timeout: 5000 }).catch(() => {});
  await P.click(`${W1} [data-win-dock]`);
  await P.waitForTimeout(300);
  check(`${tag}: ⇲ puts the Note back into the pane`, !(await P.$(W1)) && (await P.evaluate(() => !document.getElementById("notePane").hidden && document.querySelector("#notePane [data-pane-title]")?.textContent === "Folding Note")),
    JSON.stringify(await P.evaluate(() => ({ wins: [...document.querySelectorAll(".note-win")].map((w) => w.dataset.noteId), paneHidden: document.getElementById("notePane").hidden, title: document.querySelector("#notePane [data-pane-title]")?.textContent }))));

  check(`${tag}: no sideways scroll`, await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

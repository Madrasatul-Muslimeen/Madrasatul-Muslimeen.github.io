// PCF MSA J140 part 3 (15 Nov 2026) -- one pop-up in each of Hadith, Dua, Notes and Quran Study is checked end to end:
// ✕, ⛶ and – are the topmost thing at their centre (elementFromPoint), ⛶ fills the viewport and returns to the same rect, a drag by
// the top bar moves it, each of the eight handles changes the size, a click on a module bar collapses it.
// Run from the repository root with `node serve.js` running:  node tools/i18n-verify/popup-windows-all-browser.mjs [--mutate=NAME]
// Each check is proven by a mutation that must make it FAIL by name:
//   nohwcx     the Hadith Word Card loses its ✕                      -> "✕ is the topmost thing at its centre"
//   nodpop     the Dua pop-up is no longer in WINDOWS                -> "has – ⛶ ✕"
//   nofull     ⛶ does nothing                                        -> "⛶ fills the viewport"
//   nodrag     the shared drag does nothing                          -> "a drag by the top bar moves it"
//   noresize   the handles do nothing                                -> "handle ... changes the size"
//   part 4 (J140, #1762), each -> "<pop-up> has – ⛶ ✕":
//   nodword (Dua word pop-up entry), nomapx (journey-map.html dialog loses its ✕), nomapent (dialog entry),
//   noexpx (Take an Approach loses its ✕), noexpent (Take an Approach entry)
//   part 5 (J140, this round): nofilx nofilent nocopyent nonvx nonvent noqcrent nowcent nozabent nofullsize (see MUT below)
//   nocollapse a module bar no longer collapses pop-ups              -> "a click on a module bar collapses it"
import fs from "node:fs";
import { chromium, newContext, openPage, hadithGo } from "./harness.mjs";

// Mapping My Journey fixture: five folders, three Notes (the same shape journey-folder-picker-browser.mjs seeds).
const JOURNEY_SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true;
  window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(id, title, body, day) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: "rev-" + id, status: "active", createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own)); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  F("fA", "Alpha", null, 0); F("fB", "Beta", null, 1); F("fC", "Gamma", null, 2); F("fK", "Kid", "fB", 0); F("fE", "Empty", null, 4);
  N("n1", "Note One", "<p>One.</p>", 1); N("n2", "Note Two", "<p>Two.</p>", 2); N("n3", "Note Three", "<p>Three.</p>", 3);
  P("p1", "n1", "fA", 0); P("p1b", "n1", "fB", 0); P("p2", "n2", "fA", 1); P("p3", "n3", "fC", 0);
})();`;

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MIN = "app/js/minimise.js";
const MUT = {
  nohwcx: [["app/js/hadith-word-card.js", [['head.appendChild(xBtn);', ""]]]],
  nodpop: [[MIN, [['close: ".dua-pop-close"', 'close: ".dua-pop-closeX"']]]],
  nofull: [[MIN, [["e.stopPropagation(); toggleFull(root); });", "e.stopPropagation(); });"]]]],
  nodrag: [[MIN, [['startDrag(e, "move", ctx());', ""]]]],
  noresize: [[MIN, [["e.stopPropagation(); startDrag(e, h, ctx());", "e.stopPropagation();"]]]],
  nocollapse: [[MIN, [["#topNav summary, ", ""], ["#hadithCorpusRoot [role='tablist'] button, #hadithCorpusRoot nav button, ", ""], ["#duaRoot [role='tablist'] button, #duaRoot nav button, ", ""], ["#tabRow button, ", ""], ["#wheelBar button, ", ""]]]],
  // part 4
  nodword: [[MIN, [['close: ".dua-word-panel-close", title', 'close: ".dua-word-panel-closeX", title']]]],   // -> "Dua word pop-up has – ⛶ ✕"
  nomapx: [["app/journey-map.html", [["head.append(title, x);", "head.append(title);"]]]],                   // the dialog loses its ✕ -> "Folder dialog has – ⛶ ✕"
  nomapent: [[MIN, [['close: ".fp-close"', 'close: ".fp-closeX"']]]],                                         // -> "Folder dialog has – ⛶ ✕"
  noexpx: [["app/quranrevival.html", [['class="aa-x" data-aa-close', 'class="aa-xq" data-aa-close']]]],       // -> "Take an Approach has – ⛶ ✕"
  noexpent: [[MIN, [['close: ".aa-x"', 'close: ".aa-xX"']]]],                                                   // -> "Take an Approach has – ⛶ ✕"
  // part 5 (J140, this round), each -> "<pop-up> has – ⛶ ✕"
  nofilx: [["app/quranrevival.html", [['class="ayah-folder-filing-x" id=', 'class="ayah-folder-filing-xq" id=']]]],     // the filing dialog loses its ✕   -> "File in folders has – ⛶ ✕"
  nofilent: [[MIN, [['close: ".ayah-folder-filing-x"', 'close: ".ayah-folder-filing-xX"']]]],                              // -> "File in folders has – ⛶ ✕"
  nocopyent: [[MIN, [['close: ".ayah-copy-x"', 'close: ".ayah-copy-xX"']]]],                                                // -> "Copy āyāt has – ⛶ ✕"
  nonvx: [["app/quranrevival.html", [['class="ayah-nv-x" data-ayah-nv-back', 'class="ayah-nv-xq" data-ayah-nv-back']]]],     // the Āyah view loses its ✕        -> "Āyah view has – ⛶ ✕"
  nonvent: [[MIN, [['close: ".ayah-nv-x"', 'close: ".ayah-nv-xX"']]]],                                                      // -> "Āyah view has – ⛶ ✕"
  noqcrent: [[MIN, [['close: ".qcr-pop-x"', 'close: ".qcr-pop-xX"']]]],                                                     // -> "QCR pop-up has – ⛶ ✕"
  nowcent: [[MIN, [['close: "[data-word-card-close]", title', 'close: "[data-word-card-closeX]", title']]]],                // -> "Quran Word Card has – ⛶ ✕"
  nozabent: [[MIN, [['close: ".zab-head [data-zab-close]"', 'close: ".zab-head [data-zab-closeX]"']]]],                      // -> "Zab panel has – ⛶ ✕"
  nofullsize: [[MIN, [[', boxSizing: "border-box" });', ' });']]]],                                                          // ⛶ overshoots by the border -> "Quran Word Card ⛶ fills the viewport"
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (typeof ok?.then === "function") throw new Error(`check "${n}" was given a promise`); ok ? (pass++, process.env.QUIET || console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`)); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function context(lang, width, height, extraSeedJs = undefined) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, ...(extraSeedJs ? { extraSeedJs } : {}) });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    for (const [file, pairs] of MUT[MUTATE]) {
      await ctx.route(`**/${file}*`, async (r) => {
        // a page is fetched as the server (and the harness) serve it; a script is read from disk
        const page = file.endsWith(".html");
        const res = page ? await r.fetch() : null;
        let src = page ? await res.text() : fs.readFileSync(file, "utf8");
        for (const [a, b] of pairs) { if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); src = src.split(a).join(b); }
        if (page) await r.fulfill({ response: res, body: src }); else await r.fulfill({ status: 200, contentType: "text/javascript", body: src });
      });
    }
  }
  return ctx;
}

const rectOf = (page, sel) => page.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }, sel);
const topAtCentre = (page, root, btnSel) => page.evaluate(([root, btnSel]) => {
  const b = document.querySelector(root)?.querySelector(btnSel);
  if (!b) return null;
  const r = b.getBoundingClientRect();
  const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return hit === b || b.contains(hit);
}, [root, btnSel]);

/** The full set of checks on one open pop-up. `root` is the window, `x` its ✕ selector. */
async function exercise(page, tag, root, x, { handles = true } = {}) {
  const has = await page.evaluate(([root]) => { const r = document.querySelector(root); return !!r && !!r.querySelector(".mm-min-btn") && !!r.querySelector(".mm-full-btn"); }, [root]);
  // the buttons are added on the next animation frame
  if (!has) await page.waitForFunction((root) => { const r = document.querySelector(root); return !!r && !!r.querySelector(".mm-min-btn") && !!r.querySelector(".mm-full-btn"); }, root, { timeout: 4000 }).catch(() => {});
  check(`${tag} has – ⛶ ✕`, await page.evaluate(([root, x]) => { const r = document.querySelector(root); return !!r && !!r.querySelector(".mm-min-btn") && !!r.querySelector(".mm-full-btn") && !!r.querySelector(x); }, [root, x]));
  if (!(await page.evaluate(([root, x]) => { const r = document.querySelector(root); return !!r && !!r.querySelector(".mm-min-btn") && !!r.querySelector(".mm-full-btn") && !!r.querySelector(x); }, [root, x]))) return; // nothing further can be measured
  for (const [name, sel] of [["✕", x], ["⛶", ".mm-full-btn"], ["–", ".mm-min-btn"]]) {
    check(`${tag} ${name} is the topmost thing at its centre`, (await topAtCentre(page, root, sel)) === true);
  }
  const labels = await page.evaluate((root) => ({ min: document.querySelector(`${root} .mm-min-btn`)?.getAttribute("aria-label"), full: document.querySelector(`${root} .mm-full-btn`)?.getAttribute("aria-label") }), root);
  check(`${tag} – and ⛶ have labels`, !!labels.min && !!labels.full, JSON.stringify(labels));
  // ⛶
  const r0 = await rectOf(page, root);
  await page.click(`${root} .mm-full-btn`);
  const rf = await rectOf(page, root);
  const vp = page.viewportSize();
  check(`${tag} ⛶ fills the viewport`, !!rf && Math.abs(rf.w - vp.width) <= 1 && Math.abs(rf.h - vp.height) <= 1 && rf.x === 0 && rf.y === 0, JSON.stringify({ rf, vp }));
  await page.click(`${root} .mm-full-btn`);
  const r1 = await rectOf(page, root);
  check(`${tag} ⛶ again restores the same rect`, !!r1 && !!r0 && Math.abs(r1.x - r0.x) <= 1 && Math.abs(r1.y - r0.y) <= 1 && Math.abs(r1.w - r0.w) <= 1 && Math.abs(r1.h - r0.h) <= 1, JSON.stringify({ r0, r1 }));
  if (vp.width < 700) return; // a phone sheet fills the screen: drag and resize are for tablets and computers
  // drag by the top bar
  // a plain point on the bar: scan across it for somewhere that is not a button, link or field
  const bar = await page.evaluate(([root, x]) => {
    const w = document.querySelector(root); const b = w.querySelector(x).parentElement; const r = b.getBoundingClientRect();
    const y = r.y + Math.min(r.height / 2, 14);
    for (let px = r.x + r.width - 120; px > r.x + 8; px -= 6) {
      const e = document.elementFromPoint(px, y);
      if (e && b.contains(e) && !e.closest("button, a, input, select, textarea")) return { x: px, y };
    }
    return null;
  }, [root, x]);
  const here = await rectOf(page, root);
  const fills = here.w >= vp.width && here.h >= vp.height;
  if (fills) console.log(`  SKIP  ${tag} drag: the window already fills the screen (a sheet), nothing to move`);
  else if (bar) {
    const before = await rectOf(page, root);
    // toward the free side, so a window that nearly fills the screen is not stopped by the edge
    const sx = before.x + before.w / 2 > vp.width / 2 ? -60 : 60, sy = before.y + before.h / 2 > vp.height / 2 ? -40 : 40;
    await page.mouse.move(bar.x, bar.y); await page.mouse.down(); await page.mouse.move(bar.x + sx, bar.y + sy, { steps: 6 }); await page.mouse.up();
    const after = await rectOf(page, root);
    check(`${tag} a drag by the top bar moves it`, Math.hypot(after.x - before.x, after.y - before.y) >= 20 && (after.x - before.x) * sx >= 0 && (after.y - before.y) * sy >= 0 && after.w === before.w && after.h === before.h, JSON.stringify({ before, after }));
  } else check(`${tag} a drag by the top bar moves it`, false, "no plain point on the bar");
  if (!handles) return;
  for (const h of ["n", "s", "e", "w", "ne", "nw", "se", "sw"]) {
    const r = await rectOf(page, root);
    const p = await page.evaluate(([root, h]) => { const e = document.querySelector(`${root} > .mm-h[data-h="${h}"], ${root} .mm-h[data-h="${h}"]`); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, [root, h]);
    if (!p) { check(`${tag} handle ${h} changes the size`, false, "no handle"); continue; }
    if (p.x < 0 || p.y < 0 || p.x > vp.width || p.y > vp.height) { console.log(`  SKIP  ${tag} handle ${h}: the window runs past the screen edge, its handle is off screen`); continue; }
    // the window has been grown down to the page's bottom strip (the Zab bar, drawn above a pop-up): its corner is under that bar
    if (await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest("#zabBar"), [p.x, p.y])) { console.log(`  SKIP  ${tag} handle ${h}: the page's Zab bar covers it (the window was grown down to the bottom strip)`); continue; }
    // grow where there is room, shrink where the window already touches the screen's edge
    const roomE = vp.width - (r.x + r.w) > 40, roomW = r.x > 40, roomS = vp.height - (r.y + r.h) > 40, roomN = r.y > 40;
    const dx = h.includes("e") ? (roomE ? 30 : -30) : h.includes("w") ? (roomW ? -30 : 30) : 0;
    const dy = h.includes("s") ? (roomS ? 30 : -30) : h.includes("n") ? (roomN ? -30 : 30) : 0;
    await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + dx, p.y + dy, { steps: 5 }); await page.mouse.up();
    const a = await rectOf(page, root);
    check(`${tag} handle ${h} changes the size`, a.w !== r.w || a.h !== r.h, JSON.stringify({ r, a }));
  }
}

async function openDuaPop(page) {
  await page.click("[data-dua-menu-toggle]").catch(() => {});
  await page.waitForSelector(".dua-menu-tabs button", { timeout: 10000 }).catch(() => {});
  await page.click('[data-dua-tab="study"]').catch(() => {});
  await page.waitForTimeout(200);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-dua-menu]")].find((x) => x.getClientRects().length); b?.click(); });
  await page.waitForSelector(".dua-popcard", { timeout: 8000 }).catch(() => {});
}

async function collapses(page, tag, root, barSel) {
  // the pop-up's veil covers the bar for a pointer, so the press is a dispatched click (the app listens in the capture phase)
  await page.evaluate((s) => document.querySelector(s).click(), barSel);
  await page.waitForTimeout(250);
  check(`${tag} a click on a module bar collapses it`, await page.evaluate((root) => { const r = document.querySelector(root); return !!document.querySelector("#mmColStack .mm-col-bar") && (!r || r.getClientRects().length === 0); }, root));
}

for (const [lang, width, height] of [["en", 1280, 900], ["bn", 1280, 900], ["en", 768, 900], ["en", 390, 844], ["bn", 390, 844], ["en", 320, 640]]) {
  const tagB = `[${lang} ${width}]`;
  console.log(`\n=== ${tagB} ===`);

  // ---- Hadith: the Hadith Word Card
  {
    const ctx = await context(lang, width, height);
    const { page } = await openPage(ctx, "/app/hadith-study.html?resume=hadith:hadeethenc:65070");
    await page.waitForSelector(".hwc-switch", { timeout: 25000 }).catch(() => {});
    await page.click(".hwc-switch").catch(() => {});
    await page.waitForSelector(".hwc-chip", { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => { const c = [...document.querySelectorAll(".hwc-chip")].find((b) => !b.matches("a")) ?? document.querySelector(".hwc-chip"); c?.click(); });
    await page.waitForSelector(".hwc-sheet", { timeout: 8000 }).catch(() => {});
    check(`${tagB} Hadith: the Word Card is open (positive control)`, !!(await rectOf(page, ".hwc-sheet")));
    await exercise(page, `${tagB} Hadith Word Card`, ".hwc-sheet", ".hwc-close");
    await ctx.close();
  }
  // ---- Dua: a Dua Card block as a pop-up
  {
    const ctx = await context(lang, width, height);
    const { page } = await openPage(ctx, "/app/dua-study.html?g=rasul&open=8");
    await page.waitForSelector("[data-dua-topbar]", { timeout: 25000 }).catch(() => {});
    await openDuaPop(page);
    check(`${tagB} Dua: the pop-up is open (positive control)`, !!(await rectOf(page, ".dua-popcard")));
    await exercise(page, `${tagB} Dua pop-up`, ".dua-popcard", ".dua-pop-close");
    await ctx.close();
  }
  // ---- Notes: the Note opener (it drags and resizes by itself; ⛶ and – are added)
  {
    const ctx = await context(lang, width, height);
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForTimeout(500);
    if (!(await page.evaluate(() => (document.getElementById("tabNoteBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(200); }
    await page.click("#tabNoteBtn");
    await page.waitForSelector("#noteOpener:not([hidden])", { timeout: 8000 }).catch(() => {});
    check(`${tagB} Notes: the Note opener is open (positive control)`, !!(await rectOf(page, "#noteOpener")));
    await exercise(page, `${tagB} Note opener`, "#noteOpener", ".no-close", { handles: false });
    await ctx.close();
  }
  // ---- Dua (part 4): a tapped word's card, the Dua word pop-up
  {
    const ctx = await context(lang, width, height);
    const { page } = await openPage(ctx, "/app/hadith-collections.html?back=1");
    await hadithGo(page, "dua");
    const W = '[data-dua-card="1"] [data-dua-word="1"]';
    await page.waitForSelector(W, { timeout: 25000 }).catch(() => {});
    await page.evaluate((w) => document.querySelector(w)?.scrollIntoView({ block: "center" }), W);
    await page.click(W).catch(() => {});
    await page.waitForSelector(".dua-word-pop > .dua-word-panel .dua-word-panel-close", { timeout: 8000 }).catch(() => {});
    check(`${tagB} Dua word: the pop-up is open (positive control)`, !!(await rectOf(page, ".dua-word-pop > .dua-word-panel")));
    await exercise(page, `${tagB} Dua word pop-up`, ".dua-word-pop > .dua-word-panel", ".dua-word-panel-close");
    await ctx.close();
  }
  // ---- Mapping My Journey (part 4): the folder dialogs (the Note's Folders… picker)
  {
    const ctx = await context(lang, width, height, JOURNEY_SEED);
    await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fB"])); } catch {} });
    const { page } = await openPage(ctx, "/app/journey-map.html#folders");
    await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 3, null, { timeout: 20000 }).catch(() => {});
    await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]').catch(() => {});
    await page.waitForSelector("#folderNotes [data-fn-title]", { state: "visible", timeout: 8000 }).catch(() => {});
    await page.click('#folderNotes [data-note-id="n1"] [data-note-open]').catch(() => {});
    await page.waitForSelector("[data-pane-title]", { state: "visible", timeout: 8000 }).catch(() => {});
    await page.click("[data-pane-menu-btn]:visible").catch(() => {});
    await page.click("[data-pane-menu] [data-pane-copy]").catch(() => {});
    await page.waitForSelector("#folderPicker .folder-picker", { state: "visible", timeout: 8000 }).catch(() => {});
    check(`${tagB} Mapping My Journey: the folder dialog is open (positive control)`, !!(await rectOf(page, "#folderPicker .folder-picker")));
    await exercise(page, `${tagB} Folder dialog`, "#folderPicker .folder-picker", ".fp-close");
    // ✕ closes it by the dialog's own Cancel / Done
    await page.click("#folderPicker .folder-picker .fp-close").catch(() => {});
    await page.waitForTimeout(200);
    check(`${tagB} Folder dialog: ✕ closes it`, (await page.locator("#folderPicker").count()) === 0);
    await ctx.close();
  }
  // ---- Quran Study (part 4, frozen: an entry and a ✕): Explore's Take an Approach
  {
    const ctx = await context(lang, width, height);
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.click("#tabExploreBtn").catch(() => {});
    await page.waitForFunction(() => !!document.querySelector("#exploreWheelContainer svg"), null, { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((el) => el.remove()));
    await page.evaluate(() => { const s = [...document.querySelectorAll("#exploreWheelContainer .wheel-seg")].find((x) => x.dataset.key === "81" && (!x.dataset.ringKind || x.dataset.ringKind === "surah")); s?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await page.waitForFunction(() => !!document.querySelector(".aa-wheel, #exploreModeRow button"), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.click('.aa-hit[data-key="2"]').catch(() => {});
    await page.waitForTimeout(350);
    await page.click('[data-aa-row="act"] .aa-take').catch(() => {});
    await page.waitForSelector(".aa-sheet[data-aa-sheet]", { timeout: 8000 }).catch(() => {});
    check(`${tagB} Quran Study: Take an Approach is open (positive control)`, !!(await rectOf(page, ".aa-sheet[data-aa-sheet]")));
    await exercise(page, `${tagB} Take an Approach`, ".aa-sheet[data-aa-sheet]", ".aa-x");
    await page.click(".aa-sheet .aa-x").catch(() => {});
    await page.waitForTimeout(200);
    check(`${tagB} Take an Approach: ✕ closes it`, (await page.locator(".aa-sheet").count()) === 0);
    await ctx.close();
  }
  // ---- Quran Study: the Learn next sheet (entered in part 2) and a click on a module bar
  {
    const ctx = await context(lang, width, height);
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForTimeout(500);
    if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
    await page.click("#tabReadBtn"); await page.waitForTimeout(400);
    await page.evaluate(() => document.getElementById("tabVocabularyBtn")?.click());
    await page.waitForFunction(() => { const s = document.getElementById("learnNextSheet"); return s && !s.hidden && s.querySelectorAll(".ln-row").length > 0; }, null, { timeout: 15000 }).catch(() => {});
    check(`${tagB} Quran Study: Learn next is open (positive control)`, !!(await rectOf(page, "#learnNextSheet:not([hidden])")));
    await exercise(page, `${tagB} Learn next`, "#learnNextSheet", ".ln-close");
    await ctx.close();
  }

  // ---- part 5 (Quran Study, FROZEN: entries and ✕ only): the pop-ups the Āyah card opens
  for (const [key, tag, root, x, tile, ready] of [
    ["copy", "Copy āyāt", ".ayah-copy-dlg > .ayah-copy-box", ".ayah-copy-x", "[data-ayah-sheet-copy]", ".ayah-copy-dlg > .ayah-copy-box .ayah-copy-x"],
    ["nv", "Āyah view", "#ayahNoteViewPopup > .ayah-nv-box", ".ayah-nv-x", "[data-ayah-sheet-noteview]", "#ayahNoteViewPopup > .ayah-nv-box .ayah-nv-x"],
    ["qcr", "QCR pop-up", ".qcr-pop > .qcr-pop-box", ".qcr-pop-x", "[data-ayah-sheet-qcr]", ".qcr-pop > .qcr-pop-box .qcr-pop-x"],
    ["filing", "File in folders", "#ayahFolderFilingOverlay > #ayahFolderFilingCard", ".ayah-folder-filing-x", "[data-ayah-sheet-file-folder]", "#ayahFolderFilingOverlay.open #ayahFolderFilingCard .ayah-folder-filing-x"],
  ]) {
    if (key === "nv" && width >= 1000) { console.log(`  SKIP  ${tagB} ${tag}: on a computer 📖 widens the Āyah card's own pane (J70) and opens no pop-up`); continue; }
    const ctx = await context(lang, width, height);
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    await page.waitForTimeout(500);
    if (!(await page.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
    await page.click("#tabReadBtn"); await page.waitForTimeout(400);
    await page.evaluate(() => { const s = document.getElementById("surahSelect"); if (s.value !== "22") { s.value = "22"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
    await page.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:22:"]'), null, { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "3"; el.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.waitForFunction(() => document.querySelector('[data-ayah-num-badge="22:3"]'), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.evaluate(() => { document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()); document.querySelector('[data-ayah-num-badge="22:3"]')?.click(); });
    await page.waitForSelector("[data-ayah-sheet] .ayah-sheet-ref", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);
    await page.evaluate(() => { const b = document.querySelector("[data-ayah-sheet-more]"); if (b && b.getAttribute("aria-expanded") !== "true") b.click(); });
    await page.waitForTimeout(200);
    await page.evaluate((t) => document.querySelector(`[data-ayah-sheet] ${t}`)?.click(), tile);
    await page.waitForSelector(ready, { timeout: 8000 }).catch(() => {});
    check(`${tagB} ${tag} is open (positive control)`, !!(await rectOf(page, root)));
    await exercise(page, `${tagB} ${tag}`, root, x);
    await page.click(`${root} ${x}`).catch(() => {});
    await page.waitForTimeout(300);
    check(`${tagB} ${tag}: ✕ closes it`, await page.evaluate((root) => { const e = document.querySelector(root); return !e || e.getClientRects().length === 0; }, root));
    await ctx.close();
  }

  // ---- part 5: the Zab panel (zab-bar.js is NOT changed)
  {
    const ctx = await context(lang, width, height);
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForSelector("#zabRoot", { state: "attached", timeout: 15000 }).catch(() => {});
    await page.evaluate(() => { document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()); [...document.querySelectorAll("[data-zab-open]")].find((b) => b.getClientRects().length)?.click(); });
    await page.waitForSelector("#zabPanel:not([hidden]) .zab-head [data-zab-close]", { timeout: 8000 }).catch(() => {});
    check(`${tagB} Zab panel is open (positive control)`, !!(await rectOf(page, "#zabPanel:not([hidden])")));
    await exercise(page, `${tagB} Zab panel`, "#zabPanel", ".zab-head [data-zab-close]");
    await page.click("#zabPanel .zab-head [data-zab-close]").catch(() => {});
    await page.waitForTimeout(250);
    check(`${tagB} Zab panel: ✕ closes it`, await page.evaluate(() => document.getElementById("zabPanel")?.hidden === true));
    await ctx.close();
  }

  // ---- part 5: the Quran Word Card (a window from 900px; a full-screen sheet below)
  if (width >= 900) {
    const ctx = await context(lang, width, height);
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    await page.waitForTimeout(500);
    if (!(await page.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
    await page.click("#tabReadBtn"); await page.waitForTimeout(400);
    await page.waitForFunction(() => document.querySelector('#readView [data-word-occurrence]'), null, { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => document.querySelector('#readView [data-word-occurrence]')?.click());
    await page.waitForSelector("#quranWordCardMount:not([hidden]) [data-word-card-close]", { timeout: 8000 }).catch(() => {});
    check(`${tagB} Quran Word Card is open (positive control)`, !!(await rectOf(page, "#quranWordCardMount:not([hidden])")));
    await exercise(page, `${tagB} Quran Word Card`, "#quranWordCardMount", "[data-word-card-close]", { handles: false }); // it keeps its own drag and its own eight handles (initPopupWindow)
    // Observed, not asserted: once a word is open the mount holds only .word-card-content (its eight [data-note-resize] handles from the
    // static markup are no longer children of it). That is how main already behaves; recorded in the PR as a finding.
    console.log(`  NOTE  ${tagB} Quran Word Card own resize handles present: ${await page.locator("#quranWordCardMount [data-note-resize]").count()} of 8`);
    await ctx.close();
  }
}

// ---- a click on a module bar collapses the open pop-up (Hadith's bar, Dua's bar)
{
  const ctx = await context("en", 1280, 900);
  const { page } = await openPage(ctx, "/app/dua-study.html?g=rasul&open=8");
  await page.waitForSelector("[data-dua-topbar]", { timeout: 25000 }).catch(() => {});
  await openDuaPop(page);
  const bar = await page.evaluate(() => { const b = document.querySelector("#duaRoot [role='tablist'] button, #duaRoot nav button"); if (!b) return null; b.dataset.mmProbe = "1"; return "[data-mm-probe]"; });
  check(`[en 1280] Dua: a module-bar button exists (positive control)`, !!bar);
  if (bar) await collapses(page, "[en 1280] Dua pop-up", ".dua-popcard", bar);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

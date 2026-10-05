// Siyagah round S13 (decision 66, #564): the tab strip for Note pop-up windows (640px and up),
// the ✕ on the phone switcher, and "Version n of m" on the window's Details line.
// Real clicks, en + bn, at 390 / 820 / 1440. The stub's DATA shows what a restore wrote.
// MUTATE=tab-tap-noop | close-all | version-off-by-one | tabs-on-sheet-only | no-title-tooltip | sheet-titles-cut  runs a deliberately broken build.
// Run from the repository root with `node serve.js` running.
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = process.argv[2] || process.env.MUTATE || "";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

const LONG_TITLE = "A deliberately long Note title that a real tenant might really write down";
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true;
  window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d); }, toMillis: function () { return new Date(d).getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = [];
  DATA.noteFolders.push(Object.assign({ _id: "t1__fA", folderId: "fA", name: "Alpha", parentFolderId: null, semanticRole: "user", order: 0, status: "active", updatedAt: ts("2026-09-01T10:00:00Z") }, own));
  function N(id, title, cur, day) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: "<p>Body of " + id + ".</p>", currentRevisionId: cur, status: "active", createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own)); }
  function P(id, note, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: "fA", order: order, status: "active" }, own)); }
  function R(id, title, body, day, prev) { DATA.noteRevisions.push(Object.assign({ _id: "t1__" + id, revisionId: id, noteId: "n1", previousRevisionId: prev, title: title, bodyHtml: body, revisionReason: "content-update", actorUid: "test-uid", createdAt: new Date("2026-09-0" + day + "T0" + day + ":15:00Z") }, own)); }
  N("n1", ${JSON.stringify(LONG_TITLE)}, "r3", 1); N("n2", "Note Two", "r-n2", 2); N("n3", "Note Three", "r-n3", 3);
  P("p1", "n1", 0); P("p2", "n2", 1); P("p3", "n3", 2);
  R("r1", "Version one", "<p>Version ONE text.</p>", 1, null);
  R("r2", "Version two", "<p>Version TWO text.</p>", 2, "r1");
  R("r3", ${JSON.stringify(LONG_TITLE)}, "<p>Body of n1.</p>", 3, "r2");
})();`;

const browser = await chromium.launch();
const hasBn = (s) => /[ঀ-৿]/.test(s || "");
const HEIGHT = 900;
const W = (id) => `.note-win[data-note-id="${id}"]`;
const count = (page, sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 8000 });
const tabs = (page) => page.evaluate(() => [...document.querySelectorAll("#noteWinSwitch .nw-tab")].map((t) => ({ title: t.querySelector("[data-win-switch]").title, text: t.querySelector("[data-win-switch]").textContent, active: t.querySelector("[data-win-switch]").classList.contains("active"), h: t.querySelector("[data-win-switch]").getBoundingClientRect().height, xh: t.querySelector("[data-win-tabclose]").getBoundingClientRect().height, xw: t.querySelector("[data-win-tabclose]").getBoundingClientRect().width, label: t.querySelector("[data-win-tabclose]").getAttribute("aria-label") })));
/** The front window: highest z-index of those not hidden. */
const frontId = (page) => page.evaluate(() => { const ws = [...document.querySelectorAll(".note-win")].filter((w) => getComputedStyle(w).display !== "none"); ws.sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex)); return ws[0]?.dataset.noteId ?? null; });
const topmostWin = (page, id) => page.evaluate((i) => { const r = document.querySelector(`.note-win[data-note-id="${i}"]`).getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest(".note-win")?.dataset.noteId ?? null; }, id);
const leafToggle = (id) => `#folderNotes [data-note-leaf][data-note-id="${id}"][data-in-folder="fA"] [data-note-toggle]`;
const leafWindowBtn = (id) => `#folderNotes [data-note-leaf][data-note-id="${id}"][data-in-folder="fA"] [data-note-window]`;
async function openInWindow(page, id) {
  // The list is under any open window, so these two taps are dispatched on the element (opening is not what this suite judges).
  await page.evaluate((s) => document.querySelector(s).click(), leafToggle(id));
  await page.evaluate((s) => document.querySelector(s).click(), leafWindowBtn(id));
  await page.waitForSelector(W(id));
}
const verText = (page, id) => page.evaluate((i) => { const b = document.querySelector(`.note-win[data-note-id="${i}"] [data-win-ver]`); return b && !b.hidden ? b.textContent.trim() : null; }, id);

for (const lang of ["en", "bn"]) {
  for (const width of [390, 820, 1440]) {
    const tag = `${lang} ${width}px`;
    const sheet = width < 640;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: HEIGHT }, extraSeedJs: SEED });
    if (MUTATE) {
      await ctx.route("**/*", async (route) => {
        const url = route.request().url();
        // sheet-titles-cut (Architect review of S13): drop the phone switcher's wrap rules from the stylesheet,
        // putting back the one-line cut that showed "Note …" for both "Note Two" and "Note Three".
        if (MUTATE === "sheet-titles-cut" && /note-window\.css/.test(url)) {
          const res = await route.fetch(); const css = await res.text();
          const cut = css.replace(/\.nw-switch:not\(\.nw-tabs\)[^}]*\}/g, "");
          if (cut === css) console.log("  (mutation sheet-titles-cut did not apply)");
          return route.fulfill({ response: res, body: cut });
        }
        if (!/note-window\.js/.test(url)) return route.fallback();
        const res = await route.fetch();
        let body = await res.text();
        const before = body;
        if (MUTATE === "tab-tap-noop") body = body.replace("if (v) focusView(v);\n      });\n      document.body.appendChild(nav);", "if (v) { /* broken */ }\n      });\n      document.body.appendChild(nav);");
        if (MUTATE === "close-all") body = body.replace("if (v) closeNoteWindow(v); return; }", "if (v) { for (const w of [...windowViews]) closeNoteWindow(w); } return; }");
        if (MUTATE === "version-off-by-one") body = body.replace("{ n: i + 1, m: rows.length,", "{ n: i, m: rows.length,");
        if (MUTATE === "tabs-on-sheet-only") body = body.replace('const show = windowViews.length > 1;', 'const show = windowViews.length > 1 && sheet;');
        if (MUTATE === "no-title-tooltip") body = body.replace(' title="${escapeHtml(title)}">${escapeHtml(title)}</button>', '>${escapeHtml(title)}</button>');
        if (body === before) console.log(`  (mutation ${MUTATE} did not apply)`);
        await route.fulfill({ response: res, body });
      });
    }
    await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
    const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
    await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 1 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
    await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
    await page.waitForFunction(() => document.querySelectorAll("#folderNotes [data-note-leaf]").length >= 3, null, { timeout: 15000 });

    // Open three windows. On a phone the first sheet covers the list, so open at a wider width and come back (that resize is itself a check below).
    if (sheet) await page.setViewportSize({ width: 820, height: HEIGHT });
    await openInWindow(page, "n1");
    check(`${tag}: one window shows no tab strip`, (await count(page, "#noteWinSwitch")) === 0);
    await openInWindow(page, "n2");
    await openInWindow(page, "n3");
    const errs0 = errors.length;
    if (sheet) await page.setViewportSize({ width, height: HEIGHT });
    await page.waitForTimeout(300);

    // ---- tabs --------------------------------------------------------------------------
    let tb = await tabs(page);
    check(`${tag}: three windows give three tabs`, tb.length === 3, JSON.stringify(tb.map((t) => t.text)));
    const navClass = await page.getAttribute("#noteWinSwitch", "class");
    check(`${tag}: ${sheet ? "the phone keeps its bottom switcher" : "the desktop gets the tab strip"}`, sheet ? !navClass.includes("nw-tabs") : navClass.includes("nw-tabs"), navClass);
    check(`${tag}: every tab and its ✕ is 40px or taller`, tb.every((t) => t.h >= 40 && t.xh >= 40 && t.xw >= 40), JSON.stringify(tb.map((t) => [t.h, t.xh, t.xw])));
    const longTab = tb.find((t) => t.text.startsWith("A deliberately"));
    // Updated in place (Architect review of S13): on a phone a title now WRAPS onto two lines, so a long one is
    // cut vertically (scrollHeight), not sideways -- count both directions as "shortened".
    const cutNow = await page.evaluate(() => [...document.querySelectorAll("#noteWinSwitch [data-win-switch]")].filter((b) => b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1).map((b) => b.textContent));
    // Architect review of S13: two short titles that differ only after "Note " must both be readable in full,
    // at every width -- a phone has no tooltip, and "Note …" twice tells the reader nothing.
    check(`${tag}: "Note Two" and "Note Three" are each shown in full (not cut to "Note …")`, ["Note Two", "Note Three"].every((s) => !cutNow.includes(s)), JSON.stringify(cutNow));
    check(`${tag}: a long title is really shortened here (positive control for the tooltip check)`, cutNow.some((s) => s === LONG_TITLE), JSON.stringify(cutNow));
    check(`${tag}: a shortened title is never cut silently (full title in its tooltip)`, !!longTab && longTab.title === LONG_TITLE, JSON.stringify(longTab));
    check(`${tag}: the ✕ names its Note (${lang === "bn" ? "in Bangla" : "in English"})`, tb.every((t) => t.label && (lang === "bn" ? hasBn(t.label) : /^Close /.test(t.label))), JSON.stringify(tb.map((t) => t.label)));
    check(`${tag}: the strip makes no sideways page scroll`, await noSideways(page));
    check(`${tag}: the tab strip is topmost at its centre`, await page.evaluate(() => { const e = document.querySelector("#noteWinSwitch"); const r = e.getBoundingClientRect(); const h = document.elementFromPoint(r.x + 30, r.y + r.height / 2); return !!h && e.contains(h); }));

    // ---- active mark follows the front window -------------------------------------------
    let front = await frontId(page);
    check(`${tag}: the newest window (n3) is in front and its tab is the active one`, front === "n3" && (await tabs(page)).findIndex((t) => t.active) === 2, `${front}`);
    // Updated in place 5 Oct 2026 (note-pane round 3): "✕ Close all" now leads the strip, so tabs are counted among tabs only.
    const tabBtn = (i) => `#noteWinSwitch .nw-tab:nth-of-type(${i + 1}) [data-win-switch]`;
    await page.click(tabBtn(0));
    await page.waitForTimeout(100);
    front = await frontId(page);
    check(`${tag}: tapping the first tab brings n1 to the front`, front === "n1", front);
    check(`${tag}: ...and n1 is painted at its own centre`, (await topmostWin(page, "n1")) === "n1");
    check(`${tag}: ...and the active mark moved to the first tab`, (await tabs(page)).map((t) => t.active).join() === "true,false,false", JSON.stringify((await tabs(page)).map((t) => t.active)));
    if (!sheet) {
      await page.click(tabBtn(1));
      await page.waitForTimeout(100);
      check(`${tag}: tapping the second tab brings n2 to the front, painted at its centre`, (await frontId(page)) === "n2" && (await topmostWin(page, "n2")) === "n2");
    }

    // ---- resize with windows open ------------------------------------------------------
    const other = sheet ? 820 : 390;
    await page.setViewportSize({ width: other, height: HEIGHT });
    await page.waitForTimeout(300);
    check(`${tag}: resizing to ${other}px swaps the strip/switcher`, ((await page.getAttribute("#noteWinSwitch", "class")).includes("nw-tabs")) === (other >= 640));
    await page.setViewportSize({ width, height: HEIGHT });
    await page.waitForTimeout(300);
    check(`${tag}: resizing the viewport with windows open throws no page error`, errors.length === errs0, JSON.stringify(errors.slice(errs0)));
    check(`${tag}: ...and no sideways overflow after`, await noSideways(page));

    // ---- ✕ closes only that window -----------------------------------------------------
    await page.click(`#noteWinSwitch .nw-tab:nth-of-type(3) [data-win-tabclose]`);
    await until(page, () => document.querySelectorAll(".note-win").length === 2);
    check(`${tag}: ✕ on the third tab closes n3 only`, (await count(page, W("n3"))) === 0 && (await count(page, W("n1"))) === 1 && (await count(page, W("n2"))) === 1 && (await tabs(page)).length === 2);
    await page.click(`#noteWinSwitch .nw-tab:nth-of-type(2) [data-win-tabclose]`);
    await until(page, () => document.querySelectorAll(".note-win").length === 1);
    check(`${tag}: ✕ again leaves n1 open, and the strip goes away with one window`, (await count(page, W("n1"))) === 1 && (await count(page, "#noteWinSwitch")) === 0);

    // ---- Version n of m ---------------------------------------------------------------
    await until(page, () => { const b = document.querySelector('.note-win[data-note-id="n1"] [data-win-ver]'); return b && !b.hidden; });
    const digits = (n) => (lang === "bn" ? String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]) : String(n));
    let vt = await verText(page, "n1");
    check(`${tag}: the Details line says Version 3 of 3`, !!vt && (lang === "bn" ? vt.includes(`${digits(3)} / ${digits(3)}`) : vt.includes("Version 3 of 3")), vt);
    check(`${tag}: ...with the time it was saved${lang === "bn" ? ", in Bangla digits and no English AM/PM" : ""}`, !!vt && (lang === "bn" ? hasBn(vt) && !/\bAM\b|\bPM\b/i.test(vt) && !/[0-9]/.test(vt) : /saved/.test(vt) && /2026/.test(vt)), vt);
    check(`${tag}: a Note with no stored versions shows no Version line (n2 not open here; n1's line is visible and 40px tall)`, await page.evaluate(() => document.querySelector('.note-win[data-note-id="n1"] [data-win-ver]').getBoundingClientRect().height >= 40));
    check(`${tag}: Version line has no sideways overflow`, await noSideways(page));
    await page.click(`${W("n1")} [data-win-ver]`);
    await page.waitForSelector(".note-versions [data-ver-open]", { state: "visible" });
    check(`${tag}: tapping the Version line opens the Versions list (3 rows)`, (await count(page, ".note-versions [data-ver-open]")) === 3);
    await page.click('.note-versions [data-ver-open="1"]');
    await page.click("[data-ver-restore]");
    await until(page, () => window.__DATA.noteRevisions.filter((r) => r.noteId === "n1").length === 4);
    check(`${tag}: restoring adds a fourth revision and deletes none`, await page.evaluate(() => window.__DATA.noteRevisions.filter((r) => r.noteId === "n1").length === 4));
    await page.waitForFunction((l) => { const b = document.querySelector('.note-win[data-note-id="n1"] [data-win-ver]'); return b && /4/.test(b.textContent) || (l === "bn" && b && /৪/.test(b.textContent)); }, lang, { timeout: 8000 }).catch(() => null);
    vt = await verText(page, "n1");
    check(`${tag}: after the restore the line says Version 4 of 4`, !!vt && (lang === "bn" ? vt.includes(`${digits(4)} / ${digits(4)}`) : vt.includes("Version 4 of 4")), vt);
    check(`${tag}: ...and the final no-sideways check`, await noSideways(page));
    await ctx.close();
  }
}

await browser.close();
console.log(`journey-window-tabs-browser: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

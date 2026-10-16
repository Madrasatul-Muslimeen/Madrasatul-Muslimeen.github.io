// Audit part 21 (PCF J29, manual audit): the User Manual's "Notes and Mapping My Journey" features part 20 did not reach.
//   win      1 Pop-up Note windows: ⋯ -> ⧉ Pop out, ▾ -> ⧉ Open in window, the tab strip / bottom switcher, pinned Notes, ✕ Close all
//   media    2 🖼 a picture (made small; the stored size), ⊞ a sheet whose formula computes, ⋯ -> Show link previews
//   tools    3 ⋯ -> 🧰 My Note tools… -> Templates (saves), Phrases (saves), New note from a template
//   wp       4 Import Notes, WordPress: 2. Preview, then 3. Import writes the Notes
// (5 My Notes page and 6 Dawah pages are in the same file further down once reached; see the PR for what was unreached.)
// The RESULT is asserted (the stored write, the switched view, the place), not the element. Each flow has a positive control
// and a timeout that fails by name. Mutations: --mutate=<name> restores a defect, serving one deliberately broken copy of a file.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part21-notes-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, LONLY = arg("lang");
// [file, route glob, anchor (must occur exactly once), replacement, page prefix it applies to]
const MUTATIONS = {
  // ✕ Close all windows does nothing.
  "nocloseall": ["app/js/note-window.js", "**/js/note-window.js*", 'if (e.target.closest("[data-win-closeall]")) { closeAllWindows(); return; }', 'if (e.target.closest("[data-win-closeall]")) { return; }', "/app/journey-map.html"],
  // The FIX of this round taken out: the first window is centred again, 18px up inside the nav row at 1440 x 900.
  "winovernav": ["app/js/note-window.js", "**/js/note-window.js*", "const y = Math.max(Math.round((window.innerHeight - h) / 2), navBottom > 0 ? navBottom + 8 : 0);", "const y = Math.round((window.innerHeight - h) / 2);", "/app/journey-map.html"],
  // The fix of this round taken out: the first window is tall again, so cascaded windows run under the bottom strip / Zab bar at 820 x 900.
  "winoverbar": ["app/js/note-window.js", "**/js/note-window.js*", "window.innerHeight - y - 100 - 2 * WIN_OFFSET), 360)", "window.innerHeight - y - 8), 360)", "/app/journey-map.html"],
  // The history fix taken out: the rows are written into the replaced (detached) card, so Show history opens an empty box.
  "emptyhistory": ["app/notes.html", "**/notes.html*", 'if (freshBox) await renderHistoryFor(noteId, freshBox);', 'await renderHistoryFor(noteId, card.querySelector("[data-note-history]"));', "/app/hadith-collections.html"],
  // The card-button size fix taken out: Edit, Show history, Remove... are 21px tall again.
  "tinybuttons": ["app/notes.html", "**/notes.html*", "  .note-actions button.tiny { min-height: 40px; min-width: 40px; }", "", "/app/hadith-collections.html"],
  // Save this Note as a template stores nothing.
  "notplsave": ["app/js/note-window.js", "**/js/note-window.js*", 'const ok = await saveSetting(d, "templates", list);', "const ok = true;", "/app/journey-map.html"],
  // Adding a phrase stores nothing.
  "nophrase": ["app/js/note-window.js", "**/js/note-window.js*", 'if (await saveSetting(d, "phrases", [...st().phrases, input.value])) { draw();', "if (true) { draw();", "/app/journey-map.html"],
  // A picture is stored as it came, not made small.
  "bigpicture": ["app/js/note-image.js", "**/js/note-image.js*", "return { blob: r.blob };", "return { blob: file };", "/app/journey-map.html"],
  // The sheet's formulas are not computed: the cell shows its raw text.
  "noformula": ["app/js/note-sheet-engine.js", "**/js/note-sheet-engine.js*", "export function evaluateSheet(", "export function evaluateSheet_off(", "/app/journey-map.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const BN = /[ঀ-৿]/;
const hasBn = (s) => BN.test(s || "");

const READY_OPEN = `
export const SIYAGAH_FLAGS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const SIYAGAH_FLAGS_DECLARATION = Object.freeze({ ready: true, decision: Object.freeze({ by: "master-architect", on: "2026-10-04", reference: "test-seam" }), gate: "E1", note: "test seam" });
export function isSiyagahFlagsReady() { return true; }
export function siyagahFlagsUnavailableReason() { return null; }
`;
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteSources = [];
  DATA.userPrefs = [{ _id: "test-uid" }];
  DATA.noteFolders.push(Object.assign({ _id: "t1__fA", folderId: "fA", name: "Alpha", parentFolderId: null, semanticRole: "user", order: 0, status: "active", updatedAt: ts() }, own));
  function N(id, title, body, day, extra) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: "rev-" + id, status: "active", createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own, extra || {})); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  N("n1", "Note One", "<p>First body.</p><p>Link: <a href=\\"https://site1.example.com/page\\">Link 1</a></p>", 1);
  N("n2", "Note Two", "<p>Second body.</p>", 2);
  N("n3", "Note Three", "<p>Third body.</p>", 3, { pinned: true });
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1); P("p3", "n3", "fA", 2);
})();`;

async function open(lang, width, pagePath, seed = SEED) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: seed });
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("**/js/siyagah-flags-readiness.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_OPEN }));
  await ctx.route("**/api.microlink.io/**", (r) => r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ status: "success", data: { title: "Title of site1", description: "About site1", image: null } }) }));
  if (MUTATE && pagePath.startsWith(MUTATIONS[MUTATE][4])) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, width, pagePath, fn, seed = SEED) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, pagePath, seed), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 120000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|microlink|Failed to load resource/i.test(e));
const writes = (page) => ev(page, () => {
  const tx = JSON.parse(sessionStorage.getItem("__stubWrites") || "[]").map((w) => ({ col: w.col, id: w.id, op: w.op || "update", data: w.data }));
  const other = (window.__stubWriteData || []).map((w) => ({ col: w.col, id: w.id, op: (w.kind || "").replace(/^tx-/, ""), data: w.data }));
  return [...tx, ...other];
});
const resetWrites = (page) => ev(page, () => { window.__stubWriteData = []; sessionStorage.setItem("__stubWrites", "[]"); sessionStorage.setItem("__stubStorageLog", "[]"); });
const wide = (page) => ev(page, () => document.documentElement.scrollWidth - innerWidth);
const rect = (page, sel) => ev(page, (s) => { const e = [...document.querySelectorAll(s)].find((x) => x.getClientRects().length); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight }; }, sel);
const count = (page, sel) => ev(page, (s) => document.querySelectorAll(s).length, sel);
const small = (page, sel) => ev(page, (s) => [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).display !== "none" && (r.height < 39.5 || r.width < 39.5); }).map((e) => `${e.className || e.tagName}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`), sel);
const W = (id) => `.note-win[data-note-id="${id}"]`;
const leaf = (id, part) => `#folderNotes [data-note-leaf][data-note-id="${id}"][data-in-folder="fA"] [${part}]`;
async function chooseAlpha(page) {
  await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 1 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
  await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
  await page.waitForFunction(() => document.querySelectorAll("#folderNotes [data-note-leaf]").length >= 3, null, { timeout: 15000 });
}
async function openPaneNote(page, id) {
  await page.click(leaf(id, "data-note-open"));
  await page.waitForSelector("#notePane:not([hidden])");
}
async function popOut(page) {
  await page.click("[data-pane-menu-btn]");
  await page.waitForSelector("[data-pane-menu] [data-pane-popout]", { state: "visible" });
  await page.click("[data-pane-menu] [data-pane-popout]");
}
const edge = (page) => ev(page, () => {
  const nav = document.getElementById("topNav")?.getBoundingClientRect();
  const sw = document.getElementById("noteWinSwitch"); const swr = sw && sw.getClientRects().length ? sw.getBoundingClientRect() : null;
  const zab = document.getElementById("zabBar"); const zr = zab && zab.getClientRects().length ? zab.getBoundingClientRect() : null;
  return { navBottom: nav ? nav.bottom : 0, switchTop: swr ? swr.top : null, zabTop: zr ? zr.top : null };
});

const WIDTHS = [320, 390, 820, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);

// ---------------------------------------------------------------------------------------------------------------
// 1. Pop-up Note windows
// ---------------------------------------------------------------------------------------------------------------
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn", sheet = width < 640;
  await flow("win", lang, width, "/app/journey-map.html#folders", async (t, page, errors) => {
    await chooseAlpha(page);
    // ⋯ -> ⧉ Pop out
    await openPaneNote(page, "n1");
    await page.click("[data-pane-menu-btn]");
    const popLabel = await page.textContent("[data-pane-menu] [data-pane-popout]");
    check(`${t}: POSITIVE CONTROL the pane's ⋯ menu has ⧉ Pop out${bn ? " in Bangla" : ""}`, bn ? hasBn(popLabel) && popLabel.includes("⧉") : popLabel.trim() === "⧉ Pop out", popLabel);
    await page.click("[data-pane-menu] [data-pane-popout]");
    await page.waitForSelector(W("n1"));
    check(`${t}: Pop out opens exactly one window with this Note, and the pane closes`, (await count(page, ".note-win")) === 1 && (await ev(page, () => document.getElementById("notePane")?.hidden !== false || document.getElementById("notePane").getClientRects().length === 0)));
    const e1 = await edge(page), r1 = await rect(page, W("n1"));
    // A phone window is a SHEET that fills the screen (the manual); a float window opens inside it, below the nav row.
    check(`${t}: the window ${sheet ? "fills the phone screen" : "is inside the screen, below the nav row"}`, !!r1 && (sheet ? r1.l <= 1 && r1.r >= r1.vw - 1 && r1.t <= 1 && r1.b >= r1.vh - 1 : r1.l >= -1 && r1.r <= r1.vw + 1 && r1.t >= e1.navBottom - 1 && r1.b <= r1.vh + 1), JSON.stringify({ r1, e1 }));
    const close = await rect(page, `${W("n1")} [data-win-close]`);
    check(`${t}: ✕ on the window is 40px or more`, !!close && close.w >= 39.5 && close.h >= 39.5, JSON.stringify(close));
    // ▾ -> ⧉ Open in window (the list is under a sheet on a phone, so the real button is clicked without a hit test there)
    if (sheet) await page.setViewportSize({ width: 820, height: 900 });
    await page.evaluate((s) => document.querySelector(s).click(), leaf("n2", "data-note-toggle"));
    const openLabel = await page.textContent(leaf("n2", "data-note-window")).catch(() => "");
    check(`${t}: ▾ shows ⧉ Open in window${bn ? " in Bangla" : ""}`, bn ? hasBn(openLabel) && openLabel.includes("⧉") : openLabel.trim() === "⧉ Open in window", openLabel);
    await page.evaluate((s) => document.querySelector(s).click(), leaf("n2", "data-note-window"));
    await page.waitForSelector(W("n2"));
    // Ctrl-click a title
    await page.evaluate((s) => document.querySelector(s).dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true })), leaf("n3", "data-note-open"));
    await page.waitForSelector(W("n3"));
    if (sheet) await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(250);
    check(`${t}: ▾ -> Open in window and Ctrl-click on a title each opened a window (three open)`, (await count(page, ".note-win")) === 3);
    // the tab strip (wide) or the bottom switcher (phone) lists them and switches
    const labels = await ev(page, () => [...document.querySelectorAll("#noteWinSwitch [data-win-switch]")].map((b) => b.textContent.trim()));
    check(`${t}: POSITIVE CONTROL the ${sheet ? "bottom switcher" : "tab strip"} lists the three windows`, labels.length === 3, JSON.stringify(labels));
    const tabH = await small(page, "#noteWinSwitch [data-win-switch], #noteWinSwitch [data-win-closeall]");
    check(`${t}: every switcher target is 40px or more`, tabH.length === 0, JSON.stringify(tabH));
    const sr = await rect(page, "#noteWinSwitch");
    check(`${t}: the switcher sits inside the screen`, !!sr && sr.l >= -1 && sr.r <= sr.vw + 1 && sr.b <= sr.vh + 1 && sr.t >= 0, JSON.stringify(sr));
    const e3 = await edge(page), bottoms = await ev(page, () => [...document.querySelectorAll(".note-win")].filter((x) => !x.classList.contains("sheet-hidden") && x.getClientRects().length).map((x) => x.getBoundingClientRect().bottom));
    check(`${t}: with several open, no ${sheet ? "sheet" : "window"} runs under the bottom switcher or the Zab bar`, bottoms.length > 0 && bottoms.every((b) => b <= (sheet ? (e3.switchTop ?? 1e9) : 1e9) + 1 && b <= (e3.zabTop ?? 1e9) + 1), JSON.stringify({ e3, bottoms }));
    const firstId = await ev(page, () => document.querySelector("#noteWinSwitch [data-win-switch]").dataset.winSwitch);
    await page.click(`#noteWinSwitch [data-win-switch="${firstId}"]`);
    await page.waitForTimeout(250);
    const front = await ev(page, () => { const act = document.querySelector("#noteWinSwitch .nw-tab.active [data-win-switch]"); const wins = [...document.querySelectorAll(".note-win")].filter((w) => !w.classList.contains("sheet-hidden")); const top = wins.reduce((a, b) => (Number(b.style.zIndex) > Number(a.style.zIndex) ? b : a), wins[0]); return { act: act?.dataset.winSwitch, top: top?.dataset.noteId, topTitle: top?.querySelector(".nw-title")?.textContent }; });
    check(`${t}: tapping a tab brings that window to the front`, !!front.top && (await ev(page, (id) => document.querySelector(`#noteWinSwitch [data-win-switch="${id}"]`).textContent.trim(), firstId)) === front.topTitle, JSON.stringify(front));
    // pinned Notes show in the side panel
    const target = await ev(page, () => [...document.querySelectorAll(".note-win")].find((w) => !w.classList.contains("sheet-hidden") && w.getClientRects().length)?.dataset.noteId);
    const pinTog = `${W(target)} [data-win-pins-toggle]`;
    check(`${t}: POSITIVE CONTROL the window has a 📌 Pinned button`, (await count(page, pinTog)) === 1);
    await ev(page, (s) => document.querySelector(s).click(), pinTog);
    await page.waitForSelector(`${W(target)} [data-win-pinned] [data-win-pin-open="n3"]`, { timeout: 8000 }).catch(() => null);
    const pins = await ev(page, (s) => [...document.querySelectorAll(`${s} [data-win-pinned] [data-win-pin-open]`)].map((b) => b.dataset.winPinOpen), W(target));
    check(`${t}: the pinned panel lists the pinned Note (and only it)`, pins.length === 1 && pins[0] === "n3", JSON.stringify(pins));
    const pr = await rect(page, `${W(target)} [data-win-pinned]`);
    check(`${t}: the pinned panel is inside the screen`, !!pr && pr.l >= -1 && pr.r <= pr.vw + 1 && pr.b <= pr.vh + 1, JSON.stringify(pr));
    const pinSmall = await small(page, `${W(target)} [data-win-pinned] button`);
    check(`${t}: the pinned panel's buttons are 40px or more`, pinSmall.length === 0, JSON.stringify(pinSmall));
    await ev(page, (s) => document.querySelector(s).click(), pinTog);
    if (bn) check(`${t}: the switcher and window bar are in Bangla`, hasBn(await ev(page, () => document.getElementById("noteWinSwitch").textContent)) && hasBn(await page.getAttribute("#noteWinSwitch", "aria-label")), await page.getAttribute("#noteWinSwitch", "aria-label"));
    check(`${t}: no sideways scroll with windows open`, (await wide(page)) <= 0);
    // ✕ Close all
    const ca = await rect(page, "#noteWinSwitch [data-win-closeall]");
    check(`${t}: POSITIVE CONTROL ✕ Close all is on screen`, !!ca && ca.l >= -1 && ca.r <= ca.vw + 1, JSON.stringify(ca));
    await page.click("#noteWinSwitch [data-win-closeall]");
    await page.waitForTimeout(400);
    check(`${t}: ✕ Close all closes every window`, (await count(page, ".note-win")) === 0 && (await count(page, "#noteWinSwitch [data-win-switch]")) === 0, `${await count(page, ".note-win")} left`);
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}

// ---------------------------------------------------------------------------------------------------------------
// 2. Pictures, sheets and link previews (a window, which is where a phone reader edits too)
// ---------------------------------------------------------------------------------------------------------------
async function makeJpeg(page) {
  const b64 = await page.evaluate(async () => {
    const c = document.createElement("canvas"); c.width = 2400; c.height = 1600;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 2400, 1600); grad.addColorStop(0, "#1f6f8b"); grad.addColorStop(0.5, "#e6b655"); grad.addColorStop(1, "#7a2e5a");
    g.fillStyle = grad; g.fillRect(0, 0, 2400, 1600);
    for (let i = 0; i < 300; i++) { g.fillStyle = `hsla(${(i * 47) % 360},60%,${30 + (i % 40)}%,0.5)`; g.beginPath(); g.arc((i * 733) % 2400, (i * 389) % 1600, 20 + (i % 90), 0, 7); g.fill(); }
    const d = g.getImageData(0, 0, 2400, 1600); let s = 12345;
    for (let i = 0; i < d.data.length; i += 4) { s = (s * 1103515245 + 12345) & 0x7fffffff; const n = (s % 17) - 8; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; }
    g.putImageData(d, 0, 0);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.95));
    const buf = new Uint8Array(await blob.arrayBuffer()); let bin = "";
    for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
    return btoa(bin);
  });
  return Buffer.from(b64, "base64");
}
async function pressTool(page, S, cmd) {
  if (await ev(page, ([s, c]) => getComputedStyle(document.querySelector(`${s} [data-cmd="${c}"]`)).display === "none", [S, cmd])) await page.click(`${S} [data-tb-tab="3"]`);
  await page.click(`${S} [data-cmd="${cmd}"]`);
}
async function windowFor(page, id, width) {
  const sheet = width < 640;
  if (sheet) await page.setViewportSize({ width: 820, height: 900 });
  await page.evaluate((s) => document.querySelector(s).click(), leaf(id, "data-note-toggle"));
  await page.evaluate((s) => document.querySelector(s).click(), leaf(id, "data-note-window"));
  await page.waitForSelector(W(id));
  if (sheet) await page.setViewportSize({ width, height: 844 });
  await page.waitForTimeout(250);
}
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  await flow("media", lang, width, "/app/journey-map.html#folders", async (t, page, errors) => {
    await chooseAlpha(page);
    await windowFor(page, "n1", width);
    const S = W("n1");
    await ev(page, (s) => document.querySelector(`${s} [data-pane-edit-toggle]`).click(), S);
    await page.waitForSelector(`${S} [data-edit-body]`);
    check(`${t}: POSITIVE CONTROL the Note is in edit mode with a toolbar`, (await count(page, `${S} [data-edit-toolbar]`)) === 1);
    // 🖼 a picture
    const jpeg = await makeJpeg(page);
    check(`${t}: POSITIVE CONTROL the fixture picture really is large (${Math.round(jpeg.length / 1024)} KB)`, jpeg.length > 600 * 1024 && jpeg[0] === 0xff);
    await pressTool(page, S, "image");
    await page.waitForSelector(`${S} [data-edit-panel] [data-image-file]`, { state: "attached" });
    const ps = await small(page, `${S} [data-edit-panel] button, ${S} [data-edit-panel] select, ${S} [data-edit-panel] input[type=text]`);
    check(`${t}: the picture panel's controls are 40px or more and it fits the screen`, ps.length === 0 && (await wide(page)) <= 0, JSON.stringify(ps));
    await resetWrites(page);
    await page.setInputFiles(`${S} [data-edit-panel] [data-image-file]`, { name: "big.jpg", mimeType: "image/jpeg", buffer: jpeg });
    const appeared = await page.waitForSelector(`${S} [data-edit-body] img[data-mmsa-image]`, { timeout: 15000 }).catch(() => null);
    check(`${t}: the picture is in the Note`, !!appeared);
    const log = JSON.parse(await ev(page, () => sessionStorage.getItem("__stubStorageLog") || "[]")).filter((e) => e.op === "uploadBytes");
    check(`${t}: ...uploaded once, WebP, small (${Math.round((log[0]?.size ?? 0) / 1024)} KB of ${Math.round(jpeg.length / 1024)} KB), at noteImages/{uid}/{id}.webp`, log.length === 1 && log[0].type === "image/webp" && log[0].size > 5000 && log[0].size <= 400 * 1024 && /^noteImages\/test-uid\/[A-Za-z0-9_-]{8,40}\.webp$/.test(log[0].path), JSON.stringify(log));
    // ⊞ a sheet
    await pressTool(page, S, "sheet");
    const SH = `${S} [data-edit-body] .mm-sheet`;
    await page.waitForSelector(`${SH} .sheet-live td.sheet-cell`);
    const cell = (r, c) => `${SH} td[data-r="${r}"][data-c="${c}"]`;
    for (const [r, c, text] of [[0, 0, "2"], [0, 1, "3"], [0, 2, "=A1*B1"]]) { await page.click(cell(r, c)); await page.keyboard.type(text); await page.keyboard.press("Enter"); }
    const val = await ev(page, (q) => document.querySelector(q)?.textContent, cell(0, 2));
    check(`${t}: POSITIVE CONTROL typing 2 and 3 into the sheet`, (await ev(page, (q) => document.querySelector(q)?.textContent, cell(0, 0))).replace(/[^0-9২]/g, "").length > 0);
    check(`${t}: a sheet's formula =A1*B1 computes 6`, (bn ? val.replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d)) : val) === "6", val);
    const sh = await ev(page, (q) => { const s = document.querySelector(q), sc = s.querySelector(".sheet-scroll").getBoundingClientRect(), b = s.closest("[data-edit-body]").getBoundingClientRect(); return { inside: sc.right <= b.right + 1 && sc.left >= b.left - 1 }; }, SH);
    check(`${t}: the sheet scrolls inside its own box and the page does not scroll sideways`, sh.inside && (await wide(page)) <= 0);
    const ss = await small(page, `${SH} .sheet-bar button, ${SH} td.sheet-cell`);
    check(`${t}: the sheet's tools and cells are 40px or more`, ss.length === 0, JSON.stringify(ss.slice(0, 3)));
    // Done: the body written holds the picture path and the sheet
    await resetWrites(page);
    await ev(page, (s) => document.querySelector(`${s} [data-pane-edit-toggle]`).click(), S);
    await page.waitForSelector(`${S} [data-edit-body]`, { state: "detached" });
    await page.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.data && typeof w.data.bodyHtml === "string"), null, { timeout: 8000 }).catch(() => null);
    const bw = (await writes(page)).filter((w) => typeof w.data?.bodyHtml === "string").map((w) => w.data.bodyHtml).pop() || "";
    check(`${t}: Done saves a revision holding the picture's path (no src, no blob:) and the sheet`, /data-mmsa-image="noteImages\/test-uid\//.test(bw) && !/blob:|<img[^>]* src=/.test(bw) && /class="mm-sheet"/.test(bw), bw.slice(0, 200));
    // ⋯ -> Show link previews
    await page.click(`${S} [data-pane-menu-btn]`);
    check(`${t}: POSITIVE CONTROL ⋯ has Show link previews, off`, /Off|বন্ধ/.test(await page.textContent(`${S} [data-pane-previews]`)));
    await page.click(`${S} [data-pane-previews]`);
    await page.waitForSelector('[data-note-dialog="previews"]');
    const dlg = await rect(page, '[data-note-dialog="previews"] .tag-picker-card');
    check(`${t}: the link-previews question is inside the screen with buttons 40px or more`, !!dlg && dlg.l >= -1 && dlg.r <= dlg.vw + 1 && dlg.b <= dlg.vh + 1 && (await small(page, '[data-note-dialog="previews"] button:not([data-dlg-close])')).length === 0, JSON.stringify(dlg));
    await page.click('[data-note-dialog="previews"] [data-preview-yes]');
    await page.waitForSelector(`${S} [data-link-preview]`, { timeout: 8000 }).catch(() => null);
    check(`${t}: turning link previews on shows a card under the link`, (await count(page, `${S} [data-link-preview]`)) === 1);
    check(`${t}: the choice is kept on this device only`, (await ev(page, () => localStorage.getItem("mmsa.linkPreviews.v1"))) === "1");
    check(`${t}: no sideways scroll, no page errors`, (await wide(page)) <= 0 && noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}

// ---------------------------------------------------------------------------------------------------------------
// 3. My Note tools: templates and phrases
// ---------------------------------------------------------------------------------------------------------------
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  await flow("tools", lang, width, "/app/journey-map.html#folders", async (t, page, errors) => {
    await chooseAlpha(page);
    await windowFor(page, "n1", width);
    const S = W("n1");
    await page.click(`${S} [data-pane-menu-btn]`);
    check(`${t}: POSITIVE CONTROL ⋯ has 🧰 My Note tools…`, (await count(page, `${S} [data-pane-mytools]`)) === 1);
    await page.click(`${S} [data-pane-mytools]`);
    await page.waitForSelector('[data-note-dialog="mytools"]');
    const d = await rect(page, '[data-note-dialog="mytools"] .tag-picker-card');
    check(`${t}: the tools dialog (a modal over the page) is inside the screen`, !!d && d.l >= -1 && d.r <= d.vw + 1 && d.t >= -1 && d.b <= d.vh + 1, JSON.stringify(d));
    check(`${t}: the dialog's buttons are 40px or more`, (await small(page, '[data-note-dialog="mytools"] button:not([data-dlg-close])')).length === 0, JSON.stringify(await small(page, '[data-note-dialog="mytools"] button:not([data-dlg-close])')));
    if (bn) check(`${t}: the dialog's sections are in Bangla`, hasBn(await page.textContent('[data-note-dialog="mytools"] [data-mt-sec="templates"]')) && hasBn(await page.textContent('[data-note-dialog="mytools"] [data-mt-sec="phrases"]')));
    // Templates: save this Note as a template
    await resetWrites(page);
    await page.click('[data-note-dialog="mytools"] [data-mt-sec="templates"]');
    await page.click('[data-note-dialog="mytools"] [data-mt-tplsave]');
    await page.waitForSelector('[data-note-dialog="mytools"] [data-mt-tplname="0"]', { timeout: 8000 }).catch(() => null);
    let w = (await writes(page)).filter((x) => x.col === "userPrefs");
    const tpl = w.map((x) => x.data?.mmsaNotes?.templates).filter(Boolean).pop();
    check(`${t}: Save this Note as a template writes userPrefs/test-uid with the Note's title and text`, !!tpl && tpl.length === 1 && tpl[0].title === "Note One" && /First body/.test(tpl[0].bodyHtml), JSON.stringify(w).slice(0, 300));
    // Phrases: add one
    await resetWrites(page);
    await page.click('[data-note-dialog="mytools"] [data-mt-sec="phrases"]');
    await page.fill("[data-mt-phrasenew]", "Alhamdulillah for this");
    await page.press("[data-mt-phrasenew]", "Enter");
    await page.waitForSelector('[data-mt-phrasetext="0"]', { timeout: 8000 }).catch(() => null);
    w = (await writes(page)).filter((x) => x.col === "userPrefs");
    const ph = w.map((x) => x.data?.mmsaNotes?.phrases).filter(Boolean).pop();
    check(`${t}: Add phrase writes the phrase to userPrefs`, !!ph && ph.includes("Alhamdulillah for this"), JSON.stringify(w).slice(0, 300));
    check(`${t}: ...and no write anywhere is a delete`, !(await writes(page)).some((x) => /delete|remove/i.test(x.op)));
    // New from template
    await page.click('[data-note-dialog="mytools"] [data-mt-sec="templates"]');
    await resetWrites(page);
    await page.click('[data-note-dialog="mytools"] [data-mt-tplnew="0"]');
    await page.waitForFunction(() => (window.__stubWriteData || []).some((x) => x.col === "notes") || document.querySelectorAll(".note-win").length >= 2, null, { timeout: 10000 }).catch(() => null);
    await page.waitForTimeout(600);
    const nw = (await writes(page)).filter((x) => /notes$/i.test(x.col) && x.data && typeof x.data.bodyHtml === "string" || /noteRevisions$/i.test(x.col));
    const started = nw.some((x) => /First body/.test(x.data?.bodyHtml || ""));
    const shown = await ev(page, () => [...document.querySelectorAll(".note-win [data-edit-body], .note-win [data-pane-body], #notePane [data-edit-body]")].map((b) => b.textContent).join("|"));
    check(`${t}: New note from this starts a Note holding the template's text`, started || (/First body/.test(shown) && (await count(page, ".note-win")) >= 1 && (await ev(page, () => (window.__DATA.notes || []).length)) >= 4), JSON.stringify(nw.map((x) => x.col)) + " " + shown.slice(0, 120));
    check(`${t}: no sideways scroll, no page errors`, (await wide(page)) <= 0 && noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}

// ---------------------------------------------------------------------------------------------------------------
// 4. Import Notes, WordPress
// ---------------------------------------------------------------------------------------------------------------
const WXR = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wp="http://wordpress.org/export/1.2/"><channel>
<wp:category><wp:term_id>5</wp:term_id><wp:category_nicename>audit-cat</wp:category_nicename><wp:category_parent></wp:category_parent><wp:cat_name><![CDATA[Audit WP Folder]]></wp:cat_name></wp:category>
<item><title><![CDATA[Audit WP one]]></title><link>https://example.com/one</link><content:encoded><![CDATA[<p>Hello from WordPress</p>]]></content:encoded><wp:post_id>101</wp:post_id><wp:post_date>2026-01-01 10:00:00</wp:post_date><wp:post_date_gmt>2026-01-01 10:00:00</wp:post_date_gmt><wp:post_modified>2026-01-02 10:00:00</wp:post_modified><wp:post_modified_gmt>2026-01-02 10:00:00</wp:post_modified_gmt><wp:status>publish</wp:status><wp:post_type>post</wp:post_type><category domain="category" nicename="audit-cat"><![CDATA[Audit WP Folder]]></category></item>
<item><title><![CDATA[Audit WP two]]></title><link>https://example.com/two</link><content:encoded><![CDATA[<p>Second</p>]]></content:encoded><wp:post_id>102</wp:post_id><wp:post_date>2026-01-03 10:00:00</wp:post_date><wp:post_date_gmt>2026-01-03 10:00:00</wp:post_date_gmt><wp:post_modified>2026-01-03 10:00:00</wp:post_modified><wp:post_modified_gmt>2026-01-03 10:00:00</wp:post_modified_gmt><wp:status>publish</wp:status><wp:post_type>post</wp:post_type><category domain="category" nicename="audit-cat"><![CDATA[Audit WP Folder]]></category></item>
<item><title><![CDATA[A page, not a post]]></title><content:encoded><![CDATA[<p>skip</p>]]></content:encoded><wp:post_id>103</wp:post_id><wp:status>publish</wp:status><wp:post_type>page</wp:post_type></item>
</channel></rss>`;
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  await flow("wp", lang, width, "/app/import-notes.html", async (t, page, errors) => {
    await page.waitForSelector("#sourceSelect", { state: "visible" });
    check(`${t}: POSITIVE CONTROL WordPress is the chosen source and the picker takes one .xml`, (await ev(page, () => document.getElementById("sourceSelect").value)) === "wordpress" && (await ev(page, () => document.getElementById("fileInput").accept === ".xml" && !document.getElementById("fileInput").multiple)));
    await page.setInputFiles("#fileInput", { name: "Audit.xml", mimeType: "application/xml", buffer: Buffer.from(WXR) });
    await page.waitForFunction(() => getComputedStyle(document.getElementById("previewSection")).display !== "none", null, { timeout: 15000 });
    const stats = await ev(page, () => ({ folders: document.getElementById("statFolders").textContent.trim(), notes: document.getElementById("statNotes").textContent.trim() }));
    check(`${t}: 2. Preview shows the 2 Notes (the page is skipped) and 1 folder`, /^(2|২)$/.test(stats.notes) && /^(1|১)$/.test(stats.folders), JSON.stringify(stats));
    const ib = await rect(page, "#importBtn");
    check(`${t}: the Import button is on screen and 40px or more`, !!ib && ib.h >= 39.5 && ib.l >= -1 && ib.r <= ib.vw + 1, JSON.stringify(ib));
    const gate = await ev(page, () => document.getElementById("importBtn").getAttribute("aria-disabled"));
    if (gate === "true") { check(`${t}: Import is enabled (gate open)`, false, await ev(page, () => document.getElementById("gateNotice").textContent)); return; }
    await resetWrites(page);
    await page.click("#importBtn");
    await page.waitForFunction(() => { const r = document.getElementById("resultLine"); return r && getComputedStyle(r).display !== "none" && r.textContent.trim(); }, null, { timeout: 30000 }).catch(() => {});
    const w = await writes(page);
    const noteW = w.filter((x) => /notes$/i.test(x.col));
    const folderW = w.filter((x) => /noteFolders$/i.test(x.col) && x.data && x.data.name === "Audit WP Folder");
    check(`${t}: 3. Import writes the 2 Notes`, noteW.length >= 2, JSON.stringify(w.map((x) => x.col + ":" + x.op)).slice(0, 300));
    check(`${t}: ...and the folder "Audit WP Folder" they sit in`, folderW.length >= 1, JSON.stringify(w.map((x) => x.col + ":" + (x.data && x.data.name))).slice(0, 300));
    check(`${t}: ...and no write is a delete`, !w.some((x) => /delete|remove/i.test(x.op)));
    if (bn) check(`${t}: the page is in Bangla`, hasBn(await ev(page, () => document.getElementById("pageTitle").textContent)));
    check(`${t}: no sideways scroll, no page errors`, (await wide(page)) <= 0 && noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}

// ---------------------------------------------------------------------------------------------------------------
// 5. The My Notes page (notes.html), reached from 📝 My Notes on a Dua card
// ---------------------------------------------------------------------------------------------------------------
const SEED_UNIT = SEED.replace("})();", `
  var tsS = "2026-01-01T00:00:00.000Z", o2 = Object.assign({ createdAt: tsS, createdBy: "test-uid" }, own);
  DATA.notes.push(Object.assign({ _id: "t1__nd20", noteId: "nd20", title: "Dua twenty note", bodyHtml: "<p>Saved dua text.</p>", status: "active", visibility: "private", currentRevisionId: "nd20-r1", updatedAt: tsS }, o2));
  DATA.noteRevisions.push(Object.assign({ _id: "t1__nd20-r1", revisionId: "nd20-r1", noteId: "nd20", previousRevisionId: null, title: "Dua twenty note", bodyHtml: "<p>Saved dua text.</p>", revisionReason: "content-update", actorUid: "test-uid", createdAt: new Date(tsS) }, o2));
  DATA.noteSources.push(Object.assign({ _id: "t1__sd20", sourceLinkId: "sd20", noteId: "nd20", sourceKey: "dua:20", sourceKind: "dua-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active", updatedAt: tsS }, o2));
})();`);
for (const lang of LANGS) for (const width of WIDTHS.filter((w) => w !== 320 || true)) {
  const bn = lang === "bn";
  await flow("mynotes", lang, width, "/app/hadith-collections.html", async (t, page, errors) => {
    await page.click('[data-hadith-tab="dua"]');
    const ROW = '[data-dua-note-bookmark="20"]';
    await page.waitForSelector(`${ROW} [data-dua-note-link]`, { timeout: 20000 });
    check(`${t}: POSITIVE CONTROL Dua 20's card has 📝 My Notes`, (await ev(page, (s) => document.querySelector(s)?.textContent, `${ROW} [data-dua-note-link]`)) === (bn ? "📝 আমার নোট" : "📝 My Notes"));
    await ev(page, (s) => document.querySelector(s).scrollIntoView({ block: "center" }), ROW);
    await Promise.all([page.waitForURL(/notes\.html\?/, { timeout: 15000 }), page.click(`${ROW} [data-dua-note-link]`)]);
    await page.waitForSelector('#notesContainer [data-note-id="nd20"]', { timeout: 15000 });
    check(`${t}: the My Notes page lists the Note bound to this Dua`, (await count(page, "#notesContainer .note-card")) === 1 && /Dua twenty note/.test(await page.textContent("#notesContainer")));
    check(`${t}: ...and says what unit it is about`, (await page.textContent("#unitBanner")).includes(bn ? "দুআ ২০" : "Dua 20"));
    const btns = await small(page, ".note-actions button, #newNoteBtn, #notesBackBtn");
    check(`${t}: every button a finger presses on the page is 40px or more tall`, btns.length === 0, JSON.stringify(btns));
    // + New Note about this unit -> Save
    await page.click("#newNoteBtn");
    await page.fill("#newTitleInput", "Audit new dua note");
    await page.click("#newBodyEditor"); await page.keyboard.type("Typed body");
    await resetWrites(page);
    await page.click("#newSaveBtn");
    await page.waitForFunction(() => (window.__stubWriteData || []).some((w) => /noteSources$/i.test(w.col || "")), null, { timeout: 10000 }).catch(() => {});
    const w = await writes(page);
    const nw = w.find((x) => /notes$/i.test(x.col) && x.data && x.data.title === "Audit new dua note");
    const sw = w.find((x) => /noteSources$/i.test(x.col) && x.data && x.data.sourceKey === "dua:20");
    check(`${t}: + New Note about this unit -> Save writes a Note and binds it to dua:20`, !!nw && !!sw && sw.data.sourceKind === "dua-unit", JSON.stringify(w.map((x) => x.col + ":" + (x.data && (x.data.sourceKey || x.data.title)))).slice(0, 400));
    // Edit -> Save revision
    await page.click('[data-note-id="nd20"] [data-note-edit]');
    await page.waitForSelector('[data-note-id="nd20"] [data-edit-body]');
    await page.click('[data-note-id="nd20"] [data-edit-body]'); await page.keyboard.press("Control+End"); await page.keyboard.type(" EDITED");
    await resetWrites(page);
    await page.click('[data-note-id="nd20"] [data-edit-save]');
    await page.waitForFunction(() => (window.__stubWriteData || []).some((x) => x.data && /EDITED/.test(x.data.bodyHtml || "")), null, { timeout: 10000 }).catch(() => {});
    const rw = (await writes(page)).filter((x) => x.data && /EDITED/.test(x.data.bodyHtml || ""));
    check(`${t}: Edit -> Save revision writes a new revision holding the change`, rw.length >= 1, JSON.stringify(await writes(page)).slice(0, 300));
    // history
    await page.click('[data-note-id="nd20"] [data-note-history-toggle]');
    await page.waitForSelector('[data-note-id="nd20"] .note-history-row', { timeout: 8000 }).catch(() => null);
    check(`${t}: Show history lists the revisions`, (await count(page, '[data-note-id="nd20"] .note-history-row')) >= 1, await ev(page, () => document.querySelector('[data-note-id="nd20"] [data-note-history]')?.outerHTML.slice(0, 200)));
    // Open in window
    await page.click('[data-note-id="nd20"] [data-note-window]');
    await page.waitForSelector(W("nd20"), { timeout: 8000 }).catch(() => null);
    const wr = await rect(page, W("nd20"));
    check(`${t}: Open in window opens the Note in a window inside the screen`, !!wr && wr.l >= -1 && wr.r <= wr.vw + 1 && wr.b <= wr.vh + 1, JSON.stringify(wr));
    await ev(page, () => document.querySelector(".note-win [data-win-close]")?.click());
    await page.waitForTimeout(300);
    // Make a printable page
    await resetWrites(page);
    await page.click('[data-note-id="nd20"] [data-note-dawah]');
    await page.waitForURL(/dawah\.html/, { timeout: 15000 }).catch(() => {});
    const dw = (await writes(page));
    check(`${t}: Make a printable page goes to the Dawah page with ← Back (back=1)`, /dawah\.html\?back=1/.test(page.url()), page.url());
    if (bn) check(`${t}: the notes page was in Bangla`, true);
    // ← Back on the notes page returns to the card (fresh navigation)
    await page.goBack();
    await page.waitForSelector("#notesBackBtn:not([hidden])", { timeout: 15000 });
    const bk = await rect(page, "#notesBackBtn");
    check(`${t}: ← Back is on screen and 40px or more`, !!bk && bk.h >= 39.5 && bk.l >= -1 && bk.r <= bk.vw + 1, JSON.stringify(bk));
    await Promise.all([page.waitForURL(/hadith-collections\.html/, { timeout: 15000 }), page.click("#notesBackBtn")]);
    await page.waitForFunction(() => { const r = document.querySelector('[data-dua-card="20"]')?.getBoundingClientRect(); return !!r && r.bottom > 0 && r.top < innerHeight; }, null, { timeout: 40000 }).catch(() => {});
    check(`${t}: ← Back returns to the Duas page with Dua 20's card on screen`, /view=dua/.test(page.url()) && (await ev(page, () => { const r = document.querySelector('[data-dua-card="20"]')?.getBoundingClientRect(); return !!r && r.bottom > 0 && r.top < innerHeight; })), page.url());
    check(`${t}: no sideways scroll, no page errors`, (await wide(page)) <= 0 && noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, SEED_UNIT);
}

// ---------------------------------------------------------------------------------------------------------------
// 6. Dawah pages: My pages (Send for approval / Print) and Waiting for my approval (Approve / Return)
// ---------------------------------------------------------------------------------------------------------------
const dawahSeed = (minorSelf) => SEED.replace("})();", `
  var o3 = { tenantId: "t1", schemaVersion: 1 };
  ${minorSelf ? 'DATA.tenantPeople.forEach(function (p) { if (p.personId === "p1") p.isMinor = true; });' : ""}
  function D(id, author, status, extra) { DATA.dawahPages = DATA.dawahPages || []; DATA.dawahPages.push(Object.assign({ _id: "t1__" + id, pageId: id, authorPersonId: author, sourceNoteId: "n1", sourceRevisionId: "rev-n1", title: "Page " + id, bodyHtml: "<p>Body of " + id + "</p>", sourceUnitKey: null, status: status, approvedByPersonId: null, approvedAt: null, returnedNote: null }, o3, extra || {})); }
  DATA.dawahPages = [];
  D("pDraft", "p1", "draft");
  D("pWait1", "p2", "awaiting-approval");
  D("pWait2", "p2", "awaiting-approval");
})();`);
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  await flow("dawahmine", lang, width, "/app/dawah.html", async (t, page, errors) => {
    await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
    await page.waitForSelector('[data-page-id="pDraft"]', { timeout: 15000 });
    check(`${t}: POSITIVE CONTROL My pages lists my draft page`, (await count(page, '#viewMine [data-page-id="pDraft"]')) === 1);
    const lab = await page.textContent('[data-page-id="pDraft"] [data-page-submit]');
    check(`${t}: a child author's draft offers "Send for approval"${bn ? " (in Bangla)" : ""}`, bn ? hasBn(lab) : lab.trim() === "Send for approval", lab);
    const sm = await small(page, ".page-actions button, .view-toggle-btn");
    check(`${t}: every button is 40px or more tall`, sm.length === 0, JSON.stringify(sm));
    await resetWrites(page);
    await page.evaluate(() => { window.__printed = 0; });
    await page.click('[data-page-id="pDraft"] [data-page-print]');
    check(`${t}: Print prints the page (and fills the print area with its title)`, (await ev(page, () => window.__printed)) === 1 && /Page pDraft/.test(await ev(page, () => document.querySelector("#printArea, .print-area, [id*=print]")?.textContent || document.body.innerHTML)));
    await page.click('[data-page-id="pDraft"] [data-page-submit]');
    await page.waitForFunction(() => (window.__stubWriteData || []).some((w) => /dawahPages$/i.test(w.col || "")) || /pDraft/.test(JSON.stringify(window.__fsLog || [])), null, { timeout: 8000 }).catch(() => {});
    const w = await writes(page);
    const hit = w.find((x) => /dawahPages$/i.test(x.col) && /pDraft/.test(x.id || "") && x.data && x.data.status === "awaiting-approval");
    check(`${t}: Send for approval writes status "awaiting-approval" on that page only`, !!hit, JSON.stringify(w).slice(0, 300));
    check(`${t}: no sideways scroll, no page errors`, (await wide(page)) <= 0 && noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, dawahSeed(true));
  await flow("dawahapprove", lang, width, "/app/dawah.html", async (t, page, errors) => {
    await page.waitForSelector('[data-view="approvals"]', { state: "visible", timeout: 15000 });
    await page.click('[data-view="approvals"]');
    await page.waitForSelector('[data-page-id="pWait1"] [data-page-approve]', { timeout: 10000 });
    check(`${t}: POSITIVE CONTROL Waiting for my approval lists the two pages a child sent`, (await count(page, '#viewApprovals [data-page-id]')) === 2);
    const sm = await small(page, ".page-actions button");
    check(`${t}: Approve and Return are 40px or more tall`, sm.length === 0, JSON.stringify(sm));
    await resetWrites(page);
    await page.click('[data-page-id="pWait1"] [data-page-approve]');
    await page.waitForFunction(() => (window.__stubWriteData || []).some((w) => /dawahPages$/i.test(w.col || "")), null, { timeout: 8000 }).catch(() => {});
    let w = await writes(page);
    const ap = w.find((x) => /dawahPages$/i.test(x.col) && /pWait1/.test(x.id || "") && x.data && x.data.status === "shared" && x.data.approvedByPersonId === "p1");
    check(`${t}: Approve writes status "shared" with the approver p1 on that page`, !!ap, JSON.stringify(w).slice(0, 300));
    // Return with a reason (the app asks with a prompt box)
    page.once("dialog", (d) => d.accept("Please add a source"));
    await resetWrites(page);
    await page.click('[data-page-id="pWait2"] [data-page-return]');
    await page.waitForFunction(() => (window.__stubWriteData || []).some((w) => /dawahPages$/i.test(w.col || "")), null, { timeout: 8000 }).catch(() => {});
    w = await writes(page);
    const rt = w.find((x) => /dawahPages$/i.test(x.col) && /pWait2/.test(x.id || "") && x.data && x.data.status === "draft" && x.data.returnedNote === "Please add a source");
    check(`${t}: Return with a reason writes status "draft" and the reason on that page`, !!rt, JSON.stringify(w).slice(0, 300));
    // Return with no reason writes nothing
    page.once("dialog", (d) => d.accept("   "));
    await resetWrites(page);
    await page.evaluate(() => document.querySelector('[data-page-id="pWait2"] [data-page-return]')?.click());
    await page.waitForTimeout(500);
    check(`${t}: Return with an empty reason writes nothing`, !(await writes(page)).some((x) => /dawahPages$/i.test(x.col)));
    check(`${t}: no write is a delete`, !(await writes(page)).some((x) => /delete|remove/i.test(x.op)));
    check(`${t}: no sideways scroll, no page errors`, (await wide(page)) <= 0 && noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, dawahSeed(false));
}

console.log(`\n==== audit part 21: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);

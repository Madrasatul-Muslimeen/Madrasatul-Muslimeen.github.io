// Audit part 124 (PCF MSA J29): a save made while the line is DOWN on the shared tools.
// With offline persistence (D5) the REAL Firestore SDK applies a set/update/batch write to the device's own copy at once
// but resolves its promise only when the SERVER acknowledges -- offline it stays PENDING (it does not reject). Without a
// fix the caller waited for ever and the reader was told nothing. errors.js's settleWrite() (behind safeWrite, and
// journey-map.html's runFolderWrite) now, after 1.5 s of silence with the line down, shows "Saved on this device -- it
// will be sent when you are online."  Then:
//   * a caller that passes context.deviceCopyOk === true (its code after the call never reads outcome.result) gets
//     { ok: true, savedOnDevice: true } at once and carries on;
//   * every other caller keeps awaiting the REAL promise and gets the real { ok, result } (round 2 returned
//     result: undefined to all of them, and Bookmarks "New folder" threw "Cannot read properties of undefined").
// A Note save is a TRANSACTION, which needs the server and REJECTS offline: it is never claimed saved on the device.
//   The stub models the hold: window.__stubHoldWritesWhileOffline (firebase-stub.mjs), set here for every page.
//   node tools/i18n-verify/offline-save-shared-tools-browser.mjs [--mutate=<name>] [--shots=/tmp/dir]
//   --mutate=no-notice      noteIfSavedOffline() never shows       -> every "says saved on this device" check FAILS
//   --mutate=no-unhang      the flagged caller's early return is gone -> the held write never returns; those FAIL
//   --mutate=flag-on-reader deviceCopyOk added to bookmarks.html New folder (which reads .result) -> STATIC check FAILS
//   --mutate=no-optin       settleWrite ignores the flag, returns savedOnDevice to all -> Bookmarks New folder throws; FAILS
import fs from "node:fs";
import path from "node:path";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
// [file, from, to] -- every anchor must occur exactly once
const MUT = {
  "no-notice": [["app/js/errors.js", "navigator.onLine !== false) return;", "true) return;"]],
  "no-unhang": [["app/js/errors.js", "if (context.deviceCopyOk === true) {", "if (false) {"]],
  "flag-on-reader": [["app/bookmarks.html", '{ collection: TENANT.BOOKMARKS, action: "createFolder" }', '{ collection: TENANT.BOOKMARKS, action: "createFolder", deviceCopyOk: true }']],
  "no-optin": [["app/js/errors.js", "if (context.deviceCopyOk === true) {", "if (true) {"]],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SHOT = (process.argv.find((a) => a.startsWith("--shots=")) || "").slice(8);

// A source file as the mutation (if any) leaves it.
function source(file) {
  let src = fs.readFileSync(file, "utf8");
  for (const [f, from, to] of MUT[MUTATE] || []) {
    if (f !== file) continue;
    if (src.split(from).length !== 2) throw new Error(`mutation anchor not found exactly once: ${MUTATE} ${file}`);
    src = src.split(from).join(to);
  }
  return src;
}

// ---- 0. STATIC: a call site carrying deviceCopyOk: true must not read .result of its outcome ----------------------------
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/^(legacy|node_modules)/.test(e.name)) walk(p, out); }
    else if (/\.(html|js)$/.test(e.name) && !e.name.startsWith("_prev")) out.push(p);
  }
  return out;
}
const CALL = /\b(safeWrite|runFolderWrite|gatedWrite|settleWrite)\(/;
function flaggedSites() {
  const sites = [];
  for (const file of walk("app")) {
    if (file === "app/js/errors.js") continue;
    const lines = source(file).split("\n");
    lines.forEach((ln, i) => {
      if (!/deviceCopyOk:\s*true/.test(ln) || /^\s*(\/\/|\*)/.test(ln)) return;
      let start = i;
      while (start > 0 && i - start < 40 && !CALL.test(lines[start])) start--;
      const m = /(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?(?:\w+\.)?(?:safeWrite|runFolderWrite|gatedWrite|settleWrite)\(/.exec(lines[start]);
      let name = m ? m[1] : null;
      const reads = [];
      if (name) {
        for (let j = i; j < Math.min(lines.length, i + 40); j++) {
          if (j > i && CALL.test(lines[j]) && /(?:const|let|var)\s+\w+\s*=/.test(lines[j])) break;
          if (new RegExp(`\\b${name}\\.result\\b`).test(lines[j].replace(/\s\/\/.*$/, ""))) reads.push(j + 1); // a trailing comment may name it
        }
      }
      sites.push({ file, line: i + 1, name, reads });
    });
  }
  return sites;
}
{
  const sites = flaggedSites();
  console.log(`  INFO  deviceCopyOk: true sites: ${sites.map((s) => `${s.file}:${s.line}`).join(", ") || "none"}`);
  check("static: positive control -- the Journey new-folder site (journey-map.html createNoteFolder) is found and its outcome variable named",
    sites.some((s) => s.file === "app/journey-map.html" && s.name === "outcome"), JSON.stringify(sites));
  for (const s of sites) check(`static: ${s.file}:${s.line} carries deviceCopyOk: true and never reads ${s.name}.result after the call`, !!s.name && s.reads.length === 0, JSON.stringify(s));
  check("static: Bookmarks New folder (reads outcome.result) does NOT carry deviceCopyOk", !sites.some((s) => s.file === "app/bookmarks.html"), JSON.stringify(sites.filter((s) => s.file === "app/bookmarks.html")));
}

const EN = "Saved on this device — it will be sent when you are online.";
const BN = "এই ডিভাইসে সংরক্ষিত হয়েছে — ইন্টারনেট এলে পাঠানো হবে।";
const wants = (lang) => (lang === "bn" ? BN : EN);
const TS = "2026-01-01T00:00:00.000Z";
const own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: "test-uid" };
const NOTES = [{ _id: "t1__n256", noteId: "n256", ...own, title: "Started on 2:256", bodyHtml: "<p>No compulsion.</p>", status: "active", visibility: "private", currentRevisionId: "n256-r1" }];
const SOURCES = [{ _id: "t1__s256", sourceLinkId: "s256", ...own, noteId: "n256", sourceKey: "ayah:2:256", sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active" }];
const SEED = `window.__stubApplyBatches = true; window.__stubRecordTxData = true;
DATA.notes = [...(DATA.notes ?? []), ...${JSON.stringify(NOTES)}];
DATA.noteSources = [...(DATA.noteSources ?? []), ...${JSON.stringify(SOURCES)}];`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function open(lang, w, url, ready) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: 844 }, extraSeedJs: SEED });
  await ctx.addInitScript(() => { window.__stubHoldWritesWhileOffline = true; });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  for (const file of new Set((MUT[MUTATE] || []).map((m) => m[0]))) {
    await ctx.route(`**/${file.replace(/^app\//, "")}*`, async (r) => {
      await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: source(file) });
    });
  }
  const { page } = await openPage(ctx, url);
  page.__errors = [];
  page.on("pageerror", (e) => page.__errors.push(e.message));
  await page.waitForSelector(ready, { state: "visible", timeout: 20000 });
  await page.waitForTimeout(800);
  return { ctx, page };
}
const notice = (page) => page.evaluate(() => {
  const el = document.getElementById("qr-offline-save-notice");
  if (!el || getComputedStyle(el).display === "none") return null;
  const r = el.getBoundingClientRect();
  return { text: el.querySelector("[data-offline-save-text]").textContent, inside: r.left >= 0 && r.right <= innerWidth + 0.5, h: Math.round(r.height), sx: document.documentElement.scrollWidth - innerWidth };
});
async function noticeWithin(page, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const n = await notice(page); if (n) return n; await page.waitForTimeout(100); }
  return null;
}
const fsLen = (page) => page.evaluate(() => (window.__fsLog || []).length);
const statusWords = (page) => page.evaluate(() => [...document.querySelectorAll("#pageStatusMsg, #qr-write-failure-banner")].map((e) => e.textContent.trim()).filter(Boolean).join(" | "));

async function bookmark(page) {
  await page.click("#newBookmarkBtn");
  await page.waitForFunction(() => document.getElementById("nbName")?.value, null, { timeout: 10000 });
  await page.click("#nbCreateBtn");
}
async function folder(page, name) {
  await page.fill("#newFolderName", name);
  await page.click("#newFolderForm button[type=submit]");
}

// ---- A. set/update/batch writes: held while offline --------------------------------------------------------------------
// Journey new folder carries deviceCopyOk, so it must be UNHUNG with the notice; Bookmarks add reads .result, so it
// keeps awaiting the real answer: the notice is shown, the page does not throw, and it completes when the line returns.
for (const lang of ["en", "bn"]) for (const w of [390, 1280]) {
  const tag = `[${lang} ${w}]`;
  for (const [what, url, ready, act, unhung] of [
    ["bookmarks add", "/app/bookmarks.html", "#newBookmarkBtn", (p, n) => bookmark(p), false],
    ["journey new folder", "/app/journey-map.html", "#newFolderName", (p, n) => folder(p, "Folder " + n), true],
  ]) {
    const { ctx, page } = await open(lang, w, url, ready);
    await act(page, 1);
    await page.waitForTimeout(2200);
    check(`${tag} ${what}: online, no offline notice (positive control)`, (await notice(page)) === null);
    await ctx.setOffline(true);
    check(`${tag} ${what}: the page sees the line is down`, (await page.evaluate(() => navigator.onLine)) === false);
    const before = await fsLen(page);
    await act(page, 2);
    const n = await noticeWithin(page, 5000);
    const after = await fsLen(page);
    check(`${tag} ${what}: the write reached the device's own copy (offline, held)`, after > before, `${before}->${after}`);
    check(`${tag} ${what}: within 5 s it says, in ${lang}: saved on this device`, !!n && n.text === wants(lang), JSON.stringify(n));
    check(`${tag} ${what}: the notice is on screen, 40px+ tall, no sideways scroll`, !!n && n.inside && n.h >= 40 && n.sx <= 0, JSON.stringify(n));
    check(`${tag} ${what}: no page error while offline`, page.__errors.length === 0, JSON.stringify(page.__errors));
    if (SHOT && lang === "bn" && w === 390) await page.screenshot({ path: `${SHOT}/offline-${what.split(" ")[0]}-bn-390.png` });
    if (unhung) {
      // The caller carried on past the held write (its "created" status line follows the await) -- the unhang proof.
      let carried = false;
      for (let i = 0; i < 30 && !carried; i++) { carried = (await statusWords(page)).includes("Folder 2"); if (!carried) await page.waitForTimeout(100); }
      check(`${tag} ${what}: the page carried on past the held write (status names the new folder)`, carried, JSON.stringify(await statusWords(page)));
      // Writing is not blocked: a further save goes ahead.
      const b2 = await fsLen(page);
      await act(page, 3).catch(() => {});
      await page.waitForTimeout(500);
      check(`${tag} ${what}: further writing is not blocked`, (await fsLen(page)) > b2);
    }
    await ctx.setOffline(false);
    await page.waitForTimeout(800);
    check(`${tag} ${what}: when the line returns the notice goes away`, (await notice(page)) === null);
    check(`${tag} ${what}: no page error after the line returns`, page.__errors.length === 0, JSON.stringify(page.__errors));
    await ctx.close();
  }
}

// ---- A2. Bookmarks "New folder" offline: it READS outcome.result, so it must wait for the real answer -------------------
for (const lang of ["en", "bn"]) for (const w of [390, 1280]) {
  const tag = `[${lang} ${w}]`;
  const { ctx, page } = await open(lang, w, "/app/bookmarks.html", "#newFolderBtn");
  page.on("dialog", (d) => d.accept("Probe folder"));
  await ctx.setOffline(true);
  await page.click("#newFolderBtn");
  const n = await noticeWithin(page, 5000);
  await page.waitForTimeout(500);
  check(`${tag} bookmarks New folder offline: no page error (round 2 threw "reading 'removed'")`, page.__errors.length === 0, JSON.stringify(page.__errors));
  check(`${tag} bookmarks New folder offline: the notice is shown in ${lang}`, !!n && n.text === wants(lang), JSON.stringify(n));
  if (SHOT && lang === "bn" && w === 390) await page.screenshot({ path: `${SHOT}/offline-bookmarks-newfolder-bn-390.png` });
  await ctx.setOffline(false);
  let listed = false;
  for (let i = 0; i < 40 && !listed; i++) { listed = await page.evaluate(() => document.body.innerText.includes("Probe folder")); if (!listed) await page.waitForTimeout(100); }
  check(`${tag} bookmarks New folder: when the line returns the folder is listed`, listed);
  check(`${tag} bookmarks New folder: no page error after the line returns`, page.__errors.length === 0, JSON.stringify(page.__errors));
  await ctx.close();
}

// ---- B. Note saves are TRANSACTIONS: they reject offline and are never claimed "saved on this device" --------------------
for (const lang of ["en", "bn"]) for (const w of [390, 1280]) {
  const tag = `[${lang} ${w}]`;
  {
    const { ctx, page } = await open(lang, w, "/app/notes.html?unit=ayah%3A2%3A256&label=2%3A256", "#newNoteBtn");
    await ctx.setOffline(true);
    await page.click("#newNoteBtn");
    await page.fill("#newTitleInput", "Offline note");
    await page.click("#newBodyEditor"); await page.keyboard.type("typed offline");
    await page.click("#newSaveBtn");
    await page.waitForTimeout(2500);
    const words = await statusWords(page);
    console.log(`  INFO  ${tag} notes.html new note, offline, words on screen: ${JSON.stringify(words)}`);
    check(`${tag} notes.html new note: offline, it does NOT claim "saved on this device" (a transaction keeps no local copy)`, (await notice(page)) === null);
    check(`${tag} notes.html new note: offline, the reader is told it failed (I15), not left waiting`, words.length > 0, JSON.stringify(words));
    check(`${tag} notes.html new note: the words do not promise an automatic save that will not happen`, !/automatically|নিজে থেকেই/.test(words) && /Nothing was saved|কিছুই সংরক্ষিত হয়নি/.test(words), JSON.stringify(words));
    check(`${tag} notes.html new note: Save is not stuck -- the form is still open and the button enabled`, await page.evaluate(() => { const b = document.getElementById("newSaveBtn"); return !!b && !b.disabled && b.getBoundingClientRect().width > 0; }));
    await ctx.close();
  }
  {
    const { ctx, page } = await open(lang, w, "/app/journey-map.html?note=n256", "[data-pane-title]");
    await ctx.setOffline(true);
    await page.click("[data-pane-bar] > [data-pane-edit-toggle]:not([hidden])");
    await page.waitForSelector("[data-edit-body]", { timeout: 10000 });
    await page.click("[data-edit-body]"); await page.keyboard.type(" typed offline");
    await page.click("[data-pane-bar] > [data-pane-edit-toggle]:not([hidden])");
    await page.waitForTimeout(2500);
    const words = await page.evaluate(() => [...document.querySelectorAll("[data-edit-status], [data-pane-status], #pageStatusMsg, #qr-write-failure-banner")].map((e) => e.textContent.trim()).filter(Boolean).join(" | "));
    console.log(`  INFO  ${tag} Notes pane edit, offline, words on screen: ${JSON.stringify(words)}`);
    check(`${tag} Notes pane edit: offline, it does NOT claim "saved on this device" (a transaction)`, (await notice(page)) === null);
    check(`${tag} Notes pane edit: offline, the reader is told it is not saved yet`, /Not saved yet|এখনও সংরক্ষিত হয়নি/.test(words), JSON.stringify(words));
    check(`${tag} Notes pane edit: the typed text is kept on the device (draft) for the retry`, await page.evaluate(() => Object.keys(localStorage).some((k) => /draft/i.test(k) && /typed offline/.test(localStorage.getItem(k) || ""))));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== offline save, shared tools${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

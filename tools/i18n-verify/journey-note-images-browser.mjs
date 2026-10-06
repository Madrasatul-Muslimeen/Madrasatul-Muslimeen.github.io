// Note pane Part C, item 35 (decisions 72, 81; issue #620) -- PICTURES IN NOTES: made small on the device, put in Firebase Storage
// under noteImages/{uid}/{id}.webp, kept in the Note as a path (never a src, a blob: or a token). Real input (setInputFiles with a
// large JPEG made in the page), the inline pane AND a pop-up window, en + bn, 390 / 820 / 1440. The Storage stub's call log
// (sessionStorage.__stubStorageLog) is the proof of what was sent; the write log is the proof of what was saved.
//
// MUTATE=src-survives | not-smaller | silent-failure | other-uid   serves one deliberately broken copy of a file.
// Run from the repository root with `node serve.js` running.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = process.argv[2] === "none" ? "" : (process.argv[2] || process.env.MUTATE || "");
const ONLY = process.argv[3] || ""; // a quick local run: node ... none "pane en 1440"

async function routeText(ctx, glob, file, from, to) {
  const src = fs.readFileSync(file, "utf8");
  if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from.slice(0, 60)}`);
  await ctx.route(glob, (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.replace(from, to) }));
}
async function routeMutation(ctx) {
  if (MUTATE === "src-survives") await routeText(ctx, "**/js/note-sanitize.js", "app/js/note-sanitize.js", "for (const a of [...img.attributes]) img.removeAttribute(a.name);", "");
  else if (MUTATE === "not-smaller") await routeText(ctx, "**/js/note-image.js", "app/js/note-image.js", "return { blob: r.blob };", "return { blob: file };");
  else if (MUTATE === "silent-failure") await routeText(ctx, "**/js/note-window.js", "app/js/note-window.js", "say(err?.message || t(\"The picture was not saved. Your Note is unchanged.\")); return;", "return;");
  else if (MUTATE === "other-uid") await routeText(ctx, "**/js/note-image.js", "app/js/note-image.js", "if (!uid || noteImageOwner(path) !== uid)", "if (false)");
  else if (MUTATE) throw new Error(`unknown mutation ${MUTATE}`);
}

const GOOD_OTHER = "noteImages/someone-else/AbCdEf12ghIJ.webp";
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteLinks = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(id, title, body, day) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: "rev-" + id, status: "active", createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own)); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  F("fSys", "Personal Journey Map", null, 0);
  F("fA", "Alpha", null, 0);
  N("n1", "Note One", "<p>First paragraph alpha.</p><p>Second paragraph gamma.</p>", 1);
  N("n2", "Note Two", '<p>Someone else\\'s picture:</p><img data-mmsa-image="${GOOD_OTHER}" alt="not mine">', 2);
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1);
})();`;

const hasBn = (s) => /[ঀ-৿]/.test(s || "");
async function resetWrites(page) { await page.evaluate(() => { window.__stubWriteData = []; sessionStorage.setItem("__stubWrites", "[]"); }); }
const writes = (page) => page.evaluate(() => (window.__stubWriteData || []).map((w) => ({ col: w.col, data: w.data })));
async function lastBody(page, count = 1) {
  await page.waitForFunction((c) => (window.__stubWriteData || []).filter((w) => w.data && typeof w.data.bodyHtml === "string").length >= c, count, { timeout: 8000 }).catch(() => null);
  const b = (await writes(page)).filter((w) => typeof w.data?.bodyHtml === "string").map((w) => w.data.bodyHtml);
  return b[b.length - 1] ?? "";
}
const bodyWrites = async (page) => (await writes(page)).filter((w) => typeof w.data?.bodyHtml === "string").length;
const storageLog = (page) => page.evaluate(() => JSON.parse(sessionStorage.getItem("__stubStorageLog") || "[]"));
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const smallTargets = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 39.5 || r.width < 39.5) && getComputedStyle(e).display !== "none"; }).map((e) => `${e.tagName}.${e.className}`), sel);

async function waitTree(page) {
  await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 2 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
}
async function openLeaf(page, id) {
  const showing = await page.evaluate(() => getComputedStyle(document.getElementById("folderNotes")).display !== "none" && !!document.querySelector("#folderNotes [data-note-leaf]"));
  if (!showing) {
    await page.evaluate(() => { const b = document.querySelector("#notePane:not([hidden]) [data-pane-back]"); if (b) b.click(); });
    if (await page.isVisible("#folderNotes [data-list-back]")) await page.click("#folderNotes [data-list-back]");
    await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
    await page.waitForSelector("#folderNotes [data-note-leaf]", { state: "visible" });
  }
  await page.click(`#folderNotes [data-note-leaf][data-note-id="${id}"] [data-note-open]`);
  await page.waitForSelector("#notePane:not([hidden]) [data-pane-title]");
}
async function popOut(page) {
  await page.click("#notePane [data-pane-menu-btn]");
  await page.waitForSelector("[data-pane-menu] [data-pane-popout]", { state: "visible" });
  await page.click("[data-pane-menu] [data-pane-popout]");
  await page.waitForSelector(".note-win [data-pane-body]");
}
async function startEdit(page, S) {
  await page.evaluate((s) => document.querySelector(`${s} [data-pane-edit-toggle]`).click(), S);
  await page.waitForSelector(`${S} [data-edit-body]`);
}
async function finishEdit(page, S) {
  await page.evaluate((s) => document.querySelector(`${s} [data-pane-edit-toggle]`).click(), S);
  await page.waitForSelector(`${S} [data-edit-body]`, { state: "detached" });
}
async function pressTool(page, S, cmd) {
  if (await page.evaluate(([s, c]) => getComputedStyle(document.querySelector(`${s} [data-cmd="${c}"]`)).display === "none", [S, cmd])) await page.click(`${S} [data-tb-tab="3"]`);
  await page.click(`${S} [data-cmd="${cmd}"]`);
}
const panelMsg = (page, S) => page.evaluate((s) => { const m = document.querySelector(`${s} [data-panel-msg]`); return m && !m.hidden ? m.textContent : ""; }, S);

// A large, photo-like JPEG made in the page (3000 x 2000: gradients, shapes and light noise), so the fixture really is much bigger than 400 KB.
async function makeJpeg(page) {
  const b64 = await page.evaluate(async () => {
    const c = document.createElement("canvas"); c.width = 3000; c.height = 2000;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 3000, 2000); grad.addColorStop(0, "#1f6f8b"); grad.addColorStop(0.5, "#e6b655"); grad.addColorStop(1, "#7a2e5a");
    g.fillStyle = grad; g.fillRect(0, 0, 3000, 2000);
    for (let i = 0; i < 400; i++) { g.fillStyle = `hsla(${(i * 47) % 360},60%,${30 + (i % 40)}%,0.5)`; g.beginPath(); g.arc((i * 733) % 3000, (i * 389) % 2000, 20 + (i % 90), 0, 7); g.fill(); }
    const d = g.getImageData(0, 0, 3000, 2000); let s = 12345;
    for (let i = 0; i < d.data.length; i += 4) { s = (s * 1103515245 + 12345) & 0x7fffffff; const n = (s % 17) - 8; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; }
    g.putImageData(d, 0, 0);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.95));
    const buf = new Uint8Array(await blob.arrayBuffer()); let bin = "";
    for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
    return btoa(bin);
  });
  return Buffer.from(b64, "base64");
}

const browser = await chromium.launch();
for (const lang of ["en", "bn"]) {
  for (const width of [390, 820, 1440]) {
    for (const surface of ["pane", "window"]) {
      const tag = `${surface} ${lang} ${width}px`;
      if (ONLY && !tag.includes(ONLY)) continue;
      const S = surface === "pane" ? "#notePane" : ".note-win";
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
      await ctx.route("**/js/siyagah-flags-readiness.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: `export const SIYAGAH_FLAGS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const SIYAGAH_FLAGS_DECLARATION = Object.freeze({ ready: true, decision: Object.freeze({ by: "master-architect", on: "2026-10-04", reference: "test-seam" }), gate: "E1", note: "test seam" });
export function isSiyagahFlagsReady() { return true; }
export function siyagahFlagsUnavailableReason() { return null; }` }));
      await routeMutation(ctx);
      await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); localStorage.setItem("mmsa-journey-note-window", JSON.stringify({ x: 40, y: 40, w: 900, h: 700 })); } catch {} });
      const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
      await waitTree(page);
      const jpeg = await makeJpeg(page);
      check(`${tag}: POSITIVE CONTROL -- the fixture really is a large JPEG (${Math.round(jpeg.length / 1024)} KB)`, jpeg.length > 800 * 1024 && jpeg[0] === 0xff && jpeg[1] === 0xd8);

      // ---- someone else's picture is never fetched ----
      await openLeaf(page, "n2");
      if (surface === "window") await popOut(page);
      await page.waitForSelector(`${S} [data-pane-body] img[data-mmsa-image]`);
      await page.waitForTimeout(400);
      const other = await page.$eval(`${S} [data-pane-body] img[data-mmsa-image]`, (i) => ({ state: i.dataset.imageState, src: i.getAttribute("src") }));
      check(`${tag}: another person's picture is not fetched from Storage (no getBlob) and shows no picture`, !(await storageLog(page)).some((e) => e.op === "getBlob") && other.state === "failed" && !other.src, JSON.stringify(other));

      // ---- insert ----
      if (surface === "window") await page.evaluate(() => document.querySelector('.note-win [data-win-close]')?.click());
      await openLeaf(page, "n1");
      if (surface === "window") await popOut(page);
      await startEdit(page, S);
      const btn = `${S} [data-cmd="image"]`;
      const lbl = await page.getAttribute(btn, "aria-label");
      check(`${tag}: the toolbar has ONE 🖼 button, named in ${lang}`, (await page.$$(btn)).length === 1 && lbl.length > 3 && (lang === "bn" ? hasBn(lbl) : /picture/i.test(lbl)), `${(await page.$$(btn)).length} buttons, label "${lbl}"`);
      check(`${tag}: the 🖼 button is a 40px target`, (await smallTargets(page, btn)).length === 0, JSON.stringify(await page.$eval(btn, (b) => b.getBoundingClientRect().toJSON())));
      await pressTool(page, S, "image");
      await page.waitForSelector(`${S} [data-edit-panel] [data-image-file]`, { state: "attached" });
      check(`${tag}: the picture panel's controls are 40px or taller and the page does not scroll sideways`, (await smallTargets(page, `${S} [data-edit-panel] button, ${S} [data-edit-panel] input[type=text], ${S} [data-edit-panel] select, ${S} [data-image-pick]`)).length === 0 && (await noSideways(page)), JSON.stringify(await smallTargets(page, `${S} [data-edit-panel] button, ${S} [data-edit-panel] select, ${S} [data-image-pick]`)));
      const note = await page.textContent(`${S} [data-image-note]`);
      check(`${tag}: the panel says it is private and made small, in ${lang}`, lang === "bn" ? hasBn(note) : /made small on this device/.test(note), note);
      await page.fill(`${S} [data-edit-panel] [data-image-alt]`, "A map of the river");
      await page.selectOption(`${S} [data-edit-panel] [data-image-width]`, "50");
      await resetWrites(page);
      await page.evaluate(() => sessionStorage.setItem("__stubStorageLog", "[]"));
      await page.setInputFiles(`${S} [data-edit-panel] [data-image-file]`, { name: "big.jpg", mimeType: "image/jpeg", buffer: jpeg });
      const appeared = await page.waitForSelector(`${S} [data-edit-body] img[data-mmsa-image]`, { timeout: 15000 }).catch(() => null);
      check(`${tag}: the picture was inserted into the Note`, !!appeared, await panelMsg(page, S));
      if (!appeared) { await page.close(); await ctx.close(); continue; }
      const log = await storageLog(page), up = log.filter((e) => e.op === "uploadBytes");
      check(`${tag}: exactly one upload, WebP, at noteImages/test-uid/{id}.webp`, up.length === 1 && up[0].type === "image/webp" && /^noteImages\/test-uid\/[A-Za-z0-9_-]{8,40}\.webp$/.test(up[0].path), JSON.stringify(up));
      check(`${tag}: it is MADE SMALL: at most 400 KB, about 200 KB (${Math.round((up[0]?.size ?? 0) / 1024)} KB), far under the ${Math.round(jpeg.length / 1024)} KB original`, up[0] && up[0].size <= 400 * 1024 && up[0].size <= 260 * 1024 && up[0].size > 10 * 1024, JSON.stringify(up));
      const shown = await page.$eval(`${S} [data-edit-body] img[data-mmsa-image]`, (i) => ({ alt: i.alt, w: i.getAttribute("width"), path: i.getAttribute("data-mmsa-image") }));
      check(`${tag}: the picture is in the Note with its alt text and width`, shown.alt === "A map of the river" && shown.w === "50" && shown.path === up[0]?.path, JSON.stringify(shown));
      await page.waitForFunction((s) => { const i = document.querySelector(`${s} [data-edit-body] img[data-mmsa-image]`); return i && i.complete && i.naturalWidth > 0; }, S, { timeout: 8000 });
      const dims = await page.$eval(`${S} [data-edit-body] img[data-mmsa-image]`, (i) => ({ nw: i.naturalWidth, nh: i.naturalHeight, w: i.getBoundingClientRect().width, body: i.closest("[data-edit-body]").getBoundingClientRect().width }));
      check(`${tag}: it was fetched back and shows (longest side ≤ 1600, width within the Note: ${Math.round(dims.w)} of ${Math.round(dims.body)}px)`, dims.nw <= 1600 && dims.nw > 100 && dims.w <= dims.body + 1, JSON.stringify(dims));
      check(`${tag}: no sideways overflow with the picture in the editor`, await noSideways(page));
      await finishEdit(page, S);
      const saved = await lastBody(page);
      check(`${tag}: the saved body has data-mmsa-image and NO src, no blob:, no token, no http`, /data-mmsa-image="noteImages\/test-uid\//.test(saved) && !/\ssrc=/i.test(saved) && !/blob:|token=|firebasestorage|https?:/i.test(saved), saved);
      check(`${tag}: the saved <img> carries only the path, alt and width`, await page.evaluate((h) => { const t = document.createElement("template"); t.innerHTML = h; const i = t.content.querySelector("img"); return !!i && [...i.attributes].map((a) => a.name).sort().join() === "alt,data-mmsa-image,width"; }, saved), saved);
      await page.waitForFunction((s) => { const i = document.querySelector(`${s} [data-pane-body] img[data-mmsa-image]`); return i && i.complete && i.naturalWidth > 0; }, S, { timeout: 8000 });
      check(`${tag}: read again, the picture shows`, await page.evaluate((s) => { const i = document.querySelector(`${s} [data-pane-body] img[data-mmsa-image]`); return !!i && i.naturalWidth > 0 && !i.getAttribute("src").startsWith("http"); }, S));
      const getBlobs = (await storageLog(page)).filter((e) => e.op === "getBlob" && e.path === up[0].path).length;
      check(`${tag}: it was fetched with Storage getBlob (never a download URL)`, getBlobs >= 1);
      check(`${tag}: no sideways overflow reading it`, await noSideways(page));

      // ---- refused: the Rules are not published yet ----
      await page.evaluate(() => sessionStorage.setItem("__stubStorageFail", "storage/unauthorized"));
      await startEdit(page, S);
      await pressTool(page, S, "image");
      await resetWrites(page);
      const imgsBefore = await page.$$eval(`${S} [data-edit-body] img`, (e) => e.length);
      await page.setInputFiles(`${S} [data-edit-panel] [data-image-file]`, { name: "big.jpg", mimeType: "image/jpeg", buffer: jpeg });
      await page.waitForFunction((s) => { const m = document.querySelector(`${s} [data-panel-msg]`); return m && !m.hidden && /Rules|নিয়ম|storage|স্টোরেজ/.test(m.textContent); }, S, { timeout: 15000 }).catch(() => null);
      const refusal = await panelMsg(page, S);
      check(`${tag}: a refused upload says so in words (${lang})`, lang === "bn" ? hasBn(refusal) && !/Storage Rules/.test(refusal) && refusal.length > 20 : /picture was not saved: picture storage is not switched on yet/.test(refusal) && /Storage Rules/.test(refusal), refusal);
      check(`${tag}: ...the upload was really attempted and refused`, (await storageLog(page)).some((e) => e.op === "uploadBytes" && e.refused === "storage/unauthorized"));
      check(`${tag}: ...and nothing was put into the Note, which still works`, (await page.$$eval(`${S} [data-edit-body] img`, (e) => e.length)) === imgsBefore && (await page.$(`${S} [data-edit-body]`)) !== null);
      await page.click(`${S} [data-edit-body]`);
      await page.keyboard.type(" typed after the refusal");
      await finishEdit(page, S);
      const after = await lastBody(page);
      check(`${tag}: ...so the next save is a normal one (the typed text, still one picture)`, /typed after the refusal/.test(after) && (after.match(/<img/g) || []).length === 1, after);

      // ---- not a picture ----
      await page.evaluate(() => sessionStorage.removeItem("__stubStorageFail"));
      await startEdit(page, S);
      await pressTool(page, S, "image");
      await page.evaluate(() => sessionStorage.setItem("__stubStorageLog", "[]"));
      await page.setInputFiles(`${S} [data-edit-panel] [data-image-file]`, { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
      await page.waitForFunction((s) => { const m = document.querySelector(`${s} [data-panel-msg]`); return m && !m.hidden && /not a picture|কোনো ছবি নয়/.test(m.textContent); }, S, { timeout: 8000 }).catch(() => null);
      const nope = await panelMsg(page, S);
      check(`${tag}: a file that is not a picture is refused in words, with no upload`, (lang === "bn" ? hasBn(nope) : /not a picture/.test(nope)) && (await storageLog(page)).every((e) => e.op !== "uploadBytes"), nope);
      await finishEdit(page, S);

      const real = errors.filter((e) => !/ERR_CERT|net::ERR|Failed to load resource|not your picture|object-not-found/i.test(String(e)));
      check(`${tag}: no page errors`, real.length === 0, real.slice(0, 3).join(" | "));
      await page.close(); await ctx.close();
    }
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

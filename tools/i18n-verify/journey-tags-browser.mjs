// Siyagah port round 7b (issue #461; Owner decision 42.5: Tags only, never Note
// Types): Tags on Notes -- the Note view's ⋯ → 🏷 Tags… picker and chips (in the
// inline pane AND a pop-up window, and on the Notes page), and the Tags block
// and Trash in the Mapping My Journey tray. Every action is driven through the
// REAL controls; the stub's DATA and write log are the proof.
//
// THE GATE. siyagah-sections-readiness.js is `ready: false` in the shipped file
// and Tags reuse it (no second gate). The "gate forced ON" cases route a
// REPLACEMENT copy of that one module in through ctx.route() -- the seam
// journey-sections-browser.mjs uses; production cannot reach it.
//
// MUTATION SEAM: MUTATE=a|b serves a deliberately broken copy of
// note-foundation.js through the same ctx.route() seam, so a check can be shown
// to FAIL without editing any file.
//   a: re-tag creates a new link instead of restoring the retired one
//   b: tagging also stamps a Note revision
// Run from the repository root with `node serve.js` running.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = process.env.MUTATE || (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);

// ---- the candidate's own field lists, read out of the file, never retyped ----
const CANDIDATE = fs.readFileSync("docs/governance/2026-10-01-siyagah-round7-DEPLOYMENT-candidate.rules", "utf8");
function listAfter(fn, kind) {
  const at = CANDIDATE.indexOf(`function ${fn}()`);
  if (at < 0) throw new Error(`candidate has no ${fn}()`);
  const m = new RegExp(`${kind}\\(\\[([^\\]]*)\\]\\)`).exec(CANDIDATE.slice(at));
  if (!m) throw new Error(`no ${kind} list after ${fn}()`);
  const out = [...m[1].matchAll(/'([A-Za-z]+)'/g)].map((x) => x[1]);
  if (out.length < 8) throw new Error(`implausibly short ${kind} list for ${fn}`);
  return out;
}
const ALLOWED = { noteTags: listAfter("tagShapeOk", "hasOnly"), noteTagLinks: listAfter("tagLinkShapeOk", "hasOnly") };
const REQUIRED = { noteTags: listAfter("tagShapeOk", "hasAll"), noteTagLinks: listAfter("tagLinkShapeOk", "hasAll") };

const READY_OPEN = `
export const SIYAGAH_SECTIONS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const SIYAGAH_SECTIONS_DECLARATION = Object.freeze({ ready: true, decision: Object.freeze({ by: "master-architect", on: "2026-10-01", reference: "test-seam" }), gate: "E1", note: "test seam" });
export function isSiyagahSectionsReady() { return true; }
export function siyagahSectionsUnavailableReason() { return null; }
`;
async function routeMutation(ctx) {
  if (!MUTATE) return;
  let src = fs.readFileSync("app/js/note-foundation.js", "utf8");
  if (MUTATE === "a") {
    if (!src.includes("  if (retired) {")) throw new Error("mutation a: anchor missing");
    src = src.replace("  if (retired) {", "  if (false) {");
  } else if (MUTATE === "b") {
    const anchor = "  const owner = ownership({ tenantId, ownerPersonId, ownerUid });\n  const existing = await findTagLinksFor";
    if (!src.includes(anchor)) throw new Error("mutation b: anchor missing");
    src = src.replace(anchor, `  await createDocument(db, TENANT.NOTE_REVISIONS, noteFoundationDocId(tenantId, newNoteEntityId()), { noteId, tenantId, ownerPersonId, ownerUid }, actorUid);\n${anchor}`);
  }
  await ctx.route("**/js/note-foundation.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src }));
}

const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(id, title, body, day) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: "rev-" + id, status: "active", createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own)); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  F("fSys", "Personal Journey Map", null, 0);
  F("fA", "Alpha", null, 0);
  N("n1", "Note One", "<p>First body.</p>", 1); N("n2", "Note Two", "<p>Second body.</p>", 2);
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1);
})();`;

const NOTES_SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1, createdBy: "test-uid" };
  DATA.notes = []; DATA.noteSources = []; DATA.noteRevisions = []; DATA.noteTags = []; DATA.noteTagLinks = [];
  function N(logical, title, body) {
    var id = logical.slice(1).repeat(32);
    DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: "rev-" + id, status: "active", visibility: "private", createdAt: "2026-09-01T10:00:00.000Z", updatedAt: "2026-09-01T10:00:00.000Z" }, own));
    DATA.noteSources.push(Object.assign({ _id: "t1__s-" + id, sourceLinkId: "s-" + id, noteId: id, sourceKey: "ayah:2:255", sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active", createdAt: "2026-09-01T10:00:00.000Z", updatedAt: "2026-09-01T10:00:00.000Z" }, own));
  }
  N("n1", "Note One", "<p>First body.</p>");
})();`;

const browser = await chromium.launch();
const hasBn = (s) => /[ঀ-৿]/.test(s || "");
const GATE_EN = "Tags switch on once the new Firebase Rules are published.";
const tagGateBn = "নতুন ফায়ারবেস নিয়ম প্রকাশিত হলেই ট্যাগ চালু হবে।";

async function resetWrites(page) { await page.evaluate(() => { window.__stubWriteData = []; sessionStorage.setItem("__stubWrites", "[]"); }); }
async function writes(page) {
  return page.evaluate(() => (window.__stubWriteData || []).map((w) => ({ col: w.col, id: w.id, op: w.kind.replace(/^tx-/, ""), keys: Object.keys(w.data || {}), data: w.data })));
}
const tagWrites = (ws) => ws.filter((w) => w.col === "noteTags" || w.col === "noteTagLinks");
const status = (page) => page.evaluate(() => { const e = document.getElementById("pageStatusMsg"); return e && getComputedStyle(e).display !== "none" ? e.textContent : ""; });
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const dataOf = (page, col) => page.evaluate((c) => JSON.parse(JSON.stringify(window.__DATA[c] || [])), col);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
const vis = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0 && r.height > 0; }, sel);
async function waitTree(page) {
  await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 2 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
}
function checkFieldSets(tag, ws) {
  for (const w of tagWrites(ws)) {
    const extra = w.keys.filter((k) => !ALLOWED[w.col].includes(k));
    check(`${tag}: ${w.col} ${w.op} writes only fields the candidate allows`, extra.length === 0, `outside hasOnly: ${extra.join(",")}`);
    if (w.op === "set") {
      const stamps = ["schemaVersion", "createdAt", "updatedAt", "createdBy"];
      const missing = REQUIRED[w.col].filter((k) => !w.keys.includes(k) && !stamps.includes(k));
      check(`${tag}: ${w.col} create carries every hasAll field`, missing.length === 0, `missing: ${missing.join(",")}`);
    }
    if (w.op === "update") check(`${tag}: ${w.col} update never changes noteId, tagId or linkId`, !w.keys.some((k) => ["noteId", "tagId", "linkId", "tenantId", "ownerPersonId"].includes(k)));
  }
}
async function contrast(page, selector) {
  return page.evaluate((sel) => {
    const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const el = document.querySelector(sel);
    if (!el) return 0;
    const fg = parse(getComputedStyle(el).color);
    let bgEl = el, bg = null;
    while (bgEl) { const c = parse(getComputedStyle(bgEl).backgroundColor); if (c.length >= 3 && (c.length === 3 || c[3] > 0.99)) { bg = c; break; } bgEl = bgEl.parentElement; }
    bg = bg || [255, 255, 255];
    const [a, b] = [lum(fg), lum(bg)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, selector);
}
const smallTargets = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 39.5 || r.width < 39.5) && getComputedStyle(e).display !== "none"; }).map((e) => `${e.tagName}.${e.className}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`), sel);

const leafTitle = (id) => `[data-note-leaf][data-note-id="${id}"][data-in-folder="fA"] [data-note-open]`;
const leafToggle = (id) => `[data-note-leaf][data-note-id="${id}"][data-in-folder="fA"] [data-note-toggle]`;
const leafWindowBtn = (id) => `[data-note-leaf][data-note-id="${id}"][data-in-folder="fA"] [data-note-window]`;
const chipsIn = (page, scope) => page.$$eval(`${scope} [data-tag-chip]`, (els) => els.map((e) => e.textContent.trim()));
const pickerOpen = async (page, menuBtn, menu) => {
  await page.click(menuBtn);
  await page.waitForSelector(`${menu} [data-pane-tags]`, { state: "visible" });
  await page.click(`${menu} [data-pane-tags]`);
  await page.waitForSelector(".tag-picker");
};
const pickerClose = async (page) => { await page.click("[data-tag-close]"); await page.waitForFunction(() => !document.querySelector(".tag-picker")); };

for (const lang of ["en", "bn"]) {
  for (const width of [390, 820, 1280]) {
    // =============================== GATE ON (forced) ===============================
    {
      const tag = `ON ${lang} ${width}px`;
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
      await ctx.route("**/js/siyagah-sections-readiness.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_OPEN }));
      await routeMutation(ctx);
      await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
      const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
      await waitTree(page);
      await resetWrites(page);

      // ---- create a tag and tag a Note from the PANE ----
      await page.click(leafTitle("n1"));
      await page.waitForSelector("#notePane:not([hidden])");
      await pickerOpen(page, "[data-pane-menu-btn]", "[data-pane-menu]");
      check(`${tag}: the Tags picker shows no gate sentence once on`, !(await vis(page, "[data-tag-gate]")));
      check(`${tag}: the picker's targets are all 40px or more`, (await smallTargets(page, ".tag-picker button, .tag-picker input[type=text], .tag-picker input[type=search], .tag-pick-row")).length === 0, JSON.stringify(await smallTargets(page, ".tag-picker button, .tag-picker input[type=text], .tag-picker input[type=search], .tag-pick-row")));
      await page.fill("[data-tag-new-name]", "Prayer");
      await page.click("[data-tag-new]");
      await page.waitForFunction(() => document.querySelectorAll(".tag-pick-row input:checked").length === 1);
      await pickerClose(page);
      check(`${tag}: the pane's Details line shows the tag as a chip`, JSON.stringify(await chipsIn(page, "#notePane")).includes("Prayer"), JSON.stringify(await chipsIn(page, "#notePane")));
      let tags = await dataOf(page, "noteTags"), links = await dataOf(page, "noteTagLinks");
      check(`${tag}: one tag document and one active link exist`, tags.length === 1 && links.length === 1 && links[0].status === "active" && links[0].noteId === "n1" && links[0].tagId === tags[0].tagId);
      const linkId = links[0]?.linkId;
      let w = await writes(page);
      checkFieldSets(tag, w);
      check(`${tag}: tagging wrote no Note and no revision`, w.every((x) => x.col !== "notes" && x.col !== "noteRevisions"), JSON.stringify(w.map((x) => x.col)));
      check(`${tag}: the tag create carries ownerUid and the owner fields`, w.filter((x) => x.col === "noteTags" && x.op === "set").every((x) => x.data.ownerUid && x.data.ownerPersonId && x.data.tenantId && x.data.status === "active" && x.data.name === "Prayer"));

      // ---- duplicate name refused in a sentence, no write ----
      await resetWrites(page);
      await pickerOpen(page, "[data-pane-menu-btn]", "[data-pane-menu]");
      await page.fill("[data-tag-new-name]", "  prayer ");
      await page.click("[data-tag-new]");
      await page.waitForFunction(() => !document.querySelector("[data-tag-msg]").hidden);
      const dupMsg = await page.textContent("[data-tag-msg]");
      check(`${tag}: a duplicate name (any case) is refused in a sentence`, /Prayer|tag|ট্যাগ/.test(dupMsg) && (lang === "en" ? dupMsg.includes("already have a tag") : hasBn(dupMsg)), dupMsg);
      check(`${tag}: the refused duplicate wrote nothing`, tagWrites(await writes(page)).length === 0);

      // ---- untag, then re-tag RESTORES the same link ----
      await resetWrites(page);
      await page.uncheck(".tag-pick-row input");
      await page.waitForFunction(() => !document.querySelector(".tag-pick-row input:checked"));
      links = await dataOf(page, "noteTagLinks");
      check(`${tag}: untag retires the link (status retired, document kept)`, links.length === 1 && links[0].status === "retired" && links[0].linkId === linkId);
      check(`${tag}: untagging removes the chip`, (await chipsIn(page, "#notePane")).length === 0);
      await page.check(".tag-pick-row input");
      await page.waitForFunction(() => document.querySelectorAll(".tag-pick-row input:checked").length === 1);
      links = await dataOf(page, "noteTagLinks");
      check(`${tag}: re-tag RESTORES the same link (same linkId, no second document)`, links.length === 1 && links[0].linkId === linkId && links[0].status === "active", JSON.stringify(links.map((l) => [l.linkId, l.status])));
      w = await writes(page);
      checkFieldSets(tag, w);
      check(`${tag}: untag and re-tag wrote no Note and no revision`, w.every((x) => x.col !== "notes" && x.col !== "noteRevisions"));
      await pickerClose(page);

      // ---- a POP-UP window: tag Note Two from it ----
      await page.click(".note-pane-bar [data-pane-back]").catch(() => {});
      await page.waitForSelector(leafToggle("n2"), { state: "visible", timeout: 5000 }).catch(() => {});
      await page.click(leafToggle("n2"));
      await page.click(leafWindowBtn("n2"));
      await page.waitForSelector('.note-win[data-note-id="n2"]');
      await pickerOpen(page, '.note-win[data-note-id="n2"] [data-pane-menu-btn]', '.note-win[data-note-id="n2"] [data-pane-menu]');
      await page.check(".tag-pick-row input");
      await page.waitForFunction(() => document.querySelectorAll(".tag-pick-row input:checked").length === 1);
      await pickerClose(page);
      links = await dataOf(page, "noteTagLinks");
      check(`${tag}: a pop-up window can tag too (link for n2)`, links.filter((l) => l.noteId === "n2" && l.status === "active").length === 1);
      const chipEl = '.note-win[data-note-id="n2"] [data-tag-chip]';
      check(`${tag}: closed Details shows no half-visible tag chip`, !(await vis(page, chipEl)));
      await page.click('.note-win[data-note-id="n2"] [data-win-details]');
      check(`${tag}: open Details shows the chip`, await vis(page, chipEl));
      await page.evaluate(() => document.querySelector(".note-win [data-win-close]").click());
      await page.waitForFunction(() => !document.querySelector(".note-win"));

      // ---- the tray's Tags block ----
      await page.evaluate(() => { const b = document.querySelector("#notePane:not([hidden]) [data-pane-back]"); if (b) b.click(); });
      await page.waitForSelector("[data-tags-block] [data-tag-item]");
      check(`${tag}: the Tags block lists the tag with a count of 2 Notes`, (await page.textContent("[data-tag-item] [data-tag-count]")).trim() === "2");
      check(`${tag}: the Tags block sits below the folder tree`, await page.evaluate(() => { const a = document.querySelector("[data-folder-tree]"), b = document.querySelector("[data-tags-block]"); return !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)); }));
      await page.click("[data-tag-item] [data-tag-open]");
      await page.waitForSelector("[data-tag-notes] [data-tag-note]");
      const listed = await page.$$eval("[data-tag-note]", (els) => els.map((e) => e.dataset.tagNote).sort());
      check(`${tag}: tapping the tag lists its two Notes`, JSON.stringify(listed) === '["n1","n2"]', JSON.stringify(listed));
      await page.click('[data-tag-note="n2"]');
      await page.waitForSelector("#notePane:not([hidden])");
      check(`${tag}: opening a tag's Note opens it in the Note view`, (await page.textContent("#notePane [data-pane-title]")).includes("Note Two"));
      await page.evaluate(() => document.querySelector("#notePane [data-pane-back]").click());
      await page.waitForSelector("[data-tags-block] [data-tag-item]");

      // rename
      await resetWrites(page);
      await page.click("[data-tag-item] .folder-menu-btn");
      await page.click("[data-tag-item] [data-tag-rename]");
      await page.fill("[data-tag-rename-input]", "Salah");
      await page.press("[data-tag-rename-input]", "Enter");
      await page.waitForFunction(() => document.querySelector("[data-tag-name]")?.textContent === "Salah");
      check(`${tag}: rename writes only the name`, JSON.stringify(tagWrites(await writes(page)).map((x) => x.keys.filter((k) => k !== "updatedAt"))) === '[["name"]]', JSON.stringify(tagWrites(await writes(page)).map((x) => x.keys)));
      // colour
      await resetWrites(page);
      await page.click("[data-tag-item] .folder-menu-btn");
      await page.click("[data-tag-item] [data-tag-look]");
      await page.waitForSelector("#siyagahDialog [data-swatch]");
      check(`${tag}: the tag colour dialog has no Bold toggle (tags have no bold)`, (await page.$("#siyagahDialog [data-look-bold]")) === null);
      check(`${tag}: swatches are 40px or more`, (await smallTargets(page, "#siyagahDialog .swatch")).length === 0);
      await page.click('#siyagahDialog [data-swatch="#2E8B57"]');
      await page.click("#siyagahDialog [data-look-apply]");
      await page.waitForFunction(() => document.querySelector("[data-tag-item] [data-look-dot]"));
      tags = await dataOf(page, "noteTags");
      check(`${tag}: colour is stored as #RRGGBB and shows as a dot`, tags[0].color === "#2E8B57");
      check(`${tag}: colour writes only the colour`, JSON.stringify(tagWrites(await writes(page)).map((x) => x.keys.filter((k) => k !== "updatedAt"))) === '[["color"]]');
      // chip colour dot in the Note view
      await page.click('[data-tag-item] [data-tag-open]').catch(() => {});

      // Trash -> Restore
      await resetWrites(page);
      await page.click("[data-tag-item] .folder-menu-btn");
      await page.click("[data-tag-item] [data-tag-delete]");
      await page.click("[data-tag-confirm-yes]");
      await page.waitForFunction(() => !document.querySelector("[data-tag-item]"));
      w = await writes(page);
      check(`${tag}: Trash retires the tag and leaves its links alone`, tagWrites(w).length === 1 && tagWrites(w)[0].col === "noteTags" && tagWrites(w)[0].data.status === "retired");
      links = await dataOf(page, "noteTagLinks");
      check(`${tag}: both links are still active after the tag is trashed`, links.length === 2 && links.every((l) => l.status === "active"));
      await page.click("#openTrashBtn").catch(async () => { await page.click("[data-bar-palette-toggle]"); await page.click("#openTrashBtn"); });
      await page.waitForSelector("[data-trash-tag-id]");
      check(`${tag}: Trash lists the retired tag with Restore`, (await page.textContent("[data-trash-tag-id]")).includes("Salah") && await vis(page, "[data-trash-tag-id] [data-trash-restore]"));
      await resetWrites(page);
      await page.click("[data-trash-tag-id] [data-trash-restore]");
      await page.waitForFunction(() => !document.querySelector("[data-trash-tag-id]"));
      tags = await dataOf(page, "noteTags");
      check(`${tag}: Restore brings the tag back (active)`, tags[0].status === "active");
      await page.click("#trashBackBtn");
      await page.waitForSelector("[data-tags-block] [data-tag-item]");
      check(`${tag}: the restored tag comes back with its 2 Notes`, (await page.textContent("[data-tag-item] [data-tag-count]")).trim() === "2");

      w = await writes(page);
      checkFieldSets(tag, w);
      check(`${tag}: no write ever touched notes or noteRevisions`, (await page.evaluate(() => (window.__DATA.noteRevisions || []).length)) === 0);
      check(`${tag}: no sideways scroll`, await noSideways(page));
      check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
      if (lang === "bn") check(`${tag}: the Tags block is in Bangla`, hasBn(await page.textContent("[data-tags-block] .tags-title")));
      check(`${tag}: the Tags block's targets are 40px or more`, (await smallTargets(page, "[data-tags-block] button, [data-tags-block] input")).length === 0, JSON.stringify(await smallTargets(page, "[data-tags-block] button, [data-tags-block] input")));
      await ctx.close();
    }

    // =============================== GATE OFF (as shipped) ===============================
    {
      const tag = `OFF ${lang} ${width}px`;
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
      await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
      const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
      await waitTree(page);
      await resetWrites(page);
      const gate = lang === "en" ? GATE_EN : tagGateBn;
      check(`${tag}: the Tags block shows and says the sentence`, (await page.textContent("[data-tags-gate-note]")).trim() === gate, await page.textContent("[data-tags-gate-note]"));
      await page.fill("[data-tag-new-input]", "Prayer");
      await page.click("[data-tag-new-btn]");
      await settle(page, 300);
      check(`${tag}: ＋ New tag says the sentence and writes nothing`, (await status(page)).trim() === gate && tagWrites(await writes(page)).length === 0, await status(page));
      await page.click(leafTitle("n1"));
      await page.waitForSelector("#notePane:not([hidden])");
      await pickerOpen(page, "[data-pane-menu-btn]", "[data-pane-menu]");
      check(`${tag}: the picker says the sentence`, (await page.textContent("[data-tag-gate]")).trim() === gate);
      check(`${tag}: the picker's new-tag controls are off`, await page.evaluate(() => document.querySelector("[data-tag-new]").disabled && document.querySelector("[data-tag-new-name]").disabled));
      check(`${tag}: nothing was written`, tagWrites(await writes(page)).length === 0 && (await dataOf(page, "noteTags")).length === 0);
      check(`${tag}: the gate sentence is readable (4.5:1)`, (await contrast(page, ".tag-picker .gate-note")) >= 4.5);
      check(`${tag}: no sideways scroll`, await noSideways(page));
      check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0);
      await ctx.close();
    }
  }
}

// =============================== NOTES PAGE (gate forced on) ===============================
for (const lang of ["en", "bn"]) {
  for (const width of [390, 820, 1280]) {
    const tag = `NOTES ${lang} ${width}px`;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: NOTES_SEED });
    await ctx.route("**/js/siyagah-sections-readiness.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_OPEN }));
    await routeMutation(ctx);
    const { page, errors } = await openPage(ctx, "/app/notes.html?unit=" + encodeURIComponent("ayah:2:255") + "&label=Test");
    const id = "n".slice(1) + "1"; // placeholder, replaced below
    const nid = "1".repeat(32);
    await page.waitForSelector(`.note-card[data-note-id="${nid}"]`, { timeout: 15000 });
    await resetWrites(page);
    await page.click(`.note-card[data-note-id="${nid}"] [data-note-window]`);
    await page.waitForSelector(`.note-win[data-note-id="${nid}"]`);
    await pickerOpen(page, `.note-win[data-note-id="${nid}"] [data-pane-menu-btn]`, `.note-win[data-note-id="${nid}"] [data-pane-menu]`);
    await page.fill("[data-tag-new-name]", "Prayer");
    await page.click("[data-tag-new]");
    await page.waitForFunction(() => document.querySelectorAll(".tag-pick-row input:checked").length === 1);
    await pickerClose(page);
    const links = await dataOf(page, "noteTagLinks");
    check(`${tag}: the Notes page window can tag a Note`, links.length === 1 && links[0].noteId === nid && links[0].status === "active");
    const w = await writes(page);
    checkFieldSets(tag, w);
    check(`${tag}: tagging wrote no Note, no revision and no Journaling evidence`, w.every((x) => x.col !== "notes" && x.col !== "noteRevisions" && !/evidence|activity/i.test(x.col || "")), JSON.stringify(w.map((x) => x.col)));
    check(`${tag}: no sideways scroll`, await noSideways(page));
    check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}

// =============================== CHIP CONTRAST, Night and Light ===============================
for (const look of ["night", "light"]) {
  const ctx = await newContext(browser, { viewport: { width: 1280, height: 900 }, extraSeedJs: SEED + `
(function () { var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  DATA.noteTags.push(Object.assign({ _id: "t1__g1", tagId: "g1", name: "Prayer", color: "#2E8B57", status: "active" }, own));
  DATA.noteTagLinks.push(Object.assign({ _id: "t1__l1", linkId: "l1", noteId: "n1", tagId: "g1", status: "active" }, own)); })();` });
  await ctx.route("**/js/siyagah-sections-readiness.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_OPEN }));
  await ctx.addInitScript((l) => { try { localStorage.setItem("mm_card_look", l); localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} }, look);
  const { page } = await openPage(ctx, "/app/journey-map.html#folders");
  await waitTree(page);
  await page.click(leafTitle("n1"));
  await page.waitForSelector("#notePane [data-tag-chip]");
  check(`[${look}] a stored tag shows as a chip in the Note view (positive control)`, (await chipsIn(page, "#notePane")).length === 1);
  check(`[${look}] the chip reads at 4.5:1 or better`, (await contrast(page, "#notePane [data-tag-chip]")) >= 4.5, String(await contrast(page, "#notePane [data-tag-chip]")));
  await pickerOpen(page, "[data-pane-menu-btn]", "[data-pane-menu]");
  check(`[${look}] the picker's names read at 4.5:1 or better`, (await contrast(page, ".tag-pick-name")) >= 4.5);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (MUTATE=${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

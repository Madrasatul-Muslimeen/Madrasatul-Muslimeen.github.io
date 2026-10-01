// Siyagah port round 7a (issue #458): Sections and folder colour + bold in the
// Mapping My Journey tray, behind siyagah-sections-readiness.js. Every action
// is driven through the REAL controls; no service function is called from here.
//
// THE GATE. It is `ready: false` in the shipped file. The "gate forced ON"
// cases route a REPLACEMENT copy of that one module in through ctx.route() --
// the technique quran-word-levels-rendered.mjs used before its gate went on --
// a seam production cannot reach (a browser only ever fetches the real file).
//
// Run from the repository root with `node serve.js` running.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

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
const ALLOWED = {
  noteFolders: listAfter("folderShapeOk", "hasOnly"),
  noteSections: listAfter("sectionShapeOk", "hasOnly"),
};
const REQUIRED = { noteSections: listAfter("sectionShapeOk", "hasAll") };

const READY_OPEN = `
export const SIYAGAH_SECTIONS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const SIYAGAH_SECTIONS_DECLARATION = Object.freeze({ ready: true, decision: Object.freeze({ by: "master-architect", on: "2026-10-01", reference: "test-seam" }), gate: "E1", note: "test seam" });
export function isSiyagahSectionsReady() { return true; }
export function siyagahSectionsUnavailableReason() { return null; }
`;

const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts() { return { toDate: function () { return new Date("2026-09-01T10:00:00Z"); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = [];
  function F(id, name, parent, order, role) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: role || "user", order: order, status: "active", updatedAt: ts() }, own)); }
  F("fSys", "Personal Journey Map", null, 0, "journey-map");
  F("fA", "Alpha", null, 0); F("fB", "Beta", null, 1); F("fBk", "BetaKid", "fB", 0);
  F("fL", "A really quite long folder name that must still fit its row next to the colour dot at three twenty pixels wide", null, 2);
})();`;

const browser = await chromium.launch();
const hasBn = (s) => /[ঀ-৿]/.test(s || "");
const GATE_EN = "Sections and folder colours switch on once the new Firebase Rules are published.";

async function resetWrites(page) { await page.evaluate(() => { window.__stubWriteData = []; sessionStorage.setItem("__stubWrites", "[]"); }); }
async function writes(page) {
  return page.evaluate(() => {
    return (window.__stubWriteData || []).map((w) => ({ col: w.col, id: w.id, op: w.kind.replace(/^tx-/, ""), keys: Object.keys(w.data || {}), data: w.data }));
  });
}
const sectionish = (ws) => ws.filter((w) => w.col === "noteSections" || (w.col === "noteFolders" && w.keys.some((k) => ["color", "bold", "sectionId"].includes(k))));
const status = (page) => page.evaluate(() => { const e = document.getElementById("pageStatusMsg"); return e && getComputedStyle(e).display !== "none" ? e.textContent : ""; });
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function waitTree(page) {
  await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 4 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
}
const settle = (page, ms = 600) => page.waitForTimeout(ms);
async function folderMenu(page, id, item) {
  await page.click(`.folder-row[data-folder-id="${id}"] .folder-menu-btn`);
  await page.click(`.folder-row[data-folder-id="${id}"] [data-folder-${item}]`);
}
async function sectionMenu(page, name, item) {
  const sel = `.section-header:has([data-section-name]:text-is("${name}"))`;
  await page.click(`${sel} .folder-menu-btn`);
  await page.click(`${sel} [data-section-${item}]`);
}
const sectionNames = (page) => page.$$eval(".section-header [data-section-name]", (els) => els.map((e) => e.textContent));
/** Folder ids in DISPLAY order (rows only). */
const rowOrder = (page) => page.$$eval("[data-folder-tree] .folder-row[data-folder-id]", (rs) => rs.map((r) => r.dataset.folderId).filter(Boolean));
function checkFieldSets(tag, ws) {
  for (const w of ws.filter((x) => ALLOWED[x.col])) {
    const extra = w.keys.filter((k) => !ALLOWED[w.col].includes(k));
    check(`${tag}: ${w.col} ${w.op} writes only fields the candidate allows`, extra.length === 0, `outside hasOnly: ${extra.join(",")}`);
    if (w.op === "set" && REQUIRED[w.col]) {
      const stamps = ["schemaVersion", "createdAt", "updatedAt", "createdBy"];
      const missing = REQUIRED[w.col].filter((k) => !w.keys.includes(k) && !stamps.includes(k));
      check(`${tag}: ${w.col} create carries every hasAll field`, missing.length === 0, `missing: ${missing.join(",")}`);
    }
  }
}
async function contrast(page, selector) {
  return page.evaluate((sel) => {
    const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const el = document.querySelector(sel);
    const fg = parse(getComputedStyle(el).color);
    let bgEl = el, bg = null;
    while (bgEl) { const c = parse(getComputedStyle(bgEl).backgroundColor); if (c.length >= 3 && (c.length === 3 || c[3] > 0.99)) { bg = c; break; } bgEl = bgEl.parentElement; }
    bg = bg || [255, 255, 255];
    const [a, b] = [lum(fg), lum(bg)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, selector);
}

for (const lang of ["en", "bn"]) {
  for (const width of [390, 820, 1280]) {
    // =============================== GATE ON (forced) ===============================
    {
      const tag = `ON ${lang} ${width}px`;
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
      await ctx.route("**/js/siyagah-sections-readiness.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_OPEN }));
      await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA", "fB", "fBk"])); } catch {} });
      const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
      await waitTree(page);
      page.on("dialog", (d) => d.accept());

      check(`${tag}: nothing moves for an Owner with no section (no header, same folders)`, (await page.$$(".section-header")).length === 0 && (await rowOrder(page)).length === 5);

      // ---- create, rename, reorder, colour a section ----
      await resetWrites(page);
      await page.fill("#newFolderName", "Work");
      await page.click("#newSectionBtn");
      await page.waitForSelector(".section-header");
      await page.fill("#newFolderName", "Home");
      await page.click("#newSectionBtn");
      await page.waitForFunction(() => document.querySelectorAll(".section-header").length === 2);
      let w = await writes(page);
      check(`${tag}: two sections created (noteSections creates)`, w.filter((x) => x.col === "noteSections" && x.op === "set").length === 2);
      check(`${tag}: a section's create carries ownerUid and the owner fields`, w.filter((x) => x.col === "noteSections" && x.op === "set").every((x) => x.data.ownerUid && x.data.ownerPersonId && x.data.tenantId && x.data.status === "active"));
      checkFieldSets(tag, w);
      check(`${tag}: sections are listed by order`, JSON.stringify(await sectionNames(page)) === '["Work","Home"]', JSON.stringify(await sectionNames(page)));
      check(`${tag}: sections sit BELOW the unnamed block of root folders`, await page.evaluate(() => {
        const rows = [...document.querySelectorAll("[data-folder-tree] > li")];
        const firstSection = rows.findIndex((li) => li.hasAttribute("data-section-item"));
        return firstSection > 0;
      }));

      await resetWrites(page);
      await sectionMenu(page, "Work", "rename");
      await page.fill("[data-section-rename-input]", "Work life");
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => [...document.querySelectorAll(".section-header [data-section-name]")].some((e) => e.textContent === "Work life"));
      w = await writes(page);
      check(`${tag}: rename writes only name`, w.some((x) => x.col === "noteSections" && x.keys.includes("name")) && w.filter((x) => x.col === "noteSections").every((x) => x.keys.every((k) => ["name", "updatedAt"].includes(k))), JSON.stringify(w.map((x) => x.keys)));
      checkFieldSets(tag + " rename", w);

      await resetWrites(page);
      await sectionMenu(page, "Home", "up");
      await page.waitForFunction(() => document.querySelector(".section-header [data-section-name]")?.textContent === "Home");
      w = await writes(page);
      check(`${tag}: Move up reorders the section (order written)`, JSON.stringify(await sectionNames(page)) === '["Home","Work life"]' && w.some((x) => x.col === "noteSections" && x.keys.includes("order")));
      checkFieldSets(tag + " reorder", w);

      await resetWrites(page);
      await sectionMenu(page, "Home", "look");
      const swatches = await page.$$eval("#siyagahDialog .swatch", (els) => els.map((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; }));
      check(`${tag}: the palette has about ten swatches plus None, each at least 40px`, swatches.length >= 10 && swatches.length <= 12 && swatches.every((s) => s.w >= 40 && s.h >= 40), JSON.stringify(swatches));
      check(`${tag}: no gate note shows when the gate is open`, (await page.$("[data-sections-gate-note]")) === null);
      check(`${tag}: the dialog has no sideways scroll`, await noSideways(page));
      await page.click('#siyagahDialog [data-swatch="#2F6FDE"]');
      await page.check("#siyagahDialog [data-look-bold]");
      await page.click("#siyagahDialog [data-look-apply]");
      await page.waitForSelector(".section-header [data-look-dot]");
      w = await writes(page);
      const sw = w.find((x) => x.col === "noteSections" && x.keys.includes("color"));
      check(`${tag}: section colour + bold written together (#2F6FDE, true)`, sw && sw.data.color === "#2F6FDE" && sw.data.bold === true, JSON.stringify(sw));
      checkFieldSets(tag + " section look", w);
      check(`${tag}: the section shows its colour dot and bold`, await page.evaluate(() => { const n = document.querySelector(".section-header [data-section-name]"); return !!document.querySelector(".section-header [data-look-dot]") && parseInt(getComputedStyle(n).fontWeight, 10) >= 700; }));

      // ---- folder colour + bold, then clear to None ----
      await resetWrites(page);
      await folderMenu(page, "fA", "look");
      await page.click('#siyagahDialog [data-swatch="#C0392B"]');
      await page.check("#siyagahDialog [data-look-bold]");
      await page.click("#siyagahDialog [data-look-apply]");
      await page.waitForSelector('.folder-row[data-folder-id="fA"] [data-look-dot]');
      w = await writes(page);
      const fw = w.find((x) => x.col === "noteFolders" && x.keys.includes("color"));
      check(`${tag}: folder colour + bold written (#C0392B, true)`, fw && fw.data.color === "#C0392B" && fw.data.bold === true && fw.keys.every((k) => ["color", "bold", "updatedAt"].includes(k)), JSON.stringify(fw));
      checkFieldSets(tag + " folder look", w);
      const c1 = await contrast(page, '.folder-row[data-folder-id="fA"] [data-folder-name]');
      check(`${tag}: a coloured folder's name keeps 4.5:1 (${c1.toFixed(2)})`, c1 >= 4.5);
      await resetWrites(page);
      await folderMenu(page, "fA", "look");
      check(`${tag}: the dialog opens on the current colour`, (await page.getAttribute('#siyagahDialog [data-swatch="#C0392B"]', "aria-pressed")) === "true");
      await page.click('#siyagahDialog [data-swatch=""]');
      await page.uncheck("#siyagahDialog [data-look-bold]");
      await page.click("#siyagahDialog [data-look-apply]");
      await page.waitForFunction(() => !document.querySelector('.folder-row[data-folder-id="fA"] [data-look-dot]'));
      w = await writes(page);
      const cw = w.find((x) => x.col === "noteFolders" && x.keys.includes("color"));
      check(`${tag}: None clears back (color null, bold false)`, cw && cw.data.color === null && cw.data.bold === false);

      // ---- long name still fits at the row with a dot ----
      await folderMenu(page, "fL", "look");
      await page.click('#siyagahDialog [data-swatch="#8E44AD"]');
      await page.click("#siyagahDialog [data-look-apply]");
      await page.waitForSelector('.folder-row[data-folder-id="fL"] [data-look-dot]');
      const fit = await page.evaluate(() => {
        const row = document.querySelector('.folder-row[data-folder-id="fL"]');
        const r = row.getBoundingClientRect();
        const kids = [...row.children].map((c) => c.getBoundingClientRect());
        return { inside: kids.every((k) => k.left >= r.left - 1 && k.right <= r.right + 1), sideways: document.documentElement.scrollWidth <= innerWidth + 1 };
      });
      check(`${tag}: a long folder name with its dot stays inside its row`, fit.inside && fit.sideways, JSON.stringify(fit));

      // ---- move a root folder to a section and back ----
      await resetWrites(page);
      await folderMenu(page, "fB", "section");
      const picks = await page.$$eval("#siyagahDialog [data-section-pick]", (b) => b.map((x) => x.textContent.trim()));
      check(`${tag}: Move to section lists No section and the active sections`, picks.length === 3, JSON.stringify(picks));
      await page.click('#siyagahDialog [data-section-pick]:nth-of-type(1)', { trial: true }).catch(() => {});
      await page.click(`#siyagahDialog li:nth-child(2) [data-section-pick]`); // first section (Home)
      await page.waitForFunction(() => document.querySelector('li[data-section-item] + li .folder-row[data-folder-id="fB"]'));
      w = await writes(page);
      const mv = w.find((x) => x.col === "noteFolders" && x.keys.includes("sectionId"));
      check(`${tag}: the folder is filed under the section (sectionId written, nothing else but updatedAt)`, mv && !!mv.data.sectionId && mv.keys.every((k) => ["sectionId", "updatedAt"].includes(k)), JSON.stringify(mv));
      checkFieldSets(tag + " move to section", w);
      check(`${tag}: a section header shows how many folders it holds`, (await page.textContent(".section-header .folder-row-count")).trim() === "1");

      // ---- nest a sectioned folder: the write clears sectionId ----
      await resetWrites(page);
      await folderMenu(page, "fB", "move");
      await page.waitForSelector("#folderPicker");
      await page.click('#folderPicker [data-pick="fA"]');
      await settle(page);
      w = await writes(page);
      const nest = w.find((x) => x.col === "noteFolders" && x.keys.includes("parentFolderId"));
      check(`${tag}: nesting a sectioned folder clears sectionId IN THE SAME WRITE`, nest && nest.keys.includes("sectionId") && nest.data.sectionId === null && nest.data.parentFolderId === "fA", JSON.stringify(nest));
      checkFieldSets(tag + " nest", w);
      check(`${tag}: a nested folder's menu has no Move to section`, (await page.$('.folder-row[data-folder-id="fB"] .folder-menu-btn')) !== null && await (async () => {
        await page.click('.folder-row[data-folder-id="fB"] .folder-menu-btn');
        const has = (await page.$('.folder-row[data-folder-id="fB"] [data-folder-section]')) !== null;
        await page.keyboard.press("Escape");
        return !has;
      })());

      // ---- lift it back to the top: no section was involved, so no sectionId written ----
      await resetWrites(page);
      await folderMenu(page, "fB", "move");
      await page.waitForSelector("#folderPicker");
      await page.click('#folderPicker [data-pick="top"]');
      await settle(page);
      w = await writes(page);
      const lift = w.find((x) => x.col === "noteFolders" && x.keys.includes("parentFolderId"));
      check(`${tag}: lifting to the top from an unsectioned place writes no sectionId`, lift && !lift.keys.includes("sectionId"), JSON.stringify(lift));

      // ---- the system folder has no Move to section ----
      check(`${tag}: a system folder's row has no ⋯ menu and no Move to section`, (await page.$('.folder-row[data-folder-role="journey-map"] [data-folder-section]')) === null && (await page.$('.folder-row[data-folder-role="journey-map"] .folder-menu-btn')) === null);

      // ---- Delete -> Trash -> Restore (folders return to the unnamed block) ----
      await folderMenu(page, "fB", "section");
      await page.click(`#siyagahDialog li:nth-child(2) [data-section-pick]`);
      await page.waitForFunction(() => document.querySelector('li[data-section-item] + li .folder-row[data-folder-id="fB"]'));
      let confirmText = "";
      page.removeAllListeners("dialog");
      page.on("dialog", (d) => { confirmText = d.message(); d.accept(); });
      await resetWrites(page);
      await sectionMenu(page, "Home", "delete");
      await page.waitForFunction(() => ![...document.querySelectorAll(".section-header [data-section-name]")].some((e) => e.textContent === "Home"));
      w = await writes(page);
      check(`${tag}: the confirm says the folders go back to the unnamed block, not to Trash`, lang === "bn" ? hasBn(confirmText) : /not deleted/.test(confirmText) && /unnamed block/.test(confirmText), confirmText);
      check(`${tag}: deleting a section clears its folder's sectionId and retires the section (never deletes)`, w.some((x) => x.col === "noteFolders" && x.id === "t1__fB" && x.keys.includes("sectionId")) && w.some((x) => x.col === "noteSections" && x.keys.includes("status")) && !w.some((x) => x.op === "delete"), JSON.stringify(w.map((x) => `${x.col}:${x.keys}`)));
      checkFieldSets(tag + " delete", w);
      check(`${tag}: the folder is back in the unnamed block, not in Trash`, await page.evaluate(() => !!document.querySelector('.folder-row[data-folder-id="fB"]') && !document.querySelector('li[data-section-item] + li .folder-row[data-folder-id="fB"]')));
      await page.click("#pageMenu .folder-menu-btn", { trial: true }).catch(() => {});
      await page.evaluate(() => document.getElementById("openTrashBtn").click());
      await page.waitForSelector("[data-trash-section-id]");
      check(`${tag}: Trash lists the retired section with Restore`, (await page.$("[data-trash-section-id] [data-trash-restore]")) !== null);
      await resetWrites(page);
      await page.click("[data-trash-section-id] [data-trash-restore]");
      await settle(page);
      w = await writes(page);
      check(`${tag}: Restore writes only status`, w.some((x) => x.col === "noteSections" && x.keys.includes("status")) && w.filter((x) => x.col === "noteSections").every((x) => x.keys.every((k) => ["status", "updatedAt"].includes(k))));
      await page.click("#trashBackBtn");
      await page.waitForSelector(".section-header");
      check(`${tag}: the restored section is back`, (await sectionNames(page)).includes("Home"));

      check(`${tag}: swatch targets and rows leave no sideways scroll`, await noSideways(page));
      check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|api\.quran\.com/.test(e)).length === 0, JSON.stringify(errors));
      if (lang === "bn") check(`${tag}: the new words are Bangla`, hasBn(await page.textContent(".folder-footer")) && hasBn(await page.textContent(".section-header")));
      await ctx.close();
    }

    // =============================== GATE OFF (the shipped file) ===============================
    {
      const tag = `OFF ${lang} ${width}px`;
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
      await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA", "fB", "fBk"])); } catch {} });
      const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
      await waitTree(page);
      await resetWrites(page);
      const expected = lang === "bn" ? null : GATE_EN;
      const said = async () => (await status(page)) || (await page.textContent("[data-sections-gate-note]").catch(() => ""));

      check(`${tag}: ＋ New section is present`, (await page.$("#newSectionBtn")) !== null);
      await page.fill("#newFolderName", "Work");
      await page.click("#newSectionBtn");
      let s = await status(page);
      check(`${tag}: ＋ New section says the sentence`, lang === "bn" ? hasBn(s) : s === expected, s);

      await folderMenu(page, "fA", "look");
      check(`${tag}: 🎨 opens the palette with swatches shown and the sentence in words`, (await page.$$("#siyagahDialog .swatch")).length >= 10 && (lang === "bn" ? hasBn(await page.textContent("[data-sections-gate-note]")) : (await page.textContent("[data-sections-gate-note]")) === GATE_EN));
      check(`${tag}: swatches are at least 40px even when switched off`, (await page.$$eval("#siyagahDialog .swatch", (els) => els.every((e) => e.getBoundingClientRect().width >= 40 && e.getBoundingClientRect().height >= 40))));
      await page.click('#siyagahDialog [data-swatch="#C0392B"]');
      await page.click("#siyagahDialog [data-look-apply]");
      await settle(page, 300);
      check(`${tag}: Apply writes nothing and the dialog stays open with the sentence`, (await page.$("#siyagahDialog")) !== null);
      await page.click("#siyagahDialog [data-dialog-cancel]");

      await folderMenu(page, "fB", "section");
      check(`${tag}: Move to section is present, shows No section and the sentence`, (await page.$$("#siyagahDialog [data-section-pick]")).length === 1 && (await page.$("[data-sections-gate-note]")) !== null);
      await page.click("#siyagahDialog [data-section-pick]");
      await settle(page, 300);
      check(`${tag}: choosing writes nothing`, (await page.$("#siyagahDialog")) !== null);
      await page.click("#siyagahDialog [data-dialog-cancel]");

      const w = await writes(page);
      check(`${tag}: __fsLog/stub writes show NO noteSections write and no folder color/bold/sectionId write`, sectionish(w).length === 0, JSON.stringify(sectionish(w)));
      const reads = await page.evaluate(() => (window.__fsLog || []).filter((r) => r.col === "noteSections").length);
      check(`${tag}: and no noteSections read (the Rules are not published)`, reads === 0, String(reads));
      check(`${tag}: no sideways scroll`, await noSideways(page));
      check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|api\.quran\.com/.test(e)).length === 0, JSON.stringify(errors));
      await ctx.close();
    }
  }
}

// ---- Light card look contrast (the rows are light in both looks; prove it in each) ----
for (const look of ["night", "light"]) {
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 900 }, extraSeedJs: SEED.replace('F("fA", "Alpha", null, 0);', 'F("fA", "Alpha", null, 0); DATA.noteFolders[1].color = "#C0392B"; DATA.noteFolders[1].bold = true;') });
  await ctx.addInitScript((l) => { try { localStorage.setItem("mm_card_look", l); } catch {} }, look);
  const { page } = await openPage(ctx, "/app/journey-map.html#folders");
  await waitTree(page);
  const c = await contrast(page, '.folder-row[data-folder-id="fA"] [data-folder-name]');
  check(`contrast ${look} look: a coloured, bold folder's name is ${c.toFixed(2)}:1 (needs 4.5)`, c >= 4.5);
  check(`contrast ${look} look: its dot is drawn`, (await page.$('.folder-row[data-folder-id="fA"] [data-look-dot]')) !== null);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

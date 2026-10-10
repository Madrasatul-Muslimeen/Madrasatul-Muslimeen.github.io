// Bangla sweep, part 2 (issue #680): the Qur'an page, Read view (text and Mushaf), Note view, the Word card, Explore
// (Approaches, QCR, Asma ul Husna), Mapping My Journey and the Bookmarks page.
//
// Same method and the SAME scanner as #677's bangla-sweep-newer-screens-browser.mjs (shared in bangla-sweep-lib.mjs):
// in Bangla each screen is opened for real, every visible text node and aria-label/title/placeholder is read for
// Latin-script interface words, and the suite asserts none. Data is allowed only by exact phrase (lib + CORE_ALLOWED
// below, each with its reason). Run at 390px and again at 1280px.
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/bangla-sweep-core-screens-browser.mjs
//   --list            print every Latin-script string found on each screen (READ it)
//   --mutate="<phrase>"  make the page's bn lookup miss that phrase (the sweep must fail and name it)
//   --width=390|1280  run one width only
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
import { SCAN, leaksOf as baseLeaksOf, DATA_ALLOWED, NAME_TOKENS } from "./bangla-sweep-lib.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const LIST = process.argv.includes("--list");
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const ONLY = (process.argv.find((a) => a.startsWith("--width=")) || "").slice(8);

// Data this part meets that #677's screens did not: exact phrases, each one a name or a title, not interface wording.
DATA_ALLOWED.push(
  // The font-size button's glyph: a symbol (a small and a large letter A), not a word.
  /^Aa$/,
  // The Arabic font choices: typeface names, shown in their own name in every language.
  /^(Scheherazade|Noto Naskh|Amiri Quran)$/,
  // Names the TEST typed into its seed (a folder, two notes, a bookmark and its folder): the tenant's own words, not
  // interface. Exact phrases only, with the "(01) " ordinal and the "📁 " icon the app puts in front of them.
  /^(\(\d\d\) )?(📁 )?(Alpha|AlphaKid|Beta|Note One|Note Two|Note One body\.|Folder One|Spot One)$/,
  /^বন্ধ করুন: (📁 )?(Alpha|Note One)$/,
  // The QCR collection names, as the catalogue spells them (transliterated Arabic family names, section marks and
  // example phrases): the collections' own titles, shown in every language. Exact titles only.
  /^(14|15|20|21|22|23|25|26) · (Naẓar|Ta'aqqul|Tafakkur|Tadabbur|Tafaqquh|Tadhakkur|Fahm|Ḥukm \/ Taḥākum)$/,
  /^§(4 · (Ra'ā family|Sayr fil-Arḍ|I'tibār)|6 · Audience Epithets|5 · Preconditions|9 · Adjacent \/ Safeguards)$/,
  /^(Proposed New Families|Āyah-Formula — 'Inna fī dhālika la-āyāt\.\.\.' \(45:3-type\)|Hal min\.\.\. \(challenge for a rival\)|Afaman\.\.\. \(comparative-inference\))$/,
  // Key names in a hint ("Ctrl+Shift+X", "Enter") are the names printed on the keys.
);
NAME_TOKENS.push(/CC BY-SA 4\.0/g, /Ctrl\+Shift\+X/g, /\bEnter\b/g);
// Reciters' personal names: people's names inside a Bangla label ("Abdullah Basfar (আরবি)"); only the language is interface.
NAME_TOKENS.push(/Abdullah Basfar/g, /Ibraheem Walk/g, /Kevan Brighting/g, /Shareef Bayezid Mahmud/g);

// Seeds. Names are typed by the tenant (data), so they are listed as exact phrases in DATA_ALLOWED below.
const JOURNEY_SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteLinks = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(id, title, day) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: "<p>" + title + " body.</p>", currentRevisionId: "rev-" + id, status: "active", pinned: false, createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own)); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  F("fA", "Alpha", null, 0); F("fAk", "AlphaKid", "fA", 0); F("fB", "Beta", null, 1);
  N("n1", "Note One", 1); N("n2", "Note Two", 2);
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1);
})();`;
const BOOKMARK_SEED = `
DATA.bookmarks = [{ _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", resume: {},
  folders: [{ id: "fA", name: "Folder One", parentId: null, personTagId: null, removed: false, createdAt: "2026-09-01T00:00:00.000Z" }],
  saved: [{ id: "b1", programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "Spot One", position: "ayah:2:255", folderId: "fA", removed: false,
    settings: { unitType: "ayah", surahNum: 2, ayahNum: 255, trackableId: "tafsir" }, createdAt: "2026-09-01T00:00:00.000Z" }] }];
`;
const allLeaks = [];
async function sweep(P, screen, width) {
  // Positive control: a screen that did not render (blank, or still English) must not pass as "clean".
  const bnChars = await P.evaluate(() => (document.body.innerText.match(/[ঀ-৿]/g) || []).length);
  check(`bn ${width}: "${screen}" is rendered in Bangla (positive control)`, bnChars >= 20, `Bangla characters: ${bnChars}`);
  const found = await P.evaluate(SCAN);
  const leaks = baseLeaksOf(found);
  for (const l of leaks) allLeaks.push({ screen, ...l });
  if (LIST) console.log(`[${width} ${screen}] ${leaks.length} Latin-script strings:\n` + leaks.map((l) => `    ${l.kind} <${l.where}> ${JSON.stringify(l.text)}`).join("\n"));
  check(`bn ${width}: "${screen}" shows no English interface text`, leaks.length === 0, JSON.stringify(leaks.slice(0, 8).map((l) => `${l.kind}:${l.text}`)));
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const settle = (P, ms = 300) => P.waitForTimeout(ms);
const quiet = (errors) => errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
async function mk(width, extra = {}) {
  const ctx = await newContext(browser, { appLang: "bn", banner: false, viewport: { width, height: 860 }, ...extra });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    await ctx.route("**/app/js/i18n/bn.js*", async (r) => {
      const src = fs.readFileSync("app/js/i18n/bn.js", "utf8");
      const key = JSON.stringify(MUTATE);
      if (!src.includes(key + ":")) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(key + ":").join(JSON.stringify("\u0000" + MUTATE) + ":") });
    });
  }
  return ctx;
}
const noSplash = (P) => P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
const click = async (P, sel, ms = 400) => { await P.evaluate((s) => document.querySelector(s)?.click(), sel); await settle(P, ms); };

for (const width of ONLY ? [Number(ONLY)] : [390, 1280]) {
  // ---- 1-3: the Qur'an page, Read view (text, Mushaf), Note view -------------------------------------------------
  {
    const ctx = await mk(width);
    const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
    await noSplash(P);
    await settle(P, 800);
    await sweep(P, "Qur'an page landing", width);
    check(`bn ${width}: Qur'an page raised no page errors`, quiet(errors).length === 0, quiet(errors).slice(0, 2).join(" | "));
    // 2. Read view (text), bar buttons, Range unit card, Ayah card.
    await click(P, "#tabReadBtn", 700).catch(() => {});
    if (!(await P.evaluate(() => document.body.classList.contains("read-sideways") || !!document.getElementById("readBar")?.offsetWidth))) {
      await click(P, "#tabStudyBtn", 300); await click(P, "#tabReadBtn", 700);
    }
    await sweep(P, "Read view (text)", width);
    for (const [id, nm] of [["readBarTakeBtn", "Take an Approach"], ["readBarRecordBtn", "Record Your Progress"], ["readBarStatusBtn", "Know Your Status"]]) {
      await click(P, "#" + id, 600);
      await sweep(P, "Read bar: " + nm, width);
      await click(P, "#" + id, 400);
    }
    await P.evaluate(() => { const s = document.getElementById("unitTypeSelect"); s.value = "range"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await settle(P, 700);
    await sweep(P, "Read view, Range unit card", width);
    await P.evaluate(() => { const s = document.getElementById("unitTypeSelect"); s.value = "ayah"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await settle(P, 700);
    await sweep(P, "Read view, Āyah card", width);
    await P.evaluate(() => { const m = document.getElementById("mushafToggle"); if (m && !m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); } });
    await settle(P, 1500);
    await sweep(P, "Read view, Mushaf", width);
    // 3. UPDATED IN PLACE (Note view retirement, step b): the Note view and its ⋯/⋮ menus are deleted. The surface that now
    // does that job is the Read view's Notes pane, swept in Bangla in its place.
    check(`bn ${width}: #noteView and __dormantOpenNoteView are absent`, await P.evaluate(() => document.getElementById("noteView") === null && typeof window.__dormantOpenNoteView === "undefined"));
    await P.evaluate(() => { const b = document.getElementById("tabNoteBtn"); if (b && !b.getBoundingClientRect().width) document.getElementById("tabStudyBtn")?.click(); });
    await P.evaluate(() => document.getElementById("tabNoteBtn")?.click()); await settle(P, 1500);
    await sweep(P, "Notes pane (replaces the Note view)", width);
    await P.keyboard.press("Escape"); await P.evaluate(() => { const c = document.querySelector("#readNotePane [data-rnp-close]"); if (c) c.click(); }); await settle(P, 300);
    // The Track card (Study options -> Approach + Track).
    await click(P, "#tabStudyOptionsBtn", 600);
    check(`bn ${width}: Track card is on screen`, await P.evaluate(() => (document.getElementById("trackUnitBtn")?.offsetWidth || 0) > 0));
    await sweep(P, "Track card (Study options)", width);
    await ctx.close();
  }

  // ---- 4. Word card, all three tabs (a word that has a root: 2:131:7 -- the one #677 used) ----------------------
  {
    const ctx = await mk(width);
    const { page: P } = await openPage(ctx, "/app/quranrevival.html?word=2:131:7");
    await P.waitForSelector("#wordCardReturnBar, [data-word-card-tab], .word-card", { timeout: 20000 }).catch(() => {});
    await settle(P, 1500);
    await sweep(P, "Word card (first tab)", width);
    const tabs = await P.evaluate(() => [...document.querySelectorAll("[data-word-card-level]")].filter((b) => b.offsetWidth > 0).map((b) => b.textContent.trim()));
    check(`bn ${width}: Word card shows its three tabs`, tabs.length >= 3, JSON.stringify(tabs));
    for (let i = 1; i < Math.min(tabs.length, 3); i++) {
      await P.evaluate((k) => [...document.querySelectorAll("[data-word-card-level]")].filter((b) => b.offsetWidth > 0)[k].click(), i);
      await settle(P, 1000);
      await sweep(P, `Word card, tab ${i + 1}`, width);
    }
    await ctx.close();
  }

  // ---- 5. Explore: Approaches, QCR, Asma ul Husna with one Name open ---------------------------------------------
  {
    const ctx = await mk(width);
    const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
    await noSplash(P);
    await click(P, "#tabExploreBtn", 900);
    await sweep(P, "Explore (Quran wheel)", width);
    await click(P, "#exploreApproachBtn", 900);
    await sweep(P, "Explore, Approaches", width);
    await click(P, "#explorePaletteQcrBtn", 1200);
    await sweep(P, "Explore, QCR", width);
    await click(P, "#explorePaletteAsmaBtn", 1200);
    await P.waitForFunction(() => document.querySelectorAll("#asmaXSingleSelect option").length > 1, null, { timeout: 8000 }).catch(() => {});
    await sweep(P, "Explore, Asma ul Husna", width);
    await P.selectOption("#asmaXSingleSelect", "1");
    await P.waitForSelector("#asmaXPosterPanel", { timeout: 6000 }).catch(() => {});
    await settle(P, 800);
    check(`bn ${width}: a Name is open in Asma ul Husna`, await P.evaluate(() => !!document.getElementById("asmaXPosterPanel")));
    await sweep(P, "Explore, Asma ul Husna, one Name open", width);
    check(`bn ${width}: Explore raised no page errors`, quiet(errors).length === 0, quiet(errors).slice(0, 2).join(" | "));
    await ctx.close();
  }

  // ---- 6. Mapping My Journey: the folder tray and one Note window ------------------------------------------------
  {
    const ctx = await mk(width, { extraSeedJs: JOURNEY_SEED });
    const { page: P, errors } = await openPage(ctx, "/app/journey-map.html");
    await P.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 2 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 }).catch(() => {});
    await settle(P, 500);
    await sweep(P, "Mapping My Journey (folder tray)", width);
    await P.evaluate(() => document.querySelector('.folder-row[data-folder-id="fA"] .folder-menu-btn')?.click());
    await settle(P, 400);
    await sweep(P, "Mapping My Journey, folder ⋯ menu", width);
    await P.evaluate(() => document.querySelector('.folder-row[data-folder-id="fA"] [data-folder-window]')?.click());
    await P.waitForSelector('.folder-win[data-folder-id="fA"]', { timeout: 5000 }).catch(() => {});
    await settle(P, 500);
    await sweep(P, "Mapping My Journey, folder window", width);
    await P.evaluate(() => document.querySelector('.folder-win[data-folder-id="fA"] [data-fw-note="n1"]')?.click());
    await P.waitForSelector(".note-win:not(.folder-win)", { timeout: 5000 }).catch(() => {});
    await settle(P, 800);
    check(`bn ${width}: a Note window is open`, await P.evaluate(() => !!document.querySelector(".note-win:not(.folder-win)")));
    await sweep(P, "Mapping My Journey, a Note window", width);
    check(`bn ${width}: Journey raised no page errors`, quiet(errors).length === 0, quiet(errors).slice(0, 2).join(" | "));
    await ctx.close();
  }

  // ---- 7. Bookmarks page with one bookmark and one folder (seeded) ------------------------------------------------
  {
    const ctx = await mk(width, { extraSeedJs: BOOKMARK_SEED });
    const { page: P, errors } = await openPage(ctx, "/app/bookmarks.html");
    await P.waitForFunction(() => /Folder One|ফোল্ডার/.test(document.body.textContent) || document.querySelector("[data-bm-id], .bm-row"), null, { timeout: 15000 }).catch(() => {});
    await settle(P, 800);
    check(`bn ${width}: the Bookmarks page shows the seeded folder and bookmark`, await P.evaluate(() => /Folder One/.test(document.body.textContent) && /Spot One/.test(document.body.textContent)));
    await sweep(P, "Bookmarks page", width);
    check(`bn ${width}: Bookmarks raised no page errors`, quiet(errors).length === 0, quiet(errors).slice(0, 2).join(" | "));
    await ctx.close();
  }
}

await browser.close();
if (LIST) console.log("\nALL LEAKS:\n" + JSON.stringify([...new Set(allLeaks.map((l) => l.text))], null, 1));
console.log(`\n==== Bangla sweep, core screens: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

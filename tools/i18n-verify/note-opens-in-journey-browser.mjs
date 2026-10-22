// PCF MSA J81 part 3 (the Owner, 23 Oct 2026: "when I click on a NOTE from anywhere in the app, globally, that should bring
// to this note view"): a Note opened from the Read view's Notes pane (the list, the top-bar search, ✚ New note) or from a
// plain link to journey-map.html?note=<id> opens in the Mapping My Journey TRAY, with THAT note's title in its note window;
// nothing else opens; ✕ returns to exactly where the reader was. Zab's "Open" is proven in zab-to-note-browser.
// Run from the repository root with serve.js on :8080 (the harness BASE).
//   --only=list|search|new|link     one entry point        --lang=en|bn
//   --mutate=list    the pane opens a tapped Note in its own small Note view again   -> the list/search/new entries fail
//   --mutate=link    the tray ignores ?note= on a link                               -> the link entry fails
import { chromium, newContext, openPage, clickReadTool, BASE } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const ONLY = arg("only"), LANG = arg("lang"), MUTATE = arg("mutate");
const MUT = {
  list: ["journey-map.html", "if (unitMode) { openUnitInJourney(noteId); return; }", ""],
  link: ["js/journey-tray.js", "openJourneyTray({ noteId });", "openJourneyTray();"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
// A wait is a named state; a timeout fails by name instead of hanging or passing.
async function until(name, fn, ms = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 100)); }
  console.log(`  TIMEOUT  waiting for: ${name}`);
  return false;
}

const TS = "2026-01-01T00:00:00.000Z";
const own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: "test-uid" };
const NOTES = [
  { _id: "t1__n256", noteId: "n256", ...own, title: "Started on 2:256", bodyHtml: "<p>No compulsion in religion.</p>", status: "active", visibility: "private", currentRevisionId: "n256-r1" },
  { _id: "t1__n7", noteId: "n7", ...own, title: "Findable elsewhere note", bodyHtml: "<p>Another body.</p>", status: "active", visibility: "private", currentRevisionId: "n7-r1" },
];
const SOURCES = [{ _id: "t1__s256", sourceLinkId: "s256", ...own, noteId: "n256", sourceKey: "ayah:2:256", sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active" }];
const SEED = `
window.__stubApplyBatches = true; window.__stubRecordTxData = true;
DATA.notes = [...(DATA.notes ?? []), ...${JSON.stringify(NOTES)}];
DATA.noteSources = [...(DATA.noteSources ?? []), ...${JSON.stringify(SOURCES)}];`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of ["en", "bn"]) for (const [width, height] of [[1440, 900], [390, 844]]) {
  if (LANG && LANG !== lang) continue;
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page: P } = await openPage(ctx, "/app/quranrevival.html");
  const ev = (f, a) => P.evaluate(f, a);
  const kill = () => ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await kill();
  if (!(await ev(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(400);
  await ev(() => { const s = document.getElementById("surahSelect"); if (s.value !== "2") { s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await until("surah 2 words", () => ev(() => !!document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]')));
  const gotoAyah = async (n) => { await ev((x) => { const el = document.getElementById("ayahSelect"); el.value = String(x); el.dispatchEvent(new Event("change", { bubbles: true })); }, n); await P.waitForTimeout(700); await kill(); };
  await gotoAyah(256);

  const trayTitle = () => ev(() => document.querySelector("#journeyTray:not([hidden]) iframe")?.contentDocument?.querySelector("#notePane:not([hidden]) [data-pane-title], #notePane:not([hidden]) .nw-title")?.textContent?.trim() ?? "");
  const state = () => ev(() => ({ ayah: document.getElementById("ayahSelect").value, scroll: document.getElementById("readScroll")?.scrollTop ?? 0, pane: !document.getElementById("readNotePane")?.hidden && !!document.getElementById("readNotePane"),
    tray: !!document.querySelector("#journeyTray:not([hidden])"), sheet: !!document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), wp: !!document.querySelector(".page-window:not([hidden]), #pageWindow:not([hidden])") }));
  // Common checks for one entry point, once its tap has been made.
  async function opened(name, wantTitle, before, { paneStays }) {
    const ok = await until(`${name}: the tray shows the note`, async () => (await trayTitle()) !== "");
    const title = await trayTitle();
    check(`${tag} ${name}: the tray opens with the note's own title in its note window ("${wantTitle}")`, ok && (wantTitle instanceof RegExp ? wantTitle.test(title) : title === wantTitle), title);
    const mid = await state();
    check(`${tag} ${name}: nothing else opened (no Āyah card, no page window; the pane is ${paneStays ? "still" : "not"} open)`, mid.tray && !mid.sheet && !mid.wp && mid.pane === paneStays, JSON.stringify(mid));
    await P.click("#journeyTray .jt-close", { timeout: 3000 }).catch(() => {}); await P.waitForTimeout(400);
    const after = await state();
    check(`${tag} ${name}: ✕ returns to exactly where the reader was (same āyah, same scroll, same pane)`, !after.tray && after.ayah === before.ayah && Math.abs(after.scroll - before.scroll) <= 2 && after.pane === before.pane, JSON.stringify({ before, after }));
  }
  const openPane = async (n) => {
    await clickReadTool(P, "#readNotesBtn");
    // The pane may reuse its page and be told the new āyah by message, so the address can still name the first one.
    const F = await (async () => { for (let i = 0; i < 100; i++) { const f = P.frames().find((x) => /journey-map\.html\?embed=1&unit=ayah%3A2%3A/.test(x.url())); if (f) return f; await P.waitForTimeout(100); } return null; })();
    if (F) await F.waitForFunction((k) => /(257|256|২৫৭|২৫৬)/.test(document.querySelector("[data-unit-title]")?.textContent ?? "") && document.querySelector("[data-unit-title]").textContent.includes(k), n === 257 ? (lang === "bn" ? "২৫৭" : "257") : (lang === "bn" ? "২৫৬" : "256"), { timeout: 15000 }).catch(() => {});
    if (F) await F.waitForSelector("[data-unit-body] [data-note-id], [data-unit-empty]", { timeout: 15000 }).catch(() => {});
    return F;
  };

  // POSITIVE CONTROL: before any tap the tray is closed and shows no note, so a title read later came from the tap.
  check(`${tag} POSITIVE CONTROL: no tray and no note title before the first tap`, !(await state()).tray && (await trayTitle()) === "");

  if (!ONLY || ONLY === "list") {
    const F = await openPane(256);
    check(`${tag} list: the Notes pane lists "Started on 2:256"`, !!F && !!(await F.$('[data-unit-body] [data-note-id="n256"] [data-note-open]')));
    if (F) { const before = await state(); await F.click('[data-unit-body] [data-note-id="n256"] [data-note-open]'); await opened("list", "Started on 2:256", before, { paneStays: true }); }
  }
  if (!ONLY || ONLY === "search") {
    const bar = await ev(() => !!document.querySelector("#readNotePane:not([hidden])"));
    if (!bar) await openPane(256);
    const before = await state();
    await ev(() => { const pane = document.getElementById("readNotePane"); pane.classList.remove("rnp-finding"); });
    if (await ev(() => (document.querySelector("#readNotePane [data-rnp-find-btn]")?.getBoundingClientRect().width ?? 0) > 0)) await P.click("#readNotePane [data-rnp-find-btn]");
    await P.fill("#readNotePane [data-rnp-search]", "Findable");
    const found = await until("search result", () => ev(() => !!document.querySelector('#readNotePane [data-rnp-result="n7"] .rnp-res-open')));
    check(`${tag} search: the top-bar search finds "Findable elsewhere note"`, found);
    if (found) { await P.click('#readNotePane [data-rnp-result="n7"] .rnp-res-open'); await opened("search", "Findable elsewhere note", before, { paneStays: true }); }
  }
  if (!ONLY || ONLY === "new") {
    await P.click("#readNotePane [data-rnp-back]").catch(() => {});
    await P.waitForTimeout(300);
    await gotoAyah(257);
    const F = await openPane(257);
    if (F) {
      await F.waitForFunction(() => document.querySelector("[data-unit-new]") && !document.querySelector("[data-unit-new]").hasAttribute("aria-disabled"), null, { timeout: 15000 }).catch(() => {});
      const before = await state();
      // The stub's data lives per page, so the tray's fresh page cannot read back a note written in the pane's page: a new
      // Note is proven by the tray's address naming the Note just written (real Firestore returns it), not by a rendered title.
      await F.click("[data-unit-new]");
      await until("new: the tray opens", () => ev(() => !!document.querySelector("#journeyTray:not([hidden]) iframe")?.getAttribute("src")?.includes("note=")));
      const wrote = await F.evaluate(() => (window.__stubWriteData || []).filter((x) => x.col === "notes").map((x) => x.data?.noteId ?? x.id ?? null));
      const src = await ev(() => document.querySelector("#journeyTray iframe")?.getAttribute("src") ?? "");
      const mid = await state();
      check(`${tag} new: the tray opens on the Note just made (its address names it), and nothing else opens`, /embed=1&note=[0-9a-f]{16,}/.test(src) && mid.tray && !mid.sheet && !mid.wp && mid.pane, JSON.stringify({ src, mid, wrote }));
      await P.click("#journeyTray .jt-close"); await P.waitForTimeout(400);
      const after = await state();
      check(`${tag} new: ✕ returns to exactly where the reader was`, !after.tray && after.ayah === before.ayah && after.pane === before.pane && Math.abs(after.scroll - before.scroll) <= 2, JSON.stringify({ before, after }));
    } else check(`${tag} new: the pane opened on 2:257`, false);
  }
  if (!ONLY || ONLY === "link") {
    await P.click("#readNotePane [data-rnp-back]").catch(() => {});
    await P.waitForTimeout(300);
    const before = await state();
    await ev(() => { const a = document.createElement("a"); a.id = "testNoteLink"; a.href = "journey-map.html?note=n256&back=1"; a.textContent = "note link"; a.style.cssText = "position:fixed;left:10px;top:10px;z-index:99999;background:#fff"; document.body.appendChild(a); });
    await P.click("#testNoteLink");
    await opened("link", "Started on 2:256", { ...before, pane: false }, { paneStays: false });
    check(`${tag} link: the page did not navigate away`, P.url().includes("quranrevival.html"), P.url());
  }
  await ctx.close();
}
await browser.close();
console.log(`\n==== note-opens-in-journey (${BASE}): ${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""} ====`);
process.exit(fail ? 1 : 0);

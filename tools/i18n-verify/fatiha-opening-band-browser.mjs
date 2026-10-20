// PCF J26 / issue #814 -- "Before Al-Fātiḥah": Aʿūdhu billāh (opening:taawwudh) and the Bismillah (ayah:1:1) as study items
// above Al-Fātiḥah's āyah 1, layout B (one band, two buttons). UPDATED IN PLACE 20 Oct 2026 (PCF MSA J49, the Owner's
// screenshot: "This was done before, but dropped … Fix it"): the buttons read right to left, Aʿūdhu billāh on the RIGHT
// of the Bismillah (it was LEFT under J26's layout B; QR had the swap as its own edit, now in the one source).
// Run from the repository root with
// serve.js on :8080. Expected values are written by hand from the issue.
//
// Mutations (each makes named checks FAIL):
//   --mutate=swap      the Bismillah first in the row (so Aʿūdhu billāh would sit LEFT of it)
//   --mutate=ltrrow    the button row reads left to right again (Aʿūdhu billāh LEFT)
//   --mutate=chunk     opening:* is stored in subject_quran instead of surah_1
//   --mutate=always-bismillah  the band shows the Bismillah even with the count setting off
//   --mutate=small     the buttons shrink below 44px
//   --mutate=nodot     the dot never follows the stage
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const MUTATIONS = {
  swap: ["app/quranrevival.html", "**/app/quranrevival.html*", "const items = [{ key: OPENING_TAAWWUDH_KEY", "const items = [{ key: buildUnitKey.ayah(1, 1), opening: false, ar: \"بِسْمِ ٱللَّهِ\", name: t(\"Bismillah\") }, { key: OPENING_TAAWWUDH_KEY"],
  ltrrow: ["app/quranrevival.html", "**/app/quranrevival.html*", ".opening-chips { direction: rtl; display: grid;", ".opening-chips { display: grid;"],
  chunk: ["app/js/records.js", "**/app/js/records.js*", 'if (unitType === "opening") return "surah_1";', 'if (unitType === "opening") return `subject_${subjectId}`;'],
  "always-bismillah": ["app/quranrevival.html", "**/app/quranrevival.html*", "if (fatihaCountApplies(1, fatihaOn())) items.push", "if (true) items.push"],
  small: ["app/quranrevival.html", "**/app/quranrevival.html*", ".opening-chip { min-width: 0; min-height: 44px;", ".opening-chip { min-width: 0; min-height: 20px; max-height: 20px; overflow: hidden;"],
  nodot: ["app/quranrevival.html", "**/app/quranrevival.html*", "function paintOpeningBandDots() {", "function paintOpeningBandDots() { return;"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SEED_NONE = `{ const d = DATA.records.find((r) => r.chunkKey === "surah_1"); d.entries = {}; }`;

async function start({ lang, width, countOn = true }) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: width >= 768 ? 1000 : 844 }, extraSeedJs: SEED_NONE });
  await ctx.addInitScript((on) => { try { localStorage.setItem("mm_fatiha_bismillah_unnumbered", on ? "1" : "0"); } catch (e) {} }, countOn);
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, glob, a, b] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(file, "utf8");
    if (!body.includes(a)) throw new Error(`mutation anchor missing: ${a}`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: body.split(a).join(b) }));
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page };
}
const setSelect = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = String(val); s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
const enterRead = async (page) => {
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
};
const openFatiha = async (page, unit = "ayah") => {
  await enterRead(page);
  await setSelect(page, "surahSelect", 1); await page.waitForTimeout(900);
  await setSelect(page, "unitTypeSelect", unit); await page.waitForTimeout(600);
  await page.evaluate(() => { const s = document.getElementById("ayahSelect"); if (s) { s.value = "1"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(500);
};
const sheetOpen = (page) => page.evaluate(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"));
const waitSheet = (page) => page.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 5000 }).catch(() => {});
const recordWrites = (page) => page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "records"));
const bandInfo = (page) => page.evaluate(() => {
  const band = document.querySelector("[data-opening-band]");
  const chips = [...document.querySelectorAll("[data-opening-open]")].map((c) => { const r = c.getBoundingClientRect(); return { key: c.dataset.openingOpen, x: r.x, w: r.width, h: r.height, dot: c.querySelector("[data-opening-dot]")?.dataset.openingDot }; });
  const firstText = document.querySelector("#ayahPanels .ayah-text, #ayahPanels [data-ayah], #ayahPanels button.ayah-num-badge");
  return { present: !!band, bandTop: band?.getBoundingClientRect().top ?? null, bandBottom: band?.getBoundingClientRect().bottom ?? null, firstTop: firstText?.getBoundingClientRect().top ?? null, chips, title: band?.querySelector(".opening-band-title")?.textContent ?? "" };
});
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1 && (document.getElementById("readScroll")?.scrollWidth ?? 0) <= (document.getElementById("readScroll")?.clientWidth ?? 0) + 1);

for (const lang of ["en", "bn"]) for (const width of [320, 390, 768, 1280]) {
  const tag = `[${lang} ${width}]`;
  const { ctx, page } = await start({ lang, width });
  await openFatiha(page);
  const b = await bandInfo(page);
  check(`${tag} the band is present with two buttons`, b.present && b.chips.length === 2, JSON.stringify(b.chips));
  check(`${tag} the band is above the first row of āyah 1`, b.present && b.firstTop != null && b.bandBottom <= b.firstTop + 1, `${b.bandBottom} vs ${b.firstTop}`);
  check(`${tag} Aʿūdhu billāh is RIGHT of Bismillah (read right to left, first in the row)`, b.chips.length === 2 && b.chips[0].key === "opening:taawwudh" && b.chips[1].key === "ayah:1:1" && b.chips[0].x > b.chips[1].x, JSON.stringify(b.chips.map((c) => [c.key, Math.round(c.x)])));
  check(`${tag} buttons are 44px or more`, b.chips.length === 2 && b.chips.every((c) => c.h >= 43.5 && c.w >= 43.5), JSON.stringify(b.chips));
  check(`${tag} the band title is translated`, lang === "en" ? b.title === "Before Al-Fātiḥah" : /[ঀ-৿]/.test(b.title), b.title);
  check(`${tag} no sideways scroll`, await noSideways(page));

  // Aʿūdhu billāh card
  await page.evaluate(() => document.querySelector('[data-opening-open="opening:taawwudh"]')?.click());
  await waitSheet(page); await page.waitForTimeout(300);
  const card = await page.evaluate(() => ({ ar: document.querySelector("[data-ayah-sheet-intro] .ayah-sheet-intro-ar")?.textContent ?? "", tr: document.querySelector("[data-ayah-sheet-intro] .ayah-sheet-intro-tr")?.textContent ?? "", key: document.querySelector("[data-ayah-sheet]")?.dataset.unitKey, back: !!document.querySelector("[data-ayah-sheet-back]"), stages: document.querySelectorAll("[data-approach-stage-btn]").length, claimFor: !!document.querySelector("[data-claim-for], [data-gac-record-title]"), bm: !!document.querySelector("[data-ayah-sheet-bookmark]"), note: !!document.querySelector("[data-ayah-sheet-note]") }));
  check(`${tag} Aʿūdhu card shows its Arabic`, card.ar.includes("أَعُوذُ بِٱللَّهِ مِنَ ٱلشَّيْطَٰنِ ٱلرَّجِيمِ"), card.ar);
  check(`${tag} Aʿūdhu card has a translation`, lang === "en" ? card.tr.includes("I seek refuge in Allah") : /[ঀ-৿]/.test(card.tr), card.tr);
  check(`${tag} Aʿūdhu card is the Āyah card: key, ← Back, stage buttons, bookmark, note`, card.key === "opening:taawwudh" && card.back && card.stages >= 4 && card.bm && card.note, JSON.stringify(card));

  // stage press writes opening:taawwudh into surah_1 and the dot follows
  await page.evaluate(() => { window.__stubWriteData = []; });
  await page.evaluate(() => { const sel = document.querySelector("[data-approach-stage-select]"); if (sel) { sel.value = "recite"; sel.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('[data-approach-stage-btn="learning"]')?.click());
  await page.waitForTimeout(800);
  const writes = await recordWrites(page);
  const w = writes.find((x) => JSON.stringify(x).includes("opening:taawwudh"));
  check(`${tag} the stage press wrote opening:taawwudh into chunk surah_1`, !!w && JSON.stringify(w).includes("surah_1") && !JSON.stringify(w).includes("subject_quran"), JSON.stringify(writes).slice(0, 300));
  // ← Back
  await page.evaluate(() => document.querySelector("[data-ayah-sheet-back]")?.click());
  await page.waitForTimeout(400);
  check(`${tag} ← Back closes the card and leaves Al-Fātiḥah's page`, !(await sheetOpen(page)) && (await bandInfo(page)).present && (await page.evaluate(() => document.getElementById("surahSelect").value)) === "1");
  const after = await bandInfo(page);
  check(`${tag} the Aʿūdhu button's dot follows the stage`, after.chips[0]?.dot === "learning" && after.chips[1]?.dot === "not_started", JSON.stringify(after.chips));

  // Bismillah card
  await page.evaluate(() => document.querySelector('[data-opening-open="ayah:1:1"]')?.click());
  await waitSheet(page); await page.waitForTimeout(300);
  const bc = await page.evaluate(() => ({ ar: document.querySelector("[data-ayah-sheet-intro] .ayah-sheet-intro-ar")?.textContent ?? "", tr: document.querySelector("[data-ayah-sheet-intro] .ayah-sheet-intro-tr")?.textContent ?? "", key: document.querySelector("[data-ayah-sheet]")?.dataset.unitKey, back: !!document.querySelector("[data-ayah-sheet-back]") }));
  check(`${tag} Bismillah card shows the āyah's own Arabic and a translation`, bc.ar.includes("بِسْمِ") && bc.tr.length > 5 && bc.key === "ayah:1:1" && bc.back, JSON.stringify(bc));
  await page.evaluate(() => { window.__stubWriteData = []; });
  await page.evaluate(() => { const sel = document.querySelector("[data-approach-stage-select]"); if (sel) { sel.value = "recite"; sel.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('[data-approach-stage-btn="practising"]')?.click());
  await page.waitForTimeout(800);
  const w2 = (await recordWrites(page)).find((x) => JSON.stringify(x).includes("ayah:1:1"));
  check(`${tag} the Bismillah stage press wrote ayah:1:1 into surah_1`, !!w2 && JSON.stringify(w2).includes("surah_1"));
  await page.evaluate(() => document.querySelector("[data-ayah-sheet-back]")?.click());
  await page.waitForTimeout(400);
  const after2 = await bandInfo(page);
  check(`${tag} the Bismillah dot follows the stage`, after2.chips[1]?.dot === "practising", JSON.stringify(after2.chips));
  // the picker lists the unnumbered Bismillah (value 1) plus the 7 -- unchanged by this round
  const seven = await page.evaluate(() => [...document.getElementById("ayahSelect").options].filter((o) => o.value !== "1").length);
  check(`${tag} Al-Fātiḥah still has exactly 7 āyāt in the picker`, seven === 7, String(seven));
  if (width === 390) await page.screenshot({ path: `/tmp/fatiha-opening-${lang}-390.png` });
  await ctx.close();
}

// count setting OFF: only Aʿūdhu billāh shows, Bismillah is āyah 1 of the 7
for (const lang of ["en", "bn"]) {
  const { ctx, page } = await start({ lang, width: 390, countOn: false });
  await openFatiha(page);
  const b = await bandInfo(page);
  check(`[${lang}] count off: only Aʿūdhu billāh shows`, b.chips.length === 1 && b.chips[0].key === "opening:taawwudh", JSON.stringify(b.chips));
  const seven = await page.evaluate(() => [...document.getElementById("ayahSelect").options].length);
  check(`[${lang}] count off: Al-Fātiḥah still has 7 āyāt`, seven === 7, String(seven));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

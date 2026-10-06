// Issue #606 (Owner decisions 76-77) -- Al-Fatiha displayed Ayat 6 and 7 are TWO progress records.
// With the reader's count on, stored 1:7 is shown as Ayah 6 (words 1-4, record `ayah:1:7`) and Ayah 7
// (words 5-9, record `ayah:1:8`, a spare storage key). Old shared `ayah:1:7` marks are COPIED to 1:8 on the
// first claim (additive, nothing on load). With the count off, stored 1:7 is one Ayah and a claim writes both.
// Run from the repository root with serve.js on :8080. Expected values are written by hand from the issue.
//
// Mutations (each swaps a line of the served source; each makes named checks FAIL):
//   --mutate=record-key   displayed 7 claims write ayah:1:7 (the helper stops returning 8)
//   --mutate=no-copy      the first claim no longer copies the old 1:7 marks to 1:8
//   --mutate=no-fallback  displayed 7 stops reading the old shared 1:7 mark
//   --mutate=off-single   with the count off a claim writes only ayah:1:7
//   --mutate=rollup-double  a claim on displayed 6 counts twice in the totals
//   --mutate=picker-one   the pickers offer one "6-7" option again
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const REAL = fs.readFileSync("mushaf/mushaf-madani-v2.json");
const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const westernise = (s) => String(s ?? "").replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const MUTATIONS = {
  "record-key": ["app/js/fatiha-count.js", "**/app/js/fatiha-count.js*", 'half === "b") return FATIHA_SEVEN_RECORD_AYAH;', 'half === "b") return a;'],
  "no-copy": ["app/quranrevival.html", "**/app/quranrevival.html*", "const copied = await copyFatihaSeventhRecords(dbArg, { tenantId: args.tenantId, personId: args.personId });", "const copied = [];"],
  "no-fallback": ["app/js/fatiha-count.js", "**/app/js/fatiha-count.js*", "return raw(FATIHA_SEVEN_RECORD_AYAH) ?? raw(FATIHA_SPLIT_AYAH);", "return raw(FATIHA_SEVEN_RECORD_AYAH);"],
  "off-single": ["app/js/fatiha-count.js", "**/app/js/fatiha-count.js*", "a === FATIHA_SPLIT_AYAH && !on) return [FATIHA_SPLIT_AYAH, FATIHA_SEVEN_RECORD_AYAH];", "a === FATIHA_SPLIT_AYAH && false) return [FATIHA_SPLIT_AYAH, FATIHA_SEVEN_RECORD_AYAH];"],
  "rollup-double": ["app/js/fatiha-count.js", "**/app/js/fatiha-count.js*", "if (counts(FATIHA_SPLIT_AYAH, FATIHA_SPLIT_AYAH)) count++;", "if (counts(FATIHA_SPLIT_AYAH, FATIHA_SPLIT_AYAH)) count += 2;"],
  "picker-one": ["app/quranrevival.html", "**/app/quranrevival.html*", "const split = fatihaCountApplies(currentSurahNum, fatihaOn());\n      ayahSelect.innerHTML", "const split = false;\n      ayahSelect.innerHTML"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

// Seeds (DATA.records for surah_1 is replaced; the default fixture carries entries on 1:1..1:3 only).
const entry = (id, status) => `{ unitType: "ayah", subjectId: "quran", trackableId: "${id}", claimedStatus: "${status}", claimedByPersonId: "p1", confirmedStatus: "${status}", confirmState: "confirmed", domainIds: [], notes: "" }`;
const seedWith = (entries) => `{ const d = DATA.records.find((r) => r.chunkKey === "surah_1"); d.entries = { ${entries} }; }`;
const SEED_NONE = seedWith("");
const SEED_OLD_ONLY = seedWith(`"ayah:1:7::recite": ${entry("recite", "achieved")}`);
const SEED_SIX_ONLY = seedWith(`"ayah:1:7::recite": ${entry("recite", "achieved")}, "ayah:1:8::recite": ${entry("recite", "not_started")}`);
const SEED_SPLIT_WEAKER = seedWith(`"ayah:1:7::recite": ${entry("recite", "achieved")}, "ayah:1:8::recite": ${entry("recite", "learning")}`);

async function start({ lang, width, seed, countOn = true }) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: width >= 768 ? 1000 : 844 }, extraSeedJs: seed });
  await ctx.addInitScript((on) => { try { localStorage.setItem("mm_fatiha_bismillah_unnumbered", on ? "1" : "0"); } catch (e) {} }, countOn);
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route(MUSHAF_JSON_URL, (r) => r.fulfill({ status: 200, contentType: "application/json", body: REAL }));
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (r) => r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/fonts/" + r.request().url().split("/").pop()) }));
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
const openSurahOneAyah = async (page) => {
  await enterRead(page);
  await setSelect(page, "surahSelect", 1); await page.waitForTimeout(900);
  await setSelect(page, "unitTypeSelect", "ayah"); await page.waitForTimeout(500);
};
const recordWrites = (page) => page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "records"));
const resetWrites = (page) => page.evaluate(() => { window.__stubWriteData = []; sessionStorage.setItem("__stubWrites", "[]"); });
/** Opens the Ayah card from the single-Ayah view's number badge and picks the `recite` Approach. */
const openCard = async (page) => {
  await page.evaluate(() => document.querySelector("#ayahPanels button.ayah-num-badge")?.click());
  await page.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.evaluate(() => { const sel = document.querySelector("[data-approach-stage-select]"); if (!sel) return; sel.value = "recite"; sel.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(300);
};
/** My Status's whole-Qur'an Ayah tile for `recite` (Achieved + Mastered, counted by the pure roll-up). */
const myStatusAyahTile = async (page) => {
  await page.evaluate(() => { document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((el) => el.remove()); });
  await page.click("#myStatusWideBtn");
  await page.waitForSelector('#myStatusBody [data-my-status-open="recite"] .ms-tile[data-unit="ayah"]', { timeout: 10000 }).catch(() => {});
  const n = await page.evaluate(() => document.querySelector('[data-my-status-open="recite"] .ms-tile[data-unit="ayah"]')?.dataset.n ?? null);
  await page.click("#myStatusCloseBtn").catch(() => {}); await page.waitForTimeout(300);
  return n;
};
const pressedStage = (page) => page.evaluate(() => [...document.querySelectorAll("[data-approach-stage-btn]")].find((b) => b.getAttribute("aria-pressed") === "true")?.dataset.approachStageBtn ?? null);
const press = async (page, stage) => { await page.evaluate((s) => document.querySelector(`[data-approach-stage-btn="${s}"]`)?.click(), stage); await page.waitForTimeout(600); };
const closeCard = async (page) => { await page.keyboard.press("Escape"); await page.waitForTimeout(300); };
/** On the Ayah card: open the Surah rung's Unit card and read its "n of N" line. */
const surahCardLine = async (page) => {
  await page.waitForSelector('[data-unit-ladder-rung="surah:1"]', { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('[data-unit-ladder-rung="surah:1"]')?.click());
  await page.waitForSelector("[data-unit-card-achieved-line]", { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => /\d/.test(document.querySelector("[data-unit-card-achieved-line]")?.textContent ?? ""), null, { timeout: 8000 }).catch(() => {});
  return westernise(await page.evaluate(() => document.querySelector("[data-unit-card-achieved-line]")?.textContent ?? ""));
};
/** "n of N" in either word order (English: "1 of 7", Bangla: "7 এর মধ্যে 1"): exactly the numbers 1 and 7. */
const isOneOfSeven = (line) => { const n = (line.match(/\d+/g) ?? []).slice(0, 2).sort(); return n.length === 2 && n[0] === "1" && n[1] === "7"; };
const halfOfBadge =(page) => page.evaluate(() => [...document.querySelectorAll("#ayahPanels [data-ayah-split-half]")].map((b) => b.dataset.ayahSplitHalf));

const hubText = (page) => page.evaluate(() => [...document.querySelectorAll("[class*=hub]")].map((e) => e.innerText).join(" | ").replace(/\s+/g, " "));
for (const lang of ["en", "bn"]) for (const width of [390, 1280]) {
  const tag = `[${lang} ${width}]`;

  // ===== A. a fresh person: claim Achieved on displayed 7 only
  console.log(`\n=== A. claim on displayed 7 ${tag} ===`);
  {
    const { ctx, page } = await start({ lang, width, seed: SEED_NONE });
    await openSurahOneAyah(page);
    const picker = await page.evaluate(() => [...document.querySelectorAll("#ayahSelect option")].map((o) => [o.value, o.textContent.trim()]));
    check(`${tag} #ayahSelect offers 6 and 7 as two options (values 7 and 8), no "6–7"`, picker.length === 8 && picker[6][0] === "7" && picker[7][0] === "8" && westernise(picker[6][1]) === "6" && westernise(picker[7][1]) === "7" && !picker.some((p) => /[–-]/.test(p[1])), JSON.stringify(picker));
    await setSelect(page, "ayahSelect", 8); await page.waitForTimeout(500);
    check(`${tag} picking 7 shows ONLY displayed Ayah 7 (half b), content stays stored 1:7`, JSON.stringify(await halfOfBadge(page)) === '["b"]', JSON.stringify(await halfOfBadge(page)));
    // Architect review: the wheel's centre named the choice "Ayah 6–7" (its label call passed no half).
    const ayahWord = lang === "bn" ? "আয়াত" : "Ayah", seven = lang === "bn" ? "৭" : "7", six = lang === "bn" ? "৬" : "6";
    const hub7 = await hubText(page);
    check(`${tag} the wheel's centre names it "${ayahWord} ${seven}", not "6–7"`, hub7.includes(`${ayahWord} ${seven}`) && !/[৬6]\s*[–-]\s*[৭7]/.test(hub7), hub7.slice(0, 160));
    await resetWrites(page);
    await openCard(page);
    await press(page, "achieved");
    const w = await recordWrites(page);
    const keys = w.flatMap((x) => Object.keys(x.data ?? {})).filter((k) => k.startsWith("entries."));
    check(`${tag} Achieved on displayed 7 writes entries.ayah:1:8::recite = achieved`, w.some((x) => x.data?.["entries.ayah:1:8::recite"]?.claimedStatus === "achieved"), JSON.stringify(keys));
    check(`${tag} it writes NOTHING under ayah:1:7 (displayed 6 is unchanged)`, keys.length >= 1 && !keys.some((k) => k.startsWith("entries.ayah:1:7::")), JSON.stringify(keys));
    check(`${tag} the card shows 7 as Achieved`, (await pressedStage(page)) === "achieved");
    const line = await surahCardLine(page);
    check(`${tag} the Surah Unit card counts 1 of 7 (not 2, not 0)`, isOneOfSeven(line), line);
    await closeCard(page);
    await setSelect(page, "ayahSelect", 7); await page.waitForTimeout(500);
    check(`${tag} picking 6 shows ONLY displayed Ayah 6 (half a)`, JSON.stringify(await halfOfBadge(page)) === '["a"]', JSON.stringify(await halfOfBadge(page)));
    const hub6 = await hubText(page);
    check(`${tag} ...and for 6, "${ayahWord} ${six}"`, hub6.includes(`${ayahWord} ${six}`) && !/[৬6]\s*[–-]\s*[৭7]/.test(hub6), hub6.slice(0, 160));
    await openCard(page);
    check(`${tag} displayed 6 is still Not started`, (await pressedStage(page)) === "not_started" || (await pressedStage(page)) === null, String(await pressedStage(page)));
    await closeCard(page);
    // Mushaf rings: the inserted ⑥ reads ayah:1:7, the real end of 1:7 reads ayah:1:8.
    await page.evaluate(() => { const m = document.getElementById("mushafToggle"); m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.waitForFunction(() => !!document.querySelector("#pageViewContainer .hifz-page"), null, { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(800);
    await page.evaluate(() => document.querySelector("#pageViewContainer")?.dispatchEvent(new Event("mm-noop")));
    await setSelect(page, "ayahSelect", 8); await page.waitForTimeout(500);
    const rings = await page.evaluate(() => {
      const marks = [...document.querySelectorAll('#pageViewContainer .hifz-page[data-mushaf-page="1"] [data-ayah-marker="1:7"]')];
      return marks.map((m) => ({ split: !!m.dataset.ayahSplitPoint, ring: m.classList.contains("hifz-ayah-marker-ring") }));
    });
    check(`${tag} Mushaf: ⑥ has no ring and ⑦ has one (two records, two rings)`, rings.length === 2 && rings.find((r) => r.split)?.ring === false && rings.find((r) => !r.split)?.ring === true, JSON.stringify(rings));
    await ctx.close();
  }

  // ===== B. old shared ayah:1:7 marks are seen on both, nothing is written on load, the first claim copies
  console.log(`\n=== B. old marks ${tag} ===`);
  {
    const { ctx, page } = await start({ lang, width, seed: SEED_OLD_ONLY });
    await openSurahOneAyah(page);
    await setSelect(page, "ayahSelect", 7); await page.waitForTimeout(500);
    await openCard(page);
    const six = await pressedStage(page);
    await closeCard(page);
    await setSelect(page, "ayahSelect", 8); await page.waitForTimeout(500);
    await openCard(page);
    const seven = await pressedStage(page);
    await closeCard(page);
    check(`${tag} a person with only an old ayah:1:7 mark sees Achieved on BOTH 6 and 7`, six === "achieved" && seven === "achieved", JSON.stringify({ six, seven }));
    check(`${tag} loading and looking wrote nothing`, (await recordWrites(page)).length === 0, JSON.stringify(await recordWrites(page)));
    await setSelect(page, "ayahSelect", 7); await page.waitForTimeout(500);
    await openCard(page);
    await press(page, "learning");
    const w = await recordWrites(page);
    const copyIdx = w.findIndex((x) => x.data?.["entries.ayah:1:8::recite"]?.copiedFrom === "ayah:1:7");
    const claimIdx = w.findIndex((x) => x.data?.["entries.ayah:1:7::recite"]?.claimedStatus === "learning");
    check(`${tag} the first claim on 6 COPIES the old mark to ayah:1:8 (copiedFrom) BEFORE writing`, copyIdx >= 0 && claimIdx > copyIdx && w[copyIdx].data["entries.ayah:1:8::recite"].claimedStatus === "achieved", JSON.stringify(w.map((x) => Object.keys(x.data ?? {}))));
    check(`${tag} 6 now reads Learning`, (await pressedStage(page)) === "learning");
    await closeCard(page);
    await setSelect(page, "ayahSelect", 8); await page.waitForTimeout(500);
    await openCard(page);
    check(`${tag} 7 keeps the old Achieved mark`, (await pressedStage(page)) === "achieved", String(await pressedStage(page)));
    await closeCard(page);
    await ctx.close();
  }

  // ===== C. totals: 6 Achieved and 7 not is 1 of 7 in the Surah card and 1 in My Status
  console.log(`\n=== C. totals ${tag} ===`);
  {
    const { ctx, page } = await start({ lang, width, seed: SEED_SIX_ONLY });
    await openSurahOneAyah(page);
    await setSelect(page, "ayahSelect", 7); await page.waitForTimeout(500);
    await openCard(page);
    const line = await surahCardLine(page);
    check(`${tag} 6 Achieved, 7 not: the Surah card reads 1 of 7`, isOneOfSeven(line), line);
    await ctx.close();
    // My Status (the whole-Qur'an roll-up, approach-coverage.js) from the landing page, on a fresh load.
    const fresh = await start({ lang, width, seed: SEED_SIX_ONLY });
    await fresh.page.waitForFunction(() => !!document.querySelector("#wheelContainer svg"), null, { timeout: 30000 });
    const tile = await myStatusAyahTile(fresh.page);
    check(`${tag} 6 Achieved, 7 not: My Status counts 1 Ayah achieved (not 2, not 0)`, tile === "1", String(tile));
    await fresh.ctx.close();
  }

  // ===== D. count OFF: stored 1:7 is one Ayah; a claim writes both keys; shown status is the weaker
  console.log(`\n=== D. count off ${tag} ===`);
  {
    const { ctx, page } = await start({ lang, width, seed: SEED_SPLIT_WEAKER, countOn: false });
    await openSurahOneAyah(page);
    const values = await page.evaluate(() => [...document.querySelectorAll("#ayahSelect option")].map((o) => o.value));
    check(`${tag} count off: seven picker options, stored 1:7 is one Ayah`, values.length === 7 && values.at(-1) === "7", JSON.stringify(values));
    await setSelect(page, "ayahSelect", 7); await page.waitForTimeout(500);
    await openCard(page);
    check(`${tag} count off: the shown status is the WEAKER of the two records (Learning)`, (await pressedStage(page)) === "learning", String(await pressedStage(page)));
    await resetWrites(page);
    await press(page, "practising");
    const w = await recordWrites(page);
    const keys = w.flatMap((x) => Object.keys(x.data ?? {})).filter((k) => /^entries\.ayah:1:[78]::recite$/.test(k));
    check(`${tag} count off: a claim writes BOTH ayah:1:7 and ayah:1:8`, keys.includes("entries.ayah:1:7::recite") && keys.includes("entries.ayah:1:8::recite"), JSON.stringify(keys));
    await ctx.close();
  }
}
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
await browser.close();
process.exit(fail ? 1 : 0);

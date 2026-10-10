// Issue #482 -- Al-Fātiḥah's DISPLAY count, rendered (setting ON, the default).
// Run from the repository root, with serve.js on :8080. Expected values are
// written BY HAND from the Owner's table, never computed by the code under test.
// Also proves the stored identity never changes: every Firestore write path and
// field uses internal keys only.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";
const REAL = fs.readFileSync("mushaf/mushaf-madani-v2.json");

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const HALVES = {
  en: ["The path of those upon whom You have bestowed favor,", "not of those who have evoked [Your] anger or of those who are astray."],
  bn: ["সে সমস্ত লোকের পথ, যাদেরকে তুমি নেয়ামত দান করেছ।", "তাদের পথ নয়, যাদের প্রতি তোমার গজব নাযিল হয়েছে এবং যারা পথভ্রষ্ট হয়েছে।"],
};
const nfc = (s) => (s || "").normalize("NFC");

async function start(lang, width) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: width >= 768 ? 1000 : 844 } });
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route(MUSHAF_JSON_URL, (r) => r.fulfill({ status: 200, contentType: "application/json", body: REAL }));
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (r) => { const f = r.request().url().split("/").pop(); r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/fonts/" + f) }); });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page };
}
const enterRead = async (page) => {
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
};
const setSelect = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = String(val); s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
const openSurahOne = async (page, unit) => {
  await setSelect(page, "surahSelect", 1); await page.waitForTimeout(900);
  await setSelect(page, "unitTypeSelect", unit); await page.waitForTimeout(500);
};
const setMushaf = async (page, on) => {
  await page.evaluate((o) => { const m = document.getElementById("mushafToggle"); if (m.checked !== o) { m.checked = o; m.dispatchEvent(new Event("change", { bubbles: true })); } }, on);
  await page.waitForTimeout(on ? 1500 : 500);
};
const writes = (page) => page.evaluate(() => JSON.parse(sessionStorage.getItem("__stubWrites") || "[]"));

for (const lang of ["en", "bn"]) for (const width of [390, 1280]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== Al-Fātiḥah display count ${tag} ===`);
  const { ctx, page } = await start(lang, width);
  check(`${tag} the setting is ON by default`, await page.evaluate(() => document.getElementById("fatihaCountToggle").checked === true));

  // ---- Picker
  await enterRead(page);
  await openSurahOne(page, "ayah");
  const picker = await page.evaluate(() => [...document.querySelectorAll("#ayahSelect option")].map((o) => [o.value, o.textContent.trim()]));
  const wantLabels = lang === "en" ? ["Bismillah", "1", "2", "3", "4", "5", "6", "7"] : ["বিসমিল্লাহ", "১", "২", "৩", "৪", "৫", "৬", "৭"]; // #606: 6 and 7 are two options
  check(`${tag} picker labels read ${wantLabels.join(", ")}`, JSON.stringify(picker.map((p) => p[1])) === JSON.stringify(wantLabels), JSON.stringify(picker));
  check(`${tag} picker values are the RECORD ayahs 1..8 (#606: displayed 7 is record 8)`, JSON.stringify(picker.map((p) => p[0])) === JSON.stringify(["1", "2", "3", "4", "5", "6", "7", "8"]), JSON.stringify(picker));

  // ---- Go to
  const jump = async (text) => {
    await page.evaluate((v) => { const i = document.getElementById("jumpInput"); i.value = v; i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); }, text);
    await page.waitForTimeout(900);
    return page.evaluate(() => document.getElementById("ayahSelect").value);
  };
  check(`${tag} Go to "1:1" opens internal 1:2 (ٱلْحَمْدُ)`, (await jump("1:1")) === "2");
  check(`${tag} Go to "1:5" opens internal 1:6`, (await jump("1:5")) === "6");
  check(`${tag} Go to "1:6" opens internal 1:7`, (await jump("1:6")) === "7");
  check(`${tag} Go to "1:7" opens displayed 7 (record 8; #606 keeps the half)`, (await jump("1:7")) === "8");

  // ---- Read view, whole surah flow
  await openSurahOne(page, "surah");
  await page.waitForFunction(() => document.querySelectorAll("#pageViewContainer .ayah-arabic").length >= 8, null, { timeout: 8000 }).catch(() => {});
  const read = await page.evaluate(() => {
    const arabic = [...document.querySelectorAll("#pageViewContainer .ayah-arabic")];
    const badges = [...document.querySelectorAll("#pageViewContainer button.ayah-num-badge")].map((b) => b.textContent.trim());
    return {
      count: arabic.length, badges,
      firstBadgeInBismillah: !!arabic[0]?.previousElementSibling?.querySelector?.(".ayah-num-badge"),
      seventh: arabic[arabic.length - 1]?.textContent.trim(), sixth: arabic[arabic.length - 2]?.textContent.trim(),
      splitAttr: [...document.querySelectorAll("[data-ayah-split-half]")].map((b) => b.dataset.ayahNumBadge + b.dataset.ayahSplitHalf),
    };
  });
  const D = "٠١٢٣٤٥٦٧٨٩";
  const arabicNums = [1, 2, 3, 4, 5, 6, 7].map((n) => [...String(n)].map((c) => D[c]).join(""));
  check(`${tag} Read view badges read 1–7 in order (Arabic-Indic beside the Arabic)`, JSON.stringify(read.badges) === JSON.stringify(arabicNums), JSON.stringify(read));
  check(`${tag} Read view draws 8 Arabic blocks: Bismillah + 7 āyāt`, read.count === 8, JSON.stringify(read));
  check(`${tag} Bismillah has no badge`, !read.firstBadgeInBismillah, JSON.stringify(read));
  check(`${tag} āyah 7's line starts with غَيْرِ`, nfc(read.seventh).startsWith(nfc("غَيْرِ")), read.seventh);
  check(`${tag} āyah 6's line is صِرَٰطَ ... عَلَيْهِمْ (4 words)`, nfc(read.sixth).startsWith(nfc("صِرَٰطَ")) && read.sixth.split(/\s+/).length === 4, read.sixth);
  check(`${tag} both 6 and 7 badges keep the internal 1:7 key`, JSON.stringify(read.splitAttr) === JSON.stringify(["1:7a", "1:7b"]), JSON.stringify(read.splitAttr));
  await page.evaluate(() => { for (const id of ["trEnToggle", "trBnToggle"]) { const c = document.getElementById(id); if (!c.checked) { c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); } } });
  await page.waitForTimeout(700);
  const trTexts = await page.evaluate(() => [...document.querySelectorAll("#pageViewContainer .ayah-translation, #pageViewContainer .ayah-translation-bn")].map((e) => e.textContent.trim()));
  check(`${tag} the translation halves are shown under 6 and 7 (${lang})`, trTexts.map(nfc).includes(nfc(HALVES[lang][0])) && trTexts.map(nfc).includes(nfc(HALVES[lang][1])), JSON.stringify(trTexts.slice(-3)));

  // ---- Word card reference (flow view, tapping words)
  const wordRef = async (occ) => {
    await page.evaluate((o) => document.querySelector(`#pageViewContainer [data-word-occurrence="${o}"]`)?.click(), occ);
    await page.waitForFunction(() => !!document.querySelector(".quran-word-card .word-card-reference"), null, { timeout: 5000 }).catch(() => {});
    return page.evaluate(() => document.querySelector(".quran-word-card .word-card-reference")?.textContent.trim());
  };
  check(`${tag} word card for غَيْرِ (internal 1:7:5) reads 1:7:1`, (await wordRef("quran-word-occurrence:v1:1:7:5")) === "1:7:1");
  check(`${tag} word card for صِرَٰطَ (internal 1:7:1) reads 1:6:1`, (await wordRef("quran-word-occurrence:v1:1:7:1")) === "1:6:1");
  check(`${tag} the word's STORED occurrence id is still internal`, await page.evaluate(() => document.querySelector(".quran-word-card")?.dataset.occurrenceId === "quran-word-occurrence:v1:1:7:1"));
  await page.evaluate(() => document.querySelector("[data-word-card-close]")?.click());

  // ---- Progress: pressing Achieved on displayed 7 writes INTERNAL 1:7; displayed 6 shows it too
  const openHalf = async (half) => {
    await page.evaluate((h) => document.querySelector(`#pageViewContainer [data-ayah-split-half="${h}"]`)?.click(), half);
    await page.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
  };
  await openHalf("b");
  await page.evaluate(() => { const sel = document.querySelector("[data-approach-stage-select]"); sel.value = "recite"; sel.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('[data-approach-stage-btn="achieved"]')?.click());
  await page.waitForTimeout(500);
  const claim = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "records").at(-1));
  check(`${tag} Achieved on displayed 7 writes entries["ayah:1:8::recite"] (#606)`, !!claim && Object.keys(claim.data ?? {}).includes("entries.ayah:1:8::recite") && claim.data["entries.ayah:1:8::recite"].claimedStatus === "achieved", JSON.stringify(claim && Object.keys(claim.data ?? {})));
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await openHalf("a");
  await page.evaluate(() => { const sel = document.querySelector("[data-approach-stage-select]"); sel.value = "recite"; sel.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(300);
  const pressed6 = await page.evaluate(() => document.querySelector('[data-approach-stage-btn="achieved"]')?.getAttribute("aria-pressed"));
  check(`${tag} displayed 6 does NOT show it (#606: two separate records)`, pressed6 !== "true", String(pressed6));
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);

  // ---- Mushaf page 1
  await setMushaf(page, true);
  await page.waitForFunction(() => !!document.querySelector("#pageViewContainer .hifz-page"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);
  const mush = await page.evaluate(() => {
    const page1 = document.querySelector('#pageViewContainer .hifz-page[data-mushaf-page="1"]');
    const marks = page1 ? [...page1.querySelectorAll("[data-ayah-marker]")] : [];
    const glyph = (el) => [...el.textContent][0].codePointAt(0).toString(16);
    const split = marks.find((m) => m.dataset.ayahSplitPoint);
    const prev = split?.previousElementSibling;
    const cw = document.documentElement.clientWidth;
    return {
      has: !!page1,
      keys: marks.map((m) => m.dataset.ayahMarker),
      glyphs: marks.map(glyph),
      prevOcc: prev?.dataset.wordOccurrence, splitGlyph: split && glyph(split),
      over: document.documentElement.scrollWidth - cw,
      linesOut: page1 ? [...page1.querySelectorAll(".hifz-word")].filter((w) => { const r = w.getBoundingClientRect(); const pr = page1.getBoundingClientRect(); return r.width && (r.left < pr.left - 0.5 || r.right > pr.right + 0.5); }).length : -1,
    };
  });
  // Page 1's own glyphs: ① fc45 ② fc4a ③ fc4d ④ fc51 ⑤ fc56 ⑥ fc5a ⑦ fc64
  check(`${tag} Mushaf page 1 is drawn`, mush.has, JSON.stringify(mush));
  check(`${tag} exactly 7 numbered markers, none for the Bismillah (1:1)`, mush.keys.length === 7 && !mush.keys.includes("1:1"), JSON.stringify(mush));
  check(`${tag} markers print ①②③④⑤⑥⑦ in order`, JSON.stringify(mush.glyphs) === JSON.stringify(["fc4a", "fc4d", "fc51", "fc56", "fc5a", "fc5a", "fc64"].map((g, i) => ["fc45", "fc4a", "fc4d", "fc51", "fc56", "fc5a", "fc64"][i])), JSON.stringify(mush.glyphs));
  check(`${tag} the inserted ⑥ immediately follows word 1:7:4 in the DOM`, mush.prevOcc === "quran-word-occurrence:v1:1:7:4" && mush.splitGlyph === "fc5a", JSON.stringify(mush));
  check(`${tag} no sideways overflow on page 1`, mush.over <= 0 && mush.linesOut === 0, JSON.stringify(mush));
  await page.evaluate(() => document.querySelector("[data-ayah-split-point]")?.click());
  await page.waitForTimeout(600);
  const sheet = await page.evaluate(() => {
    const s = document.querySelector("#ayahActionSheet, .ayah-action-sheet, [data-ayah-action-sheet], [role=dialog]");
    return s ? (s.textContent || "").replace(/\s+/g, " ").slice(0, 200) : null;
  });
  check(`${tag} tapping ⑥ opens the displayed Ayah 6 card (#606)`, !!sheet && /[1১]:[6৬](?![–\d৭])/.test(sheet), String(sheet));
  await page.keyboard.press("Escape");
  await setMushaf(page, false);

  // ---- No stored key changes: every write path/field uses internal keys only
  const all = await writes(page);
  // Every written key naming a surah-1 ayah must be an internal one (1..7),
  // and the only one this run ever claimed is 1:7 -- a remapped write would
  // name 1:6 (displayed-7's neighbour) or 1:0/1:8.
  const keysWritten = [...new Set(JSON.stringify(all).match(/ayah:1:\d+/g) ?? [])];
  const bad = keysWritten.filter((k) => k !== "ayah:1:8"); // #606: displayed 7 is the record ayah:1:8
  check(`${tag} every written key naming Al-Fātiḥah is the displayed-7 record ayah:1:8 and nothing else`, bad.length === 0 && keysWritten.length >= 1, JSON.stringify({ keysWritten, n: all.length }));

  // ---- Setting OFF: today's behaviour exactly
  await page.evaluate(() => { const c = document.getElementById("fatihaCountToggle"); c.checked = false; c.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(900);
  const off = await page.evaluate(() => ({
    badges: [...document.querySelectorAll("#pageViewContainer button.ayah-num-badge")].map((b) => b.textContent.trim()),
    picker: [...document.querySelectorAll("#ayahSelect option")].map((o) => o.textContent.trim()),
    stored: localStorage.getItem("mm_fatiha_bismillah_unnumbered"),
  }));
  check(`${tag} off: seven badges over the stored ayahs, picker has 7 plain numbers (as before)`, off.badges.length === 7 && off.picker.length === 7 && off.picker[0] !== "Bismillah" && off.picker[0] !== "বিসমিল্লাহ" && off.picker[6].length === 1, JSON.stringify(off));
  check(`${tag} off: the choice is remembered on this device, not in Firestore`, off.stored === "0" && (await writes(page)).every((w) => !/fatiha/i.test(JSON.stringify(w))), JSON.stringify(off));
  await ctx.close();
}

// ===== Part 2 (issue #488): My Status totals, Explore wheel badges, search chips
const westernise = (s) => String(s ?? "").replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));
const ONLY_1_7 = `{ const d = DATA.records.find((r) => r.chunkKey === "surah_1");
  d.entries = { "ayah:1:7::recite": { unitType: "ayah", subjectId: "quran", trackableId: "recite",
    claimedStatus: "achieved", claimedByPersonId: "p1", confirmedStatus: "achieved", confirmState: "confirmed", domainIds: [], notes: "" } }; }`;
const runSearch = (page) => page.evaluate(() => { const i = document.getElementById("jumpInput"); i.value = "evoked"; i.dispatchEvent(new Event("input", { bubbles: true })); document.getElementById("searchBtn").click(); });
const flip =(page, on) => page.evaluate((o) => { const c = document.getElementById("fatihaCountToggle"); c.checked = o; c.dispatchEvent(new Event("change", { bubbles: true })); }, on);

for (const lang of ["en", "bn"]) for (const width of [390, 1280]) {
  const tag = `[#488 ${lang} ${width}]`;
  console.log(`\n=== Part 2 ${tag} ===`);
  // ---- My Status: only internal 1:7 achieved => 2 achieved with the count on, 1 with it off.
  {
    const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: width >= 768 ? 1000 : 844 }, extraSeedJs: ONLY_1_7 });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForFunction(() => !!document.querySelector("#wheelContainer svg"), null, { timeout: 30000 });
    const headline = async () => {
      await page.evaluate(() => { document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((el) => el.remove()); });
      await page.click("#myStatusWideBtn");
      await page.waitForSelector('#myStatusBody [data-my-status-open="recite"] .my-status-row-figure', { timeout: 10000 });
      const out = await page.evaluate(() => ({
        text: document.querySelector('[data-my-status-open="recite"] .my-status-row-figure').textContent.trim(),
        tile: document.querySelector('[data-my-status-open="recite"] .ms-tile[data-unit="ayah"]')?.dataset.n,
      }));
      await page.click("#myStatusCloseBtn"); await page.waitForTimeout(300);
      return out;
    };
    const on = await headline();
    check(`${tag} My Status: internal 1:7 alone reads 2 achieved (the count is on)`, westernise(on.text).match(/\d+/g).includes("2") && on.tile === "2" && !westernise(on.text).startsWith("Achieved + Mastered: 1 "), JSON.stringify(on));
    await flip(page, false); await page.waitForTimeout(600);
    const off = await headline();
    check(`${tag} My Status: with the count off the same record reads 1 achieved`, off.tile === "1" && /(^|[^\d])1([^\d]|$)/.test(westernise(off.text).slice(0, 40)), JSON.stringify(off));
    await ctx.close();
  }
  // ---- Explore wheel badges for surah 1, and the search chip.
  {
    const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: width >= 768 ? 1000 : 844 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.evaluate(() => { const s = document.getElementById("trackableSelect"); s.value = "tajweed"; s.dispatchEvent(new Event("change")); });
    await page.click("#tabExploreBtn");
    await page.waitForSelector('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="surah"]', { timeout: 30000 });
    await page.click('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="surah"][data-key="1"]', { force: true });
    // UPDATED for issue #752, reason recorded: since decision 82 (v09.107) the
    // Surah level opens in "All Approaches" mode -- one all-Approach slice
    // wheel and status strips, with NO ayah ring and NO `.way-row` badges. The
    // badges this check reads live in "One Approach" mode, so switch to it
    // (as unit-rings-browser.mjs does) instead of waiting for a ring that the
    // default mode never draws.
    await page.waitForSelector('#exploreModeRow [data-v="one"]', { timeout: 20000 });
    await page.click('#exploreModeRow [data-v="one"]');
    await page.waitForSelector('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="ayah"]', { timeout: 20000 });
    await page.waitForTimeout(500);
    const badges = () => page.evaluate(() => [...document.querySelectorAll("#exploreSidebarContainer .way-row")].map((r) => [r.dataset.key, r.querySelector(".badge").textContent.trim()]));
    const wantOn = lang === "en" ? ["", "1", "2", "3", "4", "5", "6", "7"] : ["", "১", "২", "৩", "৪", "৫", "৬", "৭"];
    const b = await badges();
    check(`${tag} Explore Al-Fātiḥah badges read (none), 1–5, 6, 7 (#606)`, JSON.stringify(b.map((x) => x[1])) === JSON.stringify(wantOn), JSON.stringify(b));
    check(`${tag} Explore: the Bismillah row shows no "1" and keys are the record ayahs 1..8 (#606)`, b[0][1] === "" && JSON.stringify(b.map((x) => x[0])) === JSON.stringify(["1", "2", "3", "4", "5", "6", "7", "8"]), JSON.stringify(b));
    // ---- Search chip (the card is opened by the Search button)
    await page.click("#tabStudyBtn"); await page.waitForTimeout(400);
    await runSearch(page);
    await page.waitForFunction(() => document.querySelectorAll(".search-hit").length > 0, null, { timeout: 15000 }).catch(() => {});
    const refs = await page.evaluate(() => [...document.querySelectorAll(".search-hit .ref")].map((e) => e.textContent.trim()));
    const wantRef = lang === "en" ? "1:6–7" : "১:৬–৭";
    check(`${tag} a search chip for internal 1:7 reads ${wantRef}`, refs.some((r) => r.endsWith(wantRef)), JSON.stringify(refs));
    await flip(page, false); await page.waitForTimeout(500);
    await runSearch(page);
    await page.waitForFunction(() => document.querySelectorAll(".search-hit").length > 0, null, { timeout: 15000 }).catch(() => {});
    const refsOff = await page.evaluate(() => [...document.querySelectorAll(".search-hit .ref")].map((e) => e.textContent.trim()));
    check(`${tag} off: the same chip reads the plain 1:7`, refsOff.some((r) => r.endsWith(lang === "en" ? "1:7" : "১:৭")) && !refsOff.some((r) => /[6৬]–/.test(r)), JSON.stringify(refsOff));
    await ctx.close();
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);

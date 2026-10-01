// Issue #352 -- "Every unit on the wheel" (Owner decisions 21-24). RENDERED,
// in a real browser, both languages. Built by the Architect: the Builder's
// two dispatched runs for this issue pushed nothing.
//
// What it proves, against the issue's own "Prove it" list:
//   1. The landing wheel's six rings, at 2:255, are coloured exactly as the
//      claims seeded below say -- the expected colours are worked out BY
//      HAND in this file's comments, never by calling the app's own
//      poolStatus()/effectiveStatus() (issue #341's review lesson). The seed
//      includes a Yes Approach whose Ruku' is done while its Page is not,
//      and a No Approach with only a Surah claim.
//   2. The data box names the rule and each unit, and its two buttons work.
//   3. The Show toggle is remembered across a reload.
//   4. subject_quran is not read at startup (I9); it is read once when All
//      units is first shown.
//   5. Explore: every ring's colour equals what Explore's own list shows
//      for that unit (Whole Qur'an Surahs and Juz, a Juz's Pages, a long
//      Surah's Ruku's, a short Surah's āyāt).
//   6. Text sizing: each of the 30 Juz arcs is within ±15% of 12°, and Al-
//      Baqarah's Surah arc matches its share of printed pages, counted here
//      independently from page-index.json.
//   7. Layout: no sideways scroll, Show buttons >= 40px, rings tappable.
//
//   node tools/i18n-verify/unit-rings-browser.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, "../quran-data-pull/output");
const pageRows = JSON.parse(fs.readFileSync(path.join(OUT, "page-index.json"), "utf8"));
const surahIndex = JSON.parse(fs.readFileSync(path.join(OUT, "surah-index.json"), "utf8"));

// ---- Independent text weight: each page = 1, shared by the āyāt on it. ----
const ayahCount = (s) => surahIndex.find((x) => x.surahNumber === s).ayahCount;
function ayahsOnPage(p) {
  const out = [];
  for (let s = p.startSurah; s <= p.endSurah; s++) {
    const from = s === p.startSurah ? p.startAyah : 1;
    const to = s === p.endSurah ? p.endAyah : ayahCount(s);
    for (let a = from; a <= to; a++) out.push([s, a]);
  }
  return out;
}
let baqaraWeight = 0;
for (const p of pageRows) {
  const on = ayahsOnPage(p);
  baqaraWeight += on.filter(([s]) => s === 2).length / on.length;
}
const BAQARA_DEG = (baqaraWeight / pageRows.length) * 360; // 48 whole pages -> 28.61°

// ---- The seed, at 2:255 -------------------------------------------------
// Units holding 2:255 (read off the real packaged tables): Juz 3 (2:253-3:92),
// Surah 2, Hizb 5 (2:253-3:14), Ruku' 34 of Al-Baqarah (2:254-257), Page 42
// (2:253-256), Āyah 2:255. Rings, middle out: juz, surah, hizb, ruku, page, ayah.
//
// "recite"  (Yes): āyāt 2:254, 255, 256, 257 Achieved.
//    juz   -- 2:253 unclaimed                 -> not_started
//    surah -- 2:1 unclaimed                   -> not_started
//    hizb  -- 2:253 unclaimed                 -> not_started
//    ruku  -- 254..257 all Achieved           -> achieved   (Ruku' done ...)
//    page  -- 2:253 unclaimed                 -> not_started (... Page not)
//    ayah  -- 2:255 Achieved                  -> achieved
// "memorise" (No): only a claim "surah:2" = learning.
//    surah -> learning; every other ring        -> not_started (no floor for No)
// "tajweed" (Yes): only "juz:3" = practising, in subject_quran.
//    juz   -- every āyah floored              -> practising
//    surah -- 2:1..252 are outside Juz 3       -> not_started
//    hizb, ruku, page, ayah -- inside Juz 3   -> practising
const EXPECT = {
  recite:   { juz: "not_started", surah: "not_started", hizb: "not_started", ruku: "achieved", page: "not_started", ayah: "achieved" },
  memorise: { juz: "not_started", surah: "learning", hizb: "not_started", ruku: "not_started", page: "not_started", ayah: "not_started" },
  tajweed:  { juz: "practising", surah: "not_started", hizb: "practising", ruku: "practising", page: "practising", ayah: "practising" },
};
const claim = (tid, st, unitType = "ayah") => `{ unitType: "${unitType}", subjectId: "quran", trackableId: "${tid}", claimedStatus: "${st}", confirmedStatus: null, confirmState: "pending" }`;
const SEED = `
for (const id of ["recite", "tajweed"]) DATA.trackables.find((t) => t._id === TENANT_ID + "__" + id).countsForEachAyah = true;
DATA.trackables.find((t) => t._id === TENANT_ID + "__memorise").countsForEachAyah = false;
DATA.records.push(
  { _id: TENANT_ID + "__p1__surah_2", tenantId: TENANT_ID, personId: "p1", entries: {
    "ayah:2:254::recite": ${claim("recite", "achieved")},
    "ayah:2:255::recite": ${claim("recite", "achieved")},
    "ayah:2:256::recite": ${claim("recite", "achieved")},
    "ayah:2:257::recite": ${claim("recite", "achieved")},
    "surah:2::memorise": ${claim("memorise", "learning", "surah")},
  } },
  { _id: TENANT_ID + "__p1__subject_quran", tenantId: TENANT_ID, personId: "p1", entries: {
    "juz:3::tajweed": ${claim("tajweed", "practising", "juz")},
  } }
);
`;
const RING_ORDER = ["juz", "surah", "hizb", "ruku", "page", "ayah"];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function clearSplash(page) {
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
}
async function goTo255(page) {
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change")); });
  await page.waitForFunction(() => document.getElementById("ayahSelect").options.length >= 286, null, { timeout: 20000 });
  await page.evaluate(() => { const a = document.getElementById("ayahSelect"); a.value = "255"; a.dispatchEvent(new Event("change")); });
  await page.waitForTimeout(400);
}
const sqReads = (page) => page.evaluate(() => (window.__fsLog || []).filter((r) => /subject_quran/.test(JSON.stringify(r)) && !/set|update|batch/i.test(r.kind || "")).length);
async function ringStatuses(page) {
  return page.evaluate(() => {
    const out = {};
    for (const p of document.querySelectorAll("#wheelContainer .wheel-ring-seg")) {
      (out[p.dataset.key] ??= {})[p.dataset.ringKind] = p.dataset.status;
    }
    return out;
  });
}

for (const lang of ["en", "bn"]) {
  console.log(`\n=== Every unit on the wheel, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width: 390, height: 844 }, extraSeedJs: SEED });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForSelector("#wheelContainer svg", { timeout: 20000 });
  await clearSplash(page);
  await goTo255(page);

  // ---- I9: the default wheel never reads subject_quran ------------------
  const startupSq = await sqReads(page);
  const defaultShow = await page.evaluate(() => ({ rings: document.querySelectorAll("#wheelContainer .wheel-ring-seg").length, segs: document.querySelectorAll("#wheelContainer .wheel-seg").length }));
  check(`[${lang}] the default wheel is today's single ring (no ring arcs)`, defaultShow.rings === 0 && defaultShow.segs === 10, JSON.stringify(defaultShow));
  check(`[${lang}] subject_quran is not read at startup`, startupSq === 0, String(startupSq));

  // ---- Show toggle: size, wrap, no sideways scroll ----------------------
  // Owner decision 51: the Show buttons live in the Unit drawer, closed until
  // opened (updated in place; assertions unchanged).
  await page.click('[data-wheel-drawer="unit"]');
  const toggle = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("#wheelShowSwitch [data-wheel-show]")];
    return { n: btns.length, minH: Math.min(...btns.map((b) => b.getBoundingClientRect().height)), overflow: document.documentElement.scrollWidth - innerWidth, pressed: btns.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.wheelShow) };
  });
  check(`[${lang}] Show offers 7 choices, each >= 40px tall`, toggle.n === 7 && toggle.minH >= 40, JSON.stringify(toggle));
  check(`[${lang}] by default Show marks the chosen unit (Āyah)`, JSON.stringify(toggle.pressed) === '["ayah"]', JSON.stringify(toggle.pressed));

  // ---- All units ---------------------------------------------------------
  await page.click('[data-wheel-show="all"]');
  await page.waitForFunction(() => document.querySelector("#wheelRingKey .wheel-ring-row span")?.textContent !== "…" && /[\d০-৯]/.test(document.querySelector("#wheelRingKey")?.textContent || ""), null, { timeout: 20000 });
  await page.waitForTimeout(300);
  check(`[${lang}] All units reads subject_quran exactly once`, (await sqReads(page)) === 1, String(await sqReads(page)));
  const st = await ringStatuses(page);
  check(`[${lang}] 10 Approaches × 6 rings are drawn`, Object.keys(st).length === 10 && Object.values(st).every((r) => RING_ORDER.every((k) => r[k])), JSON.stringify(Object.keys(st)));
  for (const [tid, exp] of Object.entries(EXPECT)) {
    for (const ring of RING_ORDER) {
      check(`[${lang}] ${tid} ${ring} ring = ${exp[ring]}`, st[tid]?.[ring] === exp[ring], `got ${st[tid]?.[ring]}`);
    }
  }
  // Ring order, middle out: the Juz arc of one slice sits inside its Āyah arc.
  const radial = await page.evaluate(() => {
    const r = (kind) => {
      const p = document.querySelector(`#wheelContainer .wheel-ring-seg[data-key="recite"][data-ring-kind="${kind}"]`);
      const b = p.getBBox(); const svg = p.ownerSVGElement.viewBox.baseVal;
      const cx = svg.width / 2, cy = svg.height / 2;
      const mx = b.x + b.width / 2, my = b.y + b.height / 2;
      return Math.hypot(mx - cx, my - cy);
    };
    return ["juz", "surah", "hizb", "ruku", "page", "ayah"].map(r);
  });
  check(`[${lang}] rings run Juz, Surah, Hizb, Ruku', Page, Āyah from the middle out`, radial.every((v, i) => i === 0 || v > radial[i - 1]), JSON.stringify(radial.map((v) => v.toFixed(1))));
  // Ring thickness at this width: tappable.
  const thick = await page.evaluate(() => {
    const svg = document.querySelector("#wheelContainer svg");
    const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    const rOuter = svg.viewBox.baseVal.width / 2 - 4;
    return ((rOuter - rOuter * 0.5) / 6) * scale;
  });
  console.log(`  INFO  ring thickness at 390px: ${thick.toFixed(1)}px`);
  check(`[${lang}] each ring is at least 9px thick at 390px`, thick >= 9, thick.toFixed(1));

  // Ring key names real units.
  const key = await page.evaluate(() => [...document.querySelectorAll("#wheelRingKey .wheel-ring-row")].map((r) => r.dataset.ringType + "=" + r.querySelector("span").textContent));
  const digits = (s) => s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
  check(`[${lang}] the ring key names Ruku' 34 (2:254–257)`, key.some((k) => k.startsWith("ruku=") && /34/.test(digits(k)) && /2:254–257/.test(digits(k))), JSON.stringify(key));
  check(`[${lang}] the ring key names Page 42 and Juz 3`, key.some((k) => k.startsWith("page=") && /42/.test(digits(k))) && key.some((k) => k.startsWith("juz=") && /\b3\b/.test(digits(k))), JSON.stringify(key));

  // ---- Data box: tap a slice -------------------------------------------
  await page.click('#wheelContainer .wheel-ring-seg[data-key="memorise"][data-ring-kind="ayah"]', { force: true });
  await page.waitForTimeout(300);
  const box = await page.evaluate(() => {
    const d = document.getElementById("wheelRingDetail");
    return { id: d?.dataset.trackableId, rule: d?.querySelector(".wheel-ring-rule")?.textContent, rows: [...(d?.querySelectorAll("li") ?? [])].map((li) => li.dataset.ringType + "=" + li.dataset.status), below: d ? d.getBoundingClientRect().top > document.getElementById("wheelContainer").getBoundingClientRect().bottom : false };
  });
  check(`[${lang}] tapping a slice shows that Approach in the data box`, box.id === "memorise", JSON.stringify(box));
  check(`[${lang}] the data box says the rule is No (○)`, /○/.test(box.rule || ""), box.rule);
  check(`[${lang}] the data box lists each unit with its status`, JSON.stringify(box.rows) === JSON.stringify(RING_ORDER.map((r) => `${r}=${EXPECT.memorise[r]}`)), JSON.stringify(box.rows));
  check(`[${lang}] on a phone the data box sits below the wheel`, box.below, JSON.stringify(box));
  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check(`[${lang}] no sideways scroll with All units shown`, noOverflow <= 1, String(noOverflow));

  // ---- Remembered across a reload ---------------------------------------
  const stored = await page.evaluate(() => localStorage.getItem("mm_wheel_show"));
  check(`[${lang}] the Show choice is stored`, stored === "all", String(stored));
  await page.reload();
  await page.waitForSelector("#wheelContainer svg", { timeout: 20000 });
  await clearSplash(page);
  await page.click('[data-wheel-drawer="unit"]'); // drawers start closed after a reload
  const afterReload =await page.evaluate(() => document.querySelector('#wheelShowSwitch [data-wheel-show="all"]').getAttribute("aria-pressed"));
  check(`[${lang}] after a reload All units is still chosen`, afterReload === "true", afterReload);

  // ---- "Take this Approach" opens the Note view on the chosen unit ------
  await goTo255(page);
  await page.waitForSelector("#wheelRingDetail [data-ring-action]", { timeout: 20000 });
  await page.click('#wheelContainer .wheel-ring-seg[data-key="recite"][data-ring-kind="juz"]', { force: true });
  await page.waitForTimeout(200);
  await page.click('#wheelRingDetail [data-ring-action="take"], .wheel-ring-panel [data-ring-action="take"]');
  await page.waitForTimeout(800);
  const noteOpen = await page.evaluate(() => ({ note: !!document.querySelector("#noteView:not([hidden])"), approach: document.getElementById("trackableSelect").value }));
  check(`[${lang}] "Take this Approach" opens the Note view on that Approach`, noteOpen.note && noteOpen.approach === "recite", JSON.stringify(noteOpen));

  // ---- Explore ----------------------------------------------------------
  await page.evaluate(() => { const s = document.getElementById("trackableSelect"); s.value = "tajweed"; s.dispatchEvent(new Event("change")); });
  await page.click("#tabExploreBtn");
  await page.waitForSelector("#exploreWheelContainer .wheel-ring-seg", { timeout: 30000 });
  await page.waitForTimeout(400);
  const listVsRing = (ringKind) => page.evaluate((kind) => {
    const rows = new Map([...document.querySelectorAll("#exploreSidebarContainer .way-row")].map((r) => [r.dataset.key, (r.querySelector(".status-chip").className.match(/chip-(\w+)/) || [])[1]]));
    const arcs = [...document.querySelectorAll(`#exploreWheelContainer .wheel-ring-seg[data-ring-kind="${kind}"]`)];
    const mism = arcs.filter((a) => rows.has(a.dataset.key) && rows.get(a.dataset.key) !== a.dataset.status).map((a) => a.dataset.key);
    return { arcs: arcs.length, compared: arcs.filter((a) => rows.has(a.dataset.key)).length, mism, statuses: [...new Set(arcs.map((a) => a.dataset.status))] };
  }, ringKind);
  const quranSurahs = await listVsRing("surah");
  check(`[${lang}] Whole Qur'an: 114 Surah arcs, each the colour its list row shows`, quranSurahs.arcs === 114 && quranSurahs.compared === 114 && quranSurahs.mism.length === 0, JSON.stringify(quranSurahs));
  await page.click("#exploreViewPrimaryBtn");
  await page.waitForTimeout(600);
  const quranJuz = await listVsRing("juz");
  check(`[${lang}] Whole Qur'an: 30 Juz arcs, each the colour its list row shows`, quranJuz.arcs === 30 && quranJuz.compared === 30 && quranJuz.mism.length === 0, JSON.stringify(quranJuz));
  check(`[${lang}] the seeded Juz 3 claim shows (Practising) -- the comparison can fail`, await page.evaluate(() => document.querySelector('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="juz"][data-key="3"]')?.dataset.status === "practising"));
  // Text sizing.
  const arcs = await page.evaluate(() => ({
    juz: [...document.querySelectorAll('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="juz"]')].map((a) => Number(a.dataset.a1) - Number(a.dataset.a0)),
    baqara: (() => { const a = document.querySelector('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="surah"][data-key="2"]'); return Number(a.dataset.a1) - Number(a.dataset.a0); })(),
  }));
  const juzOff = arcs.juz.map((d) => (d + 0.7) / 12 - 1);
  check(`[${lang}] each of the 30 Juz arcs is within ±15% of 12°`, arcs.juz.length === 30 && juzOff.every((x) => Math.abs(x) <= 0.15), JSON.stringify(arcs.juz.map((d) => d.toFixed(2))));
  check(`[${lang}] Al-Baqarah's arc matches its share of printed pages (${BAQARA_DEG.toFixed(2)}°)`, Math.abs(arcs.baqara + 0.7 - BAQARA_DEG) < 0.3, arcs.baqara.toFixed(2));

  // Tap Juz 3 -> the Juz level: Hizb, Ruku', Page rings; Pages list = Page ring.
  await page.click('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="juz"][data-key="3"]', { force: true });
  await page.waitForSelector('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="hizb"]', { timeout: 20000 });
  await page.waitForTimeout(400);
  const juzKinds = await page.evaluate(() => { const o = {}; for (const a of document.querySelectorAll("#exploreWheelContainer .wheel-ring-seg")) o[a.dataset.ringKind] = (o[a.dataset.ringKind] || 0) + 1; return o; });
  // Juz 3 = 2:253-3:92 -> Hizb 5, 6; pages 42-62 (21, per juz-index startPage/endPage).
  check(`[${lang}] inside Juz 3: 2 Hizb, 21 Pages and its Ruku's`, juzKinds.hizb === 2 && juzKinds.page === 21 && juzKinds.ruku > 0, JSON.stringify(juzKinds));
  const juzPages = await listVsRing("page");
  check(`[${lang}] inside Juz 3: every Page arc is the colour its list row shows`, juzPages.compared === 21 && juzPages.mism.length === 0 && juzPages.statuses.includes("practising"), JSON.stringify(juzPages));
  const partRuku = await page.evaluate(() => [...document.querySelectorAll('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="ruku"]')].filter((a) => /\(/.test(a.querySelector("title").textContent)).map((a) => a.dataset.key));
  // Ruku' 33 of Al-Baqarah is 2:249-253: it starts in Juz 2 and crosses into Juz 3.
  check(`[${lang}] a Ruku' crossing the Juz edge says (part)`, partRuku.includes("2:33"), JSON.stringify(partRuku));
  await page.click('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="ruku"][data-key="2:34"]', { force: true });
  await page.waitForTimeout(300);
  const eBox = await page.evaluate(() => ({ key: document.getElementById("exploreRingDetail")?.dataset.unitKey, status: document.querySelector("#exploreRingDetail [data-explore-unit-status]")?.dataset.exploreUnitStatus, done: document.querySelector("#exploreRingDetail [data-explore-unit-done]")?.textContent, open: !!document.querySelector("#exploreRingDetail [data-explore-ring-open]") }));
  // tajweed is Yes; Juz 3 practising floors all four āyāt of Ruku' 34 -> 0 of 4 Achieved/Mastered.
  const doneDigits = (eBox.done || "").replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).match(/\d+/g) ?? [];
  check(`[${lang}] the Explore data box shows the tapped Ruku' 34 as Practising`, eBox.key === "2:34" && eBox.status === "practising", JSON.stringify(eBox));
  check(`[${lang}] ... with "0 of 4" āyāt Achieved or Mastered, and an Open button`, doneDigits.map(Number).sort().join() === "0,4" && eBox.open, JSON.stringify(eBox));
  await page.click("#exploreRingDetail [data-explore-ring-open]");
  await page.waitForTimeout(1200);
  check(`[${lang}] Open goes to that Ruku'`, await page.evaluate(() => /34/.test(document.getElementById("exploreBreadcrumb").textContent.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))))));

  // Whole Qur'an -> Surah 2 (long): Ruku' list = Ruku' ring.
  await page.evaluate(() => document.querySelector('#exploreBreadcrumb [data-level="quran"]').click());
  await page.waitForSelector('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="surah"]', { timeout: 20000 });
  await page.click('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="surah"][data-key="2"]', { force: true });
  await page.waitForSelector('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="ayah"]', { timeout: 20000 });
  await page.waitForTimeout(400);
  const s2 = await listVsRing("ruku");
  const s2ayat = await page.evaluate(() => document.querySelectorAll('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="ayah"]').length);
  check(`[${lang}] Al-Baqarah: 40 Ruku' arcs = its Ruku' list, and 286 āyāt around them`, s2.compared === 40 && s2.mism.length === 0 && s2ayat === 286, JSON.stringify({ s2, s2ayat }));
  // Short Surah 1: āyah list = āyah ring.
  await page.evaluate(() => document.querySelector('#exploreBreadcrumb [data-level="quran"]').click());
  await page.waitForSelector('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="surah"]', { timeout: 20000 });
  await page.click('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="surah"][data-key="1"]', { force: true });
  await page.waitForSelector('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="ayah"]', { timeout: 20000 });
  await page.waitForTimeout(400);
  const s1 = await listVsRing("ayah");
  check(`[${lang}] Al-Faatiha: 7 āyah arcs, each the colour its list row shows`, s1.compared === 7 && s1.mism.length === 0, JSON.stringify(s1));
  const expOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check(`[${lang}] Explore: no sideways scroll`, expOverflow <= 1, String(expOverflow));

  const real = errors.filter((e) => !/Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|CERT_AUTHORITY_INVALID|FAILED)/.test(e));
  check(`[${lang}] no page errors`, real.length === 0, real.join("; "));
  await ctx.close();
}

// ---- Tablet and PC: the data box sits beside the wheel, in the list --------
// Review: at 768px the card does not scroll, and a box under the wheel was
// cut off below the card's edge -- unreachable. From 721px it goes to the
// top of the list, which scrolls.
for (const w of [768, 1100]) {
  const ctx = await newContext(browser, { viewport: { width: w, height: w === 768 ? 1024 : 800 }, extraSeedJs: SEED });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForSelector("#wheelContainer svg", { timeout: 20000 });
  await clearSplash(page);
  await page.click('[data-wheel-drawer="unit"]');
  await page.click('[data-wheel-show="all"]');
  await page.waitForSelector("#wheelRingDetail", { timeout: 20000 });
  const reach = (detailSel, listSel, wheelSel) => page.evaluate(([d, l, wh]) => {
    const det = document.querySelector(d);
    const list = document.querySelector(l);
    det.scrollIntoView({ block: "nearest" });
    const dr = det.getBoundingClientRect(), lr = list.getBoundingClientRect(), wr = document.querySelector(wh).getBoundingClientRect();
    return { inList: list.contains(det), visible: dr.top >= lr.top - 1 && dr.top < lr.bottom, beside: dr.right <= wr.left + 1 || dr.left >= wr.right - 1, overflow: document.documentElement.scrollWidth - innerWidth };
  }, [detailSel, listSel, wheelSel]);
  const land = await reach("#wheelRingDetail", "#wheelSidebarContainer", "#wheelContainer");
  check(`[${w}] landing: the data box sits beside the wheel, in the list, and can be scrolled to`, land.inList && land.visible && land.beside && land.overflow <= 1, JSON.stringify(land));
  await page.click("#tabExploreBtn");
  await page.waitForSelector("#exploreWheelContainer .wheel-ring-seg", { timeout: 30000 });
  await page.waitForTimeout(400);
  const exp = await reach("#exploreRingDetail", "#exploreSidebarContainer", "#exploreWheelContainer");
  check(`[${w}] Explore: the data box sits beside the wheel, in the list, and can be scrolled to`, exp.inList && exp.visible && exp.beside && exp.overflow <= 1, JSON.stringify(exp));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Every unit on the wheel: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

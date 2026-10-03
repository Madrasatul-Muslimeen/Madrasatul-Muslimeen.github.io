// Owner, 3 Oct 2026 (a photo of the Approach pick-list): "this approach list
// should mark those which are already had some progress done (if you choose
// the dot, like what shows for one now, then make it with the color of the
// progress)". A phone's own pick-list cannot colour its dots, so a tap on the
// pull-down opens the app's own list (ayah-action-sheet.js openApproachList).
//
// Rendered, both languages, phone and PC widths:
//   1. tapping the pull-down opens the app's own list (not the phone's), with
//      the tenant's sections and every Approach;
//   2. after a Learning claim, that Approach's dot is Learning's colour
//      (STATUS_COLORS.learning #8a6a35 = rgb(138, 106, 53), written by hand)
//      and is the checked row; an Approach with no progress has a plain dot;
//   3. choosing another row sets the pull-down and its summary (no write);
//   4. Escape and the backdrop close it; no sideways overflow at 320;
//   5. the list's text passes 4.5:1 on Night and Light.
//   --mutate-plain  draws every dot plain: check 2 must fail.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
// Issue #332 Part A -- was raw.githubusercontent.com/.../mushaf/fonts/;
// updated to match hifz-renderer.js's own MUSHAF_FONT_BASE, now the Quran
// Foundation v2 CDN (the files are byte-identical -- see
// docs/reports/2026-09-27-tajweed-font-permission.md).
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";

// ONE real page (50), ONE real āyah on it (3:55, Aal-i-Imraan) -- the
// issue's own worked example for the Ayah Card's write ("ayah:3:55"), and
// exactly the same page serves the "This page" card scenario too, so the
// suite never needs a second fixture page. Same two-position-per-ayah shape
// (a real word, then the marker) quran-ayah-action-sheet-browser.mjs's own
// fixture already uses, and the same short, on-page marker glyph its own
// Architect-review comment explains (a long synthetic glyph runs off the
// page and fails its own hit-test).
const MARKER_GLYPH = "Ⓜ";
const SYNTHETIC_MUSHAF_DATA = {
  "50": [{ type: "ayah", words: [
    { g: "Ⓦ", loc: "3:55:1" },
    { g: MARKER_GLYPH, loc: "3:55:2" },
  ] }],
};

// The default fixture's own `records` seed only carries surah_1 and
// subject_asma_ul_husna documents. A claim against a document that does not
// exist yet takes the stub's CREATE path (setDoc), which the stub's own
// comment states plainly is "a pure no-op ... and leaves no trace" -- so the
// very first claim in each scenario would be invisible to __stubWriteData
// without this. Seeded with an empty entries map (not the identical shape
// CARD_SEED's own DATA.records = [{...}] uses, since this suite ADDS to the
// default set rather than replacing it -- surah_1's own seeded claims stay
// intact for every other suite that might one day share a context).
const APPROACH_CARDS_SEED = `
DATA.records.push(
  { _id: TENANT_ID + "__p1__surah_3", tenantId: TENANT_ID, personId: "p1", entries: {} },
  { _id: TENANT_ID + "__p1__subject_quran", tenantId: TENANT_ID, personId: "p1", entries: {} }
);
`;

async function installSyntheticMushafFixture(ctx) {
  await ctx.route(MUSHAF_JSON_URL, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SYNTHETIC_MUSHAF_DATA) }));
  await ctx.route(`${MUSHAF_FONT_BASE}**`, (route) => route.abort("failed"));
  await ctx.route(SURAH_HEADER_FONT_URL, (route) => route.abort("failed"));
}

async function clickSafely(page, selector, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    await page.evaluate(() => {
      document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove());
    });
    try { await page.click(selector, { timeout: 4000 }); return; } catch (err) { lastErr = err; }
  }
  throw lastErr;
}

/** Opens the Read screen, Surah 3 (Aal-i-Imraan), Whole Surah, Mushaf on -- the same picker sequence every other Mushaf suite here already uses, just surah 3 instead of 2/14. */
async function openMushafSurah3(page) {
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await clickSafely(page, "#tabStudyBtn"); await page.waitForTimeout(150); }
  await clickSafely(page, "#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "3"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { const sel = document.getElementById("unitTypeSelect"); sel.value = "surah"; sel.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const m = document.getElementById("mushafToggle");
    if (m && !m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(500);
}


const SECTIONS = { en: ["Preservation", "Engagement", "Understanding", "Reflection", "Action"], bn: ["সংরক্ষণ", "সম্পৃক্ততা", "উপলব্ধি", "প্রতিফলন", "আমল"] };
const RECITE = { en: "Recite correctly", bn: "সঠিকভাবে তিলাওয়াত" };

const contrastOf = () => {
  const parse = (s) => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]]; };
  const lum = ([r, g, b]) => { const l = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (n) => { for (; n; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.backgroundImage.includes("gradient")) return [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => parse(m[0]).slice(0, 3)); const c = parse(cs.backgroundColor); if (c && c[3] >= 1) return [c.slice(0, 3)]; } return [[255, 255, 255]]; };
  let worst = 99, at = "";
  for (const el of document.querySelectorAll(".gac-list .gac-list-name, .gac-list .gac-list-group, .gac-list-head p, .gac-list-legend span")) {
    const fg = parse(getComputedStyle(el).color).slice(0, 3);
    for (const b of bgOf(el)) { const v = cr(fg, b); if (v < worst) { worst = v; at = el.textContent.trim().slice(0, 24); } }
  }
  return { worst: Math.round(worst * 100) / 100, at };
};

for (const lang of ["en", "bn"]) {
  for (const width of [320, 390, 1100]) {
    const L = `[${lang} ${width}]`;
    console.log(`\n=== Approach list dots, ${L} ===`);
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 844 }, extraSeedJs: APPROACH_CARDS_SEED });
    if (process.argv.includes("--mutate-plain")) {
      await ctx.route("**/js/ayah-action-sheet.js", async (route) => {
        const res = await route.fetch();
        await route.fulfill({ response: res, body: (await res.text()).replace('st && st !== "not_started" && st !== "not_applicable" ? STATUS_COLORS[st] : null', "null") });
      });
    }
    await installSyntheticMushafFixture(ctx);
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await openMushafSurah3(page);
    await page.waitForFunction(() => { const c = document.getElementById("readBarRecordBtn"); return !!c && c.getBoundingClientRect().width > 0; }, null, { timeout: 12000 }).catch(() => {});
    await clickSafely(page, "#readBarRecordBtn");
    await page.waitForFunction(() => !!document.querySelector("#pageApproachSelect"), null, { timeout: 8000 }).catch(() => {});
    await page.selectOption("#pageApproachSelect", "recite");
    await page.waitForTimeout(500);
    await clickSafely(page, '[data-approach-stage-btn="learning"]');
    await page.waitForTimeout(800);

    // 1. A tap on the pull-down opens the app's own list.
    const tapTarget = await page.evaluate(() => {
      const sel = document.getElementById("pageApproachSelect"); const r = sel.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { hit: hit?.matches("[data-approach-list-open]") ?? false, w: Math.round(r.width) };
    });
    check(`${L} a tap on the pull-down lands on the app's own list opener`, tapTarget.hit, JSON.stringify(tapTarget));
    await clickSafely(page, "#pageApproachSelect + [data-approach-list-open]");
    await page.waitForSelector("[data-approach-list]", { timeout: 4000 }).catch(() => {});
    const list = await page.evaluate(() => {
      const w = document.querySelector("[data-approach-list]"); if (!w) return null;
      const rows = [...w.querySelectorAll("[data-approach-list-pick]")];
      const dot = (id) => { const r = w.querySelector(`[data-approach-list-pick="${id}"]`); const d = r?.querySelector(".gac-list-dot"); return d ? { border: getComputedStyle(d).borderTopColor, checked: r.getAttribute("aria-checked"), progress: d.classList.contains("has-progress"), name: r.querySelector(".gac-list-name").textContent.trim() } : null; };
      const opts = document.querySelectorAll("#pageApproachSelect option[value]:not([value=''])").length;
      return { groups: [...w.querySelectorAll(".gac-list-group")].map((g) => g.textContent.trim()), rows: rows.length, opts, recite: dot("recite"),
        other: rows.map((r) => r.dataset.approachListPick).find((id) => id !== "recite"), plain: (() => { const r = rows.find((x) => x.dataset.approachListPick !== "recite"); const d = r.querySelector(".gac-list-dot"); return { progress: d.classList.contains("has-progress"), checked: r.getAttribute("aria-checked") }; })(),
        overflow: document.documentElement.scrollWidth > innerWidth + 1, inView: (() => { const b = w.querySelector(".gac-list").getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth + 0.5; })() };
    });
    check(`${L} the list opens, grouped by the tenant's sections, with every Approach`, !!list && JSON.stringify(list.groups) === JSON.stringify(SECTIONS[lang]) && list.rows === list.opts && list.rows > 5, JSON.stringify(list && { groups: list.groups, rows: list.rows, opts: list.opts }));
    // 2. The claimed Approach carries Learning's colour.
    check(`${L} Recite correctly (Learning here) has a dot in Learning's colour rgb(138, 106, 53)`, list?.recite?.progress && list.recite.border === "rgb(138, 106, 53)", JSON.stringify(list?.recite));
    check(`${L} it is the checked row, and its name says its stage`, list?.recite?.checked === "true" && list.recite.name.startsWith(RECITE[lang] + " · "), JSON.stringify(list?.recite));
    check(`${L} an Approach with no progress has a plain, unchecked dot`, list?.plain && !list.plain.progress && list.plain.checked === "false", JSON.stringify(list?.plain));
    check(`${L} the list fits the screen, no sideways scroll`, list && list.inView && !list.overflow, JSON.stringify(list && { inView: list.inView, overflow: list.overflow }));
    // 5. Contrast in both looks.
    for (const look of ["night", "light"]) {
      await page.evaluate((l) => { const w = document.querySelector("[data-approach-list]"); if (w) w.dataset.cardLook = l; }, look);
      const c = await page.evaluate(contrastOf);
      check(`${L} ${look}: the list's text passes 4.5:1`, c.worst >= 4.5, JSON.stringify(c));
    }
    // 3. Choosing another row sets the pull-down, writes nothing.
    const writesBefore = await page.evaluate(() => (window.__stubWriteData || []).length);
    await page.click(`[data-approach-list-pick="${list.other}"]`);
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({ open: !!document.querySelector("[data-approach-list]"), value: document.getElementById("pageApproachSelect")?.value, writes: (window.__stubWriteData || []).length }));
    check(`${L} choosing another Approach closes the list and sets the pull-down to it, with no write`, !after.open && after.value === list.other && after.writes === writesBefore, JSON.stringify({ ...after, want: list.other, writesBefore }));
    // 4. Escape and the backdrop close it.
    await clickSafely(page, "#pageApproachSelect + [data-approach-list-open]");
    await page.waitForSelector("[data-approach-list]", { timeout: 4000 }).catch(() => {});
    await page.keyboard.press("Escape");
    const escClosed = await page.evaluate(() => !document.querySelector("[data-approach-list]"));
    const sheetStill = await page.evaluate(() => !!document.querySelector("#pageApproachSelect"));
    check(`${L} Escape closes the list and leaves the card open`, escClosed && sheetStill, JSON.stringify({ escClosed, sheetStill }));
    await clickSafely(page, "#pageApproachSelect + [data-approach-list-open]");
    await page.waitForSelector("[data-approach-list]", { timeout: 4000 }).catch(() => {});
    await page.mouse.click(4, 4);
    check(`${L} a tap outside the list closes it`, await page.evaluate(() => !document.querySelector("[data-approach-list]")));
    await ctx.close();
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);

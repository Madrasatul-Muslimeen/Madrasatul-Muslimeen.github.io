// QR J09 (the Owner, 17 Oct 2026): Al-Fātiḥah's "Before Al-Fātiḥah" in the Single Ayah view (the Owner's choice B).
// At 390 and 1400, signed in through MMSA's test harness (Firebase faked at the network layer):
//   1. the band shows Aʿūdhu billāh on the RIGHT and the Bismillah on the LEFT;
//   2. Al-Fātiḥah opens at āyah 1, and the āyah list offers 1–7 only (no Bismillah, no Aʿūdhu billāh);
//   3. tapping Aʿūdhu billāh shows it alone in the reading space, as large as an āyah, with its meaning, and the
//      closed list names it; tapping the Bismillah shows the Bismillah the same way;
//   4. the Read bar's unit button names what is shown; ⏭ goes Aʿūdhu billāh -> Bismillah -> āyah 1, and ⏮ back; the shown item is marked; a second tap opens its card;
//   no page errors, no sideways scroll.
//
//   node tools/apps/qr-verify/fatiha-opening-browser.mjs     (serves itself on PORT, default 8098)
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import { spawn } from "node:child_process";
import { routeMmsaHadith } from "./mmsa-hadith-route.mjs";

const PORT = Number(process.env.PORT) || 8098;
let server = null;
const { chromium, newContext } = await import("../../i18n-verify/harness.mjs");

let pass = 0, fail = 0;
const check = (ok, what) => { ok ? pass++ : fail++; console.log(`${ok ? "ok  " : "FAIL"} ${what}`); };
const browser = await chromium.launch();
try {
  for (const width of [390, 1400]) {
    try { await run(width); } catch (err) { check(false, `@${width} stopped early: ${String(err.message).split("\n")[0]}`); }
  }
} finally {
  await browser.close();
  server?.kill();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

async function run(width) {
  const tag = `@${width}`;
  const ctx = await newContext(browser, { viewport: { width, height: width < 600 ? 844 : 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await routeMmsaHadith(ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${process.env.QR_BASE}/app/quranrevival.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
  await page.evaluate(() => document.getElementById("tabReadBtn").click());
  await page.waitForFunction(() => !document.getElementById("readView").hidden && document.querySelector("#ayahPanels [data-opening-band]"), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);

  const state = () => page.evaluate(() => {
    const chips = [...document.querySelectorAll("#ayahPanels [data-opening-open]")].map((c) => { const r = c.getBoundingClientRect(); return { key: c.dataset.openingOpen, x: Math.round(r.left), cur: c.getAttribute("aria-current") === "true" }; });
    const sel = document.getElementById("ayahSelect");
    const ar = document.querySelector("#ayahPanels .ayah-arabic");
    return {
      pos: document.getElementById("ayahPosition")?.textContent.trim(),
      value: sel.value,
      shown: sel.selectedOptions[0]?.textContent.trim(),
      listed: [...sel.options].filter((o) => !o.hidden).map((o) => o.textContent.trim()),
      chips,
      ar: ar?.textContent.trim() ?? "", arSize: ar ? parseFloat(getComputedStyle(ar).fontSize) : 0,
      tr: [...document.querySelectorAll("#ayahPanels .ayah-translation")].map((e) => e.textContent.trim()).join(" | "),
      chip: document.querySelector("#readUnitChip .read-unit-chip-text")?.textContent.trim(),
      prevOff: document.getElementById("prevAyahBtn")?.disabled, nextOff: document.getElementById("nextAyahBtn")?.disabled,
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    };
  });
  const tap = async (sel) => { await page.evaluate((s) => document.querySelector(s).click(), sel); await page.waitForTimeout(700); };

  let s = await state();
  check(s.value === "2" && /ٱلْحَمْدُ|الحمد/.test(s.ar), `${tag} Al-Fātiḥah opens at āyah 1 (${s.pos}; "${s.ar.slice(0, 20)}")`);
  check(JSON.stringify(s.listed) === JSON.stringify(["1", "2", "3", "4", "5", "6", "7"]), `${tag} the āyah list offers 1–7 only (${s.listed.join(", ")})`);
  const ta = s.chips.find((c) => c.key === "opening:taawwudh"), bi = s.chips.find((c) => c.key === "ayah:1:1");
  check(!!ta && !!bi && ta.x > bi.x, `${tag} the band: Aʿūdhu billāh on the right, the Bismillah on the left (${JSON.stringify(s.chips)})`);
  const ayahSize = s.arSize;

  await tap('#ayahPanels [data-opening-open="opening:taawwudh"]');
  s = await state();
  check(/أَعُوذُ بِٱللَّهِ مِنَ ٱلشَّيْطَٰنِ/.test(s.ar) && /refuge/.test(s.tr), `${tag} Aʿūdhu billāh is in the reading space with its meaning ("${s.tr.slice(0, 40)}")`);
  check(s.arSize === ayahSize && ayahSize > 0, `${tag} Aʿūdhu billāh is as large as an āyah (${s.arSize}px = ${ayahSize}px)`);
  check(/Aʿūdhu billāh/.test(s.pos) && /Aʿūdhu billāh/.test(s.shown) && /Aʿūdhu billāh/.test(s.chip), `${tag} the heading, the closed list and the bar's unit button name it ("${s.pos}", "${s.shown}", "${s.chip}")`);
  check(s.chips.find((c) => c.key === "opening:taawwudh")?.cur === true, `${tag} its band button is marked as shown`);
  check(s.prevOff === true && s.nextOff === false, `${tag} at Aʿūdhu billāh: ⏮ off, ⏭ on`);

  await tap("#nextAyahBtn");
  s = await state();
  check(/بِسْمِ/.test(s.ar) && s.value === "1" && /Bismillah/.test(s.pos) && s.chips.find((c) => c.key === "ayah:1:1")?.cur === true, `${tag} ⏭ from Aʿūdhu billāh shows the Bismillah (${s.pos}; list "${s.shown}")`);
  check(s.arSize === ayahSize, `${tag} the Bismillah is as large as Aʿūdhu billāh (${s.arSize}px)`);
  check(s.prevOff === false, `${tag} at the Bismillah ⏮ is on`);
  await tap("#prevAyahBtn");
  s = await state();
  check(/أَعُوذُ/.test(s.ar), `${tag} ⏮ from the Bismillah goes back to Aʿūdhu billāh`);
  await tap("#nextAyahBtn"); await tap("#nextAyahBtn");
  s = await state();
  check(s.value === "2" && /ٱلْحَمْدُ|الحمد/.test(s.ar), `${tag} ⏭ from the Bismillah goes to āyah 1 (${s.pos})`);

  await tap('#ayahPanels [data-opening-open="ayah:1:1"]');
  s = await state();
  check(/بِسْمِ/.test(s.ar) && s.value === "1", `${tag} the band's Bismillah shows the Bismillah in the reading space`);
  await tap('#ayahPanels [data-opening-open="ayah:1:1"]');
  await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-intro]"), null, { timeout: 8000 }).catch(() => {});
  const card = await page.evaluate(() => ({ open: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), unit: document.querySelector("[data-ayah-sheet]")?.dataset.unitKey }));
  check(card.open && card.unit === "ayah:1:1", `${tag} a second tap on the shown Bismillah opens its card (${JSON.stringify(card)})`);
  await page.evaluate(() => document.querySelectorAll("#ayahActionSheetOverlay.open [data-ayah-sheet-close]").forEach((b) => b.click()));
  await page.waitForTimeout(500);
  await tap('#ayahPanels [data-opening-open="opening:taawwudh"]');
  await tap("#ayahPanels [data-opening-card]");
  await page.waitForFunction(() => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-intro]"), null, { timeout: 8000 }).catch(() => {});
  const card2 = await page.evaluate(() => ({ open: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), unit: document.querySelector("[data-ayah-sheet]")?.dataset.unitKey }));
  check(card2.open && card2.unit === "opening:taawwudh", `${tag} tapping Aʿūdhu billāh's text opens its card (${JSON.stringify(card2)})`);

  s = await state();
  check(s.sw <= s.cw, `${tag} no sideways scroll (${s.sw} <= ${s.cw})`);
  check(errors.length === 0, `${tag} no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
  await page.evaluate(() => document.querySelectorAll("#ayahActionSheetOverlay.open [data-ayah-sheet-close]").forEach((b) => b.click()));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${process.env.QR_SHOTS ?? "/tmp"}/j09-${width}.png` });
  await ctx.close();
}

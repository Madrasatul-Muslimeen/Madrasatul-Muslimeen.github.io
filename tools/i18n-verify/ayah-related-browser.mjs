// Ayah Card section C part 1 -- "Related āyāt", in a real browser.
//
// The Owner's decision (recorded on issue #295): Related = āyāt sharing this
// āyah's rarer words (from the Qur'an data) plus āyāt in the same QCR
// collection or tied to the same Asma ul Husna Name. This proves, for 2:255:
//   - nothing is fetched for it until the card opens (I9);
//   - the card first says it is loading, then lists real rows;
//   - a seeded QCR collection holding 2:255 and 3:2 puts 3:2 under "In the same
//     QCR collection or Asma Name", with the collection's name as the reason;
//   - the shared-word list carries 20:110 (the strongest shared-word match,
//     computed independently here from the packaged index);
//   - every row is a >= 40px button, readable (contrast >= 4.5:1);
//   - tapping a row closes the card and goes to that āyah;
//   - English and Bangla, 390px and 1100px, no sideways scroll.
// Run from the repository root with serve.js on :8080.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
import { relatedBySharedWords } from "../../app/js/ayah-related.js";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

// Independent expectation from the packaged data, not from the page.
const lemmaIndex = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/lemmas-index.json", "utf8"));
const expectedShared = relatedBySharedWords(lemmaIndex.values, 2, 255);
check("precondition: the packaged index relates 2:255 to 20:110 first", expectedShared[0]?.surah === 20 && expectedShared[0]?.ayah === 110, JSON.stringify(expectedShared[0]));

const SEED = `\nDATA.ayahCollections = [{ _id: "t1", tenantId: "t1", collections: [{ id: "c-test", title: { en: "Living test collection", bn: "পরীক্ষার সংকলন" }, badge: "", order: 1, status: "active", items: ["ayah:2:255", "ayah:3:2"], yrLevels: [] }] }];\n`;

async function openStudy(page, which) {
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
  const reachable = await page.evaluate((id) => (document.getElementById(id)?.getBoundingClientRect().width ?? 0) > 0, which);
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click(`#${which}`);
  await page.waitForTimeout(700);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const viewport of [{ width: 390, height: 844 }, { width: 1100, height: 800 }]) {
  for (const lang of ["en", "bn"]) {
    const label = `${lang} ${viewport.width}px`;
    const ctx = await newContext(browser, { appLang: lang, viewport, extraSeedJs: SEED });
    const fetched = [];
    ctx.on("request", (r) => { if (/lemmas-index\.json/.test(r.url())) fetched.push(r.url()); });
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await openStudy(page, "tabReadBtn");
    await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const u = document.getElementById("unitTypeSelect"); u.value = "ayah"; u.dispatchEvent(new Event("change", { bubbles: true }));
      const a = document.getElementById("ayahSelect"); a.value = "255"; a.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForTimeout(900);
    check(`${label} I9: the word index is not fetched before the card opens`, fetched.length === 0, fetched.join(" "));

    await page.click('#readView [data-ayah-num-badge="2:255"]');
    const loading = await page.evaluate(() => document.querySelector("[data-ayah-sheet-related]")?.textContent ?? "");
    check(`${label} the Related block exists as soon as the card opens`, loading.length > 0);
    await page.waitForFunction(() => document.querySelectorAll("[data-ayah-related-jump]").length > 0, null, { timeout: 8000 }).catch(() => {});
    const state = await page.evaluate(() => {
      const rows = [...document.querySelectorAll("[data-ayah-related-jump]")];
      const lum = (c) => { const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const contrast = (el) => { const cs = getComputedStyle(el); const a = lum(cs.color), b = lum(cs.backgroundColor); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
      const subs = [...document.querySelectorAll(".ayah-related-sub")].map((p) => ({ title: p.textContent, jumps: [...(p.nextElementSibling?.querySelectorAll("[data-ayah-related-jump]") ?? [])].map((b) => ({ key: b.dataset.ayahRelatedJump, why: b.querySelector(".ayah-related-why")?.textContent })) }));
      return {
        count: rows.length,
        subs,
        minH: Math.min(...rows.map((r) => r.getBoundingClientRect().height)),
        minContrast: Math.min(...rows.map(contrast)),
        sw: document.documentElement.scrollWidth - innerWidth,
      };
    });
    check(`${label} I9: the word index is fetched once the card opens`, fetched.length >= 1, String(fetched.length));
    const lists = state.subs[0]?.jumps ?? [];
    const shared = state.subs.at(-1)?.jumps ?? [];
    check(`${label} "same QCR collection or Asma Name" lists 3:2, citing the seeded collection by name`,
      lists.some((j) => j.key === "3:2" && /Living test collection|পরীক্ষার সংকলন/.test(j.why ?? "")), JSON.stringify(lists.slice(0, 4)));
    check(`${label} the shared-rare-words list starts with 20:110, as the packaged data says`, shared[0]?.key === "20:110", JSON.stringify(shared.slice(0, 3)));
    check(`${label} every row is a real tap target (>= 40px tall)`, state.minH >= 40, String(state.minH));
    check(`${label} every row is readable (contrast >= 4.5:1)`, state.minContrast >= 4.5, state.minContrast.toFixed(2));
    check(`${label} no sideways scroll with the card open`, state.sw <= 1, `${state.sw}px`);
    if (lang === "bn") {
      const bnTitle = await page.evaluate(() => document.querySelector("[data-ayah-sheet-related] .ayah-status-heading")?.textContent);
      check(`${label} the Related heading is in Bangla`, bnTitle === "সম্পর্কিত আয়াত", bnTitle);
    }

    await page.click('[data-ayah-related-jump="20:110"]');
    await page.waitForTimeout(2000);
    const after = await page.evaluate(() => ({
      open: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"),
      surah: document.getElementById("surahSelect")?.value,
      ayah: document.getElementById("ayahSelect")?.value,
    }));
    check(`${label} tapping 20:110 closes the card and goes to Surah 20, āyah 110`, !after.open && after.surah === "20" && after.ayah === "110", JSON.stringify(after));
    check(`${label} no page errors`, errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e)).length === 0, errors.join(" | "));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== Ayah Card Related āyāt, browser: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

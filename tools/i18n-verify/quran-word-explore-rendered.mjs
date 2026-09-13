// MAP Phase 3 -- RENDERED acceptance for Arabic word coverage inside Explore.
// Read off the rendered page in both languages; the read COST is counted, not
// claimed, because the whole design of this strip is about what it refuses to
// read.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// Surah 1 has 4+5+4+3+4+4+9 = 29 words across its 7 ayahs; seed three known
// in ayah 1 so the figure is a real number the check can pin exactly.
const SEED = `
DATA.quranWordProgress = [{
  _id: TENANT_ID + "__p1__wbw__1_1", contractVersion: "quran-word-progress:v1",
  identityContract: "quran-word-occurrence:v1", lane: "learner",
  tenantId: TENANT_ID, personId: "p1", level: "wbw", surah: 1, ayah: 1,
  entries: { "1": { s: "a", at: "2026-09-13T10:00:00.000Z", by: "p1" },
             "2": { s: "a", at: "2026-09-13T10:00:00.000Z", by: "p1" },
             "3": { s: "l", at: "2026-09-13T10:00:00.000Z", by: "p1" } },
}];
DATA.quranWordApprovals = [];
`;

const westernise = (t) => (t || "").replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09E6));

async function openExplore(page) {
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabExploreBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await page.click("#tabExploreBtn").catch(() => {}); }
  else await page.click("#tabExploreBtn");
  await page.waitForTimeout(1200);
}

async function strip(page) {
  return page.evaluate(() => {
    const el = document.getElementById("exploreArabicCoverage");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      hidden: el.hidden, display: cs.display, text: el.textContent.trim(),
      onScreen: r.width > 0 && r.left >= 0 && r.right <= innerWidth + 1,
      hasFigure: !!el.querySelector(".eac-figure"),
      hasUnavailable: !!el.querySelector(".eac-unavailable"),
      hasIncomplete: !!el.querySelector(".eac-incomplete"),
      // The RENDERED contrast, not the element's existence. v07.138 shipped a
      // Save button that was navy on navy with every assertion green, and the
      // first version of THIS strip repeated it exactly: it reused the Word
      // Card's light-card palette on Explore's dark panel and measured
      // 1.89:1. The panel is a radial gradient, so getComputedStyle reports
      // its own background as transparent -- the comparison is made against
      // #2a3a57, the gradient's LIGHTEST stop, which is the worst case for
      // light text.
      contrast: (() => {
        const lum = (rgb) => {
          const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const panel = lum([0x2a, 0x3a, 0x57]);
        const worst = [...el.querySelectorAll("span"), el].map((node) => {
          const fg = getComputedStyle(node).color.match(/\d+/g);
          if (!fg) return 21;
          const L = lum(fg.slice(0, 3).map(Number));
          return (Math.max(L, panel) + 0.05) / (Math.min(L, panel) + 0.05);
        });
        return Math.round(Math.min(...worst) * 100) / 100;
      })(),
    };
  });
}

for (const lang of ["en", "bn"]) {
  console.log(`\n=== Explore Arabic coverage, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 }, extraSeedJs: SEED });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");

  const startup = await page.evaluate(() => (window.__fsLog || []).filter((r) => /quranWord/.test(r.col || "")).length);
  check(`[${lang}] I9: nothing read on the landing path`, startup === 0, String(startup));

  await openExplore(page);
  const atQuran = await strip(page);
  check(`[${lang}] the strip exists and is on screen at the Whole Quran level`,
    atQuran && !atQuran.hidden && atQuran.display !== "none" && atQuran.onScreen, JSON.stringify(atQuran));
  check(`[${lang}] at Whole Quran it says the figure is NOT available, rather than guessing`,
    atQuran?.hasUnavailable && !atQuran?.hasFigure, JSON.stringify(atQuran?.text));
  check(`[${lang}] and it is READABLE on Explore's dark panel (>=4.5:1)`,
    (atQuran?.contrast ?? 0) >= 4.5, `contrast ${atQuran?.contrast}:1`);

  const readsAtQuran = await page.evaluate(() => (window.__fsLog || []).filter((r) => /quranWord/.test(r.col || "")).length);
  check(`[${lang}] and it read NOTHING to say so -- no 12,000-document scan`, readsAtQuran === 0, String(readsAtQuran));

  // NOTE ON NAVIGATION, corrected after a failing check: the Whole Quran
  // level opens on the 114-SURAH reading, not the 30-Juz one, so clicking
  // segment 1 goes straight to Al-Faatiha and never passes through a Juz.
  // The first version of this suite assumed a Juz step that does not exist
  // and then reported the surah's own figure as a juz-level defect. To reach
  // a Juz the view toggle has to be used, exactly as a reader would.
  const switched = await page.evaluate(() => {
    const btn = document.getElementById("exploreViewPrimaryBtn");
    if (!btn || btn.getAttribute("aria-pressed") === "true") return btn ? "already" : "missing";
    btn.click();
    return "clicked";
  });
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelector('#exploreWheelContainer [data-key="1"], #exploreWheelContainer [data-seg-key="1"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForTimeout(1000);
  const juzCrumb = await page.evaluate(() => document.querySelector("#exploreBreadcrumb .explore-crumb.active")?.textContent.trim() ?? null);
  const atJuz = await strip(page);
  check(`[${lang}] reached a Juz level through the view toggle (${switched}, crumb: ${juzCrumb})`,
    /Juz|জুয/i.test(juzCrumb ?? ""), String(juzCrumb));
  check(`[${lang}] a Juz also declines, for the same reason`, atJuz?.hasUnavailable && !atJuz?.hasFigure, JSON.stringify(atJuz?.text));
  const readsAtJuz = await page.evaluate(() => (window.__fsLog || []).filter((r) => /quranWord/.test(r.col || "")).length);
  check(`[${lang}] still nothing read at the Juz level`, readsAtJuz === 0, String(readsAtJuz));

  // Into a Surah from inside the Juz.
  const reached = await page.evaluate(() => {
    const surahBtn = document.getElementById("exploreViewSurahsBtn");
    if (surahBtn && surahBtn.getAttribute("aria-pressed") !== "true") surahBtn.click();
    return true;
  });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("#exploreWheelContainer [data-key], #exploreWheelContainer [data-seg-key]")];
    (btns.find((b) => (b.getAttribute("data-key") || b.getAttribute("data-seg-key")) === "1") ?? btns[0])
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await page.waitForTimeout(1400);
  const level = await page.evaluate(() => document.querySelector("#exploreBreadcrumb .explore-crumb.active")?.textContent.trim() ?? null);
  const atSurah = await strip(page);
  // Taken HERE, with the real figure on screen, and with the boot splash
  // dismissed first. An earlier version captured at the end of the suite and
  // got the splash overlay -- a blank navy rectangle that proved nothing,
  // which is exactly why a screenshot is meant to be looked at.
  await page.evaluate(() => document.querySelectorAll(".app-splash-overlay").forEach((el) => el.remove()));
  await page.waitForTimeout(120);
  await page.screenshot({ path: `/tmp/claude-0/-home-user/a1e19a2e-bf40-5532-b479-4f9a08409a5a/scratchpad/p3-explore-${lang}.png` });
  check(`[${lang}] drilled into a Surah (breadcrumb: ${level})`, reached && !!level, String(level));

  if (atSurah?.hasFigure) {
    const nums = (westernise(atSurah.text).match(/\d+/g) || []).map(Number);
    check(`[${lang}] a Surah shows a REAL figure, 2 known of 29 from the seeded lane`,
      nums.includes(2) && nums.includes(29), `${JSON.stringify(nums)} :: ${atSurah.text} (crumb ${level})`);
    check(`[${lang}] and it is COMPLETE -- the whole surah was read, so no caveat`,
      !atSurah.hasIncomplete, atSurah.text);
    check(`[${lang}] the figure is READABLE on Explore's dark panel (>=4.5:1)`,
      atSurah.contrast >= 4.5, `contrast ${atSurah.contrast}:1 -- navy on navy is this suite's own recorded defect`);
    const readsAtSurah = await page.evaluate(() => (window.__fsLog || []).filter((r) => /quranWord/.test(r.col || "")));
    check(`[${lang}] it cost exactly TWO queries, one per lane -- not two reads per ayah`,
      readsAtSurah.length === 2, JSON.stringify(readsAtSurah.map((r) => r.col)));
    check(`[${lang}] one query on each lane`,
      readsAtSurah.filter((r) => r.col === "quranWordProgress").length === 1 &&
      readsAtSurah.filter((r) => r.col === "quranWordApprovals").length === 1,
      JSON.stringify(readsAtSurah.map((r) => r.col)));
    if (lang === "bn") {
      check(`[bn] the figure is in Bangla with Bengali digits`,
        /[ঀ-৿]/.test(atSurah.text) && /[০-৯]/.test(atSurah.text) && !/[0-9]/.test(atSurah.text), atSurah.text);
    } else {
      check(`[en] the figure is English`, !/[ঀ-৿]/.test(atSurah.text), atSurah.text);
    }
  } else {
    check(`[${lang}] a Surah shows a REAL figure`, false, `no figure rendered: ${JSON.stringify(atSurah)}`);
  }

  if (lang === "bn") {
    check(`[bn] the "not available" sentence is really translated`,
      /[ঀ-৿]/.test(atQuran?.text ?? ""), atQuran?.text);
  }

  // Nothing in Explore may write.
  const writes = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => /quranWord/.test(w.col || "")).length);
  check(`[${lang}] browsing Explore wrote nothing`, writes === 0, String(writes));
  check(`[${lang}] no page errors`, errors.length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Explore Arabic coverage: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

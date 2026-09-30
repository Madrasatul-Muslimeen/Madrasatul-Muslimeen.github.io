// Issue #370 -- the Global Approach Card (Owner-approved design, 29 Sep 2026),
// built by the Architect after two Builder runs pushed nothing.
//
// Rendered, in a real browser, both languages:
//   1. The "Choose an Approach" capsule on the Mushaf bar, in the space the
//      page reference used to stretch into: on screen, one line with the rest
//      of #readBar, at 320/360/390/412/768/1100px, no sideways scroll.
//   2. Tapping it opens the page's card; below 900px the card is FULL SCREEN
//      with its header pinned; from 900px it is the floating panel.
//   3. The pull-down is grouped by the tenant's sections and each Approach
//      shows its stage on this page; the chosen Approach is named in full with
//      its section; "Mastered is confirmed by a teacher." is shown.
//   4. A stage pressed on the card writes the PAGE claim (records write read
//      back, not a button state), and the capsule then names the Approach and
//      that stage.
// Every expected value is written out by hand from the fixture.
//
//   node tools/i18n-verify/global-approach-card-browser.mjs
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

const SWEEP_ALL = (rootSel) => {
  const parse = (s) => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0],p[1],p[2],p[3]===undefined?1:p[3]]; };
  const lum = ([r,g,b]) => { const l=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)}; return 0.2126*l(r)+0.7152*l(g)+0.0722*l(b); };
  const cr = (a,b) => { const x=lum(a),y=lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
  const blend = (top, under) => [0,1,2].map(i => top[i]*top[3] + under[i]*(1-top[3]));
  // returns list of candidate backgrounds (gradient -> several)
  function bgs(node) {
    if (!node) return [[255,255,255]];
    const cs = getComputedStyle(node);
    const img = cs.backgroundImage;
    if (img && img.includes("gradient")) {
      const stops = [...img.matchAll(/rgba?\([^)]+\)/g)].map(m => parse(m[0]));
      const under = bgs(node.parentElement);
      return stops.flatMap(s => under.map(u => blend(s, u)));
    }
    const c = parse(cs.backgroundColor);
    if (c && c[3] > 0) {
      if (c[3] >= 1) return [c.slice(0,3)];
      return bgs(node.parentElement).map(u => blend(c, u));
    }
    return bgs(node.parentElement);
  }
  const out = [];
  const roots = [...document.querySelectorAll(rootSel)];
  for (const root of roots) for (const el of [root, ...root.querySelectorAll("*")]) {
    if (["SCRIPT","STYLE","svg","SVG"].includes(el.tagName) || el.closest("svg")) continue;
    const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join("").trim();
    const isCtl = ["SELECT","TEXTAREA"].includes(el.tagName) || (el.tagName === "INPUT" && !["checkbox","radio"].includes(el.type));
    if (!txt && !isCtl) continue;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility !== "visible") continue;
    let op = 1; for (let n = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
    if (op < 0.6) continue;
    if (el.closest(".card-look-write-surface") || el.closest("[contenteditable]")) continue;
    const fg = parse(cs.color); if (!fg) continue;
    const list = bgs(el);
    let worst = 99, wb = null;
    for (const b of list) { const f = fg[3] < 1 ? blend(fg, b) : fg.slice(0,3); const v = cr(f, b); if (v < worst) { worst = v; wb = b; } }
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && Number(cs.fontWeight) >= 700);
    const min = big ? 3 : 4.5;
    if (worst < min) out.push(`${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${[...el.classList].join(".")} "${(txt || el.value || "").slice(0, 30)}" ${cs.color} on rgb(${wb.map(Math.round)}) = ${worst.toFixed(2)}`);
  }
  return [...new Set(out)];
};

// v08.109: the three pre-existing shortfalls (Hadith commentary link in Light,
// Dawah's empty-list line, the Note side pane's pressed button) are FIXED, so
// the baseline is empty and each is swept below.

const T = {
  en: { choose: "Choose an Approach", learning: "Learning", notStarted: "Not started", mastered: "Mastered is confirmed by a teacher.", recite: "Recite correctly", preservation: "Preservation" },
  bn: { choose: "একটি পদ্ধতি বেছে নিন", learning: null, notStarted: null, mastered: "আয়ত্ত হয়েছে কিনা তা একজন শিক্ষক নিশ্চিত করেন।", recite: "সঠিকভাবে তিলাওয়াত", preservation: "সংরক্ষণ" },
};

async function waitCapsule(page) {
  await page.waitForFunction(() => { const c = document.getElementById("readBarRecordBtn"); return !!c && c.getBoundingClientRect().width > 0 && Number.isFinite(Number(document.getElementById("mushafPageRef")?.dataset.page)); }, null, { timeout: 12000 }).catch(() => {});
}

// ---- 1. (updated in place, issue #428) The #370 capsule was REPLACED by the three-button bar; its layout is proven in approach-record-status-bar-browser.mjs. Here: it is gone and the Record button carries its text.
{
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 }, extraSeedJs: APPROACH_CARDS_SEED });
  await installSyntheticMushafFixture(ctx);
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await openMushafSurah3(page);
  await waitCapsule(page);
  const m = await page.evaluate(() => ({ gone: !document.getElementById("readApproachCapsule"), title: document.getElementById("readBarRecordBtn")?.title }));
  check("the capsule is gone and Record Your Progress carries 'Choose an Approach' as its title", m.gone && m.title === T.en.choose, JSON.stringify(m));
  await ctx.close();
}

// ---- 2-4. The card, the pull-down, a claim, and the capsule after it ---------
for (const lang of ["en", "bn"]) {
  for (const width of [390, 1100]) {
    console.log(`\n=== Global Approach Card, appLang=${lang}, ${width}px ===`);
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 844 }, extraSeedJs: APPROACH_CARDS_SEED });
    await installSyntheticMushafFixture(ctx);
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await openMushafSurah3(page);
    await waitCapsule(page);
    await clickSafely(page, "#readBarRecordBtn");
    await page.waitForFunction(() => !!document.querySelector("#pageApproachSelect"), null, { timeout: 8000 }).catch(() => {});
    const sheet = await page.evaluate(() => {
      const s = document.querySelector(".ayah-sheet"); if (!s) return null;
      const r = s.getBoundingClientRect(); const h = s.querySelector(".ayah-sheet-header");
      return { top: r.top, height: r.height, width: r.width, vw: innerWidth, vh: innerHeight, headerPos: h ? getComputedStyle(h).position : null };
    });
    if (width < 900) {
      check(`[${lang} ${width}] tapping the capsule opens the card FULL SCREEN`, !!sheet && sheet.top <= 1 && sheet.height >= sheet.vh - 2 && sheet.width >= sheet.vw - 2, JSON.stringify(sheet));
      check(`[${lang} ${width}] its header is pinned while the body scrolls`, sheet?.headerPos === "sticky", JSON.stringify(sheet));
    } else {
      check(`[${lang} ${width}] from 900px the card stays the floating panel`, !!sheet && sheet.width < sheet.vw / 2 && sheet.top > 10, JSON.stringify(sheet));
    }
    const groups = await page.evaluate(() => [...document.querySelectorAll("#pageApproachSelect optgroup")].map((g) => g.label));
    check(`[${lang} ${width}] the pull-down is grouped by section (the fixture's five, in order)`,
      JSON.stringify(groups) === JSON.stringify(lang === "en" ? ["Preservation", "Engagement", "Understanding", "Reflection", "Action"] : ["সংরক্ষণ", "সম্পৃক্ততা", "উপলব্ধি", "প্রতিফলন", "আমল"]), JSON.stringify(groups));

    await page.selectOption("#pageApproachSelect", "recite");
    await page.waitForTimeout(500);
    const opt = await page.evaluate(() => document.querySelector('#pageApproachSelect option[value="recite"]')?.textContent.trim());
    check(`[${lang} ${width}] each Approach shows its stage on this page ("${T[lang].recite} · …")`, !!opt && opt.startsWith(T[lang].recite + " · "), opt);
    const summary = await page.evaluate(() => {
      const s = document.querySelector("[data-gac-approach-summary]");
      return s ? { name: s.querySelector(".gac-approach-name")?.textContent.trim(), section: s.querySelector(".gac-approach-section")?.textContent.trim() } : null;
    });
    check(`[${lang} ${width}] the chosen Approach is named in full with its section`, summary?.name === T[lang].recite && summary?.section === T[lang].preservation, JSON.stringify(summary));
    const note = await page.evaluate(() => document.querySelector(".gac-mastered-note")?.textContent.trim());
    check(`[${lang} ${width}] "Mastered is confirmed by a teacher." is shown under the stages`, note === T[lang].mastered, note);
    // Owner decision 39, 30 Sep 2026: "Give the title to record as well above
    // the progress Tabs: (Icon) 'Record Your Progress'. Make it look elegant.
    // Keep proper space." Expected by hand: the words, the same face as the
    // 🎯 Take an Approach title, clear space above (>= 16px from the pull-down)
    // and close to its own buttons (<= 10px), with more space above than below.
    const rec = await page.evaluate(() => {
      const t = document.querySelector("[data-gac-record-title]"), sel = document.getElementById("pageApproachSelect"), row = document.querySelector(".approach-stage-row");
      const lab = document.querySelector(".ayah-sheet-select-label:not([data-gac-record-title])");
      if (!t || !sel || !row || !lab) return null;
      const cs = (e) => getComputedStyle(e);
      return { text: t.textContent.trim(), above: Math.round(t.getBoundingClientRect().top - sel.getBoundingClientRect().bottom),
        below: Math.round(row.getBoundingClientRect().top - t.getBoundingClientRect().bottom),
        sameFace: ["fontSize", "fontWeight", "color", "fontFamily"].every((k) => cs(t)[k] === cs(lab)[k]), beforeButtons: !!(t.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING) };
    });
    check(`[${lang} ${width}] "✅ ${lang === "bn" ? "আপনার অগ্রগতি লিপিবদ্ধ করুন" : "Record Your Progress"}" titles the stage buttons, in the Take an Approach title's own face`,
      rec?.text === (lang === "bn" ? "✅ আপনার অগ্রগতি লিপিবদ্ধ করুন" : "✅ Record Your Progress") && rec.sameFace && rec.beforeButtons, JSON.stringify(rec));
    check(`[${lang} ${width}] it has clear space above and sits close to its own buttons`, !!rec && rec.above >= 16 && rec.below <= 10 && rec.above > rec.below, JSON.stringify(rec));

    const before = await page.evaluate(() => (window.__stubWriteData || []).length);
    await clickSafely(page, '[data-approach-stage-btn="learning"]');
    await page.waitForTimeout(700);
    const write = await page.evaluate((n) => (window.__stubWriteData || []).slice(n).filter((w) => w.col === "records").at(-1), before);
    const entry = write?.data?.["entries.page:madani:50::recite"];
    check(`[${lang} ${width}] pressing Learning writes the PAGE claim page:madani:50::recite = learning to subject_quran`,
      write?.id === "t1__p1__subject_quran" && entry?.claimedStatus === "learning", JSON.stringify(write && { id: write.id, keys: Object.keys(write.data ?? {}) }));
    const cap = await page.evaluate(() => document.getElementById("readBarRecordBtn")?.title);
    const learning = await page.evaluate(() => [...document.querySelectorAll('[data-approach-stage-btn="learning"]')].map((b) => b.textContent.trim())[0]);
    check(`[${lang} ${width}] the capsule now names the Approach and its stage on this page`, cap === `${T[lang].recite} · ${learning}`, JSON.stringify({ cap, learning }));

    // Contrast of the two new lines, in both looks, against the card.
    for (const look of ["night", "light"]) {
      await page.evaluate(async (l) => (await import("/app/js/prefs.js")).setCardLook(l), look);
      await page.waitForTimeout(120);
      const ratios = await page.evaluate(() => {
        const nums = (s) => (s.match(/[\d.]+/g) || []).map(Number);
        const L = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        // The card's own background is a GRADIENT in Night (backgroundColor
        // reads transparent), so every stop of the nearest painted ancestor is
        // measured and the worst taken.
        const bgsOf = (el) => {
          for (let n = el; n; n = n.parentElement) {
            const cs = getComputedStyle(n);
            if (cs.backgroundImage.includes("gradient")) return [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => nums(m[0]));
            const c = nums(cs.backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] === 1)) return [c];
          }
          return [[255, 255, 255]];
        };
        return [".gac-approach-name", ".gac-approach-section", ".gac-mastered-note", ".gac-record-title"].map((sel) => {
          const el = document.querySelector(sel); if (!el) return [sel, null];
          const a = L(nums(getComputedStyle(el).color));
          return [sel, +Math.min(...bgsOf(el).map((bg) => { const b = L(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); })).toFixed(2)];
        });
      });
      check(`[${lang} ${width} ${look}] the name, section, Mastered and Record Your Progress lines are readable (>=4.5:1)`, ratios.every(([, r]) => r != null && r >= 4.5), JSON.stringify(ratios));
    }
    const sweepCard = async (label) => {
      for (const look of ["night", "light"]) {
        await page.evaluate(async (l) => (await import("/app/js/prefs.js")).setCardLook(l), look);
        await page.waitForTimeout(120);
        const found = await page.evaluate(SWEEP_ALL, ".ayah-sheet");
        check(`[${lang} ${width} ${look}] ${label}: every visible text element meets its contrast minimum`, found.length === 0, found.join(" | "));
      }
    };
    await sweepCard("the page card");

    // The Ayah Card: the new rule is what makes it full screen on a phone
    // (the page card already was, v08.90).
    await page.evaluate(() => document.getElementById("ayahActionSheetOverlay")?.click());
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await clickSafely(page, '[data-ayah-marker="3:55"]');
    await page.waitForFunction(() => !!document.querySelector(".ayah-sheet:not(.page-approach-card):not(.unit-card)"), null, { timeout: 8000 }).catch(() => {});
    const ayahSheet = await page.evaluate(() => {
      const s = document.querySelector(".ayah-sheet"); if (!s) return null;
      const r = s.getBoundingClientRect();
      return { cls: s.className, top: r.top, height: r.height, width: r.width, vw: innerWidth, vh: innerHeight, header: getComputedStyle(s.querySelector(".ayah-sheet-header")).position };
    });
    if (width < 900) check(`[${lang} ${width}] the Ayah Card is full screen too, header pinned`, !!ayahSheet && !/page-approach-card|unit-card/.test(ayahSheet.cls) && ayahSheet.top <= 1 && ayahSheet.height >= ayahSheet.vh - 2 && ayahSheet.header === "sticky", JSON.stringify(ayahSheet));
    else check(`[${lang} ${width}] the Ayah Card stays the floating panel`, !!ayahSheet && ayahSheet.width < ayahSheet.vw / 2, JSON.stringify(ayahSheet));
    const ayahSummary = await page.evaluate(() => document.querySelector(".ayah-sheet [data-gac-approach-summary] .gac-approach-name")?.textContent.trim());
    check(`[${lang} ${width}] the Ayah Card opens on the same chosen Approach, named in full`, ayahSummary === T[lang].recite, ayahSummary);
    await sweepCard("the Ayah Card");

    // A Unit Card, from the Ayah Card's own ladder.
    await page.waitForFunction(() => !!document.querySelector('.unit-ladder-rung[data-unit-ladder-rung^="ruku:"]'), null, { timeout: 8000 }).catch(() => {});
    await clickSafely(page, '.unit-ladder-rung[data-unit-ladder-rung^="ruku:"]');
    await page.waitForFunction(() => !!document.querySelector(".ayah-sheet.unit-card"), null, { timeout: 8000 }).catch(() => {});
    const unitSheet = await page.evaluate(() => {
      const s = document.querySelector(".ayah-sheet.unit-card"); if (!s) return null;
      const r = s.getBoundingClientRect();
      return { top: r.top, height: r.height, vh: innerHeight, width: r.width, vw: innerWidth, summary: s.querySelector("[data-gac-approach-summary] .gac-approach-name")?.textContent.trim(), note: s.querySelector(".gac-mastered-note")?.textContent.trim() };
    });
    if (width < 900) check(`[${lang} ${width}] the Unit Card is full screen too`, !!unitSheet && unitSheet.top <= 1 && unitSheet.height >= unitSheet.vh - 2, JSON.stringify(unitSheet));
    check(`[${lang} ${width}] the Unit Card carries the same named Approach and Mastered line`, unitSheet?.summary === T[lang].recite && unitSheet?.note === T[lang].mastered, JSON.stringify(unitSheet));
    await sweepCard("the Unit Card");

    const real = errors.filter((e) => !/Failed to load resource|net::ERR_/.test(e));
    check(`[${lang} ${width}] no page errors`, real.length === 0, real.join("; "));
    await ctx.close();
  }
}

console.log(`\n==== Global Approach Card (issue #370): ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);

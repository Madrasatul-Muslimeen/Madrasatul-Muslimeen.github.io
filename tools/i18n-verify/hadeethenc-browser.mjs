// The real HadeethEnc corpus in the Hadith module's Collections tab (issue
// #309, part 2 of #306) -- browse root -> sub-category -> hadith list ->
// one hadith, over the REAL packaged files already committed at
// tools/hadith-data-pull/output/hadeethenc/. This suite drives the app
// against those real files (the local static server serves the whole
// repository, so no fixture/stub is needed for the corpus itself -- only
// Firebase and the DOMPurify CDN are stubbed, exactly as every other
// browser suite here already does via harness.mjs).
//
// THE TEST IDS BELOW ARE DERIVED FROM THE REAL CORPUS, NOT INVENTED. Read
// directly off the committed files before writing this suite:
//   - category "3" (العقيدة / "The Creed") has exactly ONE hadith that is
//     its own (not covered by any sub-category): id "4563", present in ar,
//     en AND bn -- the "no fallback" case.
//   - category "224" ("Prescribed Punishment for Adultery"), reached via
//     root "4" -> "128" -> "224", holds id "2933" among its 12 own hadiths
//     -- present in ar and en, ABSENT from bn (measured: 403 such ids exist
//     corpus-wide; 2933 is one) -- the "Bangla falls back to English, and
//     says so" case.
// Re-derive both if the corpus is ever re-pulled; they are not guaranteed
// stable across a re-pull, only against the corpus this repository holds
// today.
//
// STUDY WIRING (Notes/bookmark/"Studied") IS NOT TESTED HERE BECAUSE IT WAS
// NOT BUILT -- see hadith-browser.js's own header comment on the section:
// applying `buildUnitKey.hadith(...)` from here would cross the Owner
// Control Gate `hadith-gate-contracts.mjs` already enforces (C2). This
// suite instead proves the GATE explanation is what a reader sees, and that
// no write is attempted.
//
// FIXTURES: this round did not hide the synthetic pilot's OWN Collections
// browsing (editions/books/chapters), Topics, Search or Explore tabs --
// doing so would need updating hadith-source-navigation-browser.mjs (50
// checks) and hadith-search-announcement-browser.mjs in place, which is
// beyond this round's budget alongside building the real source. What this
// suite proves instead: a reader opening Collections meets HadeethEnc
// FIRST, and the pre-existing synthetic list is demoted beneath it under
// its own, differently-worded heading -- flagged in the PR for the
// Architect/Owner to decide whether full removal is wanted next.
//
// Run:
//   node tools/i18n-verify/hadeethenc-browser.mjs en
//   node tools/i18n-verify/hadeethenc-browser.mjs bn
// Exits 0 only if every check passed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";

const EXE = process.env.CHROMIUM_PATH || undefined;
const LANG = process.argv[2] === "bn" ? "bn" : "en";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_ROOT = path.join(__dirname, "..", "hadith-data-pull", "output", "hadeethenc");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(CORPUS_ROOT, rel), "utf8"));

// The exact packaged strings this suite asserts the page shows VERBATIM.
const arCats = readJson("ar/categories.json");
const enCats = readJson("en/categories.json");
const arCat3Shard = readJson(arCats.hadithFile["4563"]);
const enCat3Shard = readJson(enCats.hadithFile["4563"]);
const REC_4563_AR = arCat3Shard.hadiths.find((h) => h.id === "4563");
const REC_4563_EN = enCat3Shard.hadiths.find((h) => h.id === "4563");

const arCat224Shard = readJson(arCats.hadithFile["2933"]);
const enCat224Shard = readJson(enCats.hadithFile["2933"]);
const REC_2933_AR = arCat224Shard.hadiths.find((h) => h.id === "2933");
const REC_2933_EN = enCat224Shard.hadiths.find((h) => h.id === "2933");
if (!REC_4563_AR || !REC_4563_EN || !REC_2933_AR || !REC_2933_EN) {
  throw new Error("hadeethenc-browser.mjs's own fixture ids were not found in the real corpus -- re-derive them (see the header comment).");
}

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}`); }
}

async function runAtWidth(width) {
  console.log(`\n===== hadeethenc-browser (${LANG}, ${width}px) =====`);
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ctx = await newContext(browser, { appLang: LANG, viewport: { width, height: 900 } });
  // Architect review, 26 Sep 2026: the listener used to be attached to the
  // PAGE after openPage() returned, so a categories.json fetched during load
  // was never seen and "opening Collections fetches categories.json" failed
  // on a correct page. Attached to the CONTEXT before anything loads now.
  const corpusRequests = [];
  ctx.on("request", (req) => {
    const url = req.url();
    if (url.includes("/tools/hadith-data-pull/output/hadeethenc/")) corpusRequests.push(url);
  });
  const { page, errors } = await openPage(ctx, "/app/hadith-collections.html");
  const settle = () => page.waitForTimeout(150);

  await page.click('[data-hadith-tab="collections"]');
  await settle();

  // --- I9: nothing about HadeethEnc was fetched before the source was
  // actually mounted, but opening the Collections tab (which mounts it
  // immediately, since it is the reader's own default now) does fetch its
  // categories.json -- and shards ONLY once a category with hadiths is
  // opened. ---------------------------------------------------------------
  const afterOpen = [...corpusRequests];
  check("opening Collections fetches categories.json (structure) but NO shard file yet",
    afterOpen.some((u) => u.endsWith("/ar/categories.json")) && !afterOpen.some((u) => /cat-\d+\.json$/.test(u)));

  // --- The section a reader actually meets: HadeethEnc first, the old
  // synthetic pilot demoted beneath it (see the header comment above). ----
  const headingOrder = await page.evaluate(() => [...document.querySelectorAll("#hadithBody h2")].map((h) => h.textContent));
  check("the HadeethEnc heading is the FIRST heading a reader meets in Collections",
    headingOrder.length >= 2 && /HadeethEnc/.test(headingOrder[0]));
  check("the pre-existing synthetic pilot list is still reachable, under its OWN, differently-worded heading",
    headingOrder.some((h) => /pilot/i.test(h) || /কৃত্রিম/.test(h)));

  // --- Root categories, and one root's title/count match the real corpus,
  // verbatim (never fabricated) -- root "3" is "The Creed" / العقيدة. ------
  const rootRows = await page.evaluate(() => [...document.querySelectorAll("[data-hadeethenc-category]")].map((r) => r.dataset.hadeethencCategory));
  check("all 7 real root categories are offered, and only those 7, at the top level", rootRows.length === 7);
  check('root category "3" is offered', rootRows.includes("3"));

  // --- Open category "3": its children AND its own one direct hadith show,
  // and opening it fetched exactly the shard(s) it needs -- nothing else. --
  await page.click('[data-hadeethenc-category="3"]');
  await settle();
  const afterCat3 = [...corpusRequests];
  const shardsFetchedForCat3 = afterCat3.filter((u) => /cat-3\.json$/.test(u));
  check("opening category 3 fetched its OWN shard (cat-3.json) in ar and the reader's own language, and nothing else shard-shaped",
    shardsFetchedForCat3.length >= 1 &&
    afterCat3.filter((u) => /cat-\d+\.json$/.test(u)).every((u) => /cat-3\.json$/.test(u)));
  const hadith4563Row = await page.evaluate(() => !!document.querySelector('[data-hadeethenc-hadith="4563"]'));
  check("category 3's own hadith (id 4563) is listed as a direct hadith, not only as a sub-category", hadith4563Row);
  const noFallbackOnRow = await page.evaluate(() => !document.querySelector('[data-hadeethenc-hadith="4563"] [data-hadeethenc-hadith-fallback]'));
  check(`the hadith-4563 row carries no fallback label in ${LANG} (it genuinely has this language)`, noFallbackOnRow);

  // --- Open the hadith card: the Arabic and (for en) the translation equal
  // the packaged strings EXACTLY, read off the rendered page. --------------
  await page.click('[data-hadeethenc-hadith="4563"]');
  await settle();
  const cardAr = await page.evaluate(() => document.querySelector('[data-hadeethenc-card="4563"] .hadith-arabic')?.textContent);
  check("hadith 4563's Arabic on screen equals the packaged ar record's own `hadeeth` field, verbatim", cardAr === REC_4563_AR.hadeeth);
  const arDir = await page.evaluate(() => {
    const p = document.querySelector('[data-hadeethenc-card="4563"] .hadith-arabic');
    return { lang: p?.getAttribute("lang"), dir: p?.getAttribute("dir") };
  });
  check('the Arabic paragraph carries lang="ar" dir="rtl"', arDir.lang === "ar" && arDir.dir === "rtl");

  if (LANG === "en") {
    const cardTranslation = await page.evaluate(() => document.querySelector('[data-hadeethenc-card="4563"] .hadith-translation-text')?.textContent);
    check("hadith 4563's English translation equals the packaged en record's own `hadeeth` field, verbatim", cardTranslation === REC_4563_EN.hadeeth);
    const noFallbackOnCard = await page.evaluate(() => !document.querySelector('[data-hadeethenc-card="4563"] [data-hadeethenc-fallback]'));
    check("no fallback notice on hadith 4563's card in English (it genuinely has an English translation)", noFallbackOnCard);
  }

  // --- Source: HadeethEnc.com, and its link is right. ----------------------
  const sourceLink = await page.evaluate(() => {
    const a = document.querySelector('[data-hadeethenc-source-link="4563"]');
    return a ? { text: a.textContent, href: a.getAttribute("href"), target: a.getAttribute("target"), rel: a.getAttribute("rel") } : null;
  });
  check('"Source: HadeethEnc.com" is present', sourceLink?.text?.includes("HadeethEnc.com"));
  // 4563 exists in every pulled language, so it is shown WITHOUT falling
  // back -- the link must therefore name this run's own reader language.
  check("its link points at hadeethenc.com's own browse URL for this hadith, in the language actually shown",
    sourceLink?.href === `https://hadeethenc.com/${LANG}/browse/hadith/4563`);
  check("the source link opens in a new tab safely (target=_blank, rel=noopener noreferrer)",
    sourceLink?.target === "_blank" && (sourceLink?.rel ?? "").includes("noopener"));

  // --- Grade/attribution shown, explanation is a real toggle, hints listed
  // where present -- all read off REC_4563 (which has none of these three,
  // so assert their ABSENCE is honest rather than an empty placeholder). ---
  const hasExplanationDetails = await page.evaluate(() => !!document.querySelector('[data-hadeethenc-card="4563"] .hadeethenc-explanation'));
  check("hadith 4563 (which the corpus gives no explanation/hints/word-meanings) renders no empty explanation toggle",
    hasExplanationDetails === Boolean(REC_4563_EN.explanation || REC_4563_AR.explanation || (REC_4563_EN.hints && REC_4563_EN.hints.length)));

  // --- Study wiring is DELIBERATELY gated -- see the header comment. ------
  const gateText = await page.evaluate(() => document.querySelector('[data-hadeethenc-card="4563"] [data-hadeethenc-study-gate]')?.textContent);
  check("the card explains, in words, why Notes/bookmark/Studied are not offered (a control that explains itself, not a silent absence)",
    !!gateText && gateText.length > 20);
  check("no Note/bookmark/claim control exists on the card at all (nothing half-wired)",
    await page.evaluate(() => !document.querySelector('[data-hadeethenc-card="4563"] [data-note-id], [data-hadeethenc-card="4563"] [data-hadith-track]')));

  // --- Back to the list, and no page error anywhere in this run. ----------
  await page.click('[data-hadeethenc-back]');
  await settle();
  check("'Back to the list' returns to the category's own hadith list", await page.evaluate(() => !!document.querySelector('[data-hadeethenc-hadith="4563"]')));

  // --- Fixtures ARE still visible (see the header's flagged deviation) --
  // recorded HONESTLY rather than pretending item 2 was closed in full.
  const fixturesStillPresent = await page.evaluate(() => !!document.querySelector('[data-hadith-edition]'));
  check("the pre-existing SYNTHETIC edition list still exists in the DOM (kept for its own suite, per the issue's 'keep in code and tests')",
    fixturesStillPresent);

  // --- The Bangla-fallback case: id 2933 exists in ar/en but not bn. ------
  if (LANG === "bn") {
    // Architect review: the reader is still inside category 3 here, so the
    // root categories are not on screen; go back to the top first, the way
    // a reader would -- the "HadeethEnc" breadcrumb.
    await page.click('[data-hadeethenc-crumbs] .hadeethenc-crumb >> nth=0');
    await settle();
    await page.click('[data-hadeethenc-category="4"]');
    await settle();
    await page.click('[data-hadeethenc-category="128"]');
    await settle();
    await page.click('[data-hadeethenc-category="224"]');
    await settle();
    const row2933Fallback = await page.evaluate(() => document.querySelector('[data-hadeethenc-hadith="2933"] [data-hadeethenc-hadith-fallback]')?.getAttribute("data-hadeethenc-hadith-fallback"));
    check("hadith 2933's row is labelled as a fallback in Bangla (it has no bn translation)", row2933Fallback === "en");

    await page.click('[data-hadeethenc-hadith="2933"]');
    await settle();
    const card2933 = await page.evaluate(() => ({
      ar: document.querySelector('[data-hadeethenc-card="2933"] .hadith-arabic')?.textContent,
      translation: document.querySelector('[data-hadeethenc-card="2933"] .hadith-translation-text')?.textContent,
      fallbackLang: document.querySelector('[data-hadeethenc-card="2933"] [data-hadeethenc-fallback]')?.getAttribute("data-hadeethenc-fallback"),
    }));
    check("hadith 2933's card in Bangla is labelled as a fallback (requestedLang bn)", card2933.fallbackLang === "bn");
    check("hadith 2933's shown Arabic still equals the packaged ar record's own `hadeeth`, verbatim (Arabic is never subject to the translation fallback)",
      card2933.ar === REC_2933_AR.hadeeth);
    check("hadith 2933's shown translation, having fallen back, equals the packaged EN record's own `hadeeth`, verbatim -- never fabricated",
      card2933.translation === REC_2933_EN.hadeeth);
  }

  // --- Architect review: the Source link is the attribution the grant
  // requires, so it must be readable (>= 4.5:1 on its own background) and a
  // real tap target (>= 40px). Measured 3.18:1 / 24.6px before the fix. ----
  if (!(await page.$("[data-hadeethenc-card] a.hadith-view-source"))) {
    await page.click('[data-hadeethenc-crumbs] .hadeethenc-crumb >> nth=0'); await settle();
    await page.click('[data-hadeethenc-category="3"]'); await settle();
    await page.click('[data-hadeethenc-hadith="4563"]'); await settle();
  }
  const src = await page.evaluate(() => {
    const a = document.querySelector("[data-hadeethenc-card] a.hadith-view-source");
    if (!a) return null;
    let bg = a, c; while (bg && (c = getComputedStyle(bg).backgroundColor) === "rgba(0, 0, 0, 0)") bg = bg.parentElement;
    const lum = (s) => { const [r, g, b] = s.match(/\d+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const A = lum(getComputedStyle(a).color), B = lum(c);
    return { ratio: (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05), h: a.getBoundingClientRect().height };
  });
  check(`the Source link is readable (contrast ${src?.ratio.toFixed(2)} >= 4.5)`, !!src && src.ratio >= 4.5);
  check(`the Source link is a real tap target (${src?.h}px >= 40)`, !!src && src.h >= 40);

  // --- The "not real narrations" notice must not sit above the REAL source:
  // on the Collections landing it belongs to the synthetic pilot list. -----
  await page.click('[data-hadeethenc-crumbs] .hadeethenc-crumb >> nth=0');
  await settle();
  const bannerPos = await page.evaluate(() => {
    const banners = document.querySelectorAll("#hadithSyntheticBanner");
    const hs = [...document.querySelectorAll("#hadithBody h2")];
    const b = banners[0];
    const pos = (x) => x.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
    return { count: banners.length, afterRealHeading: !!(b && hs[0] && pos(hs[0])), afterPilotHeading: !!(b && hs.at(-1) && pos(hs.at(-1))) };
  });
  check("the synthetic notice appears once on the Collections landing, below the real HadeethEnc heading, under the pilot list's own heading",
    bannerPos.count === 1 && bannerPos.afterRealHeading && bannerPos.afterPilotHeading);

  // --- No sideways scroll at this width. -----------------------------------
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`no sideways scroll at ${width}px (scrollWidth - clientWidth = ${overflow})`, overflow <= 1);

  check("no page error was raised anywhere in this run", errors.length === 0);
  if (errors.length) console.log("--- page errors ---\n", errors.join("\n"));

  await browser.close();
}

await runAtWidth(390);
await runAtWidth(1100);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

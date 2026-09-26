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
// STUDY WIRING (Notes/bookmark/"Studied") IS NOW TESTED HERE (issue #311,
// Owner decision 7 -- see hadith-browser.js's own header comment on the
// section). This page now carries a minimal session bootstrap (sign-in,
// tenant/person pickers) purely so the HadeethEnc card's own actions have
// someone to act for; see hadith-collections.html's own comment on why that
// bootstrap is a SEPARATE script from the corpus-mounting one.
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

  // --- Study wiring is BUILT now (issue #311, Owner decision 7) -- proven by
  // real writes below, not merely by a control existing on screen. ---------
  await page.waitForSelector('[data-hadeethenc-card="4563"] [data-hadeethenc-bookmark][aria-disabled="false"]', { timeout: 5000 }).catch(() => {});
  const actionsPresent = await page.evaluate(() => ({
    noteLink: !!document.querySelector('[data-hadeethenc-card="4563"] [data-hadeethenc-note-link]'),
    bookmarkBtn: !!document.querySelector('[data-hadeethenc-card="4563"] [data-hadeethenc-bookmark]'),
    studiedSelect: !!document.querySelector('[data-hadeethenc-card="4563"] [data-hadeethenc-studied]'),
  }));
  check("the card offers a Note link, a Bookmark button and a Studied select (issue #311)",
    actionsPresent.noteLink && actionsPresent.bookmarkBtn && actionsPresent.studiedSelect);

  const noteHref = await page.evaluate(() => document.querySelector('[data-hadeethenc-note-link="4563"]')?.getAttribute("href"));
  check("the Note link carries the HadeethEnc unit key (hadith:hadeethenc:4563), the shape Owner decision 7 chose",
    noteHref?.includes(encodeURIComponent("hadith:hadeethenc:4563")) || noteHref?.includes("hadith:hadeethenc:4563"));

  // --- Bookmark: a real write, proven via __fsLog, and it round-trips on
  // reopen (the star reads the just-written state back, not merely optimism). ---
  await page.click('[data-hadeethenc-bookmark="4563"]');
  await settle();
  const bookmarkWrite = await page.evaluate(() => {
    const rec = [...(window.__fsLog ?? [])].reverse().find((r) => r.col === "bookmarks");
    return { logged: !!rec, btnText: document.querySelector('[data-hadeethenc-bookmark="4563"]')?.textContent ?? "" };
  });
  check("bookmarking hadith 4563 writes to the bookmarks collection (__fsLog)", bookmarkWrite.logged);
  check("the bookmark button now reads as bookmarked (★ / Remove bookmark)", /★|Remove bookmark|বুকমার্ক সরান/.test(bookmarkWrite.btnText));

  // Reopen: leave the card and come back -- the star must still read bookmarked.
  await page.click('[data-hadeethenc-back]');
  await settle();
  await page.click('[data-hadeethenc-hadith="4563"]');
  await settle();
  await page.waitForSelector('[data-hadeethenc-card="4563"] [data-hadeethenc-bookmark][aria-disabled="false"]', { timeout: 5000 }).catch(() => {});
  const bookmarkAfterReopen = await page.evaluate(() => document.querySelector('[data-hadeethenc-card="4563"] [data-hadeethenc-bookmark]')?.textContent ?? "");
  check("reopening hadith 4563 shows the SAVED bookmark state, not a fresh default",
    /★|Remove bookmark|বুকমার্ক সরান/.test(bookmarkAfterReopen));

  // --- Studied: claiming a status writes to records, and reopening shows it. ---
  await page.selectOption('[data-hadeethenc-studied="4563"]', "achieved");
  await settle();
  const claimWrite = await page.evaluate(() => [...(window.__fsLog ?? [])].reverse().some((r) => r.col === "records"));
  check("claiming hadith 4563 as Studied writes to the records collection (__fsLog)", claimWrite);

  await page.click('[data-hadeethenc-back]');
  await settle();
  await page.click('[data-hadeethenc-hadith="4563"]');
  await settle();
  await page.waitForSelector('[data-hadeethenc-card="4563"] [data-hadeethenc-studied]', { timeout: 5000 }).catch(() => {});
  const studiedAfterReopen = await page.evaluate(() => document.querySelector('[data-hadeethenc-card="4563"] [data-hadeethenc-studied]')?.value);
  check('reopening hadith 4563 shows the SAVED Studied status ("achieved"), not "Not tracked"', studiedAfterReopen === "achieved");

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

  // --- The study action controls (issue #311) are readable and tappable too. ---
  const studyMetrics = await page.evaluate(() => {
    const lum = (s) => { const [r, g, b] = s.match(/\d+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const contrastOf = (el) => {
      if (!el) return null;
      let bg = el, c; while (bg && (c = getComputedStyle(bg).backgroundColor) === "rgba(0, 0, 0, 0)") bg = bg.parentElement;
      const A = lum(getComputedStyle(el).color), B = lum(c || "rgb(255,255,255)");
      return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05);
    };
    const els = {
      note: document.querySelector('[data-hadeethenc-card="4563"] [data-hadeethenc-note-link]'),
      bookmark: document.querySelector('[data-hadeethenc-card="4563"] [data-hadeethenc-bookmark]'),
      studied: document.querySelector('[data-hadeethenc-card="4563"] [data-hadeethenc-studied]'),
    };
    return Object.fromEntries(Object.entries(els).map(([k, el]) => [k, el ? { h: el.getBoundingClientRect().height, contrast: contrastOf(el) } : null]));
  });
  for (const key of ["note", "bookmark", "studied"]) {
    const m = studyMetrics[key];
    check(`the ${key} control is a real tap target (${m?.h}px >= 40)`, !!m && m.h >= 40);
    check(`the ${key} control is readable (contrast ${m?.contrast?.toFixed(2)} >= 4.5)`, !!m && m.contrast >= 4.5);
  }

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

// ---------------------------------------------------------------------------
// A view-only viewer: someone who can SEE the roster but may not RECORD for
// the selected person -- the one combination this codebase's own fixture
// (an owner/prime signed in, seeing only their own child) can never
// reproduce on its own, since owner/prime bypasses every other check. This
// downgrades the signed-in login to a bare "teacher" (no owner/prime), who
// shares no enrolment with "p2" at all -- exactly the documented,
// pre-existing gap CLAUDE.md's own "second open access-control question"
// names (a teacher's client-side standing is narrower than canRecordFor()
// grants tenant-wide). Selecting p2 must show every action disabled, with a
// reason, and never write.
// ---------------------------------------------------------------------------
const VIEW_ONLY_SEED = `
DATA.tenantMemberUids[0].roles = ["teacher"];
DATA.tenantPeople[0].roles = ["teacher"];
`;

async function runViewOnlyCheck(lang) {
  console.log(`\n===== hadeethenc-browser view-only (${lang}) =====`);
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 900 }, extraSeedJs: VIEW_ONLY_SEED });
  const { page, errors } = await openPage(ctx, "/app/hadith-collections.html");
  const settle = () => page.waitForTimeout(200);

  await page.click('[data-hadith-tab="collections"]');
  await settle();
  await page.click('[data-hadeethenc-category="3"]');
  await settle();
  await page.click('[data-hadeethenc-hadith="4563"]');
  await settle();
  await page.waitForSelector('[data-hadeethenc-card="4563"] [data-hadeethenc-bookmark]', { timeout: 5000 }).catch(() => {});

  // Switch to p2 -- a bare teacher, co-enrolled with nobody in this fixture.
  await page.waitForSelector("#personSelect option[value=\"p2\"]", { timeout: 5000 }).catch(() => {});
  await page.selectOption("#personSelect", "p2");
  await settle();
  await page.waitForFunction(
    () => document.querySelector('[data-hadeethenc-card="4563"] [data-hadeethenc-bookmark]')?.getAttribute("aria-disabled") === "true",
    null, { timeout: 5000 }
  ).catch(() => {});

  const logBefore = await page.evaluate(() => (window.__fsLog ?? []).length);

  const state = await page.evaluate(() => {
    const card = document.querySelector('[data-hadeethenc-card="4563"]');
    return {
      bookmarkDisabled: card?.querySelector('[data-hadeethenc-bookmark]')?.getAttribute("aria-disabled"),
      studiedDisabled: card?.querySelector('[data-hadeethenc-studied]')?.disabled,
      reasonShown: !!card?.querySelector(".hadeethenc-study-reason"),
    };
  });
  check("viewing p2 as a non-co-enrolled teacher: the Bookmark button is aria-disabled (never native disabled -- it still explains itself)",
    state.bookmarkDisabled === "true");
  check("viewing p2 as a non-co-enrolled teacher: the Studied select is disabled", state.studiedDisabled === true);
  check("viewing p2 as a non-co-enrolled teacher: a reason is shown in words, not a silent absence", state.reasonShown);

  // A click on the dimmed bookmark button must never write.
  await page.click('[data-hadeethenc-bookmark="4563"]', { force: true });
  await settle();
  const newBookmarkWrites = await page.evaluate(
    (n) => (window.__fsLog ?? []).slice(n).some((r) => r.col === "bookmarks"),
    logBefore
  );
  check("clicking the disabled Bookmark control writes nothing to bookmarks (never an error, never a silent write either)",
    !newBookmarkWrites);
  check("no page error was raised (a disabled control never throws)", errors.length === 0);
  if (errors.length) console.log("--- page errors ---\n", errors.join("\n"));

  await browser.close();
}

await runAtWidth(390);
await runAtWidth(1100);
await runViewOnlyCheck("en");
await runViewOnlyCheck("bn");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

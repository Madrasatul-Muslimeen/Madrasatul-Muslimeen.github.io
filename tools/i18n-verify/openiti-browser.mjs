// The real OpenITI corpus in the Hadith module's Collections tab (issue
// #316, part 2 of #314) -- browse book -> chapter -> passage, over the REAL
// packaged files already committed at
// tools/hadith-data-pull/output/openiti-release/split/ (the local static
// server serves the whole repository, so no fixture/stub is needed for the
// corpus itself -- only Firebase and the DOMPurify CDN are stubbed, exactly
// as every other browser suite here already does via harness.mjs).
//
// THE TEST IDS/NUMBERS BELOW ARE READ OFF THE REAL SPLIT OUTPUT, NOT
// INVENTED (re-derive if the split is ever re-run):
//   - Sahih al-Bukhari (0256Bukhari.Sahih.JK000110-ara1) chapter "ch-2" is
//     the chapter holding hadith 1 (firstNumber 1, lastNumber 7) -- a single
//     shard file, ch-2.json. Its own first passage (n=2) is a "chapter-text"
//     passage (no number); its second (n=3) is hadith number 1.
//   - Bukhari chapter "ch-72" holds hadith 5000 (firstNumber 4953, lastNumber
//     5035) -- "Go to hadith number" 5000 must land there.
//   - Bukhari has 101 chapters total, over the 100-per-page cap, so its
//     chapter list must show "Show more".
//   - Sahih Muslim (0261Muslim.Sahih.Shamela0001727-ara1) is
//     "sequential-by-paragraph" (14225 passages, hadithCount null) -- its
//     book-list row must say "passages", never "hadith", and every one of
//     its own passages carries kind "passage" with the "position in this
//     edition" label.
//
// Run:
//   node tools/i18n-verify/openiti-browser.mjs en
//   node tools/i18n-verify/openiti-browser.mjs bn
// Exits 0 only if every check passed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";

const EXE = process.env.CHROMIUM_PATH || undefined;
const LANG = process.argv[2] === "bn" ? "bn" : "en";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPLIT_ROOT = path.join(__dirname, "..", "hadith-data-pull", "output", "openiti-release", "split");
const BUKHARI_URI = "0256Bukhari.Sahih.JK000110-ara1";
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(SPLIT_ROOT, rel), "utf8"));

const bukhariIndex = readJson(`${BUKHARI_URI}/index.json`);
const ch2 = bukhariIndex.chapters.find((c) => c.id === "ch-2");
const ch72 = bukhariIndex.chapters.find((c) => c.id === "ch-72");
if (!ch2 || ch2.firstNumber !== 1 || !ch72 || ch72.firstNumber > 5000 || ch72.lastNumber < 5000) {
  throw new Error("openiti-browser.mjs's own fixture chapter ids were not found as expected -- re-derive them (see the header comment).");
}
const ch2Shard = readJson(`${BUKHARI_URI}/${ch2.shardFiles[0]}`);
const REC_CHAPTER_TEXT = ch2Shard.hadiths.find((h) => h.kind === "chapter-text");
const REC_HADITH_1 = ch2Shard.hadiths.find((h) => h.kind === "hadith" && h.number === 1);
if (!REC_CHAPTER_TEXT || !REC_HADITH_1) {
  throw new Error("openiti-browser.mjs's own fixture records were not found in ch-2's shard -- re-derive them.");
}
if (bukhariIndex.chapters.length <= 100) {
  throw new Error("openiti-browser.mjs assumes Bukhari has more than 100 chapters (for the 'Show more' check) -- re-check the real split output.");
}

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}`); }
}

async function runAtWidth(width) {
  console.log(`\n===== openiti-browser (${LANG}, ${width}px) =====`);
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const ctx = await newContext(browser, { appLang: LANG, viewport: { width, height: 900 } });

  // Attached to the CONTEXT before anything loads -- Collections is the
  // component's own default view (mountHadithBrowser's `state.view` starts
  // at "collections"), so OpenITI's book-list metadata is fetched on the
  // very first render, before any click a listener attached later could see.
  const openitiRequests = [];
  ctx.on("request", (req) => {
    const url = req.url();
    if (url.includes("/tools/hadith-data-pull/output/openiti-release/")) openitiRequests.push(url);
  });
  const { page, errors } = await openPage(ctx, "/app/hadith-collections.html");
  const settle = () => page.waitForTimeout(150);

  await page.click('[data-hadith-tab="collections"]');
  await settle();

  // --- I9: opening Collections loads every book's own index.json (the book
  // list's own titles/counts -- see openiti-corpus.js's header comment for
  // why there is no smaller summary file), but NO chapter shard yet. --------
  const afterOpen = [...openitiRequests];
  const indexUrls = afterOpen.filter((u) => /\/split\/[^/]+\/index\.json$/.test(u));
  const shardUrlsSoFar = afterOpen.filter((u) => /\/split\/[^/]+\/ch-[^/]+\.json$/.test(u));
  check("opening Collections fetched all 11 books' own index.json", indexUrls.length === 11);
  check("opening Collections fetched NO chapter shard file yet", shardUrlsSoFar.length === 0);

  // --- The book list: both real titles and the count wording. --------------
  const bookRows = await page.evaluate(() => [...document.querySelectorAll("[data-openiti-book]")].map((r) => r.dataset.openitiBook));
  check("all 11 real OpenITI books are offered, and only those 11", bookRows.length === 11);
  check("Bukhari is among them", bookRows.includes(BUKHARI_URI));

  const muslimRowMeta = await page.evaluate(() =>
    document.querySelector('[data-openiti-book*="Muslim"] .hadith-row-meta')?.textContent ?? "");
  const passagesWord = LANG === "bn" ? "অংশ" : "passages";
  check(`Sahih Muslim's row says "${passagesWord}", not "hadith" (it has no hadith numbers)`,
    muslimRowMeta.includes(passagesWord));
  const bukhariRowMeta = await page.evaluate((uri) =>
    document.querySelector(`[data-openiti-book="${uri}"] .hadith-row-meta`)?.textContent ?? "", BUKHARI_URI);
  const hadithWord = LANG === "bn" ? "হাদীস" : "hadith";
  check(`Bukhari's row says "${hadithWord}" (a numbered book)`, bukhariRowMeta.includes(hadithWord));

  // --- Open Bukhari: its chapter list, capped at 100 with "Show more". ------
  await page.click(`[data-openiti-book="${BUKHARI_URI}"]`);
  await settle();
  const afterBukhariOpen = [...openitiRequests];
  check("opening a book fetched NO new network request (its chapters were already in the loaded index.json)",
    afterBukhariOpen.length === afterOpen.length);
  const chapterRowCount = await page.evaluate(() => document.querySelectorAll("[data-openiti-chapter]").length);
  check("the chapter list shows only the first 100 chapters (Bukhari has 101)", chapterRowCount === 100);
  check('a "Show more" control is offered', !!(await page.$("[data-openiti-show-more]")));
  await page.click("[data-openiti-show-more]");
  await settle();
  const chapterRowCountAfterMore = await page.evaluate(() => document.querySelectorAll("[data-openiti-chapter]").length);
  check("clicking Show more reveals every remaining chapter (101 total)", chapterRowCountAfterMore === 101);

  // --- "Go to hadith number" 5000 opens the chapter that actually holds it. -
  await page.fill("[data-openiti-goto-input]", "5000");
  await page.click("[data-openiti-goto-btn]");
  await settle();
  const afterGoto5000 = [...openitiRequests];
  const newShardsForGoto = afterGoto5000.filter((u) => !afterBukhariOpen.includes(u) && /\/split\/[^/]+\/ch-[^/]+\.json$/.test(u));
  check("'Go to hadith number' 5000 fetched exactly ch-72's own shard(s), nothing else",
    newShardsForGoto.length > 0 && newShardsForGoto.every((u) => ch72.shardFiles.some((f) => u.endsWith(`/${f}`))));
  const passagesAfterGoto = await page.evaluate(() =>
    [...document.querySelectorAll('[data-openiti-passage][data-openiti-kind="hadith"]')].map((p) => p.dataset.openitiPassage));
  check("'Go to hadith number' 5000 landed on the chapter that actually holds it (ch-72, hadith numbers 4953-5035)",
    passagesAfterGoto.length > 0);
  const firstHadithNumberAfterGoto = await page.evaluate(() => {
    const el = document.querySelector('[data-openiti-passage][data-openiti-kind="hadith"] .hadith-card-head');
    return el ? el.textContent : "";
  });
  const gotoNum = firstHadithNumberAfterGoto.match(/\d+/g)?.map(Number)?.[0]
    ?? (LANG === "bn" ? Number([...firstHadithNumberAfterGoto].map((c) => "০১২৩৪৫৬৭৮৯".indexOf(c)).filter((d) => d >= 0).join("")) : NaN);
  check(`the landed chapter's first hadith number (${gotoNum}) is within ch-72's own range [${ch72.firstNumber}, ${ch72.lastNumber}]`,
    Number.isFinite(gotoNum) && gotoNum >= ch72.firstNumber && gotoNum <= ch72.lastNumber);

  // --- Back to Bukhari's chapter list, and open the chapter holding hadith 1
  // directly -- exactly its own shard is fetched, nothing else. -------------
  await page.click(`[data-openiti-crumbs] .openiti-crumb >> nth=1`);
  await settle();
  const beforeCh2 = [...openitiRequests];
  await page.click('[data-openiti-chapter="ch-2"]');
  await settle();
  const afterCh2 = [...openitiRequests];
  const newRequestsForCh2 = afterCh2.filter((u) => !beforeCh2.includes(u));
  check("opening the chapter holding hadith 1 (ch-2) fetched only its own shard file, nothing else",
    newRequestsForCh2.length >= 1 && newRequestsForCh2.every((u) => u.endsWith("/ch-2.json")));

  // --- The passages themselves: the first HADITH shown is number 1, its text
  // equals the shard record exactly; a chapter-text passage shows with no
  // number. -------------------------------------------------------------
  const passageKinds = await page.evaluate(() =>
    [...document.querySelectorAll("[data-openiti-passage]")].map((p) => ({
      kind: p.dataset.openitiKind,
      hasHead: !!p.querySelector(".hadith-card-head"),
      text: p.querySelector(".hadith-arabic")?.textContent ?? "",
    })));
  check("a chapter-text passage renders with NO number/head label",
    passageKinds.some((p) => p.kind === "chapter-text" && !p.hasHead));
  check("the chapter-text passage's own text equals the shard record exactly",
    passageKinds.some((p) => p.kind === "chapter-text" && p.text === REC_CHAPTER_TEXT.text));
  const firstHadith = passageKinds.find((p) => p.kind === "hadith");
  check("the first HADITH passage shown is present", !!firstHadith);
  check("the first hadith's text equals the shard record's own text EXACTLY, read off the page",
    firstHadith?.text === REC_HADITH_1.text);
  const firstHadithHeadText = await page.evaluate(() =>
    document.querySelector('[data-openiti-passage][data-openiti-kind="hadith"] .hadith-card-head')?.textContent ?? "");
  const oneDigit = LANG === "bn" ? "১" : "1";
  check(`the first hadith is labelled with its own number (contains "${oneDigit}")`, firstHadithHeadText.includes(oneDigit));

  const arDir = await page.evaluate(() => {
    const p = document.querySelector('[data-openiti-passage] .hadith-arabic');
    return { lang: p?.getAttribute("lang"), dir: p?.getAttribute("dir") };
  });
  check('every passage\'s Arabic text carries lang="ar" dir="rtl"', arDir.lang === "ar" && arDir.dir === "rtl");

  // --- Credit link: present on every passage, readable and a real tap target. ---
  const creditInfo = await page.evaluate(() => {
    const a = document.querySelector('[data-openiti-passage] a.hadith-view-source');
    return a ? { text: a.textContent, href: a.getAttribute("href"), target: a.getAttribute("target"), rel: a.getAttribute("rel") } : null;
  });
  check('the credit link reads "Source: OpenITI (CC BY-NC-SA 4.0)"', creditInfo?.text?.includes("OpenITI"));
  check("the credit link points at the OpenITI DOI", creditInfo?.href === "https://doi.org/10.5281/zenodo.3082463");
  check("the credit link opens in a new tab safely (target=_blank, rel=noopener noreferrer)",
    creditInfo?.target === "_blank" && (creditInfo?.rel ?? "").includes("noopener"));
  const creditMetrics = await page.evaluate(() => {
    const a = document.querySelector('[data-openiti-passage] a.hadith-view-source');
    if (!a) return null;
    const lum = (s) => { const [r, g, b] = s.match(/\d+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    let bg = a, c; while (bg && (c = getComputedStyle(bg).backgroundColor) === "rgba(0, 0, 0, 0)") bg = bg.parentElement;
    const A = lum(getComputedStyle(a).color), B = lum(c || "rgb(255,255,255)");
    return { ratio: (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05), h: a.getBoundingClientRect().height };
  });
  check(`the credit link is readable (contrast ${creditMetrics?.ratio?.toFixed(2)} >= 4.5)`, !!creditMetrics && creditMetrics.ratio >= 4.5);
  check(`the credit link is a real tap target (${creditMetrics?.h}px >= 40)`, !!creditMetrics && creditMetrics.h >= 40);

  // --- Notes/bookmark/Studied are honestly not offered yet (issue #316 point 6). ---
  const soonSentence = await page.evaluate(() => document.querySelector(".openiti-study-soon")?.textContent ?? "");
  check("a sentence says Notes/bookmark/Studied are not enabled here yet", soonSentence.length > 0);
  check("no bookmark/Studied/Note control exists anywhere under the OpenITI section",
    await page.evaluate(() => document.querySelectorAll("#openitiSection [data-hadeethenc-bookmark], #openitiSection [data-hadeethenc-studied], #openitiSection [data-hadeethenc-note-link]").length === 0));

  // --- Sahih Muslim: a passage carries the "position in this edition" label. ---
  await page.click(`[data-openiti-crumbs] .openiti-crumb >> nth=0`);
  await settle();
  await page.click('[data-openiti-book*="Muslim"]');
  await settle();
  check("Sahih Muslim's chapter list offers no 'Go to hadith number' control (it has no hadith numbers)",
    !(await page.$("[data-openiti-goto-input]")));
  const muslimGotoMsg = await page.evaluate(() => document.querySelector(".openiti-goto")?.textContent ?? "");
  check("Sahih Muslim's chapter list explains why there is no 'Go to hadith number' box, in words",
    muslimGotoMsg.length > 0);
  await page.click("[data-openiti-chapter]");
  await settle();
  const muslimPassageHead = await page.evaluate(() =>
    document.querySelector('[data-openiti-passage][data-openiti-kind="passage"] .hadith-card-head')?.textContent ?? "");
  const positionPhrase = LANG === "bn" ? "অবস্থান" : "position in this edition";
  check(`a Muslim passage's own label carries "${positionPhrase}" (its number is a position, not the book's own number)`,
    muslimPassageHead.includes(positionPhrase));

  // --- The existing HadeethEnc section is untouched by all of the above. ---
  const hadeethEncCategoryCount = await page.evaluate(() => document.querySelectorAll("[data-hadeethenc-category]").length);
  check("the pre-existing HadeethEnc section still renders its 7 root categories",
    hadeethEncCategoryCount === 7);

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

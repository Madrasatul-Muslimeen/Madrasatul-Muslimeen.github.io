// Issue #322 -- "Achieved" on the Word Card's own Word progress buttons now
// IS "mark this word known everywhere": the Owner's report, "I think user
// don't need to double click to confirm 'mark the word known everywhere',
// this is only a double work... the achieved on word progress should
// automatically count this word known everywhere." The dedicated second row
// (issue #303's own "Mark this word known everywhere") is REMOVED; the
// Word progress buttons drive both lanes now (quran-word-card.js,
// app/quranrevival.html's runWordProgressAction()/mirrorLemmaProgress()).
//
// RENDERED acceptance QA, in a real browser, at the five viewports and two
// languages the issue names. See quran-lemma-progress-rendered.mjs for the
// deeper cross-occurrence/whole-Qur'an-counter proof (updated in place for
// this same issue) -- this suite is the issue's own NEW, dedicated one,
// scoped to exactly what it asked to be proved: one press writes both
// lanes, no second row exists, a supervisor confirm confirms both, and the
// bounded counter moves exactly once (never twice) for the press that
// triggered it.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// Al-Fatihah 1:2 ("الرَّحْمَٰنِ") -- a real word with a real, small lemma
// (checked below), so the mirror's own write is proven against real data
// rather than an invented lemma id.
const s1 = JSON.parse(fs.readFileSync(path.join(repoRoot, "tools/quran-data-pull/output/surahs/surah_001.json"), "utf8"));
const ayah2 = s1.ayahs.find((a) => a.ayah === 2);
const word2 = ayah2.words.find((w) => w.position === 2);
if (!word2?.morphology?.lemma) throw new Error("fixture assumption broke: Al-Fatihah 1:2 word 2 no longer carries a lemma -- pick a new fixture word");
const LEMMA_ID = word2.morphology.lemma;

async function enterReadWithWbw(page) {
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const t = document.getElementById("wbwShowToggle");
    if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); }
    // Architect review: the Read screen opens on 1:1 in Single Ayah mode, so
    // 1:2's words are not on screen until ayah 2 is chosen -- without this the
    // suite clicked an element that did not exist.
    const a = document.getElementById("ayahSelect");
    if (a && a.value !== "2") { a.value = "2"; a.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(800);
  const present = await page.evaluate(() => !!document.querySelector('[data-word-occurrence$=":1:2:2"]'));
  if (!present) throw new Error("precondition: Al-Fatihah 1:2 word 2 is not on screen -- the suite would read nothing");
}

async function openWord(page, position) {
  await page.evaluate((p) => {
    document.querySelector(`[data-word-occurrence$=":1:2:${p}"]`)?.click();
  }, position);
  await page.waitForFunction(() => {
    const b = document.querySelector("#quranWordCardMount [data-word-progress]");
    return !!b && !/Loading|লোড হচ্ছে/.test(b.querySelector(".word-progress-state")?.textContent ?? "");
  }, null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(300);
}

function readCard(page) {
  return page.evaluate(() => {
    const b = document.querySelector("#quranWordCardMount [data-word-progress]");
    if (!b) return null;
    return {
      secondRowPresent: !!b.querySelector("[data-lemma-progress], [data-lemma-progress-state]"),
      occurrenceStatePressed: [...b.querySelectorAll("[data-word-progress-state]")].find((el) => el.getAttribute("aria-pressed") === "true")?.dataset.wordProgressState ?? null,
      decideCount: b.querySelectorAll("[data-word-progress-decide]").length,
      review: b.querySelector("[data-word-progress-review]")?.textContent.trim() ?? null,
    };
  });
}

for (const [width, height] of [[320, 640], [360, 740], [390, 844], [412, 915], [1100, 900]]) {
  for (const lang of ["en", "bn"]) {
    console.log(`\n=== Achieved mirrors the lemma, ${width}x${height}, appLang=${lang} ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height } });
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await enterReadWithWbw(page);
    await openWord(page, 2);

    const before = await readCard(page);
    check(`[${lang} ${width}] no second "Mark this word known everywhere" row anywhere in the card`,
      before?.secondRowPresent === false, JSON.stringify(before));

    await page.click('#quranWordCardMount [data-word-progress-state="achieved"]');
    await page.waitForTimeout(500);

    const occWrite = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranWordProgress").at(-1));
    check(`[${lang} ${width}] the press wrote the OCCURRENCE lane (quranWordProgress)`,
      occWrite?.col === "quranWordProgress" && /__wbw__1_2$/.test(occWrite?.id ?? ""), JSON.stringify(occWrite?.id));

    const lemmaWrite = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranLemmaProgress").at(-1));
    check(`[${lang} ${width}] the SAME press ALSO wrote the LEMMA lane (quranLemmaProgress), keyed by this word's own lemma`,
      lemmaWrite?.col === "quranLemmaProgress" && (lemmaWrite?.id ?? "").endsWith(`__wbw__${LEMMA_ID}`), JSON.stringify({ id: lemmaWrite?.id, LEMMA_ID }));

    const after = await readCard(page);
    check(`[${lang} ${width}] still no second row after the press`, after?.secondRowPresent === false, JSON.stringify(after));
    check(`[${lang} ${width}] the word's own button shows achieved`, after?.occurrenceStatePressed === "achieved", JSON.stringify(after));

    check(`[${lang} ${width}] no page errors`, errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e)).length === 0, JSON.stringify(errors.slice(0, 3)));
    await ctx.close();
  }
}

// ===========================================================================
// A supervisor's confirm ALSO confirms both lanes, and the bounded
// per-lemma-per-juz counter (quranLemmaOccurrenceCounters) moves exactly
// ONCE for the press that triggered it -- not twice, and not zero times.
// One configuration -- see this file's own header for why.
// ===========================================================================
console.log(`\n=== supervisor confirm confirms both lanes; the counter moves exactly once ===`);
{
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await enterReadWithWbw(page);

  // Switch to the managed child (p2, confirmationRequired) -- same fixture
  // shape quran-word-progress-rendered.mjs's own supervisor section uses.
  const switched = await page.evaluate(() => {
    const sel = document.getElementById("personSelect");
    const opt = sel && [...sel.options].find((o) => o.value === "p2");
    if (!opt) return false;
    sel.value = "p2"; sel.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  });
  check("[confirm] the managed child is reachable from the roster", switched === true, String(switched));
  await page.waitForTimeout(700);
  await openWord(page, 2);

  // The claim: a supervisor records Achieved FOR the managed child.
  await page.click('#quranWordCardMount [data-word-progress-state="achieved"]');
  await page.waitForTimeout(500);
  const claimed = await readCard(page);
  check("[confirm] the claim shows as WAITING, not yet counted (Activity != Mastery, same lock as before)",
    /Waiting/i.test(claimed?.review ?? ""), String(claimed?.review));

  const counterWritesAfterClaim = await page.evaluate(() =>
    (window.__stubWriteData || []).filter((w) => w.col === "quranLemmaOccurrenceCounters").length);
  check("[confirm] a claim still AWAITING confirmation moves the bounded counter ZERO times (nothing is known yet to count)",
    counterWritesAfterClaim === 0, String(counterWritesAfterClaim));

  // The confirm: BOTH lanes should now be confirmed by the one press.
  await page.click('#quranWordCardMount [data-word-progress-decide="confirmed"]');
  await page.waitForTimeout(600);

  const occDecision = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranWordApprovals").at(-1));
  check("[confirm] the OCCURRENCE lane's own approval was written", occDecision?.col === "quranWordApprovals", JSON.stringify(occDecision?.id));
  const lemmaDecision = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranLemmaApprovals").at(-1));
  check("[confirm] the SAME press ALSO wrote the lemma's own approval (quranLemmaApprovals)",
    lemmaDecision?.col === "quranLemmaApprovals" && (lemmaDecision?.id ?? "").endsWith(`__wbw__${LEMMA_ID}`), JSON.stringify({ id: lemmaDecision?.id, LEMMA_ID }));

  const afterConfirm = await readCard(page);
  check("[confirm] the card now reads confirmed", /[Cc]onfirmed/.test(afterConfirm?.review ?? ""), String(afterConfirm?.review));

  const counterWritesAfterConfirm = await page.evaluate(() =>
    (window.__stubWriteData || []).filter((w) => w.col === "quranLemmaOccurrenceCounters"));
  check("[confirm] THE COUNTER MOVED EXACTLY ONCE for the confirm that finally made this word count -- never twice",
    counterWritesAfterConfirm.length === 1, JSON.stringify(counterWritesAfterConfirm));

  check("[confirm] no page errors", errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e)).length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

// Architect review of #322: only Achieved -- or undoing THIS occurrence's own
// Achieved -- may move the Dictionary Word. Pressing Learning on a different,
// untouched form of an already-known word must NOT un-know the whole word.
// 1:2:2 and 1:1:2 are both Allah (the same lemma), checked below.
console.log(`\n=== a lower state on ANOTHER form leaves the Dictionary Word alone ===`);
{
  const lemmaOf = (a, p) => s1.ayahs.find((x) => x.ayah === a).words.find((w) => w.position === p).morphology.lemma;
  if (lemmaOf(1, 2) !== LEMMA_ID) throw new Error("fixture assumption broke: 1:1:2 and 1:2:2 no longer share a lemma");
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 } });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await enterReadWithWbw(page);
  const lemmaWrites = () => page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranLemmaProgress"));
  const goAyah = async (n) => {
    await page.evaluate((v) => { const a = document.getElementById("ayahSelect"); a.value = String(v); a.dispatchEvent(new Event("change", { bubbles: true })); }, n);
    await page.waitForTimeout(800);
  };
  const openAt = async (a, p) => {
    await page.evaluate(([a, p]) => document.querySelector(`[data-word-occurrence$=":1:${a}:${p}"]`)?.click(), [a, p]);
    await page.waitForFunction(() => {
      const b = document.querySelector("#quranWordCardMount [data-word-progress]");
      return !!b && !/Loading|লোড হচ্ছে/.test(b.querySelector(".word-progress-state")?.textContent ?? "");
    }, null, { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(300);
  };
  const press = async (state) => { await page.click(`#quranWordCardMount [data-word-progress-state="${state}"]`); await page.waitForTimeout(500); };
  const close = async () => { await page.click("#quranWordCardMount [data-word-card-close]").catch(() => {}); await page.waitForTimeout(200); };

  await openAt(2, 2); await press("achieved"); await close();
  const afterAchieved = (await lemmaWrites()).length;
  check("[other-form] Achieved on 1:2:2 wrote the lemma lane", afterAchieved >= 1, String(afterAchieved));

  await goAyah(1); await openAt(1, 2); await press("learning"); await close();
  const afterOther = await lemmaWrites();
  check("[other-form] Learning on 1:1:2 (same Dictionary Word, never Achieved) wrote NOTHING to the lemma lane",
    afterOther.length === afterAchieved, JSON.stringify({ before: afterAchieved, after: afterOther.length }));
  const occ = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranWordProgress").at(-1));
  check("[other-form] ...while that occurrence's own Learning was saved", /__wbw__1_1$/.test(occ?.id ?? ""), JSON.stringify(occ?.id));

  await goAyah(2); await openAt(2, 2); await press("learning");
  const afterUndo = await lemmaWrites();
  check("[undo] Learning on 1:2:2, which WAS Achieved, does update the Dictionary Word",
    afterUndo.length === afterAchieved + 1 && JSON.stringify(afterUndo.at(-1)).includes("learning"), JSON.stringify(afterUndo.at(-1)));
  check("[other-form] no page errors", errors.filter((e) => !/ERR_CERT_AUTHORITY_INVALID/.test(e)).length === 0, JSON.stringify(errors));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Word Card Achieved mirrors the lemma (issue #322): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

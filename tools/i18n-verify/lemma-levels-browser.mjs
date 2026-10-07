// Decision 58 (issue #490) -- Basic Achieved counts the same root AND meaning,
// Depth Achieved counts the whole root, WbW Achieved counts the same word only,
// and the Word card carries one "You know" line per level.
//
// The new gate (app/js/study-lemma-levels-readiness.js, ready:false) is FORCED
// OPEN BY ROUTE here, as quran-lemma-progress-rendered.mjs does for its gate.
// Expected values are HAND-WRITTEN (computed once from
// tools/quran-data-pull/output/lemmas-index.json, lemma-meaning-groups.json
// and roots-index.json, never by the code under test):
//   ٱلرَّحْمَٰن lemma           57 occurrences  (WbW spread)
//   mercy group رحم:2         327 occurrences  (8 lemmas; Basic spread)
//   root رحم                  339 occurrences  (the group + 12 of أَرْحَام; Depth spread)
// 1:1:3 = ٱلرَّحْمَٰن, 1:1:4 and 1:3:2 = ٱلرَّحِيم (same group), 3:6:5 = أَرْحَام
// (same root, different meaning: in NO group).
//
// Run from the repository root. MUTATE=basicroot|depthgroup|wbwgroup|sharedtotal
// runs the same assertions against a deliberately broken build and must FAIL.
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = process.argv[2] || process.env.MUTATE || "";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const WANT = { wbw: 57, basic: 327, depth: 339 };
// UPDATED IN PLACE 5 Oct 2026 (decision 68): Basic and Depth count only the
// 74,122 words that have a dictionary word, so 327/74122 = 0.44% and
// 339/74122 = 0.46% (were 0.42/0.44 over 77,429). WbW is unchanged.
const WANT_PERCENT = { wbw: "0.07", basic: "0.44", depth: "0.46" };
const RAHMAN = "رَّحْمَٰن";
const GROUP_ID = "رحم:2";
const ROOT = "رحم";

const OPEN_GATE = `
export const LEMMA_LEVELS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const LEMMA_LEVELS_PERSISTENCE_DECLARATION = Object.freeze({ ready: true, decision: Object.freeze({ by: "master-architect", on: "2026-10-02", reference: "test-forced-open" }), gate: "E1", note: "forced open by tools/i18n-verify/lemma-levels-browser.mjs" });
export function isLemmaLevelsPersistenceReady() { return true; }
export const REASON_LEMMA_LEVELS_NOT_DEPLOYED = "x";
export const REASON_LEMMA_LEVELS_DECISION_INCOMPLETE = "y";
export function lemmaLevelsUnavailableReason() { return null; }
`;

// UPDATED IN PLACE 2 Oct 2026 (Owner: "Basic and Depth rules are live"): the
// shipped readiness file now says ready, so the gate-off case can no longer
// use it as shipped. It routes this CLOSED copy through the same ctx.route()
// seam, so "closed means exactly v09.42" stays tested for any future time the
// gate is shut.
const CLOSED_GATE = `
export const LEMMA_LEVELS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const LEMMA_LEVELS_PERSISTENCE_DECLARATION = Object.freeze({ ready: false, decision: null, gate: "E1", note: "test seam: closed" });
export function isLemmaLevelsPersistenceReady() { return false; }
export const REASON_LEMMA_LEVELS_NOT_DEPLOYED = "lemma-levels-rules-not-deployed";
export const REASON_LEMMA_LEVELS_DECISION_INCOMPLETE = "lemma-levels-readiness-decision-incomplete";
export function lemmaLevelsUnavailableReason() { return REASON_LEMMA_LEVELS_NOT_DEPLOYED; }
`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function patchModule(ctx, glob, from, to) {
  let hits = 0;
  await ctx.route(glob, async (r) => {
    const res = await r.fetch();
    let body = await res.text();
    if (body.includes(from)) hits++;
    body = body.split(from).join(to);
    await r.fulfill({ response: res, body });
  });
  return () => hits;
}

async function newCtx(lang, width, height, { open = true } = {}) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height } });
  await ctx.route("**/js/study-lemma-levels-readiness.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: open ? OPEN_GATE : CLOSED_GATE }));
  if (MUTATE === "basicroot") await patchModule(ctx, "**/js/quran-lemma-levels.js", 'return lemma ? (groupOf(lemma) || lemma) : null;', "return root || null;");
  if (MUTATE === "depthgroup") await patchModule(ctx, "**/js/quran-lemma-levels.js", "return root || null;\n}", "return lemma ? (groupOf(lemma) || lemma) : null;\n}");
  if (MUTATE === "wbwgroup") await patchModule(ctx, "**/js/quran-lemma-levels.js", 'if (level === "wbw") return lemma || null;', 'if (level === "wbw") return lemma ? (groupOf(lemma) || lemma) : null;');
  if (MUTATE === "sharedtotal") await patchModule(ctx, "**/js/quran-word-total.js", 'if (level === "wbw") return base;', "return base;");
  return ctx;
}

async function enterRead(page) {
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const t = document.getElementById("wbwShowToggle");
    if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(600);
}
async function goTo(page, surah, ayah) {
  await page.evaluate(([s, a]) => {
    const ss = document.getElementById("surahSelect");
    if (ss.value !== String(s)) { ss.value = String(s); ss.dispatchEvent(new Event("change", { bubbles: true })); }
    setTimeout(() => { const as = document.getElementById("ayahSelect"); as.value = String(a); as.dispatchEvent(new Event("change", { bubbles: true })); }, 600);
  }, [surah, ayah]);
  await page.waitForFunction(([s, a]) => !!document.querySelector(`[data-word-occurrence$=":${s}:${a}:1"]`), [surah, ayah], { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
}
const marked = (page, s, a, p) => page.evaluate(([s, a, p]) =>
  [...document.querySelectorAll(`[data-word-occurrence$=":${s}:${a}:${p}"]`)].some((e) => e.classList.contains("is-known-word")), [s, a, p]);
const waitMark = (page, s, a, p, want) => page.waitForFunction(([s, a, p, want]) =>
  [...document.querySelectorAll(`[data-word-occurrence$=":${s}:${a}:${p}"]`)].some((e) => e.classList.contains("is-known-word")) === want,
  [s, a, p, want], { timeout: 5000 }).then(() => true).catch(() => false);
async function openWord(page, s, a, p, level = "wbw") {
  await page.evaluate(([s, a, p]) => document.querySelector(`[data-word-occurrence$=":${s}:${a}:${p}"]`)?.click(), [s, a, p]);
  await page.waitForSelector("#quranWordCardMount [data-word-card-level]", { timeout: 8000 }).catch(() => {});
  if (level) await page.click(`#quranWordCardMount [data-word-card-level="${level}"]`);
  await page.waitForFunction(() => {
    const b = document.querySelector("#quranWordCardMount [data-word-progress]");
    return !!b && !/Loading|লোড হচ্ছে/.test(b.querySelector(".word-progress-state")?.textContent ?? "");
  }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
}
const BN = "০১২৩৪৫৬৭৮৯";
const asciiDigits = (s) => s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
const totalsOf = (page) => page.evaluate(() => {
  const out = {};
  for (const level of ["wbw", "basic", "depth"]) {
    out[level] = {
      known: document.querySelector(`#quranWordCardMount [data-whole-quran-level="${level}"]`)?.textContent ?? null,
      percent: document.querySelector(`#quranWordCardMount [data-whole-quran-level-percent="${level}"]`)?.textContent ?? null,
      // The two <strong> numbers are the total and the known count, in the language's own order.
      knownNum: [...document.querySelectorAll(`#quranWordCardMount [data-whole-quran-level="${level}"] strong`)].map((e) => e.textContent).find((x) => !/^(77,429|৭৭,৪২৯|74,122|৭৪,১২২)$/.test(x)) ?? null, // decision 68: Basic/Depth say 74,122
    };
  }
  return out;
});
const knownNumber = (t) => (t.knownNum == null ? null : Number(asciiDigits(t.knownNum).replace(/,/g, "")));
const errs = (errors) => errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e));
const lemmaWrites = (page) => page.evaluate(() => (window.__stubWriteData || []).filter((w) => /^quranLemma/.test(w.col)).map((w) => ({ col: w.col, id: w.id })));

const LEVEL_NAME = { en: { wbw: "WbW", basic: "Basic", depth: "Depth" }, bn: { wbw: "শব্দে শব্দে", basic: "প্রাথমিক", depth: "গভীরতা" } };

for (const [width, height] of [[390, 844], [1280, 900]]) {
  for (const lang of ["en", "bn"]) {
    for (const level of ["basic", "depth", "wbw"]) {
      const tag = `[${lang} ${width} ${level}]`;
      console.log(`\n=== ${tag} Achieved on ٱلرَّحْمَٰن ===`);
      const ctx = await newCtx(lang, width, height);
      const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
      const fetched = [];
      page.on("request", (r) => { if (/lemma-meaning-groups/.test(r.url())) fetched.push(r.url()); });
      await page.waitForTimeout(800);
      check(`${tag} the groups file is NOT fetched on the landing page`, fetched.length === 0);
      await enterRead(page);
      await goTo(page, 1, 1);
      await openWord(page, 1, 1, 3, level);
      await page.click('#quranWordCardMount [data-word-progress-state="achieved"]');
      await page.waitForTimeout(1500);

      check(`${tag} ٱلرَّحْمَٰن itself is marked`, await waitMark(page, 1, 1, 3, true));
      await page.waitForTimeout(500);
      const rahimMarked = level !== "wbw";
      check(`${tag} ٱلرَّحِيم (1:1:4) ${rahimMarked ? "IS" : "is NOT"} marked`, (await marked(page, 1, 1, 4)) === rahimMarked);
      await goTo(page, 1, 3);
      check(`${tag} ٱلرَّحِيم (1:3:2) ${rahimMarked ? "IS" : "is NOT"} marked`, (await marked(page, 1, 3, 2)) === rahimMarked);
      check(`${tag} ٱلرَّحْمَٰن (1:3:1), the same word, is marked`, await waitMark(page, 1, 3, 1, true));
      await goTo(page, 3, 6);
      const arhamWant = level === "depth";
      check(`${tag} أَرْحَام (3:6:5) ${arhamWant ? "IS" : "is NOT"} marked`, (await marked(page, 3, 6, 5)) === arhamWant);

      // One record covers the spread; nothing is written for a mate.
      const writes = await lemmaWrites(page);
      const want = level === "wbw" ? `__wbw__` : level === "basic" ? `__basic__${GROUP_ID}` : `__depth__${ROOT}`;
      check(`${tag} lemma writes are only the ONE claim keyed per level`, writes.length >= 1 && writes.every((w) => (w.id ?? "").normalize("NFC").includes(want.normalize("NFC"))), JSON.stringify(writes));
      check(`${tag} nothing written under a mate's own key`, !writes.some((w) => /رَّحِيم|أَرْحَام/.test(w.id ?? "")), JSON.stringify(writes));

      // One totals document PER LEVEL: WbW keeps its old id, the others append their level.
      const totalWrites = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranWordTotals").map((w) => w.id));
      const wantTotalId = level === "wbw" ? /^t1__p1$/ : new RegExp(`^t1__p1__${level}$`);
      check(`${tag} the totals write goes to this level's own document`, totalWrites.length >= 1 && totalWrites.every((id) => wantTotalId.test(id)), JSON.stringify(totalWrites));

      await goTo(page, 1, 1);
      await openWord(page, 1, 1, 3, level);
      const totals = await totalsOf(page);
      for (const l of ["wbw", "basic", "depth"]) {
        const wantN = l === level ? WANT[l] : 0;
        check(`${tag} "You know" line for ${l} reads ${wantN}`, knownNumber(totals[l]) === wantN, JSON.stringify(totals[l]));
        check(`${tag} the ${l} line names its level (${LEVEL_NAME[lang][l]})`, (totals[l].known ?? "").includes(LEVEL_NAME[lang][l]), JSON.stringify(totals[l]));
      }
      check(`${tag} the percentage line for ${level} reads ${WANT_PERCENT[level]}%`, asciiDigits(totals[level].percent ?? "").includes(WANT_PERCENT[level]), JSON.stringify(totals[level]));

      // Layout: the box is inside the card, nothing clipped.
      const box = await page.evaluate(() => {
        const mount = document.querySelector("#quranWordCardMount");
        const b = mount?.querySelector(".word-progress-whole-quran-box");
        if (!b) return null;
        const m = mount.getBoundingClientRect(), r = b.getBoundingClientRect();
        const wide = [...b.querySelectorAll("p")].filter((p) => p.scrollWidth > p.clientWidth + 1).length;
        return { inside: r.left >= m.left - 1 && r.right <= m.right + 1, wide, lines: b.querySelectorAll("p").length };
      });
      check(`${tag} the bold box holds 6 lines inside the card, none clipped`, !!box && box.inside && box.wide === 0 && box.lines === 6, JSON.stringify(box));
      await page.screenshot({ path: `.builder-round/shot-levels-${lang}-${width}-${level}.png` });

      if (level === "basic" && width === 390 && lang === "en") {
        // The Word card on a group-mate says which level made it known.
        await goTo(page, 1, 1);
        await openWord(page, 1, 1, 4);
        const through = await page.evaluate(() => document.querySelector("#quranWordCardMount [data-word-known-through]")?.textContent ?? null);
        check(`${tag} ٱلرَّحِيم's card says it is known through Basic`, /Basic: same meaning/.test(through ?? ""), String(through));
        const pressed = await page.evaluate(() => [...document.querySelectorAll("#quranWordCardMount [data-word-progress-state]")].find((e) => e.getAttribute("aria-pressed") === "true")?.dataset.wordProgressState);
        // Updated in place, 7 Oct 2026: since v09.90 (the Owner, 6 Oct: the Word Card shows "known elsewhere" as
        // Achieved) a word known through its group shows its buttons at Achieved. This check still read "not started";
        // that round did not run this suite, so it was found by the next one. Red on main before this update.
        check(`${tag} ... and its buttons show it as Achieved (known through its group, v09.90)`, pressed === "achieved", String(pressed));
      }
      check(`${tag} the groups file was fetched on first use (Read page / Word card), exactly once`, fetched.length === 1, JSON.stringify(fetched));
      check(`${tag} no page errors`, errs(errors).length === 0, JSON.stringify(errs(errors).slice(0, 3)));
      await ctx.close();
    }
  }
}

console.log(`\n=== a pending (unconfirmed) Basic claim spreads to nobody ===`);
{
  const ctx = await newCtx("en", 390, 844);
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await enterRead(page);
  const switched = await page.evaluate(() => {
    const sel = document.getElementById("personSelect");
    const opt = sel && [...sel.options].find((o) => o.value === "p2");
    if (!opt) return false;
    sel.value = "p2"; sel.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  });
  check("[pending] the managed child is reachable", switched === true);
  await page.waitForTimeout(800);
  await goTo(page, 1, 1);
  await openWord(page, 1, 1, 3, "basic");
  await page.click('#quranWordCardMount [data-word-progress-state="achieved"]');
  await page.waitForTimeout(1500);
  check("[pending] the claim shows as waiting", await page.evaluate(() => /Waiting/i.test(document.querySelector("#quranWordCardMount [data-word-progress]")?.textContent ?? "")));
  check("[pending] ٱلرَّحْمَٰن is not marked while waiting", (await marked(page, 1, 1, 3)) === false);
  check("[pending] ٱلرَّحِيم is not marked either", (await marked(page, 1, 1, 4)) === false);
  await goTo(page, 3, 6);
  check("[pending] أَرْحَام is not marked either", (await marked(page, 3, 6, 5)) === false);
  check("[pending] no page errors", errs(errors).length === 0, JSON.stringify(errs(errors).slice(0, 3)));
  await ctx.close();
}

console.log(`\n=== the gate CLOSED (the real file): Basic Achieved spreads to nobody and writes no lemma document ===`);
{
  const ctx = await newCtx("en", 390, 844, { open: false });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await enterRead(page);
  await goTo(page, 1, 1);
  await openWord(page, 1, 1, 3, "basic");
  await page.click('#quranWordCardMount [data-word-progress-state="achieved"]').catch(() => {});
  await page.waitForTimeout(1200);
  check("[closed] ٱلرَّحِيم is not marked", (await marked(page, 1, 1, 4)) === false);
  check("[closed] no lemma document was written", (await lemmaWrites(page)).length === 0);
  const totals = await totalsOf(page);
  check("[closed] the card shows no per-level lines", totals.basic.known === null && totals.depth.known === null, JSON.stringify(totals));
  check("[closed] no page errors", errs(errors).length === 0, JSON.stringify(errs(errors).slice(0, 3)));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Lemma levels (issue #490)${MUTATE ? ` [MUTATE=${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

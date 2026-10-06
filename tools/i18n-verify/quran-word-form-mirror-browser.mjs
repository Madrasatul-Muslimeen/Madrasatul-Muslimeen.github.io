// The Owner, 6 Oct 2026 (Yaseen 36:6 and 36:8, both فَهُمْ): "Achieved in one
// place should mark both." A word with NO dictionary word is shared at WbW
// through a stand-in key (app/js/quran-word-form-key.js, form-index.json).
// Rendered proof at 390 and 1440, en + bn. Run from the repository root.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const out = "tools/quran-data-pull/output";
const s36 = JSON.parse(fs.readFileSync(`${out}/surahs/surah_036.json`, "utf8"));
const wordAt = (a, p) => s36.ayahs.find((x) => x.ayah === a).words.find((w) => w.position === p);
if (wordAt(6, 6).morphology?.lemma || wordAt(8, 9).morphology?.lemma) throw new Error("fixture assumption broke: 36:6:6 / 36:8:9 now carry a lemma");
const formIndex = JSON.parse(fs.readFileSync(`${out}/form-index.json`, "utf8"));
const GROUP = formIndex.values["form:فهم"].length; // 41
// A word WITH a dictionary word, in the same two ayat: 36:6:1 / 36:8:1 are not shared, so use the lemma index.
const lemmaIndex = JSON.parse(fs.readFileSync(`${out}/lemmas-index.json`, "utf8"));

const SEEDED_KNOWN = 5;
const SEED_TOTALS = `
DATA.quranWordTotals = [{
  _id: TENANT_ID + "__p1", contractVersion: "quran-word-total:v1",
  tenantId: TENANT_ID, personId: "p1", total: 77429, known: ${SEEDED_KNOWN},
  byJuz: { "1": { known: ${SEEDED_KNOWN}, total: 2580 } },
}];
`;
const toWestern = (s) => (s || "").replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09E6));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function openYaseen(page, ayah) {
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(200); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const e = document.getElementById("surahSelect"); e.value = "36"; e.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForFunction(() => !!document.querySelector('[data-word-occurrence*=":36:1:"]'), null, { timeout: 15000 });
  await goAyah(page, ayah);
}
async function goAyah(page, ayah) {
  await page.evaluate((a) => { const e = document.getElementById("ayahSelect"); e.value = String(a); e.dispatchEvent(new Event("change", { bubbles: true })); }, ayah);
  await page.waitForFunction((a) => !!document.querySelector(`[data-word-occurrence$=":36:${a}:1"]`), ayah, { timeout: 10000 });
  await page.waitForTimeout(400);
}
async function openWord(page, ayah, pos) {
  await page.evaluate(([a, p]) => document.querySelector(`[data-word-occurrence$=":36:${a}:${p}"]`)?.click(), [ayah, pos]);
  await page.waitForFunction(() => {
    const b = document.querySelector("#quranWordCardMount [data-word-progress]");
    return !!b && !/Loading|লোড হচ্ছে/.test(b.querySelector(".word-progress-state")?.textContent ?? "");
  }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
}
const press = async (page, state) => { await page.click(`#quranWordCardMount [data-word-progress-state="${state}"]`); await page.waitForTimeout(900); };
const card = (page) => page.evaluate(() => {
  const b = document.querySelector("#quranWordCardMount [data-word-progress]");
  if (!b) return null;
  return {
    pressed: [...b.querySelectorAll("[data-word-progress-state]")].find((el) => el.getAttribute("aria-pressed") === "true")?.dataset.wordProgressState ?? null,
    coverage: b.querySelector(".word-progress-coverage")?.textContent?.trim() ?? null,
    total: b.querySelector(".word-progress-whole-quran")?.textContent?.trim() ?? null,
    learnDelta: b.querySelector(".word-progress-learn-delta")?.textContent?.trim() ?? null,
    na: !!b.querySelector("[data-word-progress-na]"),
    buttons: b.querySelectorAll("[data-word-progress-state]").length,
  };
});
const numbers = (s) => (toWestern(s).match(/\d+/g) || []).map(Number);
const isKnownMark = (page, a, p) => page.evaluate(([a, p]) => [...document.querySelectorAll(`[data-word-occurrence$=":36:${a}:${p}"]`)].some((e) => e.classList.contains("is-known-word")), [a, p]);
const lemmaWrites = (page) => page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranLemmaProgress"));

for (const [width, height] of [[390, 844], [1440, 900]]) {
  for (const lang of ["en", "bn"]) {
    const tag = `[${lang} ${width}]`;
    console.log(`\n=== Yaseen 36:6:6 / 36:8:9 فَهُمْ, ${width}x${height}, appLang=${lang} ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height }, extraSeedJs: SEED_TOTALS });
    await ctx.addInitScript(() => { try { localStorage.setItem("mm_mark_words_mode", "known"); } catch {} });
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    await openYaseen(page, 6);

    await openWord(page, 6, 6);
    const before = await card(page);
    check(`${tag} 36:6:6 offers the four Word progress buttons (not Not applicable)`, before?.buttons === 4 && before?.na === false, JSON.stringify(before));
    check(`${tag} 36:6:6 starts not known`, !(await isKnownMark(page, 6, 6)));
    check(`${tag} the "if you learn this word" line counts the whole group (${GROUP})`, numbers(before?.learnDelta).includes(GROUP), before?.learnDelta);

    await press(page, "achieved");
    const lw = await lemmaWrites(page);
    check(`${tag} the press wrote the lemma lane under the stand-in key`, lw.at(-1)?.id?.endsWith("__wbw__form:فهم"), JSON.stringify(lw.at(-1)?.id));
    const after = await card(page);
    check(`${tag} the whole-Qur'an WbW total rose by the group size (${SEEDED_KNOWN} + ${GROUP})`, numbers(after?.total).includes(SEEDED_KNOWN + GROUP), after?.total);
    check(`${tag} 36:6:6 shows Achieved`, after?.pressed === "achieved", JSON.stringify(after));
    await page.waitForTimeout(400);
    check(`${tag} 36:6:6's own mark shows as known`, await isKnownMark(page, 6, 6));

    // The Owner's report: the OTHER place.
    await goAyah(page, 8);
    await openWord(page, 8, 9);
    const other = await card(page);
    check(`${tag} 36:8:9 (never touched) is known through the shared word: its ayah's coverage counts it`, numbers(other?.coverage)[0] >= 1, other?.coverage);
    check(`${tag} 36:8:9's mark shows as known without a reload`, await isKnownMark(page, 8, 9));
    check(`${tag} 36:8:9 has nothing left to learn (no learn-delta line)`, !other?.learnDelta, other?.learnDelta);
    check(`${tag} 36:8:9's total reads the same raised number`, numbers(other?.total).includes(SEEDED_KNOWN + GROUP), other?.total);

    // #322's rule: Not started on the place that WAS Achieved un-knows the group.
    // (Not started on a place never itself Achieved leaves the shared word alone.)
    await goAyah(page, 6);
    await openWord(page, 6, 6);
    await press(page, "not_started");
    const down = await lemmaWrites(page);
    check(`${tag} Not started on 36:6:6 wrote not_started to the same stand-in key`, down.at(-1)?.id?.endsWith("__wbw__form:فهم") && down.at(-1)?.data?.state === "not_started", JSON.stringify(down.at(-1)));
    check(`${tag} ...36:6:6's own mark is gone`, !(await isKnownMark(page, 6, 6)));
    // The stub never mutates its own DATA (CLAUDE.md), so the stored total is still the seed:
    // removing the group's ${GROUP} from it reads ${SEEDED_KNOWN} - ${GROUP}. The same artefact
    // shows for a word with a dictionary word; what matters is the size of the fall.
    check(`${tag} ...and the total fell by exactly the group size (${GROUP})`, numbers((await card(page))?.total).includes(SEEDED_KNOWN - GROUP) || toWestern((await card(page))?.total).includes(`-${GROUP - SEEDED_KNOWN}`), (await card(page))?.total);
    await goAyah(page, 8);
    check(`${tag} 36:8:9 is no longer known either`, !(await isKnownMark(page, 8, 9)));
    await goAyah(page, 6);

    // Basic / Depth stay Not applicable for a word with no dictionary word.
    await openWord(page, 6, 6);
    for (const level of ["basic", "depth"]) {
      const tab = await page.$(`#quranWordCardMount [data-word-card-level="${level}"]`);
      if (!tab) { check(`${tag} ${level} tab present`, false); continue; }
      await tab.click(); await page.waitForTimeout(700);
      const c = await card(page);
      check(`${tag} ${level}: 36:6:6 is still Not applicable (no buttons)`, c?.na === true && c?.buttons === 0, JSON.stringify(c));
    }
    const lemmaOnlyWrites = (await lemmaWrites(page)).filter((w) => /__(basic|depth)__/.test(w.id ?? ""));
    check(`${tag} nothing was written at Basic or Depth for it`, lemmaOnlyWrites.length === 0, JSON.stringify(lemmaOnlyWrites.map((w) => w.id)));

    check(`${tag} no page errors`, errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e)).length === 0, JSON.stringify(errors.slice(0, 3)));
    await ctx.close();
  }
}

// A word WITH a dictionary word behaves exactly as before: keyed by its lemma, never by a stand-in.
{
  console.log(`\n=== a word with a dictionary word is unchanged ===`);
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 }, extraSeedJs: SEED_TOTALS });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await openYaseen(page, 6);
  const lemma = wordAt(6, 1).morphology.lemma;
  const count = (lemmaIndex.values[lemma] ?? []).length;
  await openWord(page, 6, 1);
  await press(page, "achieved");
  const w = (await lemmaWrites(page)).at(-1);
  check("[lemma word] written under its own lemma, no stand-in", !!lemma && w?.id?.endsWith(`__wbw__${lemma}`) && !/form:/.test(w.id), JSON.stringify(w?.id));
  check("[lemma word] the total rose by the lemma's occurrence count", numbers((await card(page))?.total).includes(SEEDED_KNOWN + count), `${(await card(page))?.total} / ${count}`);
  check("[lemma word] no page errors", errors.filter((e) => !/CERT|archive\.org|api\.quran/.test(e)).length === 0, JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Word form mirror (6 Oct 2026): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

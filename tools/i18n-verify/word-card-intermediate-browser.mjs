// Decisions 101 and 103 (12 Oct 2026) -- the Word card's fourth level, Intermediate: "the different meanings of the
// same root and of the same word". Built to the demo the Owner approved ("Ma Shaa Allah! Build Inter tab"):
// https://claude.ai/artifact/K41de7VCbSUK12fnNA45sq. Expected values are hand-written from the packaged data
// (وَعَدَ: "promised" 67×, "you threaten us" 3× at 11:32:9 / 40:28:31 / 46:22:8; و ع د: 3 meanings, 10 words, 151×).
// Run from the repository root, with serve.js on :8080. Mutations (--mutate=NAME) must each FAIL:
//   notab      the Intermediate tab is not drawn             -> the tab checks fail
//   nospread   an Intermediate claim does not reach its root -> 14:22:9 stays unmarked
//   nosenses   the word's meanings are not grouped            -> the meanings-of-this-word checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  notab: ["app/js/quran-word-card.js", '${tabButton("intermediate", state.level === "intermediate", text.intermediate, text.intermediateFull)}', ""],
  nospread: ["app/quranrevival.html", "if (rootKey && lemmaProgressFor({ tenantId, personId, level: INTERMEDIATE_LEVEL, lemmaId: rootKey, confirmationRequired }).countsAsKnown) {", "if (false) {"],
  nosenses: ["app/js/quran-word-card.js", "${layers.lemma ? wordSensesSection(word, layers, context, text, formatNumber) : \"\"}", ""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function goTo(page, s, a) {
  await page.evaluate(([s, a]) => { const ss = document.getElementById("surahSelect"); if (ss.value !== String(s)) { ss.value = String(s); ss.dispatchEvent(new Event("change", { bubbles: true })); } setTimeout(() => { const as = document.getElementById("ayahSelect"); as.value = String(a); as.dispatchEvent(new Event("change", { bubbles: true })); }, 600); }, [s, a]);
  await page.waitForFunction(([s, a]) => !!document.querySelector(`[data-word-occurrence$=":${s}:${a}:1"]`), [s, a], { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
}
const waitMark = (page, s, a, p, want) => page.waitForFunction(([s, a, p, want]) => {
  const els = [...document.querySelectorAll(`[data-word-occurrence$=":${s}:${a}:${p}"]`)];
  return els.length > 0 && els.some((e) => e.classList.contains("is-known-word")) === want;
}, [s, a, p, want], { timeout: 6000 }).then(() => true).catch(() => false);
const panel = (page) => page.evaluate(() => {
  const card = document.querySelector("#quranWordCardMount .quran-word-card");
  const tabs = [...(card?.querySelectorAll('[role="tab"]') ?? [])];
  const senses = [...(card?.querySelectorAll("[data-word-card-sense]") ?? [])].map((li) => ({
    label: li.querySelector(".word-card-sense-top b")?.textContent.trim(), count: li.querySelector(".word-card-sense-count")?.textContent.trim(),
    current: li.classList.contains("word-card-sense-current"), refs: [...li.querySelectorAll("[data-word-occurrence-goto]")].map((b) => b.dataset.wordOccurrenceGoto) }));
  const groups = [...(card?.querySelectorAll("[data-word-card-meaning-group]") ?? [])].map((g) => ({
    current: g.classList.contains("word-card-meaning-group-current"), words: [...g.querySelectorAll("[data-word-form-toggle]")].map((b) => b.dataset.wordFormToggle) }));
  const tr = tabs.map((t) => t.getBoundingClientRect());
  return {
    tabs: tabs.map((t) => t.textContent.trim()), tabNames: tabs.map((t) => t.getAttribute("aria-label") || t.textContent.trim()),
    selected: card?.querySelector('[role="tab"][aria-selected="true"]')?.dataset.wordCardLevel ?? null,
    tabsOneRow: tr.length === 4 && new Set(tr.map((r) => Math.round(r.top))).size === 1, tabsTall: tr.every((r) => r.height >= 36),
    tabsWhole: tabs.every((t) => t.scrollWidth <= t.clientWidth + 1),
    panel: card?.querySelector("[data-word-card-panel]")?.dataset.wordCardPanel ?? null, senses, groups,
    rootNote: card?.querySelector("[data-word-card-root-meanings] .word-card-forms-summary")?.textContent.trim() ?? "",
    reach: card?.querySelector("[data-word-card-intermediate-reach]")?.textContent.trim() ?? "",
    youKnow: [...(card?.querySelectorAll("[data-whole-quran-level]") ?? [])].map((e) => e.dataset.wholeQuranLevel),
    over: document.documentElement.scrollWidth - innerWidth,
  };
});

for (const [lang, width] of [["en", 390], ["bn", 390], ["en", 1280]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== Word card Intermediate tab ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 900 : 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file.replace(/^app\//, "app/")}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  const fetched = [];
  page.on("request", (r) => { if (/lemma-senses\.json/.test(r.url())) fetched.push(r.url()); });
  await page.waitForTimeout(600);
  check(`${tag} the word-meanings file is NOT fetched at startup`, fetched.length === 0, JSON.stringify(fetched));
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await goTo(page, 14, 22);
  await page.evaluate(() => document.querySelector('[data-word-occurrence$=":14:22:8"]')?.click());
  await page.waitForFunction(() => document.querySelector("#quranWordCardMount .quran-word-card"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const p0 = await panel(page);
  const WANT_TABS = lang === "bn" ? ["শব্দে শব্দে", "প্রাথমিক", "মধ্যম", "গভীরতা"] : ["WbW", "Basic", "Intermediate", "Depth"];
  check(`${tag} four tabs, in order: ${WANT_TABS.join(" · ")}; one row, 36px+ tall, each label whole`, JSON.stringify(p0.tabs) === JSON.stringify(WANT_TABS) && p0.tabsOneRow && p0.tabsTall && p0.tabsWhole, JSON.stringify(p0));
  check(`${tag} each short tab keeps its full name as its spoken name (Basic Arabic, Intermediate Arabic, Arabic in Depth)`, lang === "bn" ? p0.tabNames[2] === "মধ্যম আরবি" : JSON.stringify(p0.tabNames.slice(1)) === JSON.stringify(["Basic Arabic", "Intermediate Arabic", "Arabic in Depth"]), JSON.stringify(p0.tabNames));

  await page.click('#quranWordCardMount [data-word-card-level="intermediate"]').catch(() => {});
  await page.waitForFunction(() => document.querySelectorAll("#quranWordCardMount [data-word-card-sense]").length > 0 && document.querySelectorAll("#quranWordCardMount [data-word-card-meaning-group]").length === 3, null, { timeout: 10000 }).catch(() => {});
  const p1 = await panel(page);
  check(`${tag} the Intermediate tab opens its own panel`, p1.selected === "intermediate" && p1.panel === "intermediate", JSON.stringify({ selected: p1.selected, panel: p1.panel }));
  check(`${tag} the word-meanings file is fetched on first use of the tab`, fetched.length === 1, JSON.stringify(fetched));
  const s0 = p1.senses[0], s1 = p1.senses[1];
  check(`${tag} meanings of this word: "promised" 67 times, marked as this word's meaning`, p1.senses.length === 2 && s0?.label === "promised" && /67|৬৭/.test(s0.count) && s0.current, JSON.stringify(p1.senses));
  check(`${tag} ...and "you threaten us" 3 times, at 11:32, 40:28 and 46:22`, s1?.label === "you threaten us" && /3|৩/.test(s1.count) && !s1.current && JSON.stringify(s1.refs) === '["11:32:9","40:28:31","46:22:8"]', JSON.stringify(s1));
  const g = p1.groups;
  check(`${tag} meanings of this root: 3 groups, this word's first (promise: 5 words), then 3 and 2`, g.length === 3 && g[0].current && g[0].words.length === 5 && g[0].words.includes("وَعَدَ") && g[0].words.includes("وَعْد") && !g[1].current && g[1].words.length === 3 && g[2].words.length === 2, JSON.stringify(g));
  check(`${tag} ...summarised as 3 meanings, 10 dictionary words, 151 times`, lang === "bn" ? /৩টি অর্থ · ১০টি অভিধান-শব্দ · ১৫১ বার/.test(p1.rootNote) : /^3 meanings · 10 dictionary words · 151 times/.test(p1.rootNote), p1.rootNote);
  check(`${tag} the side says Achieved here reaches all 151 words of the root, and a fourth "You know (Intermediate)" line is there`, /151|১৫১/.test(p1.reach) && JSON.stringify(p1.youKnow) === '["wbw","basic","intermediate","depth"]', JSON.stringify({ reach: p1.reach, youKnow: p1.youKnow }));
  check(`${tag} no sideways scroll`, p1.over <= 0, String(p1.over));

  if (lang === "en" && width === 390) {
    // The way-back law: a place opens its āyah, and "Back to Word Card" returns to this tab.
    await page.click('#quranWordCardMount [data-word-occurrence-goto="40:28:31"]');
    await page.waitForFunction(() => document.querySelector("[data-word-card-origin-back]"), null, { timeout: 10000 }).catch(() => {});
    const there = await page.evaluate(() => ({ surah: document.getElementById("surahSelect").value, ayah: document.getElementById("ayahSelect").value, back: !!document.querySelector("[data-word-card-origin-back]") }));
    check(`${tag} tapping 40:28 opens Ghafir 40:28 with "Back to Word Card"`, there.surah === "40" && there.ayah === "28" && there.back, JSON.stringify(there));
    await page.click("[data-word-card-origin-back]");
    await page.waitForFunction(() => document.querySelector('#quranWordCardMount [role="tab"][aria-selected="true"]')?.dataset.wordCardLevel === "intermediate", null, { timeout: 10000 }).catch(() => {});
    const back = await panel(page);
    check(`${tag} Back returns to the Word card on its Intermediate tab`, back.selected === "intermediate" && back.panel === "intermediate", JSON.stringify({ selected: back.selected, panel: back.panel }));
  }

  // Achieved at Intermediate reaches every word of the root: وَعْدَ (14:22:9, a different dictionary word) is marked.
  await page.click('#quranWordCardMount [data-word-progress-state="achieved"]');
  await page.waitForTimeout(1200);
  const writes = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranLemmaProgress").map((w) => w.id));
  check(`${tag} Achieved writes ONE Intermediate claim, keyed by the root و ع د`, writes.some((id) => /__intermediate__وعد$/.test(id)) && !writes.some((id) => /__(wbw|basic|depth)__/.test(id)), JSON.stringify(writes));
  await page.evaluate(() => document.querySelector("[data-word-card-close]")?.click());
  await goTo(page, 14, 22);
  check(`${tag} ...and the Read view marks وَعْدَ at 14:22:9 known (same root, a different dictionary word)`, await waitMark(page, 14, 22, 9, true));
  check(`${tag} ...and وَوَعَدتُّكُمْ at 14:22:11`, await waitMark(page, 14, 22, 11, true));
  check(`${tag} ...but not ٱلْحَقِّ at 14:22:10 (another root)`, await waitMark(page, 14, 22, 10, false));
  const bad = errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
  check(`${tag} no page errors`, bad.length === 0, bad.slice(0, 2).join(" | "));
  if (width === 390) await page.screenshot({ path: `/tmp/word-card-intermediate-${lang}-${width}.png` }).catch(() => {});
  await ctx.close();
}
await browser.close();
console.log(`\n==== Word card Intermediate tab (decision 103)${MUTATE ? ` [MUTATE=${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

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
  // Re-anchored 19 Oct 2026 (five-levels change, J38/J39): the same anchors as word-card-five-levels-browser's.
  // `nospread` (an Intermediate claim reaching its root's words) is RETIRED with the old behaviour; its inverse is
  // `rootknown`, which restores that spread and must make the "does NOT mark وَعْدَ known" checks FAIL.
  notab: ["app/js/quran-word-card.js", 'return WORD_CARD_LEVELS.map((id) => {', 'return WORD_CARD_LEVELS.filter((x) => x !== "intermediate").map((id) => {'],
  rootknown: ["app/quranrevival.html", "// PCF J38 (19 Oct 2026): a Root (intermediate), Taṣrīf or Depth mark is a study mark on a ROOT and never makes", 'const rk = claimKeyFor(ROOT_LEVEL, { root }); if (rk && lemmaProgressFor({ tenantId, personId, level: INTERMEDIATE_LEVEL, lemmaId: rk, confirmationRequired }).countsAsKnown) return { ...own, countsAsKnown: true, knownViaLevel: { level: INTERMEDIATE_LEVEL, key: rk } };\n      if (rk && lemmaProgressFor({ tenantId, personId, level: ROOT_LEVEL, lemmaId: rk, confirmationRequired }).countsAsKnown) return { ...own, countsAsKnown: true, knownViaLevel: { level: ROOT_LEVEL, key: rk } };\n      // PCF J38 (19 Oct 2026): a Root (intermediate), Taṣrīf or Depth mark is a study mark on a ROOT and never makes'],
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
    current: li.classList.contains("word-card-sense-current"), refs: [...li.querySelectorAll(".word-card-sense-ref")].map((b) => b.dataset.wordOccurrenceGoto) }));
  const groups = [...(card?.querySelectorAll("[data-word-card-meaning-group]") ?? [])].map((g) => ({
    current: g.classList.contains("word-card-meaning-group-current"), words: [...g.querySelectorAll("[data-word-form-toggle]")].map((b) => b.dataset.wordFormToggle) }));
  const tr = tabs.map((t) => t.getBoundingClientRect());
  return {
    tabs: tabs.map((t) => t.querySelector(".word-card-tab-name")?.textContent.trim()), tabNames: tabs.map((t) => t.getAttribute("aria-label") || t.textContent.trim()),
    selected: card?.querySelector('[role="tab"][aria-selected="true"]')?.dataset.wordCardLevel ?? null,
    tabsOneRow: tr.length === 5 && new Set(tr.map((r) => Math.round(r.top))).size === 1, tabsTall: tr.every((r) => r.height >= 36),
    tabsWhole: tabs.every((t) => t.scrollWidth <= t.clientWidth + 1),
    panel: card?.querySelector("[data-word-card-panel]")?.dataset.wordCardPanel ?? null, senses, groups,
    // Updated in place 19 Oct 2026 (five-levels change, J38/J39): the root's meaning groups and their summary are
    // Family's [data-word-card-dcards] ("10 forms · 151 times in all"); the reach line is [data-word-card-reach].
    rootNote: card?.querySelector("[data-word-card-dcards] .word-card-forms-summary")?.textContent.trim() ?? "",
    reach: card?.querySelector("[data-word-card-reach]")?.textContent.trim() ?? "",
    youKnow: [...(card?.querySelectorAll("[data-whole-quran-level]") ?? [])].map((e) => e.dataset.wholeQuranLevel),
    wholeText: Object.fromEntries([...(card?.querySelectorAll("[data-whole-quran-level]") ?? [])].map((e) => [e.dataset.wholeQuranLevel, e.textContent.replace(/\s+/g, " ").trim()])),
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
  // Updated in place 19 Oct 2026 (five-levels change, J38/J39): the card has FIVE tabs, WbW · Root · Family · Taṣrīf · Depth.
  // Root keeps the stored id "intermediate"; Family is "basic" (the old Basic + Intermediate), so the "meanings of this
  // word / of this root" checks below FOLLOW THEIR SECTIONS to the Family tab, and the Achieved/reach checks to Root.
  const WANT_TABS = lang === "bn" ? ["শব্দে শব্দে", "মূল", "পরিবার", "তাসরীফ", "গভীরতা"] : ["WbW", "Root", "Family", "Taṣrīf", "Depth"];
  check(`${tag} five tabs, in order: ${WANT_TABS.join(" · ")}; one row, 36px+ tall, each label whole`, JSON.stringify(p0.tabs) === JSON.stringify(WANT_TABS) && p0.tabsOneRow && p0.tabsTall && p0.tabsWhole, JSON.stringify(p0));
  check(`${tag} each tab has a spoken name (Root, Family, Taṣrīf, Arabic in Depth)`, lang === "bn" ? p0.tabNames.length === 5 && p0.tabNames.every((n) => n) : JSON.stringify(p0.tabNames.slice(1)) === JSON.stringify(["Root", "Family", "Taṣrīf", "Arabic in Depth"]), JSON.stringify(p0.tabNames));

  await page.click('#quranWordCardMount [data-word-card-level="basic"]').catch(() => {});
  await page.waitForFunction(() => document.querySelectorAll("#quranWordCardMount [data-word-card-sense]").length > 0 && document.querySelectorAll("#quranWordCardMount [data-word-card-meaning-group]").length === 3, null, { timeout: 10000 }).catch(() => {});
  const p1 = await panel(page);
  check(`${tag} the Family tab opens its own panel (the meanings live here now)`, p1.selected === "basic" && p1.panel === "basic", JSON.stringify({ selected: p1.selected, panel: p1.panel }));
  check(`${tag} the word-meanings file is fetched on first use of the tab`, fetched.length === 1, JSON.stringify(fetched));
  const s0 = p1.senses[0], s1 = p1.senses[1];
  check(`${tag} meanings of this word: "promised" 67 times, marked as this word's meaning`, p1.senses.length === 2 && s0?.label === "promised" && /67|৬৭/.test(s0.count) && s0.current, JSON.stringify(p1.senses));
  check(`${tag} ...and "you threaten us" 3 times, at 11:32, 40:28 and 46:22`, s1?.label === "you threaten us" && /3|৩/.test(s1.count) && !s1.current && JSON.stringify(s1.refs) === '["11:32:9","40:28:31","46:22:8"]', JSON.stringify(s1));
  const g = p1.groups;
  check(`${tag} meanings of this root: 3 groups, this word's first (promise: 5 words), then 3 and 2`, g.length === 3 && g[0].current && g[0].words.length === 5 && g[0].words.includes("وَعَدَ") && g[0].words.includes("وَعْد") && !g[1].current && g[1].words.length === 3 && g[2].words.length === 2, JSON.stringify(g));
  // Updated in place 19 Oct 2026 (five-levels change, J38/J39): Family's summary reads "10 forms · 151 times in all"
  // (it no longer prints the "3 meanings" count; the three groups are asserted by the previous check).
  check(`${tag} ...summarised as 10 forms, 151 times in all`, lang === "bn" ? /১০/.test(p1.rootNote) && /১৫১/.test(p1.rootNote) : /^10 forms · 151 times in all/.test(p1.rootNote), p1.rootNote);
  // Updated in place 19 Oct 2026 (five-levels change, J38/J39): the totals box lists five lines in tab order, and the
  // root levels (Root, Taṣrīf, Depth) read "studied N of 1,642 roots" -- there is no "known through the root" line.
  check(`${tag} the totals box has five lines (wbw, root, family, taṣrīf, depth) and the Root line counts roots studied`,
    JSON.stringify(p1.youKnow) === '["wbw","intermediate","basic","tasrif","depth"]' && (lang === "bn" || /^Root: studied 0 of 1,642 roots/.test(p1.wholeText.intermediate ?? "")) && !/through the root/.test(JSON.stringify(p1.wholeText)), JSON.stringify(p1.wholeText));
  check(`${tag} no sideways scroll`, p1.over <= 0, String(p1.over));

  if (lang === "en" && width === 390) {
    // The way-back law: a place opens its āyah, and "Back to Word Card" returns to this tab.
    await page.click('#quranWordCardMount .word-card-sense-ref[data-word-occurrence-goto="40:28:31"]');
    await page.waitForFunction(() => document.querySelector("[data-word-card-origin-back]"), null, { timeout: 10000 }).catch(() => {});
    const there = await page.evaluate(() => ({ surah: document.getElementById("surahSelect").value, ayah: document.getElementById("ayahSelect").value, back: !!document.querySelector("[data-word-card-origin-back]") }));
    check(`${tag} tapping 40:28 opens Ghafir 40:28 with "Back to Word Card"`, there.surah === "40" && there.ayah === "28" && there.back, JSON.stringify(there));
    await page.click("[data-word-card-origin-back]");
    await page.waitForFunction(() => document.querySelector('#quranWordCardMount [role="tab"][aria-selected="true"]')?.dataset.wordCardLevel === "intermediate", null, { timeout: 10000 }).catch(() => {});
    const back = await panel(page);
    // Updated in place 19 Oct 2026 (five-levels change, J38/J39): the place list is on Family now, so Back returns there.
    check(`${tag} Back returns to the Word card on its Family tab`, back.selected === "basic" && back.panel === "basic", JSON.stringify({ selected: back.selected, panel: back.panel }));
  }

  // Updated in place 19 Oct 2026 (five-levels change, J38/J39): the Root tab (stored id "intermediate") is a study mark
  // on the ROOT. Its side says so, and Achieved there adds Roots studied and never makes a word known.
  await page.click('#quranWordCardMount [data-word-card-level="intermediate"]').catch(() => {});
  await page.waitForFunction(() => document.querySelector('#quranWordCardMount [data-word-card-panel="intermediate"]'), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
  const pr = await panel(page);
  check(`${tag} the Root tab's side says Achieved adds Roots studied and does not add to Words known`, /Roots studied \+1|পড়া মূল/.test(pr.reach) && pr.panel === "intermediate", pr.reach);

  // Achieved at Intermediate reaches every word of the root: وَعْدَ (14:22:9, a different dictionary word) is marked.
  await page.click('#quranWordCardMount [data-word-progress-state="achieved"]');
  await page.waitForTimeout(1200);
  const writes = await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranLemmaProgress").map((w) => w.id));
  check(`${tag} Achieved writes ONE Intermediate claim, keyed by the root و ع د`, writes.some((id) => /__intermediate__وعد$/.test(id)) && !writes.some((id) => /__(wbw|basic|depth)__/.test(id)), JSON.stringify(writes));
  await page.evaluate(() => document.querySelector("[data-word-card-close]")?.click());
  await goTo(page, 14, 22);
  // Updated in place 19 Oct 2026 (five-levels change, J38/J39): a Root mark is a study mark on the root and NEVER makes a
  // word known, so the Read view marks none of the root's other words (the old spread is retired). The claim written
  // above is the positive control that the press really happened.
  check(`${tag} ...and the Read view does NOT mark وَعْدَ at 14:22:9 known (a Root mark never makes a word known)`, await waitMark(page, 14, 22, 9, false));
  check(`${tag} ...nor وَوَعَدتُّكُمْ at 14:22:11`, await waitMark(page, 14, 22, 11, false));
  check(`${tag} ...but not ٱلْحَقِّ at 14:22:10 (another root)`, await waitMark(page, 14, 22, 10, false));
  const bad = errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
  check(`${tag} no page errors`, bad.length === 0, bad.slice(0, 2).join(" | "));
  if (width === 390) await page.screenshot({ path: `/tmp/word-card-intermediate-${lang}-${width}.png` }).catch(() => {});
  await ctx.close();
}
await browser.close();
console.log(`\n==== Word card Intermediate tab (decision 103)${MUTATE ? ` [MUTATE=${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

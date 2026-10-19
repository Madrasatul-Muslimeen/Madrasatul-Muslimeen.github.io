// PCF MSA J38 + J39 (19 Oct 2026) -- the Word card's FIVE tabs, part 1 (tabs and content):
// docs/reference/2026-10-19-word-card-five-levels-build-spec.md sections 1, 2, 4 and 6.
// Example word: وَعَدَكُمْ, Ibrāhīm 14:22 word 8, root و ع د. Run from the repository root with serve.js on :8080.
// PART 2 (issue #966) adds counting (spec section 3), Family's per-group marks and the OPEN Taṣrīf gate.
// UPDATED IN PLACE (19 Oct 2026, part 2): the Owner published the Rules and the Architect opened the Taṣrīf gate, so
// the part-1 checks "the block is CLOSED by the gate" and "writes nothing while gated" now describe the CLOSED case,
// which is kept as the mutation `gateclosed` (run it: it must PASS the closed assertions and write nothing). In the
// default (open) run the same slots assert the block writes level `tasrif` keyed by the root.
// Mutations (--mutate=NAME) must each FAIL:
//   notasrif    the Taṣrīf tab is not drawn                           -> order/fit/Taṣrīf checks fail
//   sub600      the small line shows below 600px                     -> the hidden-below-600 check fails
//   rootindepth Depth gets its Root & Word Family section back        -> the Depth-sections check fails
//   nogrows     the Root tab loses "How the root grows"               -> the Root-sections check fails
//   nowhowhen   the Taṣrīf "who and when" line is not drawn           -> the 4A check fails
//   nodoes      the purple "what it does" lines are not drawn         -> the 3A check fails
//   nocando     the can-do box is not drawn                           -> the purple-parts check fails
//   lowcontrast the light-look purple ink is washed out               -> the contrast check fails
//   gateclosed  the Taṣrīf readiness gate is CLOSED -> runs the closed-case assertions (block closed, nothing written); the open-case ones are skipped
//   tasnowrite  the Taṣrīf press writes nothing even though the gate is open -> "Taṣrīf writes level tasrif" fails
//   rootknown   a Root mark makes the word known again (the old branch)   -> "never marks a word known" fails
//   rootcounts  Root/Taṣrīf/Depth move a word total again                 -> "never writes a word total" fails
//   grouplemma  a Family group control marks the CURRENT word's group     -> "writes only that group's key" fails
//   noroots     the totals box prints word sentences for root levels      -> "studied N of 1,642 roots" fails
//   noorder     the order note is not drawn                           -> the order-note check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  notasrif: ["app/js/quran-word-card.js", 'return WORD_CARD_LEVELS.map((id) => {', 'return WORD_CARD_LEVELS.filter((x) => x !== "tasrif").map((id) => {'],
  sub600: ["app/quranrevival.html", ".word-card-tab-sub { display: none;", ".word-card-tab-sub { display: block;"],
  rootindepth: ["app/js/word-card-depth.js", 'const DEPTH_SECTIONS = ["sarf",', 'const DEPTH_SECTIONS = ["root", "sarf",'],
  nogrows: ["app/js/quran-word-card.js", "${rootGrowsSection(layers, context, text, formatNumber)}", ""],
  nowhowhen: ["app/js/word-card-depth.js", 'if (!features?.tense) return "";\n  const { lang } = ctx;', 'return "";\n  const { lang } = ctx;'],
  nodoes: ["app/js/quran-word-card.js", "(does && !sameWords ?", "(false ?"],
  nocando: ["app/js/quran-word-card.js", 'return `<p class="word-card-cando"', 'return "" && `<p class="word-card-cando"'],
  lowcontrast: ["app/quranrevival.html", '[data-card-look="light"] .quran-word-card { --wc-purple-bg: #f1e9fb; --wc-purple-ink: #4b2a85;', '[data-card-look="light"] .quran-word-card { --wc-purple-bg: #f1e9fb; --wc-purple-ink: #c9b8ee;'],
  gateclosed: ["app/js/study-tasrif-level-readiness.js", "ready: true,\n  decision: Object.freeze({", "ready: false,\n  decision: Object.freeze({"],
  tasnowrite: ["app/quranrevival.html", 'if (level === "tasrif" && !isTasrifLevelPersistenceReady()) return; // gated: nothing is ever written', 'if (level === "tasrif") return; // gated: nothing is ever written'],
  rootknown: ["app/quranrevival.html", "// PCF J38 (19 Oct 2026): a Root (intermediate), Taṣrīf or Depth mark is a study mark on a ROOT and never makes", 'const rk = claimKeyFor(ROOT_LEVEL, { root }); if (rk && lemmaProgressFor({ tenantId, personId, level: INTERMEDIATE_LEVEL, lemmaId: rk, confirmationRequired }).countsAsKnown) return { ...own, countsAsKnown: true, knownViaLevel: { level: INTERMEDIATE_LEVEL, key: rk } };\n      if (rk && lemmaProgressFor({ tenantId, personId, level: ROOT_LEVEL, lemmaId: rk, confirmationRequired }).countsAsKnown) return { ...own, countsAsKnown: true, knownViaLevel: { level: ROOT_LEVEL, key: rk } };\n      // PCF J38 (19 Oct 2026): a Root (intermediate), Taṣrīf or Depth mark is a study mark on a ROOT and never makes'],
  rootcounts: ["app/quranrevival.html", 'function levelCountsWords(level) { return level === "wbw" || level === "basic"; }', 'function levelCountsWords(level) { return true; }'],
  grouplemma: ["app/js/quran-word-card.js", "familyGroupMarkHtml(context.familyGroups, head.lemma,", "familyGroupMarkHtml(context.familyGroups, layers.lemma,"],
  noroots: ["app/js/quran-word-card.js", 'if (unit === "roots") {', 'if (false) {'],
  noorder: ["app/js/quran-word-card.js", "return note ? `<p class=\"word-card-ordernote\"", "return false ? `<p class=\"word-card-ordernote\""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

const EN_TABS = ["WbW", "Root", "Family", "Taṣrīf", "Depth"];
const BN_TABS = ["শব্দে শব্দে", "মূল", "পরিবার", "তাসরীফ", "গভীরতা"];
const EN_SUB = ["the word here", "where it comes from", "its words", "how it changes", "in this āyah"];
const BN_SUB = ["এখানে শব্দটি", "কোথা থেকে এসেছে", "এর শব্দগুলো", "কীভাবে বদলায়", "এই আয়াতে"];
const CLOSED = MUTATE === "gateclosed";
const wlog = (page, n = 0) => page.evaluate((n) => (window.__stubWriteData || []).slice(n).map((w) => `${w.col}:${w.id}`), n);
const wcount = (page) => page.evaluate(() => (window.__stubWriteData || []).length);
const press = (page, sel, i = 0) => page.evaluate(([sel, i]) => document.querySelectorAll("#quranWordCardMount " + sel)[i]?.click(), [sel, i]);
const wholeLines = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll("#quranWordCardMount [data-whole-quran-level]")].map((e) => [e.dataset.wholeQuranLevel, e.textContent.trim().replace(/\s+/g, " ")])));
const LEVELS = ["wbw", "intermediate", "basic", "tasrif", "depth"];

async function goTo(page, s, a) {
  await page.evaluate(([s, a]) => { const ss = document.getElementById("surahSelect"); if (ss.value !== String(s)) { ss.value = String(s); ss.dispatchEvent(new Event("change", { bubbles: true })); } setTimeout(() => { const as = document.getElementById("ayahSelect"); as.value = String(a); as.dispatchEvent(new Event("change", { bubbles: true })); }, 600); }, [s, a]);
  await page.waitForFunction(([s, a]) => !!document.querySelector(`[data-word-occurrence$=":${s}:${a}:1"]`), [s, a], { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
}
const openTab = async (page, level) => {
  await page.click(`#quranWordCardMount [data-word-card-level="${level}"]`).catch(() => {});
  await page.waitForFunction((l) => document.querySelector(`#quranWordCardMount [data-word-card-panel="${l}"]`), level, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(700);
};
const tabRow = (page) => page.evaluate(() => {
  const card = document.querySelector("#quranWordCardMount .quran-word-card");
  const list = card.querySelector('[role="tablist"]');
  const lr = list.getBoundingClientRect();
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const rects = tabs.map((t) => t.getBoundingClientRect());
  return {
    names: tabs.map((t) => t.querySelector(".word-card-tab-name")?.textContent.trim()),
    subs: tabs.map((t) => t.querySelector(".word-card-tab-sub")?.textContent.trim()),
    levels: tabs.map((t) => t.dataset.wordCardLevel),
    oneRow: new Set(rects.map((r) => Math.round(r.top))).size === 1,
    inside: rects.every((r) => r.left >= lr.left - 1 && r.right <= lr.right + 1),
    whole: tabs.every((t) => t.scrollWidth <= t.clientWidth + 1),
    tall: rects.every((r) => r.height >= 36),
    // a single-word name must stay on ONE line (never broken mid-word)
    lines: tabs.map((t) => { const n = t.querySelector(".word-card-tab-name"); return Math.round(n.getBoundingClientRect().height / parseFloat(getComputedStyle(n).lineHeight || "16") * 10) / 10; }),
    subShown: tabs.map((t) => { const s = t.querySelector(".word-card-tab-sub"); return !!s && getComputedStyle(s).display !== "none" && s.getBoundingClientRect().height > 0; }),
    over: document.documentElement.scrollWidth - innerWidth,
    spoken: tabs.map((t) => t.getAttribute("aria-label")),
  };
});
const panelInfo = (page) => page.evaluate(() => {
  const card = document.querySelector("#quranWordCardMount .quran-word-card");
  const q = (s) => card?.querySelector(s);
  const qa = (s) => [...(card?.querySelectorAll(s) ?? [])];
  return {
    panel: q("[data-word-card-panel]")?.dataset.wordCardPanel ?? null,
    cando: q("[data-word-card-cando]")?.textContent.trim() ?? null,
    order: q("[data-word-card-ordernote]")?.textContent.trim() ?? null,
    secs: qa("details[data-word-card-sec]").map((d) => d.dataset.wordCardSec),
    openSecs: qa("details[data-word-card-sec][open]").map((d) => d.dataset.wordCardSec),
    rootFamily: !!q("[data-word-card-root-family] [data-word-card-fam]"),
    rootMeaning: q("[data-word-card-root-meaning]")?.textContent.trim() ?? null,
    ayahRoot: qa("[data-word-card-ayahroot] .word-card-ar-chip").length,
    grows: q("[data-word-card-root-grows] h4")?.textContent.trim() ?? null,
    growChips: qa("[data-word-card-grow-chip]").map((c) => c.textContent.trim()),
    senses: qa("[data-word-card-sense]").length,
    sensesHead: q("[data-word-card-senses] h4")?.textContent.trim() ?? null,
    groups: qa("[data-word-card-meaning-group]").map((g) => ({ current: g.classList.contains("word-card-meaning-group-current"), cards: g.querySelectorAll(".word-card-dcard").length })),
    does: qa("[data-word-card-does]").map((d) => ({ kind: d.dataset.wordCardDoes, text: d.textContent.trim() })),
    counts: !!q(".word-card-lemma-toggle"),
    whowhen: q("[data-word-card-whowhen]")?.textContent.replace(/\s+/g, " ").trim() ?? null,
    tasrifNa: !!q("[data-word-card-tasrif-na]"),
    conj: !!q('details[data-word-card-sec="conj"]'),
    gated: q("[data-word-progress-gated]")?.textContent.trim() ?? null,
    na: q("[data-word-progress-na]")?.textContent.trim() ?? null,
    stateButtons: qa("[data-word-progress-state]").length,
    reach: q("[data-word-card-reach]")?.textContent.trim() ?? null,
    over: document.documentElement.scrollWidth - innerWidth,
  };
});
// WCAG contrast of an element's text colour against its own (opaque) background, under a given card look.
const contrast = (page, look, selector) => page.evaluate(([look, selector]) => {
  document.documentElement.setAttribute("data-card-look", look);
  const el = document.querySelector(selector);
  if (!el) return null;
  const cs = getComputedStyle(el);
  const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const fg = rgb(cs.color), bg = rgb(cs.backgroundColor);
  if (bg.length === 4 && bg[3] < 1) return { ratio: 0, note: "translucent background" };
  const [a, b] = [lum(fg), lum(bg)];
  return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
}, [look, selector]);

for (const [lang, width] of [["en", 320], ["en", 390], ["en", 768], ["en", 1280], ["bn", 320], ["bn", 390], ["bn", 768], ["bn", 1280]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== Word card five levels ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 900 : 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const writes = [];
  await page.waitForTimeout(600);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await goTo(page, 14, 22);
  await page.evaluate(() => document.querySelector('[data-word-occurrence$=":14:22:8"]')?.click());
  await page.waitForFunction(() => document.querySelector("#quranWordCardMount .quran-word-card"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);

  // 1. five tabs, in order, fitting; the small line only from 600px
  const row = await tabRow(page);
  const wantNames = lang === "bn" ? BN_TABS : EN_TABS;
  check(`${tag} five tabs in order WbW · Root · Family · Taṣrīf · Depth, with the stored ids unchanged`, JSON.stringify(row.names) === JSON.stringify(wantNames) && JSON.stringify(row.levels) === JSON.stringify(LEVELS), JSON.stringify(row));
  check(`${tag} the tab row fits: one row, inside the card, every label whole, 36px+ tall, no sideways scroll`, row.oneRow && row.inside && row.whole && row.tall && row.over <= 0, JSON.stringify(row));
  check(`${tag} single-word names are never broken across lines`, row.lines.every((n, i) => (lang === "bn" && i === 0) || n <= 1.3), JSON.stringify(row.lines));
  check(`${tag} the small line under each tab is ${width >= 600 ? "shown" : "hidden"} (${width >= 600 ? "from" : "below"} 600px) and is the spec's text`,
    row.subShown.every((s) => s === (width >= 600)) && JSON.stringify(row.subs) === JSON.stringify(lang === "bn" ? BN_SUB : EN_SUB), JSON.stringify({ shown: row.subShown, subs: row.subs }));
  check(`${tag} a tab's spoken name is its whole name, not name + small line`, row.spoken.every((s, i) => s && !s.includes(row.subs[i])), JSON.stringify(row.spoken));
  if (width !== 390) { await ctx.close(); continue; }

  // 2. each tab's sections
  const wbw = await panelInfo(page);
  check(`${tag} WbW: can-do box and no order note`, wbw.panel === "wbw" && /^(Achieved here means: I know what this word means here|এখানে অর্জিত মানে)/.test(wbw.cando ?? "") && wbw.order === null, JSON.stringify(wbw));

  await openTab(page, "intermediate");
  const root = await panelInfo(page);
  check(`${tag} Root: order note, can-do, the root family section (moved from Depth) with the root's meaning and its words in this āyah`,
    root.panel === "intermediate" && !!root.order && !!root.cando && root.rootFamily && root.ayahRoot >= 2 && !!root.rootMeaning, JSON.stringify(root));
  check(`${tag} Root: "How the root grows: its 3 meanings" with one chip per meaning group (meaning · count)`,
    /3|৩/.test(root.grows ?? "") && root.growChips.length === 3 && root.growChips.every((c) => /\d|[০-৯]/.test(c)), JSON.stringify({ grows: root.grows, chips: root.growChips }));
  check(`${tag} Root: no senses list and no word cards (those are Family's)`, root.senses === 0 && root.groups.length === 0, JSON.stringify(root.groups));
  check(`${tag} Root: reach line says it adds Roots studied and not Words known`, /Roots studied \+1|পড়া মূল/.test(root.reach ?? ""), root.reach ?? "");
  check(`${tag} Root: the order note reads "after WbW" and there is no lock`, /WbW|শব্দে শব্দে/.test(root.order ?? ""), root.order ?? "");

  await openTab(page, "basic");
  await page.waitForFunction(() => document.querySelectorAll('#quranWordCardMount [data-word-card-meaning-group]').length === 3, null, { timeout: 10000 }).catch(() => {});
  const fam = await panelInfo(page);
  check(`${tag} Family: order note, can-do, "Meanings of … itself" senses, three meaning-group cards (this word's first, in gold), counts below`,
    fam.panel === "basic" && !!fam.order && !!fam.cando && fam.senses === 2 && fam.groups.length === 3 && fam.groups[0].current && !fam.groups[1].current && fam.groups[0].cards === 5 && fam.counts, JSON.stringify(fam));
  check(`${tag} Family: the senses heading names the word itself`, /itself|নিজের/.test(fam.sensesHead ?? ""), fam.sensesHead ?? "");
  check(`${tag} Family 3A: purple "what it does" lines on the shape groups (verb, masdar) and never twice the group label`,
    fam.does.some((d) => d.kind === "verb" && /action itself|কাজটি নিজেই/.test(d.text)) && fam.does.some((d) => d.kind === "masdar" && /doing of it|কাজটি করা/.test(d.text)) && fam.does.every((d) => ["verb", "masdar", "doer", "done"].includes(d.kind)), JSON.stringify(fam.does));
  check(`${tag} Family: the progress block still carries the state buttons (one block, the current word's group)`, fam.stateButtons === 4, String(fam.stateButtons));

  await openTab(page, "tasrif");
  await page.waitForFunction(() => document.querySelector('#quranWordCardMount details[data-word-card-sec="conj"] .word-card-cj'), null, { timeout: 10000 }).catch(() => {});
  const tas = await panelInfo(page);
  check(`${tag} Taṣrīf: order note, can-do, Verb Conjugation (moved from Depth), open by default`, tas.panel === "tasrif" && !!tas.order && !!tas.cando && tas.conj && tas.openSecs.includes("conj"), JSON.stringify(tas));
  check(`${tag} Taṣrīf 4A: "Who: he · When: past (it is done) · To whom: you all (men) (كُمْ)"`,
    lang === "bn" ? /কে: সে · কখন: অতীত \(কাজটি হয়ে গেছে\) · কাকে: তোমরা \(পুরুষ\)/.test(tas.whowhen ?? "") : /^Who: he · When: past \(it is done\) · To whom: you all \(men\) \(كُمْ\)$/.test(tas.whowhen ?? ""), tas.whowhen ?? "");
  const wantGated = lang === "bn" ? /সেটিংস ধাপ/.test(tas.gated ?? "") : tas.gated === "Saving Taṣrīf marks waits for one settings step by the Owner.";
  check(`${tag} Taṣrīf: reach line is "a study mark on the root, does not add to Words known"`, /study mark|পাঠের চিহ্ন/.test(tas.reach ?? ""), tas.reach ?? "");
  if (CLOSED) {
    // The CLOSED case (part 1's checks, kept): the Owner's words, no state buttons, and nothing written.
    check(`${tag} Taṣrīf (gate closed): the progress block is CLOSED (the Owner's words, no state buttons)`, tas.stateButtons === 0 && wantGated, JSON.stringify({ gated: tas.gated, n: tas.stateButtons }));
    const before = await wcount(page);
    await page.evaluate(() => document.querySelectorAll('#quranWordCardMount .word-card-side button').forEach((b) => b.click()));
    await page.waitForTimeout(800);
    const log = await wlog(page, before);
    const all = await wlog(page);
    check(`${tag} Taṣrīf (gate closed) writes nothing (no level 'tasrif' document anywhere, no write from pressing the block)`, !all.some((x) => /tasrif/.test(x)) && log.length === 0, JSON.stringify({ log, all }));
  } else {
    check(`${tag} Taṣrīf (gate open): the progress block is OPEN -- four state buttons, no waiting message`, tas.stateButtons === 4 && tas.gated === null, JSON.stringify({ gated: tas.gated, n: tas.stateButtons }));
    const before = await wcount(page);
    await press(page, '.word-card-side [data-word-progress-state="achieved"]');
    await page.waitForTimeout(2500);
    const log = await wlog(page, before);
    check(`${tag} Taṣrīf writes level 'tasrif' keyed by the ROOT (occurrence mark + one root-keyed claim)`,
      log.some((x) => /^quranLemmaProgress:t1__p1__tasrif__وعد$/.test(x)) && log.some((x) => /^quranWordProgress:t1__p1__tasrif__/.test(x)), JSON.stringify(log));
    check(`${tag} a Taṣrīf mark never writes a word total or a word counter`, !log.some((x) => /^quranWordTotals:|^quranLemmaOccurrenceCounters:/.test(x)), JSON.stringify(log));
    const lines = await wholeLines(page);
    check(`${tag} totals box: "Taṣrīf: studied 1 of 1,642 roots"`, lang === "bn" ? /১,৬৪২টি মূলের মধ্যে ১টি/.test(lines.tasrif ?? "") : lines.tasrif === "Taṣrīf: studied 1 of 1,642 roots", JSON.stringify(lines));
  }

  await openTab(page, "depth");
  const dep = await panelInfo(page);
  check(`${tag} Depth: order note, can-do, and exactly Morphology, Grammar, Word Choice, Classical Usage, dictionary & forms; Morphology open`,
    dep.panel === "depth" && !!dep.order && !!dep.cando && JSON.stringify(dep.secs) === '["sarf","nahw","choice","classical","dict"]' && JSON.stringify(dep.openSecs) === '["sarf"]', JSON.stringify(dep));
  check(`${tag} Depth: no Root & Word Family section and no Verb Conjugation`, !dep.secs.includes("root") && !dep.secs.includes("conj") && !dep.conj && !dep.rootFamily, JSON.stringify(dep.secs));
  check(`${tag} Depth: reach line is the study-mark line`, /study mark|পাঠের চিহ্ন/.test(dep.reach ?? ""), dep.reach ?? "");

  // 2b. PART 2 -- counting. A Depth and a Root mark: study marks on the root only.
  const cb = await wcount(page);
  await openTab(page, "depth");
  await press(page, '.word-card-side [data-word-progress-state="achieved"]');
  await page.waitForTimeout(2500);
  await openTab(page, "intermediate");
  await press(page, '.word-card-side [data-word-progress-state="achieved"]');
  await page.waitForTimeout(2500);
  const clog = await wlog(page, cb);
  check(`${tag} Depth and Root marks write their root-keyed claims (level depth / intermediate)`,
    clog.some((x) => /^quranLemmaProgress:t1__p1__depth__وعد$/.test(x)) && clog.some((x) => /^quranLemmaProgress:t1__p1__intermediate__وعد$/.test(x)), JSON.stringify(clog));
  check(`${tag} Root and Depth marks never write a word total or a word counter`, !clog.some((x) => /^quranWordTotals:|^quranLemmaOccurrenceCounters:/.test(x)), JSON.stringify(clog));
  const lines2 = await wholeLines(page);
  const zeroWords = (v) => /Achieved 0 and 0%|০/.test(v ?? "") || /\b0\b.*0%/.test(v ?? "");
  check(`${tag} Root, Taṣrīf and Depth lines read "studied N of 1,642 roots" (Root and Depth studied 1); WbW and Family keep word sentences at 0`,
    ["intermediate", "depth", "tasrif"].every((k) => CLOSED && k === "tasrif" ? true : /1,642|১,৬৪২/.test(lines2[k] ?? "") && !/words|শব্দ/.test(lines2[k] ?? ""))
      && /(?:studied|পড়া) ?.*|studied/.test(lines2.intermediate ?? "") && (lang === "bn" || (lines2.intermediate === "Root: studied 1 of 1,642 roots" && lines2.depth === "Depth: studied 1 of 1,642 roots"))
      && /77,429|৭৭,৪২৯/.test(lines2.wbw ?? "") && /74,122|৭৪,১২২/.test(lines2.basic ?? "") && zeroWords(lines2.wbw) && zeroWords(lines2.basic), JSON.stringify(lines2));
  await openTab(page, "wbw");
  const wbwAfter = await page.evaluate(() => ({ achieved: document.querySelector('#quranWordCardMount [data-word-progress-state="achieved"]')?.getAttribute("aria-pressed"), through: !!document.querySelector("#quranWordCardMount [data-word-known-through]"), elsewhere: !!document.querySelector("#quranWordCardMount [data-word-progress-known-elsewhere]") }));
  check(`${tag} after Root, Taṣrīf and Depth marks on this root the word is NOT known: WbW shows no Achieved, no "known through" line`, wbwAfter.achieved === "false" && !wbwAfter.through && !wbwAfter.elsewhere, JSON.stringify(wbwAfter));
  const rootMarkedFam = await (async () => { await openTab(page, "basic"); return page.evaluate(() => !!document.querySelector("#quranWordCardMount [data-known-through-level]")); })();
  check(`${tag} no "Known through the root" line anywhere (Family shows none for a root mark)`, !rootMarkedFam);

  // 2c. J39 5A -- a Family mark per meaning group, writing only that group's key.
  await page.waitForFunction(() => document.querySelectorAll("#quranWordCardMount [data-family-group-mark]").length === 3, null, { timeout: 10000 }).catch(() => {});
  const gm = await page.evaluate(() => [...document.querySelectorAll("#quranWordCardMount [data-word-card-meaning-group]")].map((g) => ({ n: g.querySelectorAll("[data-family-group-state]").length, reach: g.querySelector("[data-family-group-reach]")?.textContent.trim() ?? null, lemma: g.querySelector("[data-family-group-state]")?.dataset.familyGroupLemma })));
  check(`${tag} Family: every meaning-group card has Learning / Practising / Achieved and a "→ Words known +N" line`,
    gm.length === 3 && gm.every((g) => g.n === 3 && /^(→ Words known \+|→ জানা শব্দ \+)/.test(g.reach ?? "")), JSON.stringify(gm));
  const gb = await wcount(page);
  await press(page, '[data-family-group-state="achieved"]', 1);
  await page.waitForTimeout(2800);
  const glog = await wlog(page, gb);
  const lemmaKeys = glog.filter((x) => /^quranLemmaProgress:t1__p1__basic__/.test(x));
  const secondGroupKey = "وعد:3";
  check(`${tag} a Family group mark writes ONLY that group's key (${secondGroupKey}), at level basic`, lemmaKeys.length === 1 && lemmaKeys[0] === `quranLemmaProgress:t1__p1__basic__${secondGroupKey}` && !glog.some((x) => /^quranWordProgress:/.test(x)), JSON.stringify(glog));
  const lines3 = await wholeLines(page);
  const gReach = Number((gm[1].reach ?? "").replace(/\D/g, "")) || null;
  check(`${tag} the Family total moves by that group's own count (${gm[1].reach}) and WbW stays 0`,
    lang === "bn" ? /১৭|17/.test(lines3.basic ?? "") : lines3.basic?.startsWith("Family: Achieved 17 and") && gm[1].reach === "→ Words known +17", JSON.stringify({ lines3, gm }));

  // 3. purple parts, contrast on both looks (the app has two card looks: light and night)
  await openTab(page, "tasrif");
  for (const look of ["light", "night"]) {
    const c1 = await contrast(page, look, "[data-word-card-cando]");
    const c2 = await contrast(page, look, "[data-word-card-ordernote]");
    const c3 = await contrast(page, look, "[data-word-card-whowhen]");
    check(`${tag} purple parts on the ${look} look: can-do ${c1?.ratio?.toFixed(2)}, order note ${c2?.ratio?.toFixed(2)}, who-and-when ${c3?.ratio?.toFixed(2)} (>= 4.5:1)`, !!c1 && !!c2 && !!c3 && c1.ratio >= 4.5 && c2.ratio >= 4.5 && c3.ratio >= 4.5, JSON.stringify([c1, c2, c3]));
  }
  await openTab(page, "basic");
  for (const look of ["light", "night"]) {
    const c = await contrast(page, look, "[data-word-card-does]");
    check(`${tag} the purple "what it does" line on the ${look} look: ${c?.ratio?.toFixed(2)} (>= 4.5:1)`, !!c && c.ratio >= 4.5, JSON.stringify(c));
  }
  await page.evaluate(() => document.documentElement.setAttribute("data-card-look", "night"));

  // 4. a word that is not a verb: Taṣrīf says so and its block is Not applicable (I7)
  await openTab(page, "wbw");
  let sawNoun = null;
  for (let p = 1; p <= 14 && !sawNoun; p++) {
    await page.evaluate((p) => document.querySelector(`[data-word-occurrence$=":14:22:${p}"]`)?.click(), p);
    await page.waitForTimeout(500);
    await openTab(page, "tasrif");
    const x = await panelInfo(page);
    if (x.tasrifNa) sawNoun = { p, ...x };
  }
  check(`${tag} a non-verb: Taṣrīf says so in words and its progress block reads "Not applicable"`, !!sawNoun && sawNoun.stateButtons === 0 && /Not applicable|প্রযোজ্য নয়/.test(sawNoun.na ?? ""), JSON.stringify(sawNoun));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Word card five levels: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

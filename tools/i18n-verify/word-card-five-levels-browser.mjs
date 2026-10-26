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
//   smallgloss  the gloss stays body size and regular weight (J43)    -> "J43 gloss: English ~1.35x" fails
//   nolegend    no ⓘ Legend button is drawn (J43)                     -> the Legend checks fail
//   threestate  the Family group control loses Not started (J43)      -> "same four states" fails
//   legendleft  the Legend sits at the row's LEFT end (J43)           -> "at the row's right end" fails
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
  // J43 mutations, added by the Architect in review (19 Oct 2026): the round shipped its checks unproven.
  // PCF MSA J101: the meaning moved beside the Arabic (one, in the app's language); its J43 size lives in that rule now.
  smallgloss: ["app/quranrevival.html", "background: var(--card-bg-inset); font-size: 1.22rem; font-weight: 700;", "background: var(--card-bg-inset); font-size: 0.9rem; font-weight: 400;"],
  // UPDATED IN PLACE (J59, 21 Oct 2026): the ⓘ moved from the colour row into the header, so these two mutations follow it.
  nolegend: ["app/js/quran-word-card.js", "      ${legendButtonHtml(text)}\n", ""],
  threestate: ["app/js/quran-word-card.js", "${button(\"not_started\")}${button(\"learning\")}", "${button(\"learning\")}"],
  legendleft: ["app/quranrevival.html", "header button.word-card-legend-btn { width: 40px; height: 40px;", "header button.word-card-legend-btn { order: 9; width: 26px; height: 26px;"],
  // J59 mutations: the balloon's pointer must sit under the ⓘ, and a colour row with nothing in it must not be drawn.
  noarrow: ["app/quranrevival.html", 'balloon.style.setProperty("--wc-legend-arrow",', 'void ("--wc-legend-arrow",'],
  // Re-anchored (audit part 78): the 320px gap is 0.1rem now.
  wrap320: ["app/quranrevival.html", "    .quran-word-card header { column-gap: 0.1rem; }\n", ""],
  // Audit part 78: without the cap on "This āyah ⋯", a wider system font sends × to a second row again.
  nocap: ["app/quranrevival.html", "padding: 0 2px; max-width: 5.5rem; white-space: normal; line-height: 1.1; }", "padding: 0 2px; }"],
  // Re-anchored for J60 (the colour row is gone): an empty colour row drawn under the meaning bar again.
  emptyrow: ["app/js/quran-word-card.js", '${state.level === "wbw" ? meaningBarHtml(word, context, text) : ""}\n', '${state.level === "wbw" ? meaningBarHtml(word, context, text) : ""}<div class="word-card-segment-controls"></div>\n'],
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
    combinedHead: q("[data-word-card-family-combined] h4")?.textContent.trim() ?? null,
    renders: qa("[data-word-card-meaning-group] [data-word-card-family-render]").length,
    markedSense: qa("[data-word-card-family-sense].word-card-sense-current").length,
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

// WCAG ratio of an element's text colour over the first opaque background found walking up from it, per card look
// ("dark" is the default look: no attribute).
const ratioIn = (page, look, selector) => page.evaluate(([look, selector]) => {
  if (look === "dark") document.documentElement.removeAttribute("data-card-look"); else document.documentElement.setAttribute("data-card-look", look);
  const el = document.querySelector(selector);
  if (!el) return null;
  const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  let bg = null;
  for (let n = el; n && !bg; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] === 1)) bg = c; }
  const fg = rgb(getComputedStyle(el).color);
  const [a, b] = [lum(fg), lum(bg ?? [255, 255, 255])];
  return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), fg: getComputedStyle(el).color };
}, [look, selector]);
const MOUNT = "#quranWordCardMount";
const legendState = (page) => page.evaluate(() => {
  const card = document.querySelector("#quranWordCardMount .quran-word-card");
  const head = card?.querySelector("header");
  const btn = card?.querySelector("[data-word-card-legend-toggle]");
  const ayahBtn = card?.querySelector("header [data-word-card-ayah-action]");
  const row = card?.querySelector(".word-card-segment-controls");
  const bal = card?.querySelector("[data-word-card-legend-balloon]");
  const cr = card?.getBoundingClientRect(), br = btn?.getBoundingClientRect(), ar = ayahBtn?.getBoundingClientRect();
  const vis = (e) => !!e && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().height > 0;
  const er = bal?.getBoundingClientRect();
  return {
    exists: !!btn, tag: btn?.tagName, h: br?.height ?? 0, w: br?.width ?? 0, expanded: btn?.getAttribute("aria-expanded"), shown: vis(bal),
    // J59: in the header, straight after "This āyah ⋯", on its row (same vertical centre) and to its right.
    inHeader: !!btn && !!head && head.contains(btn) && btn.previousElementSibling === ayahBtn && !!ar && Math.abs((ar.top + ar.height / 2) - (br.top + br.height / 2)) <= 2 && br.left >= ar.right - 1 && br.left - ar.right <= 14,
    // the pointer's centre is under the ⓘ's centre (within 6px), measured on the real rendered ::before
    arrowOff: vis(bal) ? (() => { const cs = getComputedStyle(bal, "::before"); const left = er.left + parseFloat(cs.left) + parseFloat(cs.width) / 2 + 2; return Math.abs(left - (br.left + br.width / 2)); })() : null,
    rowEmpty: !!row && row.children.length === 0,
    // J59: ‹ 🔍 This āyah ⓘ › × stay on ONE row (the 320px phone was the tight one: × wrapped before the fix)
    oneRow: !!head && new Set([...head.querySelectorAll(":scope > button")].map((b) => Math.round(b.getBoundingClientRect().top))).size === 1,
    insideCard: !!br && !!cr && br.left >= cr.left - 1 && br.right <= cr.right + 1 && (!vis(bal) || (er.left >= cr.left - 1 && er.right <= cr.right + 1)),
    cando: bal?.querySelector("[data-word-card-cando]")?.textContent.trim() ?? null,
    order: bal?.querySelector("[data-word-card-ordernote]")?.textContent.trim() ?? null,
    outsideCando: [...(card?.querySelectorAll("[data-word-card-cando]") ?? [])].filter((e) => !bal.contains(e)).length,
    over: document.documentElement.scrollWidth - innerWidth,
    label: btn?.textContent.trim(), name: btn?.getAttribute("aria-label"),
  };
});

async function j43Checks(page, tag, lang, width) {
  // --- image 1: the word-by-word gloss box (WbW tab)
  await openTab(page, "wbw");
  const g = await page.evaluate(() => {
    const bar = document.querySelector("#quranWordCardMount [data-word-card-meaning-bar]");
    const fs = (s) => { const e = bar?.querySelector(s); return e ? parseFloat(getComputedStyle(e).fontSize) : null; };
    const cs = (s) => bar?.querySelector(s) ? getComputedStyle(bar.querySelector(s)) : null;
    const body = parseFloat(getComputedStyle(document.querySelector("#quranWordCardMount .word-card-reference")).fontSize);
    const br = bar?.getBoundingClientRect(), cr = document.querySelector("#quranWordCardMount .quran-word-card").getBoundingClientRect();
    // PCF MSA J101: ONE meaning, beside the Arabic (data-word-card-head-gloss), in the app's own language; the bar keeps
    // the transliteration. "Bangla the same" is now "the one meaning, whichever language it is". Updated in place.
    const g1 = document.querySelector("#quranWordCardMount [data-word-card-head-gloss]");
    const gs = g1 ? getComputedStyle(g1) : null;
    return { body, en: gs ? parseFloat(gs.fontSize) : null, bn: gs ? parseFloat(gs.fontSize) : null, tr: fs(".word-card-transliteration"), enW: Number(gs?.fontWeight), trStyle: cs(".word-card-transliteration")?.fontStyle, inside: !!br && br.left >= cr.left - 1 && br.right <= cr.right + 1, over: document.documentElement.scrollWidth - innerWidth };
  });
  check(`${tag} J43 gloss: English ~1.35x body (${g.en}px vs ${g.body}px), bold; Bangla the same; transliteration smaller and italic; fits, no sideways scroll`,
    g.en >= g.body * 1.3 && g.enW >= 700 && g.bn === g.en && g.tr < g.en && g.tr >= g.body && g.trStyle === "italic" && g.inside && g.over <= 0, JSON.stringify(g));
  if (width === 390) {
    const bad = [];
    for (const look of ["light", "dark", "night"]) {
      for (const sel of [`${MOUNT} .word-card-meaning-en`, `${MOUNT} .word-card-meaning-bn`, `${MOUNT} .word-card-transliteration`, `${MOUNT} .word-card-gloss-segment`]) {
        const r = await ratioIn(page, look, sel);
        if (r && r.ratio < 4.5) bad.push(`${look} ${sel.split(" ").pop()} ${r.ratio.toFixed(2)} ${r.fg}`);
      }
    }
    check(`${tag} J43 gloss: every gloss line and colour segment has >= 4.5:1 on the light, dark and Night looks`, bad.length === 0, bad.join("; "));
  }
  // --- image 2: ⓘ Legend balloon on all five levels
  for (const level of LEVELS) {
    await openTab(page, level);
    const s0 = await legendState(page);
    // UPDATED IN PLACE (J59): the button is now a small round "ⓘ" in the header beside "This āyah ⋯" (the Owner's ask), named
    // for a screen reader in the reader's language; no colour row is drawn empty.
    const wantName = lang === "bn" ? "এই স্তরের নির্দেশিকা" : "Legend for this level";
    check(`${tag} J59 Legend [${level}]: a real 40x40 button "ⓘ" named "${wantName}", in the header beside This āyah, the header's buttons on one row, inside the card, closed, no empty colour row, no old can-do box in the panel`,
      s0.exists && s0.tag === "BUTTON" && s0.label === "ⓘ" && s0.name === wantName && s0.h >= 40 && s0.w >= 40 && s0.w <= 44 && s0.inHeader && s0.oneRow && s0.insideCard && s0.expanded === "false" && !s0.shown && !s0.rowEmpty && s0.outsideCando === 0 && s0.over <= 0, JSON.stringify(s0));
    if (level === "wbw" && width === 320) {
      // Audit part 78: the row held by 3px here and broke on a machine whose system-ui draws "This āyah ⋯" 10px wider.
      // Draw it 16px+ wider still (letter-spacing) and the header must hold: × on the first row, the label whole (it may
      // wrap inside its tile), every button still 40px tall. POSITIVE CONTROL: the label really did get wider.
      const wide = await page.evaluate(() => {
        const head = document.querySelector("#quranWordCardMount .quran-word-card header");
        const btn = head?.querySelector(".word-card-ayah-action-btn");
        if (!btn) return null;
        const natural = () => { const c = btn.cloneNode(true); Object.assign(c.style, { position: "absolute", visibility: "hidden", maxWidth: "none", whiteSpace: "nowrap" }); btn.after(c); const w = c.getBoundingClientRect().width; c.remove(); return w; };
        const before = natural();
        btn.style.letterSpacing = `${Math.ceil(17 / Math.max(1, [...btn.textContent.trim()].length))}px`; // 16px+ wider in either language
        const after = natural();
        const tops = [...head.querySelectorAll(":scope > button")].filter((b) => !b.classList.contains("word-card-app-back")).map((b) => Math.round(b.getBoundingClientRect().top));
        const r = btn.getBoundingClientRect();
        const out = { before: Math.round(before), after: Math.round(after), rows: new Set(tops).size, h: Math.round(r.height), whole: btn.scrollWidth <= btn.clientWidth + 1 && btn.scrollHeight <= btn.clientHeight + 1,
          tall: [...head.querySelectorAll(":scope > button")].every((b) => b.getBoundingClientRect().height >= 39.5) };
        btn.style.letterSpacing = "";
        return out;
      });
      check(`${tag} audit part 78: POSITIVE CONTROL -- the wider font really widened "This āyah ⋯" by 16px+ (${wide?.before} -> ${wide?.after}px)`, !!wide && wide.after - wide.before >= 16, JSON.stringify(wide));
      check(`${tag} audit part 78: with "This āyah ⋯" drawn wider, the header's buttons stay on ONE row, the label whole, every button 40px tall`, !!wide && wide.rows === 1 && wide.whole && wide.tall, JSON.stringify(wide));
    }
    if (level === "wbw") {
      // J59 checked the colour row with Colour off and on. Updated in place for PCF MSA J60 (the Owner, 21 Oct 2026:
      // "removing the color tick/ untick option, it should be always coloured … remove 'stem, particle' that line"):
      // there is no Colour tick and no colour row at all now, and the word parts are coloured.
      const wbw = await page.evaluate(() => ({
        tick: document.querySelectorAll("#quranWordCardMount [data-word-card-colour-toggle]").length,
        rows: document.querySelectorAll("#quranWordCardMount .word-card-segment-controls").length,
        coloured: document.querySelectorAll("#quranWordCardMount .word-card-arabic [class*='word-card-segment-']").length,
      }));
      check(`${tag} J60 WbW: no Colour tick, no colour row, and the word parts are coloured`, wbw.tick === 0 && wbw.rows === 0 && wbw.coloured >= 1, JSON.stringify(wbw));
    }
    await page.click(`${MOUNT} [data-word-card-legend-toggle]`);
    await page.waitForTimeout(150);
    const s1 = await legendState(page);
    const wantCando = lang === "bn" ? /^এখানে অর্জিত মানে/ : /^Achieved here means/;
    const wantOrder = level === "wbw" ? s1.order === null : !!s1.order;
    check(`${tag} J43 Legend [${level}]: tap opens the balloon (aria-expanded true) with the can-do sentence${level === "wbw" ? "" : " and the order note"} in ${lang}, inside the card, its pointer under the ⓘ (J59)`,
      s1.expanded === "true" && s1.shown && wantCando.test(s1.cando ?? "") && wantOrder && s1.insideCard && s1.arrowOff !== null && s1.arrowOff <= 6 && s1.over <= 0, JSON.stringify(s1));
    if (width === 390) {
      const bad = [];
      for (const look of ["light", "dark", "night"]) for (const sel of ["[data-word-card-cando]", "[data-word-card-ordernote]"]) { const r = await ratioIn(page, look, `${MOUNT} ${sel}`); if (r && r.ratio < 4.5) bad.push(`${look} ${sel} ${r.ratio.toFixed(2)}`); }
      check(`${tag} J43 Legend [${level}]: balloon text >= 4.5:1 on light, dark and Night`, bad.length === 0, bad.join("; "));
      await page.evaluate(() => document.documentElement.setAttribute("data-card-look", "night"));
    }
    await page.click(`${MOUNT} [data-word-card-legend-toggle]`);
    const s2 = await legendState(page);
    await page.click(`${MOUNT} [data-word-card-legend-toggle]`);
    await page.keyboard.press("Escape");
    const s3 = await legendState(page);
    await page.click(`${MOUNT} [data-word-card-legend-toggle]`);
    await page.click(`${MOUNT} .word-card-reference`);
    const s4 = await legendState(page);
    const stillOpen = await page.evaluate(() => !!document.querySelector("#quranWordCardMount .quran-word-card"));
    check(`${tag} J43 Legend [${level}]: closes on a second tap, on Esc (card stays open) and on a tap outside`,
      s2.expanded === "false" && !s2.shown && s3.expanded === "false" && !s3.shown && stillOpen && s4.expanded === "false" && !s4.shown, JSON.stringify({ s2, s3, s4, stillOpen }));
  }
  // --- image 3: Family's group control is the main block's control, on the card's light surface
  await openTab(page, "basic");
  await page.waitForFunction(() => document.querySelectorAll("#quranWordCardMount [data-family-group-mark]").length === 3, null, { timeout: 10000 }).catch(() => {});
  const f = await page.evaluate(() => {
    const css = (e) => { const c = getComputedStyle(e); return { bg: c.backgroundColor, fg: c.color, border: c.borderTopColor, h: Math.round(e.getBoundingClientRect().height), r: c.borderTopLeftRadius, fs: c.fontSize }; };
    const main = [...document.querySelectorAll("#quranWordCardMount [data-word-progress-state]")];
    const group = document.querySelector("#quranWordCardMount [data-family-group-mark]");
    const gb = [...group.querySelectorAll("[data-family-group-state]")];
    const pressedMain = main.filter((b) => b.getAttribute("aria-pressed") === "true");
    const reach = group.querySelector("[data-family-group-reach]");
    reach.scrollIntoView({ block: "center" });
    const rr = reach.getBoundingClientRect();
    const hit = document.elementFromPoint(rr.left + rr.width / 2, rr.top + rr.height / 2);
    const below = rr.top >= gb[0].getBoundingClientRect().bottom - 1;
    // The group card is always a LIGHT surface, so it is compared with the main block on its light look.
    document.documentElement.setAttribute("data-card-look", "light");
    const off = (list) => list.find((b) => b.getAttribute("aria-pressed") !== "true");
    return { states: gb.map((b) => b.dataset.familyGroupState), mainStates: main.map((b) => b.dataset.wordProgressState), unpressed: css(off(gb)), mainUnpressed: css(off(main)), mainStage: main[0].style.cssText, groupStage: gb[0].style.cssText, h: gb.map((b) => Math.round(b.getBoundingClientRect().height)), reachHit: hit === reach || reach.contains(hit), below, label: gb.map((b) => b.textContent.trim()), mainLabel: main.map((b) => b.textContent.trim()), pressedMain: pressedMain.length };
  });
  check(`${tag} J43 Family group control: the same four states, labels and stage colours as the main WORD PROGRESS block; 40px+ buttons`,
    JSON.stringify(f.states) === JSON.stringify(f.mainStates) && JSON.stringify(f.states) === '["not_started","learning","practising","achieved"]' && JSON.stringify(f.label) === JSON.stringify(f.mainLabel) && f.groupStage === f.mainStage && f.h.every((h) => h >= 40), JSON.stringify(f));
  check(`${tag} J43 Family group control: unpressed buttons have the main block's colours, size, radius and text size`, JSON.stringify(f.unpressed) === JSON.stringify(f.mainUnpressed), JSON.stringify([f.unpressed, f.mainUnpressed]));
  check(`${tag} J43 Family reach line "→ Words known +N" sits under the buttons and is not covered (elementFromPoint at its centre is the line)`, f.below && f.reachHit, JSON.stringify(f));
  // pressed: the colours match the main block's pressed colours for the same state
  await press(page, '[data-family-group-state="learning"]', 0);
  await page.waitForTimeout(2500);
  const p = await page.evaluate(() => {
    const g = document.querySelector('#quranWordCardMount [data-family-group-state="learning"][aria-pressed="true"]');
    const c = g && getComputedStyle(g);
    return { found: !!g, bg: c?.backgroundColor, fg: c?.color, weight: c?.fontWeight, stage: g?.style.cssText };
  });
  check(`${tag} J43 Family group control: a pressed state wears the stage colour (not brown) with bold text`, p.found && /^--stage-bg: ?#8a6a35/.test(p.stage ?? "") && p.bg === "rgb(138, 106, 53)" && Number(p.weight) >= 700, JSON.stringify(p));
  await page.evaluate(() => document.documentElement.setAttribute("data-card-look", "night"));
  await openTab(page, "wbw"); // the checks after this block start from the WbW tab, as before
  return { g, f };
}

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
  // 1b. PCF J43 -- the polish round (issue #975): gloss size, the ⓘ Legend balloon, Family's group control. Every width.
  const j43 = await j43Checks(page, tag, lang, width);
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
  // Updated in place 20 Oct 2026 (PCF MSA J45, Owner's ticks 1A 2A 3A): "Meanings of … itself" and the meaning-group
  // cards are ONE section now, a row per meaning group with its purple renderings; the old senses list is gone (0).
  await page.waitForFunction(() => document.querySelectorAll('#quranWordCardMount [data-word-card-family-word]').length > 0, null, { timeout: 10000 }).catch(() => {});
  const fam2 = await panelInfo(page);
  check(`${tag} Family: order note, can-do, ONE combined section: three meaning-group rows (this word's first, in gold), each with its renderings, counts below`,
    fam2.panel === "basic" && !!fam2.order && !!fam2.cando && fam2.senses === 0 && fam2.groups.length === 3 && fam2.groups[0].current && !fam2.groups[1].current && fam2.groups[0].cards === 5 && fam2.renders === 3 && fam2.counts, JSON.stringify(fam2));
  check(`${tag} Family: the combined heading is "The root's words, by meaning", and one rendering line is marked "this word"`, (lang === "bn" ? /অর্থ অনুযায়ী/ : /^The root's words, by meaning$/).test(fam2.combinedHead ?? "") && fam2.markedSense === 1, JSON.stringify({ h: fam2.combinedHead, m: fam2.markedSense }));
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
  // UPDATED IN PLACE (J43, issue #975): the group control now has the main block's four states (Not started added), so n is 4.
  check(`${tag} Family: every meaning-group card has Not started / Learning / Practising / Achieved and a "→ Words known +N" line`,
    gm.length === 3 && gm.every((g) => g.n === 4 && /^(→ Words known \+|→ জানা শব্দ \+)/.test(g.reach ?? "")), JSON.stringify(gm));
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
    // UPDATED IN PLACE (J43): the can-do box and order note now live in the ⓘ Legend balloon, which is closed by default
    // (hidden), so the Legend is opened first; contrast is still measured on the real rendered balloon.
    await page.evaluate(() => { const b = document.querySelector("#quranWordCardMount [data-word-card-legend-toggle]"); if (b?.getAttribute("aria-expanded") !== "true") b?.click(); });
    const c1 = await contrast(page, look, "[data-word-card-cando]");
    const c2 = await contrast(page, look, "[data-word-card-ordernote]");
    const c3 = await contrast(page, look, "[data-word-card-whowhen]");
    check(`${tag} purple parts on the ${look} look: can-do ${c1?.ratio?.toFixed(2)}, order note ${c2?.ratio?.toFixed(2)}, who-and-when ${c3?.ratio?.toFixed(2)} (>= 4.5:1)`, !!c1 && !!c2 && !!c3 && c1.ratio >= 4.5 && c2.ratio >= 4.5 && c3.ratio >= 4.5, JSON.stringify([c1, c2, c3]));
  }
  // J43: the open Legend balloon sits over the tab row, so it is closed (a tap on its button) before the next tab is pressed.
  await page.evaluate(() => { const b = document.querySelector("#quranWordCardMount [data-word-card-legend-toggle][aria-expanded='true']"); b?.click(); });
  await openTab(page, "basic");
  // J43: wait for the state (the groups hydrate after the tab opens) rather than a guessed delay.
  await page.waitForFunction(() => document.querySelector("#quranWordCardMount [data-word-card-does]"), null, { timeout: 10000 }).catch(() => {});
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

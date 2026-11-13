// MSA · QR J136 (the Owner, 10 Nov 2026: "Approved with recommended") -- "Mark the Word" on the REAL Word card.
// (1) six buttons, the seeded marks pressed (Learned Easy = the old Done), names in English and Bangla.
// (2) "How hard was it, in this sūrah": the four degrees with count and %, from the seeded marks and effort.
// (3) THE REFUSAL PATH (the day the flag is false): Very Hard and Already Known say in words that they cannot be saved yet, write NOTHING,
//     and stay unpressed; Difficult / Learn / Learned Easy still save, as the old keys, with no `effort` field sent.
//     UPDATED IN PLACE 11 Nov 2026 (QR Lead 46L): the Owner PUBLISHED the Rules, so the repository's flag is now TRUE. This section
//     therefore runs against a copy of word-effort.js with the flag forced to false (the refusal path must keep working).
// (3b) THE PUBLISHED PATH: with the real file, Very Hard saves `hard` AND effort "very", Already Known saves effort "known", and
//     neither shows the "cannot be saved yet" note.
// (4) the Marks wheel lights the inner band blue (Already Known) and purple (Very Hard) from the stored effort.
// Run from the repo root, serve.js on :8080. --mutate=NAME must make the suite FAIL:
//   nonote    the "cannot be saved yet" line is never shown          -> (3)
//   flagfalse the real flag is false: Very Hard cannot be saved       -> (3b)
//   notally   the table is not drawn                                 -> (2)
//   noband    the wheel ignores the effort map                       -> (4)
//   bnleak    the Bangla note is missing                             -> (3)
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${String(detail).slice(0, 260)}`); }
};
const HTML = "app/quranrevival.html", EFF = "app/js/word-effort.js", UI = "app/js/marks-ui.js", BN = "app/js/i18n/bn.js";
const MUT = {
  nonote: [HTML, "wordEffortNote = { unitKey, text: t(", "wordEffortNote = { unitKey: '', text: t("],
  flagfalse: [EFF, "export const WORD_EFFORT_RULES_PUBLISHED = true;", "export const WORD_EFFORT_RULES_PUBLISHED = false;"],
  nolittle: [EFF, 'EFFORT_STORED = Object.freeze(["known", "easy", "little", "very"])', 'EFFORT_STORED = Object.freeze(["known", "easy", "very"])'], // 12 Nov 2026: Little Difficult can no longer be stored
  nolegend: [UI, '["little", lang === "bn" ? "একটু কঠিন" : "Little Difficult"], ', ""],
  notally: [HTML, 'const detailsHtml = `<details class="we-details"', 'const detailsHtml = "" && `<details class="we-details"'],
  noband: [UI, "const eff = effort?.[p.key] === \"known\"", "const eff = null && effort?.[p.key] === \"known\""],
  bnleak: [BN, '  "This mark cannot be saved yet: the new saving rule has not been published in Firebase. Difficult, Learn and Learned Easy save as before.": ', '  "x-unused": '],
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const TENANT = "t1";
const SEED = `\nDATA.ayahKeyMarks = [{ _id: "${TENANT}__p1__1", tenantId: "${TENANT}", scope: "p1", surah: 1, entries: { "qword:1:1:1": ["done"], "qword:1:1:2": ["hard"], "qword:1:1:3": ["hard"], "qword:1:1:4": [], "qword:1:2:1": ["practice"] }, effort: { "qword:1:1:2": "very", "qword:1:1:4": "known" }, schemaVersion: 1, createdAt: "2026-11-10T00:00:00.000Z", updatedAt: "2026-11-10T00:00:00.000Z", createdBy: "test-uid" }];\n`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
const writesOf = (page) => ev(page, () => (window.__stubWriteData || []).filter((x) => x.col === "ayahKeyMarks").map((x) => JSON.stringify(x)));
const rowState = (page) => ev(page, () => [...document.querySelectorAll(".quran-word-card [data-word-mark]")].filter((b) => b.getBoundingClientRect().width > 0).map((b) => ({ id: b.dataset.wordMark, on: b.getAttribute("aria-pressed") === "true", name: b.querySelector(".we-name")?.textContent.trim(), h: Math.round(b.getBoundingClientRect().height) })));
// UPDATED IN PLACE (12 Nov 2026, the Owner: "Place another level before Difficult, 'Little Difficult'"): six buttons now.
// UPDATED IN PLACE (13 Nov 2026, the Owner: "Mark chips order: Already known, Learned Easy, Little Hard, Difficult, Very Hard, Learn"): the six buttons are in that order (the labels are unchanged).
const NAMES = { en: ["Already Known", "Learned Easy", "Little Difficult", "Difficult", "Very Hard", "Learn"], bn: ["আগে থেকেই জানা", "সহজে শেখা", "একটু কঠিন", "কঠিন", "খুব কঠিন", "শিখুন"] };

async function routeMutation(ctx) {
  const [file, a, b] = MUT[MUTATE];
  await ctx.route(`**/${file}*`, async (r) => {
    const src = fs.readFileSync(file, "utf8");
    if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) });
  });
}
for (const [lang, width, height] of [["en", 390, 844], ["en", 1440, 900], ["bn", 390, 844]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== Mark the Word ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: SEED + "window.__stubApplyBatches = true;" });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  // the refusal path runs on a copy with the flag forced false (see the header); a mutation then overrides it, except flagfalse (3b only)
  await ctx.route(`**/${EFF}*`, async (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: fs.readFileSync(EFF, "utf8").replace("export const WORD_EFFORT_RULES_PUBLISHED = true;", "export const WORD_EFFORT_RULES_PUBLISHED = false;") }));
  if (MUTATE && MUTATE !== "flagfalse") await routeMutation(ctx);
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await settle(page, 1200);
  if (!(await ev(page, () => !document.getElementById("readView").hidden))) {
    if (!(await ev(page, () => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await settle(page, 200); }
    await page.click("#tabReadBtn");
    await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 8000 });
    await settle(page, 300);
  }
  await ev(page, () => { const el = document.getElementById("ayahSelect"); el.value = "1"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await settle(page, 700);
  await ev(page, () => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await settle(page, 500);
  const occ = "quran-word-occurrence:v1:1:1:1";
  await page.waitForFunction((i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`), occ, { timeout: 8000 });
  await ev(page, (i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`).click(), occ);
  await page.waitForSelector(`.quran-word-card[data-occurrence-id="${occ}"]`, { timeout: 8000 });
  await page.waitForSelector(".quran-word-card [data-word-marks-row]", { timeout: 6000 }).catch(() => {});

  // (1)
  let m = await rowState(page);
  check(`${tag} (1) six buttons in order, named in ${lang}`, m.length === 6 && m.map((x) => x.id).join() === "known,easy,little,difficult,very,learn" && m.every((x, i) => x.name === NAMES[lang][i]), JSON.stringify(m));
  check(`${tag} (1) only Learned Easy (the seeded Done) is pressed`, m.filter((x) => x.on).map((x) => x.id).join() === "easy", JSON.stringify(m));
  check(`${tag} (1) every button is at least 40px tall`, m.length === 6 && m.every((x) => x.h >= 40), JSON.stringify(m.map((x) => x.h)));
  // (2)
  await ev(page, () => { const d = document.querySelector(".quran-word-card [data-word-effort-details]"); if (d) d.open = true; });
  await settle(page, 200);
  const tally = await ev(page, () => ({ rows: Object.fromEntries([...document.querySelectorAll(".quran-word-card [data-effort-row]")].map((r) => [r.dataset.effortRow, [...r.querySelectorAll("td")].slice(1).map((c) => c.textContent.trim()).join(" ")])), of: document.querySelector(".quran-word-card .we-of")?.textContent.trim() ?? "" }));
  const pct = (n) => (n / 29 * 100).toFixed(2);
  check(`${tag} (2) the table: one each of the four degrees, with count and % of the sūrah's 29 words`, ["known", "easy", "hard", "very"].every((k) => tally.rows[k] === `1 ${pct(1)}%`), JSON.stringify(tally));
  check(`${tag} (2) the table says how many words it is of`, /29/.test(tally.of), JSON.stringify(tally));
  // (3)
  const w0 = (await writesOf(page)).length;
  const tap = async (id) => { await ev(page, (x) => [...document.querySelectorAll(`.quran-word-card [data-word-mark="${x}"]`)].find((b) => b.getBoundingClientRect().width > 0)?.click(), id); await settle(page, 600); };
  await tap("very");
  let note = await ev(page, () => document.querySelector(".quran-word-card [data-word-effort-note]")?.textContent.trim() ?? "");
  check(`${tag} (3) Very Hard says in words that it cannot be saved yet`, lang === "bn" ? /[ঀ-৿]/.test(note) && !/[A-Za-z]/.test(note.replace(/Firebase/g, "")) : /cannot be saved yet/.test(note) && /Learned Easy/.test(note), JSON.stringify(note));
  check(`${tag} (3) ...and writes NOTHING`, (await writesOf(page)).length === w0, JSON.stringify(await writesOf(page)));
  m = await rowState(page);
  check(`${tag} (3) ...and stays unpressed, Learned Easy untouched`, m.filter((x) => x.on).map((x) => x.id).join() === "easy", JSON.stringify(m));
  await tap("known");
  note = await ev(page, () => document.querySelector(".quran-word-card [data-word-effort-note]")?.textContent.trim() ?? "");
  check(`${tag} (3) Already Known says the same, and writes nothing`, note.length > 20 && (await writesOf(page)).length === w0, JSON.stringify(note));
  await tap("difficult");
  let w = (await writesOf(page)).slice(w0);
  check(`${tag} (3) Difficult still saves: entries.qword:1:1:1 = [done, hard], and NO effort field`, w.length === 1 && w[0].includes('"entries.qword:1:1:1":["done","hard"]') && !/effort/.test(w[0]), JSON.stringify(w));
  note = await ev(page, () => document.querySelector(".quran-word-card [data-word-effort-note]")?.textContent.trim() ?? "");
  check(`${tag} (3) a successful save clears the old note`, note === "", JSON.stringify(note));
  await tap("easy");
  w = (await writesOf(page)).slice(w0);
  check(`${tag} (3) tapping the pressed Learned Easy clears it: the list loses done, keeps hard, still no effort`, w.length === 2 && w[1].includes('"entries.qword:1:1:1":["hard"]') && !/effort/.test(w[1]), JSON.stringify(w));
  // (4)
  await ev(page, () => document.querySelector("[data-word-card-close]")?.click());
  await settle(page, 300);
  await ev(page, () => document.getElementById("tabApproachBtn")?.click());
  await settle(page, 500);
  if (width < 900) { await page.click('#wheelDrawerRow [data-wheel-drawer="wheel"]').catch(() => {}); await settle(page, 300); }
  await ev(page, () => document.querySelector('[data-wheel-kind="marks"]')?.click());
  await page.waitForSelector("#wheelContainer svg[data-mk-wheel]", { timeout: 6000 }).catch(() => {});
  await ev(page, () => document.querySelector('[data-mk-view="all-words"]')?.click());
  await settle(page, 500);
  const bands = await ev(page, () => { const g = (k) => document.querySelector(`#wheelContainer .mk-piece[data-mk-key="${k}"]`); const eff = (k) => [...(g(k)?.querySelectorAll(".mk-eff-known.on, .mk-eff-very.on") ?? [])].map((p) => p.getAttribute("class")); return { very: eff("qword:1:1:2"), known: eff("qword:1:1:4"), plain: eff("qword:1:1:3"), legend: document.querySelector("[data-mk-legend]")?.innerText ?? "" }; });
  check(`${tag} (4) the wheel lights Very Hard's inner band purple, Already Known's blue, a plain Difficult word neither`, bands.very.length >= 1 && bands.very.every((c) => /mk-eff-very/.test(c)) && bands.known.length >= 1 && bands.known.every((c) => /mk-eff-known/.test(c)) && bands.plain.length === 0, JSON.stringify(bands));
  check(`${tag} (4) MUTATION TARGET (nolegend): the legend also names Little Difficult`, lang === "bn" ? /একটু কঠিন/.test(bands.legend) : /Little Difficult/.test(bands.legend), JSON.stringify(bands.legend));
  check(`${tag} (4) the legend names both new colours`, lang === "bn" ? /আগে থেকেই জানা/.test(bands.legend) && /খুব কঠিন/.test(bands.legend) : /Already Known/.test(bands.legend) && /Very Hard/.test(bands.legend), JSON.stringify(bands.legend));
  await page.close(); await ctx.close();
}
// (3b) THE PUBLISHED PATH, with the real word-effort.js (the flagfalse mutation breaks it).
{
  const tag = "[en 390 published]";
  console.log(`\n=== Mark the Word ${tag} ===`);
  const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 844 }, extraSeedJs: SEED + "window.__stubApplyBatches = true;" });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE === "flagfalse" || MUTATE === "nolittle") await routeMutation(ctx);
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await settle(page, 1200);
  if (!(await ev(page, () => !document.getElementById("readView").hidden))) {
    if (!(await ev(page, () => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await settle(page, 200); }
    await page.click("#tabReadBtn");
    await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 8000 });
    await settle(page, 300);
  }
  await ev(page, () => { const el = document.getElementById("ayahSelect"); el.value = "1"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await settle(page, 700);
  await ev(page, () => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await settle(page, 500);
  const occ = "quran-word-occurrence:v1:1:1:1";
  await page.waitForFunction((i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`), occ, { timeout: 8000 });
  await ev(page, (i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`).click(), occ);
  await page.waitForSelector(`.quran-word-card[data-occurrence-id="${occ}"]`, { timeout: 8000 });
  await page.waitForSelector(".quran-word-card [data-word-marks-row]", { timeout: 6000 }).catch(() => {});
  const w0 = (await writesOf(page)).length;
  const tap = async (id) => { await ev(page, (x) => [...document.querySelectorAll(`.quran-word-card [data-word-mark="${x}"]`)].find((b) => b.getBoundingClientRect().width > 0)?.click(), id); await settle(page, 600); };
  await tap("very");
  let w = (await writesOf(page)).slice(w0);
  let note = await ev(page, () => document.querySelector(".quran-word-card [data-word-effort-note]")?.textContent.trim() ?? "");
  check(`${tag} (3b) Very Hard SAVES: the key hard (replacing Learned Easy) and effort "very" for the word, in one write`, w.length === 1 && w[0].includes('"entries.qword:1:1:1":["hard"]') && w[0].includes('"effort.qword:1:1:1":"very"'), JSON.stringify(w));
  check(`${tag} (3b) ...and shows no "cannot be saved yet" note`, note === "", JSON.stringify(note));
  const m2 = await rowState(page);
  check(`${tag} (3b) ...and Very Hard is pressed`, m2.filter((x) => x.on).map((x) => x.id).includes("very"), JSON.stringify(m2));
  await tap("known");
  w = (await writesOf(page)).slice(w0);
  check(`${tag} (3b) Already Known SAVES effort "known" (the second write)`, w.length === 2 && w[1].includes('"effort.qword:1:1:1":"known"'), JSON.stringify(w));
  await tap("little");
  w = (await writesOf(page)).slice(w0);
  const m3 = await rowState(page);
  check(`${tag} (3b) MUTATION TARGET (nolittle): Little Difficult SAVES effort "little" (the third write), replacing Already Known, with no Difficult key`, w.length === 3 && w[2].includes('"effort.qword:1:1:1":"little"') && w[2].includes('"entries.qword:1:1:1":[]'), JSON.stringify(w));
  check(`${tag} (3b) ...and only Little Difficult is pressed (not Already Known, not Difficult)`, m3.filter((x) => x.on).map((x) => x.id).join() === "little", JSON.stringify(m3));
  await page.close(); await ctx.close();
}
await browser.close();
console.log(`\n==== Mark the Word (J136)${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

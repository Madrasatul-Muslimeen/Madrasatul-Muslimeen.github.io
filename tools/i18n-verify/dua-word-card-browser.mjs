// Decision 90, rounds 2-4 (the Owner, 8 Oct 2026: "Go ahead with rounds 2, 3 and 4"; Q1 answered "Yes. (since its
// about knowing and understanding the word)"). Round 2: a word matched without its leading «و», or through the
// Qur'an's own spelling, says so. Round 3: the Dua word card -- dictionaries at the root, the word's places in the
// Qur'an (each opening its Word card, with the way back). Round 4: the word's Word-by-Word progress; a press records it
// through the Word card's own saving, the SAME record as the Qur'an word's -- and a bare link records nothing.
// Expected values written BY HAND: Dua 11's «وبك» = «و» + بِكَ; Dua 18's «الحياة» = ٱلْحَيَوٰةِ; «أسلمت» (Dua 1) at
// 2:131:7 and 3:20:4, root سلم (Buckwalter slm), dictionary word أَسْلَمَ.
// Run from the repository root, serve.js on :8080.
//   --mutate=nohow    the round 2 notes are not shown         -> the «و»/spelling checks fail
//   --mutate=noplaces the places are not listed               -> the places checks fail
//   --mutate=notoken  the Word card records without the token -> the bare-link check fails
//   --mutate=norecord the Word card does not record on arrival -> the recording checks fail
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nohow: ["js/hadith-browser.js", "  const prefix = how.replace(\"~\", \"\");\n", "  const prefix = \"\"; how = \"\";\n"],
  noplaces: ["js/hadith-browser.js", "  if (places.length) {\n    const row = el(\"div\", \"dua-word-places\");", "  if (false) {\n    const row = el(\"div\", \"dua-word-places\");"],
  notoken: ["quranrevival.html", '&& sessionStorage.getItem("mmsa-dua-word-progress") === `${raw}|${want}`) record = want;', ") record = want;"],
  norecord: ["quranrevival.html", "      if (record) await runWordProgressAction({ kind: \"state\", state: record });\n", "\n"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function context(lang, width, look) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 860 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.addInitScript((l) => { try { localStorage.setItem("mm_card_look", l); } catch {} }, look);
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  return ctx;
}
const panelText = (P, n) => P.evaluate((d) => document.querySelector(`[data-dua-word-panel="${d}"]`)?.innerText ?? "", n);
async function tap(P, dua, i) {
  await P.evaluate(([d, w]) => document.querySelector(`[data-dua-card="${d}"] [data-dua-word="${w}"]`).scrollIntoView({ block: "center" }), [dua, i]);
  await P.click(`[data-dua-card="${dua}"] [data-dua-word="${i}"]`);
  await P.waitForSelector(`[data-dua-word-panel="${dua}"]:not([hidden])`, { timeout: 4000 }).catch(() => {});
}
const lemmaWrites = (P) => P.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranLemmaProgress").map((w) => ({ id: w.id, lemma: w.data?.lemmaId, state: w.data?.state })));

for (const [lang, width, look] of [["en", 390, "light"], ["bn", 390, "night"], ["en", 1280, "night"]]) {
  const tag = `[${lang} ${width} ${look}]`;
  const ctx = await context(lang, width, look);
  const { page: P, errors } = await openPage(ctx, "/app/hadith-collections.html?back=1");
  await P.click('[data-hadith-tab="dua"]');
  await P.waitForSelector('[data-dua-card="11"] [data-dua-word]');

  // Round 2.
  await tap(P, 11, 4);
  const wa = await panelText(P, 11);
  check(`${tag} ROUND 2: Dua 11's «وبك» opens بِكَ, read as «و» (and) + the word`, wa.includes("بِكَ") && wa.includes(lang === "bn" ? "«و» (এবং) + এই শব্দ" : "Read as «و» (and) + this word"), wa.slice(0, 120));
  await tap(P, 18, 4);
  const sp = await panelText(P, 18);
  check(`${tag} ROUND 2: Dua 18's «الحياة» opens ٱلْحَيَوٰةِ, saying the Qur'an spells it its own way`, /ٱلْحَيَوٰة/.test(sp) && sp.includes(lang === "bn" ? "নিজস্ব বানানে" : "The Qur'an spells this word its own way"), sp.slice(0, 120));
  check(`${tag} ROUND 2: a word matched as it stands carries no such note`, await (async () => { await tap(P, 1, 1); const t = await panelText(P, 1); return !t.includes("«و»") && !t.includes(lang === "bn" ? "নিজস্ব বানানে" : "its own way"); })());

  // Round 3.
  await P.waitForSelector('[data-dua-word-panel="1"] [data-dua-word-dict="ejtaal"]', { timeout: 6000 }).catch(() => {});
  const card = await P.evaluate(() => {
    const p = document.querySelector('[data-dua-word-panel="1"]');
    const box = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
    return { dicts: [...p.querySelectorAll("[data-dua-word-dict]")].map((a) => [a.dataset.duaWordDict, a.getAttribute("href"), a.target, box(a)]),
      places: [...p.querySelectorAll("[data-dua-word-place]")].map((a) => [a.dataset.duaWordPlace, a.getAttribute("href"), box(a)[1]]),
      states: [...p.querySelectorAll("[data-dua-word-state]")].map((b) => { const r = b.getBoundingClientRect(); return [b.dataset.duaWordState, Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }),
      wide: p.scrollWidth > p.clientWidth + 1 };
  });
  check(`${tag} ROUND 3: the dictionaries open at the root سلم: Quranic Arabic Corpus (q=slm) and Lane · Hans Wehr (bwq=slm), in a new tab`,
    card.dicts.length === 2 && card.dicts[0][1] === "https://corpus.quran.com/qurandictionary.jsp?q=slm" && card.dicts[1][1] === "https://ejtaal.net/aa/#bwq=slm" && card.dicts.every((d) => d[2] === "_blank"), JSON.stringify(card.dicts));
  check(`${tag} ROUND 3: ...side by side, the same width, 40px tall`, card.dicts.length === 2 && Math.abs(card.dicts[0][3][0] - card.dicts[1][3][0]) <= 1 && card.dicts.every((d) => d[3][1] >= 40), JSON.stringify(card.dicts.map((d) => d[3])));
  check(`${tag} ROUND 3: its places in the Qur'an: 2:131:7 and 3:20:4, each opening its Word card with the way back to Dua 1`,
    JSON.stringify(card.places.map((p) => p[0])) === JSON.stringify(["2:131:7", "3:20:4"]) && card.places.every((p) => p[1] === `./quranrevival.html?word=${p[0]}&back=1&from=dua-1` && p[2] >= 40), JSON.stringify(card.places));
  check(`${tag} ROUND 3: nothing in the card is wider than the card`, !card.wide);

  // Round 4: the status, then a press.
  await P.waitForSelector('[data-dua-word-panel="1"] [data-dua-word-state-now]', { timeout: 10000 }).catch(() => {});
  const now = await P.evaluate(() => { const s = document.querySelector('[data-dua-word-panel="1"] [data-dua-word-state-now]'); return { state: s?.dataset.duaWordStateNow, text: s?.textContent, current: document.querySelector('[data-dua-word-panel="1"] [data-dua-word-state][aria-current="true"]')?.dataset.duaWordState }; });
  // Updated in place for round 6 (decision 92): the line now reads "The same word in the Qur'an (Word-by-Word): …",
  // beside the new "In this dua: …" line (dua-word-progress-browser checks that one).
  check(`${tag} ROUND 4: the word's Word-by-Word progress is read and shown: ${lang === "bn" ? "কুরআনে একই শব্দ" : "The same word in the Qur'an"} … ${lang === "bn" ? "শুরু হয়নি" : "Not started"}`, now.state === "not_started" && now.current === "not_started" && now.text.startsWith(lang === "bn" ? "কুরআনে একই শব্দ (শব্দে শব্দে):" : "The same word in the Qur'an (Word-by-Word):"), JSON.stringify(now));
  const rows = [...new Set(card.states.map((s) => s[1]))].length;
  check(`${tag} ROUND 4: the four states in an even grid (${width < 520 ? "2 × 2" : "one row"}), 40px tall`, card.states.length === 4 && rows === (width < 520 ? 2 : 1) && card.states.every((s) => s[3] >= 40 && Math.abs(s[2] - card.states[0][2]) <= 1), JSON.stringify(card.states));
  await Promise.all([P.waitForURL(/quranrevival\.html\?word=/, { timeout: 15000 }), P.click('[data-dua-word-panel="1"] [data-dua-word-state="achieved"]')]).catch(() => {});
  await P.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "quranLemmaProgress"), null, { timeout: 30000 }).catch(() => {});
  await P.waitForTimeout(800);
  const lw = await lemmaWrites(P);
  const after = await P.evaluate(() => ({ url: location.search, pressed: document.querySelector("[data-word-progress-state][aria-pressed='true']")?.dataset.wordProgressState ?? null,
    totals: (window.__stubWriteData || []).some((w) => w.col === "quranWordTotals"), occ: (window.__stubWriteData || []).some((w) => w.col === "quranWordProgress" && /2_131/.test(w.id)),
    back: document.querySelector("[data-word-card-app-back]")?.textContent.trim() ?? null, token: (() => { try { return sessionStorage.getItem("mmsa-dua-word-progress"); } catch { return "?"; } })() }));
  check(`${tag} ROUND 4: pressing Achieved records the dictionary word أَسْلَمَ as achieved everywhere -- the Qur'an word's own record`, lw.some((w) => w.lemma === "أَسْلَمَ" && w.state === "achieved" && w.id === "t1__p1__wbw__أَسْلَمَ"), JSON.stringify(lw));
  check(`${tag} ROUND 4: ...through the Word card's own saving: the place 2:131:7 and the "You know" totals too`, after.occ && after.totals, JSON.stringify(after));
  check(`${tag} ROUND 4: ...the Word card shows Achieved, with "← ${lang === "bn" ? "দুআ ১-এ ফিরে যান" : "Back to Dua 1"}" in it`, after.pressed === "achieved" && after.back === `← ${lang === "bn" ? "দুআ ১-এ ফিরে যান" : "Back to Dua 1"}`, JSON.stringify(after));
  check(`${tag} ROUND 4: ...the one-use token is gone and the address no longer asks to record`, after.token === null && !/progress=/.test(after.url), JSON.stringify(after));
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();

  // Round 4: a bare link (no token from a Dua card) records nothing.
  const ctx2 = await context(lang, width, look);
  const { page: Q } = await openPage(ctx2, "/app/quranrevival.html?word=2:131:7&progress=achieved");
  await Q.waitForFunction(() => /2:131:7/.test(document.querySelector("[data-word-card-content]")?.innerText ?? ""), null, { timeout: 25000 }).catch(() => {});
  await Q.waitForTimeout(2500);
  const bare = await Q.evaluate(() => ({ open: /2:131:7/.test(document.querySelector("[data-word-card-content]")?.innerText ?? ""), writes: (window.__stubWriteData || []).filter((w) => /quranLemmaProgress|quranWordProgress|quranWordTotals/.test(w.col)).length }));
  check(`${tag} ROUND 4: a bare "…&progress=achieved" link opens the Word card and records NOTHING`, bare.open && bare.writes === 0, JSON.stringify(bare));
  await ctx2.close();
}
await browser.close();
console.log(`\n==== Dua word card: «و» and spellings, dictionaries and places, progress through the Word card: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

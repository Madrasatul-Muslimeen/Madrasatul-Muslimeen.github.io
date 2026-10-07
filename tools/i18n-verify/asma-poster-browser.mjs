// Owner decision 85 (7 Oct 2026) -- the Asmaul Husna poster is a TRUE COPY of the Owner's template
// (docs/reference/2026-10-07-asma-poster-template-al-witr.png), and its references open inside the app.
// Run from the repository root with serve.js on :8080:  node tools/i18n-verify/asma-poster-browser.mjs
//
// Expected values are written BY HAND: the template's measured positions, the Hadith words, Ar-Rahman's Arabic.
// The Hadith links are proven against the library's own files (each passage must hold the narration's words), then
// in the browser (the library opens on that passage). Mutations (--mutate=<name>) break one thing each:
//   wrong-passage  a Hadith link points one passage off          -> the library-words checks fail
//   no-fit         the poster is never fitted                    -> the "stays inside its place" checks fail
//   not-interactive the full-size poster has no reference buttons -> the reference-tap checks fail
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUTATIONS = {
  "wrong-passage": ['"bukhari:6410": { openiti: { versionUri: "0256Bukhari.Sahih.JK000110-ara1", n: 6682 }', '"bukhari:6410": { openiti: { versionUri: "0256Bukhari.Sahih.JK000110-ara1", n: 6683 }'],
  "no-fit": ["for (const p of posters) {\n    if (!p.getBoundingClientRect().width) continue;", "for (const p of []) {\n    if (!p.getBoundingClientRect().width) continue;"],
  "not-interactive": ['renderAsmaPosterHtml(entry, "standalone", { interactive: true })', 'renderAsmaPosterHtml(entry, "standalone")'],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const mutated = (src) => { const [a, b] = MUTATIONS[MUTATE]; if (!src.includes(a)) throw new Error(`mutation target not found: ${MUTATE}`); return src.split(a).join(b); };

// ---- 1. The Hadith table against the library's own files ----------------------------------------------------
const posterSrc = fs.readFileSync("app/js/asma-poster.js", "utf8");
const tableSrc = MUTATE === "wrong-passage" ? mutated(posterSrc) : posterSrc;
const POSTER_HADITH = {};
for (const m of tableSrc.matchAll(/"([a-z]+:\d+)": \{ openiti: \{ versionUri: "([^"]+)", n: (\d+) \}, edition: [^,]+, words: "([^"]+)" \}/g)) {
  POSTER_HADITH[m[1]] = { versionUri: m[2], n: Number(m[3]), words: m[4] };
}
const norm = (s) => String(s).replace(/[ً-ٰٟـ]/g, "").replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[^ء-ي ]/g, " ").replace(/\s+/g, " ").trim();
check("POSITIVE CONTROL: the table parses to the 14 Hadith the posters cite that the library holds", Object.keys(POSTER_HADITH).length === 14, Object.keys(POSTER_HADITH).join(","));
const base = "tools/hadith-data-pull/output/openiti-release/split";
for (const [key, h] of Object.entries(POSTER_HADITH)) {
  const index = JSON.parse(fs.readFileSync(`${base}/${h.versionUri}/index.json`, "utf8"));
  const chapter = index.chapters.find((c) => (c.hadithPositions ?? []).includes(h.n));
  let text = "";
  if (chapter) for (const f of chapter.shardFiles) for (const x of JSON.parse(fs.readFileSync(`${base}/${h.versionUri}/${f}`, "utf8")).hadiths) if (x.n === h.n) text = x.text;
  // Muslim's edition is in paragraphs: a narration may run on into the next one or two.
  if (key.startsWith("muslim:") && chapter && !norm(text).includes(norm(h.words))) {
    for (const f of chapter.shardFiles) for (const x of JSON.parse(fs.readFileSync(`${base}/${h.versionUri}/${f}`, "utf8")).hadiths) if (x.n > h.n && x.n <= h.n + 2) text += " " + x.text;
  }
  check(`${key}: library passage ${h.n} holds the narration's own words`, !!chapter && norm(text).includes(norm(h.words)), `${h.words} | ${text.slice(0, 80)}`);
}

// ---- 2. Every Name's poster (pure) ------------------------------------------------------------------------
const { asmaPosterModel } = await import("../../app/js/asma-poster.js").catch(() => ({}));
// asma-poster.js touches `document` only when drawing, so its model can be read here.
const { ASMA_NAMES } = await import("../../app/js/asma-data.js");
const { DEFAULT_EXTRA_ASMA_NAMES, DEFAULT_CANONICAL_REFS } = await import("../../app/js/asma-collections-data.js");
const names = [...ASMA_NAMES, ...DEFAULT_EXTRA_ASMA_NAMES].map((n) => ({ ...n, ref: n.ref ?? DEFAULT_CANONICAL_REFS[n.number] }));
const models = names.map((n) => asmaPosterModel(n));
check("every one of the 132 Names has a poster with its Name and its Arabic", models.length === 132 && models.every((m) => m.title && m.arabic), JSON.stringify(models.filter((m) => !(m.title && m.arabic)).map((m) => m.number)));
// Nine of the Owner's added Names carry only a Bangla meaning, and no archive poster gives an English one: they show
// no meaning line until the Owner supplies one (nothing is invented). Any OTHER Name without one is a defect.
const NO_ENGLISH_MEANING = [103, 106, 107, 123, 125, 126, 129, 130, 131];
check("every Name has its English meaning line, except the nine the Owner has not given one for yet", JSON.stringify(models.filter((m) => !m.meaning).map((m) => m.number)) === JSON.stringify(NO_ENGLISH_MEANING), JSON.stringify(models.filter((m) => !m.meaning).map((m) => m.number)));
check("decision 49 in the template's form: no poster says Lord or God", models.every((m) => !/\b(Lord|God)\b/.test(`${m.meaning} ${m.description}`)), JSON.stringify(models.filter((m) => /\b(Lord|God)\b/.test(`${m.meaning} ${m.description}`)).map((m) => m.number)));
const hadithCites = models.flatMap((m) => m.hadith);
check("every Hadith a poster cites opens in the library, except Sahih al-Jami' 1824 (not in it)", hadithCites.every((c) => c.link || c.key === "sahihjami:1824") && hadithCites.some((c) => c.key === "sahihjami:1824" && !c.link), JSON.stringify(hadithCites.filter((c) => !c.link).map((c) => c.key)));
const witr = models.find((m) => m.number === 102);
check("Al-Witr reads as the template: \"Al-Witr\", \"The One\", الوِتْر, \"Sahih al-Bukhari - 6410\"", witr.title === "Al-Witr" && witr.meaning === "The One" && witr.arabic === "الوِتْر" && witr.hadith[0]?.text === "Sahih al-Bukhari - 6410" && witr.description.startsWith("The One, the Only, the Single. He has no partners."), JSON.stringify(witr));
const rahman = models.find((m) => m.number === 1);
check("Ar-Rahman's two Ayat: the template's form first, the second short", rahman.quran.length === 2 && rahman.quran[0].text === "Quran 1:1, Surah Al-Faatiha" && rahman.quran[1].text === "· 55:1", JSON.stringify(rahman.quran));

// ---- 3. In the browser -------------------------------------------------------------------------------------
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function start(lang, width, height) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE === "no-fit" || MUTATE === "wrong-passage") await ctx.route("**/js/asma-poster.js", async (r) => {
    const res = await r.fetch(); await r.fulfill({ response: res, body: mutated(await res.text()) });
  });
  if (MUTATE === "not-interactive") await ctx.route("**/quranrevival.html", async (r) => {
    const res = await r.fetch(); await r.fulfill({ response: res, body: mutated(await res.text()) });
  });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
  return { ctx, page, errors };
}
async function openName(page, n) {
  if (!(await page.evaluate(() => !!document.querySelector("#asmaXSingleSelect")?.offsetParent))) {
    await page.click("#tabExploreBtn"); await page.waitForTimeout(600);
    await page.click("#explorePaletteAsmaBtn");
    await page.waitForFunction(() => document.querySelectorAll("#asmaXSingleSelect option").length > 1, null, { timeout: 8000 });
  }
  await page.selectOption("#asmaXSingleSelect", String(n));
  await page.waitForFunction((n) => document.querySelector(`#asmaXPosterPanel [data-asma-poster="${n}"]`), n, { timeout: 8000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}
/** Each placed piece inside the room the template gives it, measured on screen. */
const placement = (page, sel) => page.evaluate((sel) => {
  const p = document.querySelector(sel); const P = p.getBoundingClientRect();
  const r = (q) => { const e = p.querySelector(q); const b = e.getBoundingClientRect(); return { l: (b.left - P.left) / P.width, r: (b.right - P.left) / P.width, t: (b.top - P.top) / P.height, b: (b.bottom - P.top) / P.height }; };
  const d = p.querySelector(".ahp-desc"), refs = [...p.querySelectorAll(".ahp-ref")];
  return {
    ratio: P.width / P.height, title: r("[data-poster-title]"), meaning: r("[data-poster-meaning]"), arabic: r("[data-poster-arabic]"),
    descFits: d.scrollHeight <= d.clientHeight + 1,
    refsFit: refs.every((x) => { const b = x.getBoundingClientRect(); return [...x.children].every((c) => { const k = c.getBoundingClientRect(); return k.left >= b.left - 1 && k.right <= b.right + 1 && k.top >= b.top - 1 && k.bottom <= b.bottom + 1; }); }),
    refsOneLine: refs.every((x) => new Set([...x.children].map((c) => Math.round(c.getBoundingClientRect().top))).size <= 1),
  };
}, sel);

for (const [lang, width, height] of [["en", 390, 844], ["bn", 390, 844], ["en", 1280, 900], ["bn", 820, 1000]]) {
  const tag = `[${lang} ${width}]`;
  const { ctx, page, errors } = await start(lang, width, height);
  for (const n of [1, 85, 102, 3]) {
    await openName(page, n);
    const m = await placement(page, "#asmaXPosterPanel .ahp");
    check(`${tag} #${n}: the poster keeps the template's shape (1055 × 1491)`, Math.abs(m.ratio - 1055 / 1491) < 0.01, String(m.ratio));
    // The template's own rooms, as fractions of the poster: the arch at the Name's and the meaning's height, the cartouche.
    check(`${tag} #${n}: Name and meaning stay inside the arch, the Arabic inside its cartouche`,
      m.title.l >= 0.375 && m.title.r <= 0.625 && m.meaning.l >= 0.35 && m.meaning.r <= 0.65 && m.arabic.l >= 0.31 && m.arabic.r <= 0.69, JSON.stringify({ t: m.title, mn: m.meaning, a: m.arabic }));
    check(`${tag} #${n}: the description fits its place, each reference box holds one line inside it`, m.descFits && m.refsFit && m.refsOneLine, JSON.stringify(m));
  }
  // Ar-Rahman's Arabic, as the archive poster writes it.
  await openName(page, 1);
  const ar = await page.evaluate(() => document.querySelector("#asmaXPosterPanel [data-poster-arabic]").textContent);
  check(`${tag} Ar-Rahman's poster shows الرَّحْمٰنُ`, ar === "الرَّحْمٰنُ", ar);

  // Full size: the references are buttons and links.
  await page.click("#asmaXPosterPanel");
  await page.waitForFunction(() => document.querySelector("#asmaXPosterOverlay.open .ahp-standalone"), null, { timeout: 5000 }).catch(() => {});
  const big = await page.evaluate(() => {
    const o = document.querySelector("#asmaXPosterOverlay.open .ahp-standalone"); if (!o) return null;
    const q = [...o.querySelectorAll("[data-poster-quran]")], b = o.getBoundingClientRect();
    return { q: q.map((x) => x.dataset.posterQuran), qHit: q.every((x) => { const r = x.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e === x || x.contains(e); }),
      inView: b.top >= -1 && b.bottom <= innerHeight + 1 && b.left >= -1 && b.right <= innerWidth + 1 };
  });
  check(`${tag} full size: Ar-Rahman's two Ayat are buttons (1:1, 55:1), tappable, the poster fully on screen`, !!big && big.q.join() === "1:1,55:1" && big.qHit && big.inView, JSON.stringify(big));
  if (big?.q.length) {
    await page.click('#asmaXPosterOverlay [data-poster-quran="55:1"]');
    await page.waitForFunction(() => !document.querySelector("#asmaXPosterOverlay.open") && document.querySelector("#noteView:not([hidden])"), null, { timeout: 8000 }).catch(() => {});
    const went = await page.evaluate(() => ({ closed: !document.querySelector("#asmaXPosterOverlay.open"), surah: document.getElementById("surahSelect")?.value, ayah: document.getElementById("ayahSelect")?.value }));
    check(`${tag} tapping "· 55:1" closes the poster and opens Ar-Rahman 55:1 here`, went.closed && went.surah === "55" && went.ayah === "1", JSON.stringify(went));
  } else check(`${tag} tapping "· 55:1" closes the poster and opens Ar-Rahman 55:1 here`, false, "no button");
  if (width === 390) { await openName(page, 102); await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/asma-poster-${lang}-${width}.png` }); }
  // Al-Witr full size: its Hadith is a link to the library, at that narration.
  await openName(page, 102);
  await page.click("#asmaXPosterPanel");
  await page.waitForTimeout(300);
  const href = await page.evaluate(() => document.querySelector('#asmaXPosterOverlay.open [data-poster-hadith="bukhari:6410"]')?.getAttribute("href") ?? null);
  check(`${tag} Al-Witr's "Sahih al-Bukhari - 6410" links to the library at that narration`, href === "./hadith-collections.html?openiti=0256Bukhari.Sahih.JK000110-ara1&passage=6682", href);
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|fonts\.g/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// The library opens on the narration (three books, three numbering styles).
for (const key of ["bukhari:6410", "muslim:487", "tirmidhi:3507"]) {
  const h = POSTER_HADITH[key];
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 } });
  const { page } = await openPage(ctx, `/app/hadith-collections.html?openiti=${h.versionUri}&passage=${h.n}`);
  await page.waitForFunction(() => document.querySelector("[data-openiti-focused]") || document.querySelector("[data-openiti-error]"), null, { timeout: 15000 }).catch(() => {});
  const got = await page.evaluate(() => { const c = document.querySelector("[data-openiti-focused]"); if (!c) return null; const r = c.getBoundingClientRect(); return { n: c.dataset.openitiPassage, text: c.textContent, onScreen: r.top < innerHeight && r.bottom > 0 }; });
  const words = norm(POSTER_HADITH[key].words);
  check(`library link ${key}: opens on passage ${h.n}, on screen, marked`, !!got && got.n === String(h.n) && got.onScreen, JSON.stringify(got && { n: got.n, onScreen: got.onScreen }));
  check(`library link ${key}: that passage is the narration (its words)`, !!got && (norm(got.text).includes(words) || key.startsWith("muslim:")), got?.text.slice(0, 60));
  await ctx.close();
}

// The template, measured: Al-Witr drawn at the template's own width lands where the template prints it (±5px).
{
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 1100, height: 1600 } });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const box = await page.evaluate(async () => {
    const { renderAsmaPoster, fitAsmaPosters } = await import("/app/js/asma-poster.js");
    const w = document.createElement("div"); w.style.cssText = "position:absolute;left:0;top:0;width:1055px;z-index:99999"; document.body.appendChild(w);
    w.innerHTML = renderAsmaPoster({ number: 102, transliteration: "Al-Witr", arabic: "الوتر", ref: "সহীহ বুখারী ৬৪১০ — সহীহ" }, "explore");
    await document.fonts.ready; fitAsmaPosters(w);
    const p = w.firstElementChild.getBoundingClientRect(); const d = w.querySelector(".ahp-desc").getBoundingClientRect();
    return { w: p.width, h: p.height, descL: d.left - p.left, descT: d.top - p.top, descW: d.width };
  });
  check("Al-Witr at 1055px: the poster is 1055 × 1491 and the description sits at the template's place (x 224, y 700, 610 wide)",
    Math.abs(box.w - 1055) < 1 && Math.abs(box.h - 1491) < 2 && Math.abs(box.descL - 224) <= 5 && Math.abs(box.descT - 700) <= 5 && Math.abs(box.descW - 610) <= 5, JSON.stringify(box));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Asmaul Husna poster, a true copy with references that open (decision 85): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

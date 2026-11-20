// The Owner, 20 Nov 2026 ("Keep doing now for every month"): Bewley as an English translation, in the layout its translators publish, for the hizbs published so far
// (output/bewley/, added to monthly by tools/quran-data-pull/pull-bewley.mjs). Saheeh International stays the default; every verse not published keeps Saheeh.
//   node tools/i18n-verify/bewley-translation-browser.mjs [--mutate=NAME]   (repo root, serve.js on :8080 / QR_BASE)
//   --mutate=norhythm   the renderer ignores the book's lines                  -> "26:109 is set as the book sets it" FAILS
//   --mutate=noindent   the indent steps are not drawn                         -> "each nested line steps in further" FAILS
//   --mutate=leak       Bewley is applied even when Saheeh is chosen           -> "Saheeh is the default" FAILS
//   --mutate=nofallback a verse not published loses its English                -> "a verse not published keeps Saheeh" FAILS
//   --mutate=eager      Bewley's index is fetched even when Saheeh is chosen   -> "nothing of Bewley is fetched unless it is chosen" FAILS
//   --mutate=race       a late Bewley answer overwrites a choice made since        -> "a quick Bewley then Saheeh ends on Saheeh" FAILS
//   --mutate=nomem      the choice is not kept when storage refuses it            -> "where storage is blocked the choice still holds" FAILS
//   --mutate=gapbadge   the stanza space is put on the words, after the number     -> "a line of space BEFORE the verse number" FAILS
//   --mutate=covempty   a failed index looks like "nothing published"                 -> "coverage tells 'could not reach'" FAILS
//   --mutate=failsilent a failed sūrah file is not reported                         -> "a published sūrah whose file fails is reported" FAILS
//   --mutate=cachenull  a failed index request is remembered for the session      -> "a failed Bewley request is asked again" FAILS
//   --mutate=nogap      the stanza break is not drawn                          -> "a stanza break leaves a line of space" FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  norhythm: ["app/js/ayah-renderer.js", 'if (lang === "en" && ayah.rhythm?.lines?.length) {', 'if (false) {'],
  noindent: ["app/quranrevival.html", "padding-inline-start: calc(var(--i, 0) * 1.4em); }", "padding-inline-start: 0; }"],
  leak: ["app/js/quran-data.js", "choice = getEnglishTranslator(); want = choice === \"bewley\" ? await bewleyFor(surah.surahNumber) : null;", "choice = getEnglishTranslator(); want = await bewleyFor(surah.surahNumber);"],
  nofallback: ["app/js/quran-data.js", "else { delete a.rhythm; t.en = t.enSaheeh; }", 'else { delete a.rhythm; t.en = ""; }'],
  eager: ["app/js/quran-data.js", "choice = getEnglishTranslator(); want = choice === \"bewley\" ? await bewleyFor(surah.surahNumber) : null;", "choice = getEnglishTranslator(); want = await bewleyFor(surah.surahNumber); if (choice !== \"bewley\") want = null;"],
  race: ["app/js/quran-data.js", "do { choice = getEnglishTranslator(); want = choice === \"bewley\" ? await bewleyFor(surah.surahNumber) : null; } while (getEnglishTranslator() !== choice);", "choice = getEnglishTranslator(); want = choice === \"bewley\" ? await bewleyFor(surah.surahNumber) : null;"],
  nomem: ["app/js/quran-data.js", "  if (chosenEnglish) return chosenEnglish;\n", ""],
  gapbadge: ["app/js/ayah-renderer.js", "${gap && !badge ? \" ayah-rhythm-gap\" : \"\"}", "${gap ? \" ayah-rhythm-gap\" : \"\"}"],
  covempty: ["app/js/quran-data.js", "if (!idx) return bewleyIndexFailed ? { unavailable: true } : null;", "if (!idx) return null;"],
  failsilent: ["app/js/quran-data.js", "bewleySurahs.delete(surahNumber); bewleyFailedSurahs.add(surahNumber);", "bewleySurahs.delete(surahNumber);"],
  cachenull: ["app/js/quran-data.js", ".catch(() => { forget(); return null; });", ".catch(() => { return null; });"],
  nogap: ["app/quranrevival.html", ".ayah-num-row.ayah-rhythm-gap { margin-top: 0.9em; }", ".ayah-num-row.ayah-rhythm-gap { margin-top: 0; }"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error(`promise: ${n}`); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const S26 = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/surahs/surah_026.json", "utf8"));
const B26 = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/bewley/surah_026.json", "utf8"));
const saheeh = (n) => S26.ayahs.find((a) => a.ayah === n).translations.en;
const sleep = (p, ms) => p.waitForTimeout(ms);
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);

for (const [lang, width] of [["en", 390], ["en", 1280], ["bn", 390]]) {
  const tag = `[${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) { const [file, a, b] = MUT[MUTATE]; await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (src.split(a).length !== 2) throw new Error(`mutation anchor missing or not unique: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) }); }); }
  const bewleyRequests = [];
  ctx.on("request", (rq) => { if (/\/bewley\//.test(rq.url())) bewleyRequests.push(rq.url()); });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await sleep(page, 500);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await sleep(page, 150); }
  await page.click("#tabReadBtn"); await sleep(page, 500);
  const show = async (surah, ayah) => { await setSel(page, "surahSelect", String(surah)); await sleep(page, 1200); await setSel(page, "unitTypeSelect", "ayah"); await sleep(page, 600); await setSel(page, "ayahSelect", String(ayah)); await sleep(page, 900); };
  const en = () => page.evaluate(() => { const e = document.querySelector("#readView .ayah-translation:not(.ayah-translation-bn), #ayahPanels .ayah-translation:not(.ayah-translation-bn)"); if (!e) return null; const lines = [...e.querySelectorAll(".ayah-rhythm-line")].map((l) => ({ t: l.textContent.trim(), pad: Math.round(parseFloat(getComputedStyle(l).paddingInlineStart)) })); const prev = e.previousElementSibling, gapEl = prev?.classList?.contains("ayah-num-row") ? prev : e; // the stanza space belongs on the verse number when there is one (Codex P2 on #1814)
    return { text: e.textContent.trim(), rhythm: e.classList.contains("ayah-rhythm"), gap: gapEl.classList.contains("ayah-rhythm-gap"), mt: Math.round(parseFloat(getComputedStyle(gapEl).marginTop)), textMt: Math.round(parseFloat(getComputedStyle(e).marginTop)), onBadge: gapEl !== e, lines, tr: e.dataset.translator ?? null }; });

  await show(26, 109);
  const d = await en();
  check(`${tag} POSITIVE CONTROL: 26:109 is on screen with its English`, !!d && d.text.length > 10, JSON.stringify(d));
  check(`${tag} Saheeh is the default: 26:109 is Saheeh's plain English, no book layout`, !!d && !d.rhythm && d.text === saheeh(109), JSON.stringify(d));
  check(`${tag} nothing of Bewley is fetched unless it is chosen (no request to /bewley/)`, bewleyRequests.length === 0, bewleyRequests.join(" "));
  check(`${tag} the choice is Saheeh in the select, and the note is hidden`, await page.evaluate(() => document.getElementById("trEnChoiceSelect")?.value === "saheeh" && document.getElementById("trEnChoiceNote")?.hidden === true));

  await setSel(page, "trEnChoiceSelect", "bewley"); await sleep(page, 1500);
  const b = await en();
  const want109 = B26.ayahs["109"].lines;
  check(`${tag} 26:109 is set as the book sets it: ${want109.length} lines, the translators' words`, !!b && b.rhythm && b.tr === "bewley" && b.lines.length === want109.length && b.lines.every((l, i) => l.t === want109[i].t), JSON.stringify(b));
  check(`${tag} each nested line steps in further than the one above (the book's 0, 1, 2)`, !!b && b.lines.length === 3 && b.lines[0].pad < b.lines[1].pad && b.lines[1].pad < b.lines[2].pad, JSON.stringify(b?.lines));
  const note = await page.evaluate(() => ({ hidden: document.getElementById("trEnChoiceNote")?.hidden, text: document.getElementById("trEnChoiceNote")?.textContent ?? "" }));
  check(`${tag} the note says how many verses are published and credits the translators`, note.hidden === false && /Bewley|বিউলি/.test(note.text) && /aishabewley\.org/.test(note.text) && /search|অনুসন্ধান/i.test(note.text) && /[\d\u09E6-\u09EF]/.test(note.text), JSON.stringify(note));
  check(`${tag} only sūrah 26's file was fetched, with the index (not any other sūrah)`, bewleyRequests.length > 0 && bewleyRequests.every((u) => /bewley\/(index|surah_026)\.json/.test(u)), bewleyRequests.join(" "));

  await show(26, 107);
  const g = await en();
  check(`${tag} a stanza break leaves a line of space BEFORE the verse number (not between the number and its words): 26:107 starts a new stanza in the book`, !!g && g.gap === true && g.mt >= 8 && g.onBadge === true && g.textMt <= 6, JSON.stringify(g));
  await show(26, 104);
  const f = await en();
  check(`${tag} a verse not published keeps Saheeh (26:104 is in the hizb before)`, !!f && !f.rhythm && f.text === saheeh(104), JSON.stringify(f));
  await show(2, 5);
  const o = await en();
  check(`${tag} a sūrah with nothing published keeps Saheeh and fetches no Bewley file for it`, !!o && !o.rhythm && o.text.length > 10 && !bewleyRequests.some((u) => /surah_002/.test(u)), JSON.stringify([o?.rhythm, bewleyRequests.filter((u) => /surah_002/.test(u))]));

  await page.reload({ waitUntil: "networkidle" }); await sleep(page, 800);
  check(`${tag} the choice is remembered across a reload`, await page.evaluate(() => document.getElementById("trEnChoiceSelect")?.value === "bewley"));
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await sleep(page, 150); }
  await page.click("#tabReadBtn"); await sleep(page, 500);
  await show(26, 109);
  const r = await en();
  check(`${tag} after the reload 26:109 is still in the book's layout`, !!r && r.rhythm && r.lines.length === 3, JSON.stringify(r));

  await setSel(page, "trEnChoiceSelect", "saheeh"); await sleep(page, 1200);
  const back = await en();
  check(`${tag} choosing Saheeh again gives back its plain English and hides the note`, !!back && !back.rhythm && back.text === saheeh(109) && (await page.evaluate(() => document.getElementById("trEnChoiceNote")?.hidden === true)), JSON.stringify(back));
  await ctx.close();
}

// ---- Codex P2s on #1814: a quick Bewley-then-Saheeh while Bewley's files are on their way, and storage that refuses the choice ----------------------------
{
  const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) { const [file, a, b] = MUT[MUTATE]; await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (src.split(a).length !== 2) throw new Error(`mutation anchor missing or not unique: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) }); }); }
  await ctx.route("**/output/bewley/**", async (r) => { await new Promise((x) => setTimeout(x, 700)); await r.continue(); }); // Bewley's files are slow
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await sleep(page, 500);
  const race = await page.evaluate(async () => {
    const m = await import("/app/js/quran-data.js");
    await m.getSurah(26); // loaded first, so both choices below have a surah to redraw
    const p1 = m.setEnglishTranslator("bewley");
    await new Promise((r) => setTimeout(r, 150));
    const p2 = m.setEnglishTranslator("saheeh");
    await Promise.all([p1, p2]);
    const a = (await m.getSurah(26)).ayahs.find((x) => x.ayah === 109);
    return { choice: m.getEnglishTranslator(), rhythm: !!a.rhythm, en: a.translations.en, saheeh: a.translations.enSaheeh };
  });
  check("a quick Bewley then Saheeh, with Bewley's files still on their way, ends on Saheeh: the choice and the text agree", race.choice === "saheeh" && !race.rhythm && race.en === race.saheeh && race.en === saheeh(109), JSON.stringify(race));
  await ctx.close();
}
{
  const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) { const [file, a, b] = MUT[MUTATE]; await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (src.split(a).length !== 2) throw new Error(`mutation anchor missing or not unique: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) }); }); }
  await ctx.addInitScript(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === "qr.englishTranslator") throw new Error("blocked"); return o.call(this, k, v); }; });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await sleep(page, 500);
  const mem = await page.evaluate(async () => {
    const m = await import("/app/js/quran-data.js");
    await m.setEnglishTranslator("bewley");
    const a = (await m.getSurah(26)).ayahs.find((x) => x.ayah === 109);
    return { choice: m.getEnglishTranslator(), rhythm: !!a.rhythm, stored: localStorage.getItem("qr.englishTranslator") };
  });
  check("where storage is blocked the choice still holds for this visit: Bewley is chosen and shown", mem.choice === "bewley" && mem.rhythm === true && mem.stored === null, JSON.stringify(mem));
  await ctx.close();
}
{
  // Codex P2 on #1814: a failed request is not remembered. The first request for Bewley's index fails; choosing Bewley again later works.
  const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) { const [file, a, b] = MUT[MUTATE]; await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (src.split(a).length !== 2) throw new Error(`mutation anchor missing or not unique: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) }); }); }
  let tries = 0, failIndex = true;
  await ctx.route("**/output/bewley/index.json", async (r) => { tries++; if (failIndex) await r.abort("failed"); else await r.continue(); });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await sleep(page, 500);
  await page.evaluate(async () => { const m = await import("/app/js/quran-data.js"); await m.getSurah(26); });
  const first = await page.evaluate(async () => { const m = await import("/app/js/quran-data.js"); await m.setEnglishTranslator("bewley"); return !!(await m.getSurah(26)).ayahs.find((x) => x.ayah === 109).rhythm; }); // every index request fails
  const covFailed = await page.evaluate(async () => { const m = await import("/app/js/quran-data.js"); const c = await m.getBewleyCoverage(); return c?.unavailable === true; });
  const triesAfterFirst = tries;
  failIndex = false; // the network is back
  const second = await page.evaluate(async () => { const m = await import("/app/js/quran-data.js"); await m.setEnglishTranslator("bewley"); return !!(await m.getSurah(26)).ayahs.find((x) => x.ayah === 109).rhythm; });
  const covOk = await page.evaluate(async () => { const m = await import("/app/js/quran-data.js"); const c = await m.getBewleyCoverage(); return !c?.unavailable && !!c?.surahs?.[26]; });
  const retry = { firstRhythm: first, secondRhythm: second };
  check("a failed Bewley request is asked again: the first try fails (Saheeh shown), choosing Bewley again works", retry.firstRhythm === false && retry.secondRhythm === true && tries > triesAfterFirst, JSON.stringify({ ...retry, tries, triesAfterFirst }));
  check("coverage tells 'could not reach' (unavailable) apart from 'nothing published' while the request fails, and reads the index once it works", covFailed === true && covOk === true, JSON.stringify({ covFailed, covOk }));
  await ctx.close();
}
{
  // Codex P2 on #1814: the index loads but a published sūrah's file fails -> the note must be able to say so (and the next choice retries)
  const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) { const [file, a, b] = MUT[MUTATE]; await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (src.split(a).length !== 2) throw new Error(`mutation anchor missing or not unique: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "application/javascript", body: src.split(a).join(b) }); }); }
  let failSurah = true;
  await ctx.route("**/output/bewley/surah_026.json", async (r) => { if (failSurah) await r.abort("failed"); else await r.continue(); });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await sleep(page, 500);
  await page.evaluate(async () => { const m = await import("/app/js/quran-data.js"); await m.getSurah(26); window.__bw = 0; window.addEventListener("qr:bewley-failed", () => { window.__bw++; }); });
  const first = await page.evaluate(async () => { const m = await import("/app/js/quran-data.js"); await m.setEnglishTranslator("bewley"); const r = !!(await m.getSurah(26)).ayahs.find((x) => x.ayah === 109).rhythm; const c = await m.getBewleyCoverage(); return { rhythm: r, failed: c?.failedSurahs ?? null, signalled: window.__bw }; });
  failSurah = false;
  const second = await page.evaluate(async () => { const m = await import("/app/js/quran-data.js"); await m.setEnglishTranslator("bewley"); const r = !!(await m.getSurah(26)).ayahs.find((x) => x.ayah === 109).rhythm; const c = await m.getBewleyCoverage(); return { rhythm: r, failed: c?.failedSurahs ?? null }; });
  check("a published sūrah whose file fails is reported (coverage names it, the page is told) while Saheeh shows; choosing again works and clears it", first.rhythm === false && JSON.stringify(first.failed) === "[26]" && first.signalled >= 1 && second.rhythm === true && second.failed === null, JSON.stringify({ first, second }));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Bewley as an English translation (the Owner, 20 Nov 2026)${MUTATE ? ` [MUTATE=${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

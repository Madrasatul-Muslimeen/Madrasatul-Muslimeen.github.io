// Audit part 16 (PCF J29, manual audit): the User Manual's "Hadith and Dua" features, each one WORKING.
// Measured on the rendered page at 390 / 820 / 1440 (and 320 for anything that opens a card or sheet), English and Bangla.
// The result is asserted, not the element: the narration shown after Go to number, a stored write (window.__stubWriteData)
// with the right person, document and unit key, the place returned to after ← Back.
//   1 Hadith library: HadeethEnc (category, hadith, grade, explanation, Text language)
//   2 Hadith library: Arabic books (OpenITI): Go to number (Standard / This edition's), English translation
//   3 Hadith "Studied" and notes (hadith:hadeethenc:<id>, 👥, D10, 📝 and 🔖 with a way back, OpenITI "not enabled yet")
//   4 Dua cards (‹ Previous / Next ›, With / Without vowels, Narrated in N places, ← Back to Dua, Dua chapters)
//   5 Dua progress, words, notes and bookmarks (dua:<n> once, word card, Open in the Word card, 📝 and 🔖)
//   6 ✓ Check this dua (owner/prime opens, Narrations, Words, Save, ← Back; a reader does not see it, nothing is blank)
//   7 Bangla: no English left on these features
// Each flow has a POSITIVE CONTROL and a timeout that fails by name. Mutations: --mutate=<name> restores a defect.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part16-hadith-dua-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const PROBE = process.env.PROBE === "1" || process.argv.includes("--probe");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);
const WONLY = Number((process.argv.find((a) => a.startsWith("--width=")) || "").slice(8)) || 0;
const LONLY = (process.argv.find((a) => a.startsWith("--lang=")) || "").slice(7);
// No defect was found in this audit, so these are PROOFS THAT THE CHECKS CAN FAIL: each breaks the feature it guards.
const MUTATIONS = {
  // The Text language choice changes nothing.
  "nolang": ["app/js/hadith-browser.js", "**/js/hadith-browser.js*", 'sel.addEventListener("change", () => { state.contentLang = sel.value; render(); });', ""],
  // Go to number by the Standard number reads the edition's own number.
  "gostd": ["app/js/hadith-browser.js", "**/js/hadith-browser.js*", "const n = conc.firstNByCite.get(Math.trunc(Number(input.value)));", "const n = Math.trunc(Number(input.value));"],
  // Studied writes under the wrong unit key.
  "wrongkey": ["app/js/hadith-study-actions.js", "**/js/hadith-study-actions.js*", 'return buildUnitKey.hadith("hadeethenc", String(id));', 'return buildUnitKey.hadith("bukhari", String(id));'],
  // FIXED in this round: a narration taller than the screen is centred, so its number is scrolled past (restores the old scroll).
  "nostart": ["app/js/hadith-browser.js", "**/js/hadith-browser.js*", 'block: target.getBoundingClientRect().height > innerHeight ? "start" : "center" });', 'block: "center" });'],
  // FIXED in this round: the way back is not sticky, so after a jump it is thousands of pixels up the chapter.
  "nosticky": ["app/css/hadith.css", "**/css/hadith.css*", "position: sticky; top: 0; z-index: 5; background: #fff; border: 1px solid var(--hadith-rule);", "border: 1px solid var(--hadith-rule);"],
  // The 👥 list is ignored: Studied is written for the page's person only.
  "selfonly": ["app/js/hadith-study-actions.js", "**/js/hadith-study-actions.js*", "const targets = personIds?.length ? personIds : [session.personId];", "const targets = [session.personId];"],
  // The Dua list's Next › does nothing.
  "nonext": ["app/js/dua-browser.js", "**/js/dua-browser.js*", "next.addEventListener(\"click\", () => { state.dua.page = page + 1; render(); document.getElementById(\"duaCards\")?.scrollIntoView({ block: \"start\" }); });", ""],
  // ← Back to Dua drops the dua the reader came from.
  "noduaback": ["app/js/dua-browser.js", "**/js/dua-browser.js*", "state.dua.page = page; state.dua.focusDua = c.dua; render(); } }] };", "state.dua.page = page; render(); } }] };"],
  // The vowels switch changes nothing.
  "notoggle": ["app/js/dua-browser.js", "**/js/dua-browser.js*", "words.querySelectorAll(\"[data-dua-word]\").forEach((w) => { w.textContent = plain ? w.dataset.plain : w.dataset.vowelled; });", ""],
  // ✓ Check this dua is offered to a reader too.
  "checkforall": ["app/js/dua-browser.js", "**/js/dua-browser.js*", "if (checkEnv?.session?.canCheck) card.appendChild(", "if (true) card.appendChild("],
  // The Check panel loses its Back button.
  "nocheckback": ["app/js/dua-check.js", "**/js/dua-check.js*", "  panel.appendChild(back);\n", "\n"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);

const SEED_FAMILY = `DATA.tenantPeople.push({ _id: "p3", tenantId: TENANT_ID, personId: "p3", name: lang("Yusuf", "ইউসুফ"), roles: ["guardian"] });`;
const SEED_CHECK = `DATA.ayahCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, collections: [] }];`;
const READER = `DATA.tenantMemberUids[0].roles = ["student"]; DATA.tenantPeople[0].roles = ["student"];`;

const browser = await chromium.launch();
const BN = /[ঀ-৿]/;
const bnDigits = (s) => String(s).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
const latin = (s) => String(s).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));
// English words that may stay on a Bangla page: the app's own names and the names of sources and books.
const ALLOWED = /HadeethEnc(?:\.com)?|OpenITI|MMSA|Hadith|hadith|Qur'?an|QuranRevival|Sahih|Bukhari|Muslim|Tirmidhi|Jami'?|Nasa'?i|Sunan|Abi|Abu|Dawud|Ibn|Majah|Riyad|Salihin|Salihin|Hisn|Adhkar|Nawawi|Amal|Yawm|Layla|Sunni|Adab|Mufrad|Kitab|Bab|Al-?[A-Za-z']+|An-?[A-Za-z']+|As-?[A-Za-z']+|Ar-?[A-Za-z']+|fawazahmed0|api|ITI/g;
const englishLeft = (text) => (String(text).replace(ALLOWED, " ").replace(/[؀-ۿ]+/g, " ").match(/[A-Za-z]{3,}/g) || []);

const CORPUS = path.join(ROOT, "tools/hadith-data-pull/output/hadeethenc");
const rec = (lang, id) => { const c = JSON.parse(fs.readFileSync(path.join(CORPUS, lang, "categories.json"), "utf8")); return JSON.parse(fs.readFileSync(path.join(CORPUS, c.hadithFile[id]), "utf8")).hadiths.find((h) => h.id === id); };
const REC = { ar: rec("ar", "4563"), en: rec("en", "4563"), bn: rec("bn", "4563") };
if (!REC.ar || !REC.en || !REC.bn || !REC.en.grade || !REC.en.explanation) throw new Error("fixture assumption broke: hadith 4563 (root category 3) needs ar, en, bn, a grade and an explanation");

async function open(lang, width, pagePath, { seed = "" } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: seed });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}

async function flow(name, lang, width, fn, opts = {}) {
  if (ONLY && !ONLY.split(",").some((o) => name === o)) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, opts.path || "/app/hadith-collections.html", opts), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.ctx, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 150000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}

const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 400) => page.waitForTimeout(ms);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
const writeCount = (page) => ev(page, () => (window.__stubWriteData || []).length);
const writesFrom = (page, k) => ev(page, (k) => (window.__stubWriteData || []).slice(k).map((x) => ({ kind: x.kind, col: x.col, id: x.id, data: x.data })), k);
// The record entries a write carries: { key, status, by }.
const entriesOf = (ws) => ws.filter((w) => w.col === "records").flatMap((w) => {
  const out = [];
  for (const [k, v] of Object.entries(w.data || {})) if (k.startsWith("entries.")) out.push({ id: w.id, key: k.slice(8), status: v?.claimedStatus, by: v?.claimedByPersonId });
  for (const [k, v] of Object.entries(w.data?.entries || {})) out.push({ id: w.id, key: k, status: v?.claimedStatus, by: v?.claimedByPersonId });
  return out;
});
const onTop = (page, sel) => ev(page, (s) => { const b = [...document.querySelectorAll(s)].find((x) => x.getClientRects().length); if (!b) return false; const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (t === b || b.contains(t)); }, sel);
const inScreen = (page, sel) => ev(page, (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: innerWidth, over: document.documentElement.scrollWidth - innerWidth }; }, sel);
const fits = (r) => !!r && r.l >= -1 && r.r <= r.w + 1 && r.over <= 0;
const leftIn = (page, sel) => ev(page, (s) => { const e = document.querySelector(s); return e ? e.innerText : ""; }, sel);
// The text of a region as the reader reads it, leaving out the Latin "Sounds like" transliteration (data, not a label).
const bodyOf = (page, sel) => ev(page, (s) => { const e = document.querySelector(s); if (!e) return ""; const c = e.cloneNode(true); c.querySelectorAll(".dua-word-translit").forEach((x) => x.remove()); return c.textContent; }, sel);

async function hadeethencOpen(page, cat, id) {
  await page.click('[data-hadith-tab="collections"]');
  await page.waitForSelector(`[data-hadeethenc-category="${cat}"]`, { timeout: 20000 });
  await page.click(`[data-hadeethenc-category="${cat}"]`);
  await page.waitForSelector(`[data-hadeethenc-hadith="${id}"]`, { timeout: 15000 });
  await page.click(`[data-hadeethenc-hadith="${id}"]`);
  await page.waitForSelector(`[data-hadeethenc-card="${id}"]`, { timeout: 15000 });
}
const BUKHARI = "0256Bukhari.Sahih.JK000110-ara1";
// Updated in place 28 Oct 2026 (PCF MSA J106 round 1): the library moved out of Collections (now "Encyclopedia") into
// Hadith Books, the page's default view. From another view its button goes to the shelf; on Books it would open the
// quick list instead, so it is tapped only when Books is not already the view.
async function toBooks(page) {
  const on = await page.$eval('[data-hadith-tab="books"]', (b) => b.getAttribute("aria-current") === "page").catch(() => false);
  if (!on) await page.click('[data-hadith-tab="books"]');
}
async function openBukhari(page) {
  await toBooks(page);
  await page.waitForSelector(`[data-openiti-book="${BUKHARI}"]`, { timeout: 25000 });
  await page.click(`[data-openiti-book="${BUKHARI}"]`);
  await page.waitForSelector("[data-openiti-goto-input]", { timeout: 15000 });
}
async function duaTab(page) {
  await page.click('[data-hadith-tab="dua"]');
  await page.waitForSelector("[data-dua-card]", { timeout: 20000 });
}

const WIDTHS = [320, 390, 820, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  const other = bn ? "en" : "bn";
  // 1: HadeethEnc.
  await flow("hadeethenc", lang, width, async (t, page, ctx, errors) => {
    await hadeethencOpen(page, "3", "4563");
    const c = await ev(page, () => { const card = document.querySelector('[data-hadeethenc-card="4563"]'); return { ar: card.querySelector(".hadith-arabic")?.textContent, tr: card.querySelector(".hadith-translation-text")?.textContent, grade: card.querySelector(".hadith-attribution")?.textContent ?? "", fallback: !!card.querySelector("[data-hadeethenc-fallback]"), sel: document.getElementById("hadithContentLang")?.value }; });
    if (PROBE) console.log(t, JSON.stringify(c).slice(0, 300));
    check(`${t}: POSITIVE CONTROL a HadeethEnc hadith (4563) opens with its Arabic and its ${bn ? "Bangla" : "English"} text, verbatim from the packaged record`, c.ar === REC.ar.hadeeth && c.tr === REC[lang].hadeeth && !c.fallback, JSON.stringify(c).slice(0, 200));
    check(`${t}: the Text language choice starts on ${bn ? "বাংলা" : "English"}`, c.sel === lang);
    check(`${t}: the grade is shown (${bn ? REC.bn.grade : "Authentic"})`, c.grade.includes(REC[lang].grade), c.grade);
    check(`${t}: the card sits inside the screen, no sideways scroll`, fits(await inScreen(page, '[data-hadeethenc-card="4563"]')));
    await page.click('[data-hadeethenc-card="4563"] [data-hadeethenc-explanation-toggle]');
    await settle(page, 200);
    const ex = await ev(page, () => { const d = document.querySelector('[data-hadeethenc-card="4563"] .hadeethenc-explanation'); return { open: d?.open, text: d?.innerText ?? "", hints: d?.querySelector("[data-hadeethenc-hints]")?.children.length ?? 0 }; });
    check(`${t}: Show explanation opens the explanation (${REC[lang].explanation.slice(0, 20)}…) and its ${REC[lang].hints?.length} hints`, ex.open && ex.text.includes(REC[lang].explanation.slice(0, 40)) && ex.hints === (REC[lang].hints || []).length, JSON.stringify(ex).slice(0, 200));
    // Text language: the other language, then Arabic only.
    await page.selectOption("#hadithContentLang", other);
    await page.waitForSelector('[data-hadeethenc-card="4563"]', { timeout: 10000 });
    await settle(page, 600);
    const o = await ev(page, () => document.querySelector('[data-hadeethenc-card="4563"] .hadith-translation-text')?.textContent ?? null);
    check(`${t}: choosing ${other === "bn" ? "বাংলা" : "English"} as the Text language shows that language's text (the packaged ${other} record)`, o === REC[other].hadeeth, String(o).slice(0, 80));
    await page.selectOption("#hadithContentLang", "ar");
    await settle(page, 600);
    const a = await ev(page, () => ({ tr: !!document.querySelector('[data-hadeethenc-card="4563"] .hadith-translation-text'), ar: document.querySelector('[data-hadeethenc-card="4563"] .hadith-arabic')?.textContent }));
    check(`${t}: choosing العربية shows the Arabic only`, !a.tr && a.ar === REC.ar.hadeeth, JSON.stringify(a).slice(0, 100));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 2: OpenITI: Go to hadith number, English translation.
  await flow("openiti", lang, width, async (t, page, ctx, errors) => {
    await openBukhari(page);
    const modes = await ev(page, () => [...document.querySelectorAll("[data-openiti-goto-mode] option")].map((o) => o.value));
    check(`${t}: POSITIVE CONTROL Bukhari's chapter list offers Go to hadith number with Standard / This edition's number`, modes.join() === "standard,edition", modes.join());
    // Standard 6306 = Sayyid al-Istighfar, passage 6578 (edition number 5947).
    await page.fill("[data-openiti-goto-input]", "6306");
    await page.click("[data-openiti-goto-btn]");
    await page.waitForSelector('[data-openiti-passage="6578"]', { timeout: 20000 }).catch(() => {});
    await settle(page, 1200);
    const s = await ev(page, () => { const c = document.querySelector('[data-openiti-passage="6578"]'); const r = c?.getBoundingClientRect(); return { focused: document.querySelector("[data-openiti-focused]")?.dataset.openitiPassage ?? null, text: c?.innerText ?? "", top: r?.top ?? -1, bottom: r?.bottom ?? -1, vh: innerHeight }; });
    if (PROBE) console.log(t, JSON.stringify({ ...s, text: s.text.slice(0, 60) }));
    check(`${t}: Go to the Standard number 6306 shows that narration: Bukhari 6306 (edition no. 5947, «سيد الاستغفار»), highlighted`, s.focused === "6578" && /(5947|٥٩٤٧|৫৯৪৭)/.test(s.text) && /(6306|৬৩০৬)/.test(s.text) && /سيد الاستغفار/.test(s.text), s.text.slice(0, 120));
    check(`${t}: ...and the narration's top (its number and standard number) is on screen, not scrolled past`, s.top >= -1 && s.top < s.vh - 100, JSON.stringify({ top: s.top, vh: s.vh }));
    check(`${t}: the narration is inside the screen`, fits(await inScreen(page, '[data-openiti-passage="6578"]')));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
  await flow("openiti-edition", lang, width, async (t, page, ctx, errors) => {
    await openBukhari(page);
    // This edition's number 5947 is the same narration.
    await page.selectOption("[data-openiti-goto-mode]", "edition");
    await page.fill("[data-openiti-goto-input]", "5947");
    await page.click("[data-openiti-goto-btn]");
    await page.waitForSelector('[data-openiti-passage="6578"]', { timeout: 20000 }).catch(() => {});
    // Updated in place 28 Oct 2026 (PCF MSA J106 round 1): the reader shows one narration at a time, so "the chapter
    // holding it" is now read as the narration itself, highlighted, with its chapter marked open in the Chapters pane
    // (it used to count the chapter's passage cards, > 5).
    const e = await ev(page, () => ({ text: document.querySelector('[data-openiti-passage="6578"]')?.innerText ?? "", focused: document.querySelector("[data-openiti-focused]")?.dataset.openitiPassage ?? null, chapter: document.querySelector('[data-openiti-chapter][aria-current="true"]')?.dataset.openitiChapter ?? null }));
    check(`${t}: Go to This edition's number 5947 opens that narration («Hadith 5947», standard 6306), highlighted, its chapter marked`, /(5947|৫৯৪৭)/.test(e.text.split("\n")[0]) && /(6306|৬৩০৬)/.test(e.text) && e.focused === "6578" && !!e.chapter, JSON.stringify({ head: e.text.slice(0, 60), focused: e.focused, chapter: e.chapter }));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
  await flow("openiti-missing", lang, width, async (t, page, ctx, errors) => {
    await openBukhari(page);
    // A number that does not exist says so in words.
    await page.fill("[data-openiti-goto-input]", "99999");
    await page.click("[data-openiti-goto-btn]");
    await settle(page, 300);
    const msg = await leftIn(page, "[data-openiti-goto-msg]");
    check(`${t}: a number that does not exist says so (${bn ? "Bangla" : "English"}), nothing blank`, msg.trim().length > 5 && (!bn || BN.test(msg)), msg);
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
  await flow("openiti-translation", lang, width, async (t, page, ctx, errors) => {
    await openBukhari(page);
    // The English / Bangla translation fold on the narration.
    await page.fill("[data-openiti-goto-input]", "6306");
    await page.click("[data-openiti-goto-btn]");
    await page.waitForSelector('[data-openiti-passage="6578"] [data-standard-translation="en"]', { timeout: 20000 });
    await ev(page, () => { const d = document.querySelector('[data-openiti-passage="6578"] [data-standard-translation="en"]'); d.scrollIntoView({ block: "center" }); d.querySelector("summary").click(); });
    await page.waitForFunction(() => document.querySelector('[data-openiti-passage="6578"] [data-standard-translation="en"] [data-standard-translation-text]'), null, { timeout: 15000 });
    const tr = await ev(page, () => { const d = document.querySelector('[data-openiti-passage="6578"] [data-standard-translation="en"]'); return { label: d.querySelector("summary").textContent, text: d.querySelector("[data-standard-translation-text]").textContent, lang: d.querySelector("[data-standard-translation-text]").lang }; });
    check(`${t}: the English translation opens and gives Bukhari 6306 («Shaddad bin Aus»)`, /Shaddad bin Aus/.test(tr.text) && tr.lang === "en", JSON.stringify(tr).slice(0, 160));
    if (bn) check(`${t}: its fold title is in Bangla`, BN.test(tr.label), tr.label);
    check(`${t}: no sideways scroll with the fold open`, fits(await inScreen(page, '[data-openiti-passage="6578"]')));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 3: Studied and notes.
  await flow("studied", lang, width, async (t, page, ctx, errors) => {
    await hadeethencOpen(page, "3", "4563");
    await page.waitForSelector('[data-hadeethenc-card="4563"] [data-claim-for]', { timeout: 15000 });
    await page.waitForSelector('[data-hadeethenc-card="4563"] [data-hadeethenc-bookmark][aria-disabled="false"]', { timeout: 15000 });
    const pk = await ev(page, () => { const r = document.querySelector('[data-hadeethenc-card="4563"] [data-claim-for]'); return { label: r.querySelector("[data-assign-trigger-label]")?.textContent, rows: [...r.querySelectorAll("[data-assign-list] input")].map((i) => [i.value, i.checked]) }; });
    check(`${t}: POSITIVE CONTROL Studied is there with the 👥 picker, the signed-in person (Ahsan) ticked alone`, pk.label === (bn ? "আহসান" : "Ahsan") && JSON.stringify(pk.rows) === JSON.stringify([["p1", true], ["p2", false], ["p3", false]]), JSON.stringify(pk));
    let k = await writeCount(page);
    await page.selectOption('[data-hadeethenc-studied="4563"]', "achieved");
    await page.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "records"), null, { timeout: 10000 }).catch(() => {});
    await settle(page, 500);
    let es = entriesOf(await writesFrom(page, k));
    check(`${t}: Studied writes ONE record for Ahsan: hadith:hadeethenc:4563, achieved, in t1__p1's Hadith records`, es.length === 1 && es[0].id.includes("__p1__") && es[0].key.startsWith("hadith:hadeethenc:4563") && es[0].status === "achieved", JSON.stringify(es));
    // 👥: tick Yusuf, untick Ahsan: only Yusuf is written; Ahsan's own status is unchanged (D10).
    const pick = async (id) => { await page.click('[data-hadeethenc-card="4563"] [data-claim-for] [data-assign-trigger]'); await settle(page, 120); await page.click(`[data-hadeethenc-card="4563"] [data-claim-for] [data-assign-list] input[value="${id}"]`); await page.click('[data-hadeethenc-card="4563"] [data-claim-for] [data-assign-trigger]'); await settle(page, 100); };
    await pick("p3"); await pick("p1");
    k = await writeCount(page);
    await page.selectOption('[data-hadeethenc-studied="4563"]', "learning");
    await page.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "records"), null, { timeout: 10000 }).catch(() => {});
    await settle(page, 600);
    es = entriesOf(await writesFrom(page, k));
    const shown = await ev(page, () => ({ v: document.querySelector('[data-hadeethenc-studied="4563"]').value, note: document.querySelector("[data-hadeethenc-recorded]")?.textContent ?? "" }));
    check(`${t}: 👥 with only Yusuf ticked writes ONE record, Yusuf's (p3), learning, claimed by the signed-in Ahsan`, es.length === 1 && es[0].id.includes("__p3__") && es[0].key.startsWith("hadith:hadeethenc:4563") && es[0].status === "learning" && es[0].by === "p1", JSON.stringify(es));
    check(`${t}: D10: Ahsan's own record is unchanged (the select still shows achieved) and the notice names Yusuf`, shown.v === "achieved" && shown.note.includes(bn ? "ইউসুফ" : "Yusuf"), JSON.stringify(shown));
    // 🔖 Bookmark.
    k = await writeCount(page);
    await page.click('[data-hadeethenc-bookmark="4563"]');
    await page.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "bookmarks"), null, { timeout: 10000 }).catch(() => {});
    await settle(page, 300);
    const bw = (await writesFrom(page, k)).filter((w) => w.col === "bookmarks").flatMap((w) => (w.data?.saved ?? []).map((b) => ({ id: w.id, moduleId: b.moduleId, position: b.position })));
    const bt = await ev(page, () => document.querySelector('[data-hadeethenc-bookmark="4563"]').textContent);
    check(`${t}: 🔖 Bookmark this saves hadith:hadeethenc:4563 in t1__p1's own bookmarks, and the button reads ★ ${bn ? "বুকমার্ক সরান" : "Remove bookmark"}`, bw.some((b) => b.id === "t1__p1" && b.moduleId === "hadith" && String(b.position).startsWith("hadith:hadeethenc:4563")) && bt.includes(bn ? "বুকমার্ক সরান" : "Remove bookmark"), JSON.stringify([bw, bt]));
    // 📝 My Notes with a way back.
    const href = await ev(page, () => document.querySelector('[data-hadeethenc-note-link="4563"]')?.getAttribute("href") ?? "");
    const q = new URLSearchParams(href.split("?")[1] ?? "");
    check(`${t}: 📝 My Notes opens notes.html for hadith:hadeethenc:4563 with back=1`, href.startsWith("notes.html?") && q.get("unit") === "hadith:hadeethenc:4563" && q.get("back") === "1", href);
    // UPDATED IN PLACE (audit part 147; stale since J108, v13.01): a plain press on 📝 no longer navigates to notes.html.
    // It opens a NEW Note in the shared Note opener over this page, and closing it is the way back. The old check waited
    // for a navigation that never comes, so it failed; the stub also logged "Note and Folder must exist" because it only
    // keeps the Note's folder when __stubApplyBatches is on (seeded below), which real Firestore never needs.
    // The link's own address (notes.html, back=1) is still followed below, so the Notes page's ← Back stays covered.
    await page.click('[data-hadeethenc-note-link="4563"]');
    const fEl = await page.waitForSelector("#noteOpener:not([hidden]) iframe", { timeout: 10000 }).catch(() => null);
    let nf = null;
    for (let i = 0; i < 100 && fEl && !nf; i++) { const f = await fEl.contentFrame(); if (f && /new=1/.test(f.url())) nf = f; else await page.waitForTimeout(100); }
    await nf?.waitForSelector("[data-edit-body] .mm-ref", { timeout: 20000 }).catch(() => {});
    check(`${t}: 📝 opens a NEW Note with hadith 4563 inside it, over the page`, !!nf && (await nf.evaluate(() => JSON.parse(document.querySelector("[data-edit-body] .mm-ref")?.getAttribute("data-mmsa-ref") || "{}").id).catch(() => null)) === "hadith:hadeethenc:4563");
    await nf?.click('[data-nn-tool="back"]').catch(() => {});
    await page.waitForFunction(() => document.getElementById("noteOpener")?.hidden, null, { timeout: 8000 }).catch(() => {});
    let went = true;
    await page.goto(new URL(href, page.url()).href, { waitUntil: "load" }).catch(() => { went = false; });
    if (went) {
      await page.waitForSelector("#notesBackBtn:not([hidden])", { timeout: 15000 }).catch(() => {});
      const bk = await ev(page, () => { const b = document.getElementById("notesBackBtn"); return b && !b.hidden ? { text: b.textContent, h: b.getBoundingClientRect().height } : null; });
      check(`${t}: the Notes page shows ${bn ? "← পেছনে" : "← Back"}, 40px tall`, bk?.text === (bn ? "← পেছনে" : "← Back") && bk.h >= 40, JSON.stringify(bk));
      if (bk) {
        await Promise.all([page.waitForURL(/hadith-collections\.html/, { timeout: 15000 }), page.click("#notesBackBtn")]).catch(() => {});
        await page.waitForSelector('[data-hadeethenc-card="4563"]', { timeout: 20000 }).catch(() => {});
        await settle(page, 1200);
        const there = await ev(page, () => { const c = document.querySelector('[data-hadeethenc-card="4563"]')?.getBoundingClientRect(); return { card: !!c, on: !!c && c.bottom > 0 && c.top < innerHeight }; });
        check(`${t}: ← Back lands on hadith 4563's card again, on screen`, there.card && there.on, JSON.stringify(there));
      }
    } else check(`${t}: My Notes opens the Notes page`, false);
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, { seed: SEED_FAMILY + " window.__stubApplyBatches = true;" });

  await flow("studied-openiti", lang, width, async (t, page, ctx, errors) => {
    await toBooks(page); // J106 round 1: the library is Hadith Books now (see toBooks)
    await page.waitForSelector("#openitiSection .openiti-study-soon", { timeout: 25000 });
    const soon = await leftIn(page, "#openitiSection .openiti-study-soon");
    check(`${t}: an OpenITI book says in words that Studied is "not enabled here yet" (${bn ? "Bangla" : "English"})`, soon.trim().length > 20 && (bn ? BN.test(soon) : /not enabled here yet/.test(soon)), soon);
    await openBukhari(page);
    await page.fill("[data-openiti-goto-input]", "6306");
    await page.click("[data-openiti-goto-btn]");
    await page.waitForSelector('[data-openiti-passage="6578"]', { timeout: 20000 });
    const ctrl = await ev(page, () => document.querySelectorAll('#openitiSection [data-hadeethenc-studied], #openitiSection [data-hadeethenc-bookmark], #openitiSection [data-hadeethenc-note-link]').length);
    check(`${t}: ...and offers no Studied / Bookmark / Notes control on an OpenITI narration (nothing half-working)`, ctrl === 0, String(ctrl));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 3b: a bookmark reopens the hadith (way back to the card).
  await flow("bookmark-resume", lang, width, async (t, page, ctx, errors) => {
    await page.waitForSelector('[data-hadeethenc-card="4563"]', { timeout: 25000 });
    const c = await ev(page, () => { const r = document.querySelector('[data-hadeethenc-card="4563"]')?.getBoundingClientRect(); return { on: !!r && r.bottom > 0 && r.top < innerHeight, ar: !!document.querySelector('[data-hadeethenc-card="4563"] .hadith-arabic') }; });
    check(`${t}: a bookmark's address (?resume=hadith:hadeethenc:4563) reopens that hadith's card, on screen`, c.on && c.ar, JSON.stringify(c));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, { path: "/app/hadith-study.html?resume=hadith:hadeethenc:4563" });

  // 4: Dua cards.
  await flow("dua", lang, width, async (t, page, ctx, errors) => {
    await duaTab(page);
    const list = () => ev(page, () => ({ count: document.querySelector(".dua-cards-count")?.textContent ?? "", ids: [...document.querySelectorAll("[data-dua-card]")].map((c) => Number(c.dataset.duaCard)), narrated: [...document.querySelectorAll("[data-dua-narrated-count]")].map((e) => Number(e.dataset.duaNarratedCount)), prev: document.querySelector("[data-dua-prev]")?.disabled, next: document.querySelector("[data-dua-next]")?.disabled }));
    const p1 = await list();
    if (PROBE) console.log(t, JSON.stringify({ ...p1, narrated: p1.narrated.slice(0, 6), ids: p1.ids.slice(0, 6) }));
    check(`${t}: POSITIVE CONTROL the Duas list shows 40 cards, Dua 1 first, ‹ Previous off and Next › on`, p1.ids.length === 40 && p1.ids[0] === 1 && p1.prev === true && p1.next === false, JSON.stringify({ n: p1.ids.length, first: p1.ids[0], prev: p1.prev, next: p1.next }));
    check(`${t}: the cards are in order of how many places narrate them (most first)`, p1.narrated.every((n, i) => i === 0 || n <= p1.narrated[i - 1]), p1.narrated.join());
    await page.click("[data-dua-next]");
    await page.waitForFunction(() => document.querySelector(".dua-cards-count")?.textContent.includes("41") || document.querySelector(".dua-cards-count")?.textContent.includes("৪১"), null, { timeout: 15000 }).catch(() => {});
    await settle(page, 400);
    const p2 = await list();
    check(`${t}: Next › shows the NEXT forty (page 2: Duas 41–80), ‹ Previous now on`, p2.count.includes(bn ? "৪১" : "41") && p2.ids.length === 40 && p2.ids[0] !== p1.ids[0] && p2.prev === false, JSON.stringify({ count: p2.count.slice(0, 40), first: p2.ids[0], prev: p2.prev }));
    await page.click("[data-dua-prev]");
    await page.waitForFunction(() => document.querySelector(".dua-cards-count")?.textContent.match(/\b1\b|১/), null, { timeout: 15000 }).catch(() => {});
    await settle(page, 400);
    const p3 = await list();
    check(`${t}: ‹ Previous returns to page 1, the same cards in the same order`, p3.ids.join() === p1.ids.join() && p3.prev === true, `${p3.ids.slice(0, 4)} vs ${p1.ids.slice(0, 4)}`);
    // With / Without vowels (Dua 4).
    const words = () => ev(page, () => ({ w: document.querySelector('[data-dua-card="4"] [data-dua-words]')?.textContent ?? "", sw: document.querySelector('[data-dua-card="4"] [data-dua-vowels-toggle]')?.textContent ?? "", pressed: document.querySelector('[data-dua-card="4"] [data-dua-vowels-toggle]')?.getAttribute("aria-pressed") }));
    const v0 = await words();
    const hasVow = (s) => /[ً-ْ]/.test(s);
    check(`${t}: Dua 4 shows WITH vowels and a switch "${bn ? "হরকত ছাড়া" : "Without vowels"}"`, hasVow(v0.w) && v0.sw === (bn ? "হরকত ছাড়া" : "Without vowels") && v0.pressed === "false", JSON.stringify(v0));
    await ev(page, () => document.querySelector('[data-dua-card="4"] [data-dua-vowels-toggle]').scrollIntoView({ block: "center" }));
    check(`${t}: the switch is on top of the page and tappable`, await onTop(page, '[data-dua-card="4"] [data-dua-vowels-toggle]'));
    await page.click('[data-dua-card="4"] [data-dua-vowels-toggle]');
    const v1 = await words();
    check(`${t}: Without vowels strips the vowels from the words and the switch reads "${bn ? "হরকতসহ" : "With vowels"}"`, !hasVow(v1.w) && v1.w.length > 10 && v1.sw === (bn ? "হরকতসহ" : "With vowels") && v1.pressed === "true", JSON.stringify(v1));
    await page.click('[data-dua-card="4"] [data-dua-vowels-toggle]');
    const v2 = await words();
    check(`${t}: With vowels brings them back, the same words`, hasVow(v2.w) && v2.w.normalize("NFC") === v0.w.normalize("NFC"), v2.w);
    // Narrated in N places: Dua 2 (23 places).
    const d2 = await ev(page, () => { const c = document.querySelector('[data-dua-card="2"]'); const hd = c.querySelector("[data-dua-narrated-count]"); return { n: hd.dataset.duaNarratedCount, head: hd.textContent, refs: c.querySelectorAll(".dua-also [data-dua-ref]").length }; });
    check(`${t}: Dua 2 says "Narrated in 23 places" and lists 23 sources`, d2.n === "23" && d2.refs === 23 && d2.head.includes(bn ? "২৩" : "23"), JSON.stringify(d2));
    await ev(page, () => document.querySelector('[data-dua-card="2"] .dua-also').scrollIntoView({ block: "center" }));
    const first = await ev(page, () => document.querySelector('[data-dua-card="2"] .dua-also > .dua-also-refs [data-dua-ref]')?.dataset.duaRef);
    const [uri, pn] = String(first).split(":");
    await page.click(`[data-dua-card="2"] .dua-also > .dua-also-refs [data-dua-ref="${first}"]`);
    await page.waitForSelector(`[data-openiti-passage="${pn}"][data-openiti-focused]`, { timeout: 25000 });
    const bk = await ev(page, () => { const b = document.querySelector("[data-openiti-trail-back]"); const r = b?.getBoundingClientRect(); return { text: b?.textContent ?? "", top: r?.top ?? -1, h: r?.height ?? 0 }; });
    check(`${t}: a source opens that narration, highlighted, with a visible "${bn ? "দুআ ২-এ ফিরুন" : "← Back to Dua 2"}" (${uri.slice(0, 12)}…)`, bk.text.includes(bn ? "২" : "Dua 2") && bk.text.startsWith("←") && bk.top >= 0 && bk.h >= 36, JSON.stringify(bk));
    await page.click("[data-openiti-trail-back]");
    await page.waitForSelector('[data-dua-card="2"].hadith-card-focused', { timeout: 20000 }).catch(() => {});
    const back = await ev(page, () => { const r = document.querySelector('[data-dua-card="2"]')?.getBoundingClientRect(); return { focused: !!document.querySelector('[data-dua-card="2"].hadith-card-focused'), on: !!r && r.bottom > 0 && r.top < innerHeight }; });
    check(`${t}: ← Back to Dua 2 returns to the SAME dua (Dua 2's card, highlighted, on screen)`, back.focused && back.on, JSON.stringify(back));
    // Dua chapters: Bukhari's chapter, a narration, ← Back to Dua.
    await page.click('[data-dua-mode="chapters"]');
    await page.waitForSelector("[data-dua-book]");
    await page.click(`[data-dua-book="${BUKHARI}"]`);
    await page.waitForSelector("[data-dua-chapter]");
    await page.click("[data-dua-chapter]");
    // Updated in place 28 Oct 2026 (PCF MSA J106 round 1): the chapter opens in the three-pane reader on its first
    // sub-chapter's first narration (6578 is further in), so any narration of it on screen is what is waited for.
    await page.waitForSelector("[data-openiti-passage]", { state: "attached", timeout: 25000 });
    const cb = await ev(page, () => document.querySelector("[data-openiti-trail-back]")?.textContent ?? "");
    check(`${t}: a Dua chapter opens its narrations with a visible ${bn ? "দুআ-এ ফিরুন" : "← Back to Dua"}`, cb.startsWith("←") && (bn ? BN.test(cb) : /Back to Dua/.test(cb)), cb);
    await page.click("[data-openiti-trail-back]");
    await page.waitForSelector("[data-dua-chapter]", { timeout: 15000 });
    check(`${t}: ...which returns to Bukhari's list of Dua chapters`, !!(await page.$("[data-dua-back]")));
    check(`${t}: no sideways scroll`, fits(await inScreen(page, "body")));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    if (width === 390 || width === 1440) await page.screenshot({ path: `/tmp/audit16-dua-${lang}-${width}.png` });
  });

  // 5: Dua progress, words, notes, bookmarks.
  await flow("dua-progress", lang, width, async (t, page, ctx, errors) => {
    await duaTab(page);
    const card = '[data-dua-card="1"]';
    await page.waitForSelector(`${card} [data-dua-status="learning"]`, { timeout: 15000 });
    await ev(page, (c) => document.querySelector(c).scrollIntoView({ block: "start" }), card);
    let k = await writeCount(page);
    await page.click(`${card} [data-dua-status="learning"]`);
    await page.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "records"), null, { timeout: 10000 }).catch(() => {});
    await settle(page, 500);
    const es = entriesOf(await writesFrom(page, k));
    const pressed = await ev(page, (c) => document.querySelector(`${c} [data-dua-status][aria-pressed="true"]`)?.dataset.duaStatus, card);
    check(`${t}: POSITIVE CONTROL My progress on this dua: Learning writes ONE record, dua:1, learning, for Ahsan (t1__p1), and the button shows pressed`, es.length === 1 && es[0].key.startsWith("dua:1") && es[0].id.includes("__p1__") && es[0].status === "learning" && pressed === "learning", JSON.stringify([es, pressed]));
    // A word: open the linked word and the Word card, with a way back.
    await page.waitForSelector(`${card} [data-dua-word="1"]`, { timeout: 10000 });
    await ev(page, (c) => document.querySelector(`${c} [data-dua-word="1"]`).scrollIntoView({ block: "center" }), card);
    await page.click(`${card} [data-dua-word="1"]`);
    await page.waitForSelector('[data-dua-word-panel="1"] [data-dua-word-open]', { timeout: 10000 });
    const w = await ev(page, () => { const p = document.querySelector('[data-dua-word-panel="1"]'); const o = p.querySelector("[data-dua-word-open]"); const r = p.getBoundingClientRect(); return { place: o.dataset.duaWordOpen, href: o.getAttribute("href"), text: o.textContent, inside: r.left >= -1 && r.right <= innerWidth + 1, head: p.innerText.slice(0, 30) }; });
    check(`${t}: tapping a word opens its card inside the screen, with "Open in the Word card ›" (2:131:7) carrying back=1`, w.place === "2:131:7" && /word=2:131:7/.test(w.href) && /back=1/.test(w.href) && w.inside && (bn ? BN.test(w.text) : /Open in the Word card/.test(w.text)), JSON.stringify(w));
    let navigated = true;
    await Promise.all([page.waitForURL(/quranrevival\.html\?word=2:131:7/, { timeout: 20000 }), page.click('[data-dua-word-panel="1"] [data-dua-word-open]')]).catch(() => { navigated = false; });
    check(`${t}: Open in the Word card reaches the Qur'an word 2:131:7`, navigated);
    if (navigated) {
      await page.waitForSelector("[data-word-card-app-back]", { timeout: 40000 }).catch(() => {});
      const wb = await ev(page, () => { const b = document.querySelector("[data-word-card-app-back]"); const r = b?.getBoundingClientRect(); return { text: b?.textContent.trim() ?? "", ok: !!r && r.width > 0 && r.top >= 0 && r.bottom <= innerHeight }; });
      check(`${t}: the Word card shows a way back ("${wb.text}") on screen`, wb.text.length > 3 && wb.ok && (bn ? BN.test(wb.text) : /Back/.test(wb.text)), JSON.stringify(wb));
      if (wb.text) {
        await Promise.all([page.waitForURL(/hadith-collections\.html/, { timeout: 20000 }), page.click("[data-word-card-app-back]")]).catch(() => {});
        await page.waitForSelector('[data-dua-card="1"]', { timeout: 25000 }).catch(() => {});
        await settle(page, 1500);
        const there = await ev(page, () => { const r = document.querySelector('[data-dua-card="1"]')?.getBoundingClientRect(); return { url: location.search, card: !!r, on: !!r && r.bottom > 0 && r.top < innerHeight }; });
        check(`${t}: ← Back returns to the Duas page with Dua 1's card on screen`, there.card && there.on, JSON.stringify(there));
      }
    }
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  await flow("dua-notes", lang, width, async (t, page, ctx, errors) => {
    await duaTab(page);
    const row = '[data-dua-note-bookmark="1"]';
    await page.waitForSelector(`${row} [data-dua-bookmark]`, { timeout: 15000 });
    await ev(page, (s) => document.querySelector(s).scrollIntoView({ block: "center" }), row);
    const href = await ev(page, (s) => document.querySelector(`${s} [data-dua-note-link]`).getAttribute("href"), row);
    const q = new URLSearchParams(href.split("?")[1] ?? "");
    check(`${t}: POSITIVE CONTROL 📝 on Dua 1 links to notes.html for dua:1 with back=1`, q.get("unit") === "dua:1" && q.get("back") === "1", href);
    const k = await writeCount(page);
    await page.click(`${row} [data-dua-bookmark]`);
    await page.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "bookmarks"), null, { timeout: 10000 }).catch(() => {});
    await settle(page, 300);
    const bw = (await writesFrom(page, k)).filter((w) => w.col === "bookmarks").flatMap((w) => (w.data?.saved ?? []).map((b) => ({ id: w.id, moduleId: b.moduleId, subjectId: b.subjectId, position: b.position })));
    const txt = await ev(page, (s) => document.querySelector(`${s} [data-dua-bookmark]`).textContent, row);
    check(`${t}: 🔖 saves dua:1 in t1__p1's own bookmarks and the button then reads ★ ${bn ? "বুকমার্ক সরান" : "Remove bookmark"}`, bw.some((b) => b.id === "t1__p1" && b.moduleId === "hadith" && b.subjectId === "dua" && b.position === "dua:1") && txt.includes(bn ? "বুকমার্ক সরান" : "Remove bookmark"), JSON.stringify([bw, txt]));
    let went = true;
    await Promise.all([page.waitForURL(/notes\.html\?/, { timeout: 15000 }), page.click(`${row} [data-dua-note-link]`)]).catch(() => { went = false; });
    check(`${t}: 📝 opens the Notes page`, went);
    if (went) {
      await page.waitForSelector("#notesBackBtn:not([hidden])", { timeout: 15000 }).catch(() => {});
      await Promise.all([page.waitForURL(/hadith-collections\.html/, { timeout: 20000 }), page.click("#notesBackBtn")]).catch(() => {});
      await page.waitForSelector('[data-dua-card="1"]', { timeout: 25000 }).catch(() => {});
      await settle(page, 1200);
      const there = await ev(page, () => { const r = document.querySelector('[data-dua-card="1"]')?.getBoundingClientRect(); return { card: !!r, on: !!r && r.bottom > 0 && r.top < innerHeight }; });
      check(`${t}: ← Back from Notes lands on Dua 1's card, on screen`, there.card && there.on, JSON.stringify(there));
    }
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 6: ✓ Check this dua.
  await flow("dua-check", lang, width, async (t, page, ctx, errors) => {
    await duaTab(page);
    const card = '[data-dua-card="2"]';
    await page.waitForSelector(`${card} [data-dua-check-open]`, { timeout: 20000 });
    await ev(page, (c) => document.querySelector(`${c} [data-dua-check-open]`).scrollIntoView({ block: "center" }), card);
    check(`${t}: POSITIVE CONTROL the owner sees ✓ Check this dua on Dua 2, tappable`, await onTop(page, `${card} [data-dua-check-open]`));
    await page.click(`${card} [data-dua-check-open]`);
    await page.waitForSelector('[data-dua-check-panel="2"] [data-dua-check-member]', { timeout: 15000 });
    const p = await ev(page, () => { const pn = document.querySelector('[data-dua-check-panel="2"]'); const r = pn.getBoundingClientRect(); return { members: pn.querySelectorAll("[data-dua-check-member]").length, back: !!pn.querySelector("[data-dua-check-back]") || !!document.querySelector("[data-dua-check-back]"), over: document.documentElement.scrollWidth - innerWidth, w: innerWidth, l: r.left, r: r.right, small: [...pn.querySelectorAll("button")].filter((b) => b.getBoundingClientRect().height > 0 && b.getBoundingClientRect().height < 39.5).length }; });
    check(`${t}: the Narrations step lists the 23 members, with ← Back, inside the screen, every button 40px`, p.members === 23 && p.back && p.over <= 0 && p.l >= -1 && p.r <= p.w + 1 && p.small === 0, JSON.stringify(p));
    await page.click('[data-dua-check-member] [data-v="cut"]');
    await page.click("[data-dua-check-rest-same]");
    await page.click('[data-dua-check-step="2"]');
    await page.waitForSelector("[data-dua-check-word]", { timeout: 10000 });
    const wd = await ev(page, () => ({ words: document.querySelectorAll("[data-dua-check-word]").length, over: document.documentElement.scrollWidth - innerWidth }));
    check(`${t}: the Words step lists the dua's words, no sideways scroll`, wd.words > 5 && wd.over <= 0, JSON.stringify(wd));
    await page.click("[data-dua-check-rest-ok]");
    await page.click('[data-dua-check-step="3"]');
    const k = await writeCount(page);
    await page.click("[data-dua-check-save]");
    await page.waitForSelector(`${card} [data-dua-check-status="done"]`, { timeout: 15000 }).catch(() => {});
    const w = (await writesFrom(page, k)).filter((x) => x.col === "ayahCollections");
    check(`${t}: Save writes ONE write with one field path, duaChecks.2`, w.length === 1 && JSON.stringify(Object.keys(w[0].data).filter((x) => x !== "updatedAt")) === '["duaChecks.2"]', JSON.stringify(w.map((x) => Object.keys(x.data))));
    const after = await ev(page, (c) => ({ chip: document.querySelector(`${c} [data-dua-check-status]`)?.textContent ?? "", panel: !!document.querySelector("[data-dua-check-panel]"), n: document.querySelector(`${c} [data-dua-narrated-count]`)?.dataset.duaNarratedCount }), card);
    check(`${t}: the panel closes and the card says it is checked (${bn ? "যাচাই করেছেন" : "checked by"}), 22 places now`, !after.panel && after.chip.includes(bn ? "যাচাই করেছেন" : "checked by") && latin(after.n) === "22", JSON.stringify(after));
    // ← Back from a reopened panel returns to the dua.
    await page.click(`${card} [data-dua-check-open]`);
    await page.waitForSelector("[data-dua-check-panel]");
    await page.click("[data-dua-check-back]");
    await settle(page, 300);
    // UPDATED IN PLACE (audit part 147; stale since audit part 141 H4, v13.0x): ← Back deliberately returns focus to the
    // button that opened the panel (✓ Check this dua, data-dua-check-open), not to the card itself (data-dua-card), so the old
    // check read a null dataset.duaCard. The card must still be on screen: that is the way back.
    const bk = await ev(page, () => { const a = document.activeElement; const c = document.querySelector('[data-dua-card="2"]')?.getBoundingClientRect(); return { panel: !!document.querySelector("[data-dua-check-panel]"), focus: a?.dataset?.duaCheckOpen ?? a?.dataset?.duaCard ?? null, on: !!c && c.bottom > 0 && c.top < innerHeight }; });
    check(`${t}: ← Back to Dua closes the panel and returns focus to Dua 2's ✓ Check button, the card on screen`, !bk.panel && bk.focus === "2" && bk.on, JSON.stringify(bk));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, { seed: SEED_CHECK });

  await flow("dua-check-reader", lang, width, async (t, page, ctx, errors) => {
    await duaTab(page);
    const card = '[data-dua-card="2"]';
    await page.waitForSelector(`${card} [data-dua-word="0"]`, { timeout: 20000 });
    await page.waitForSelector(`${card} [data-dua-check-status]`, { timeout: 15000 }).catch(() => {});
    const r = await ev(page, (c) => { const e = document.querySelector(c); return { btn: document.querySelectorAll("[data-dua-check-open]").length, chip: e.querySelector("[data-dua-check-status]")?.dataset.duaCheckStatus ?? null, n: e.querySelector("[data-dua-narrated-count]")?.dataset.duaNarratedCount ?? null, words: e.querySelectorAll("[data-dua-word]").length, progress: !!e.querySelector("[data-dua-progress]") }; }, card);
    check(`${t}: a reader who cannot manage sees NO ✓ Check this dua, and the card is complete (23 places, words, the checked-or-not chip, progress)`, r.btn === 0 && r.chip === "none" && r.n === "23" && r.words > 5 && r.progress, JSON.stringify(r));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, { seed: SEED_CHECK + READER });

  // 7: Bangla: no English left on these features.
  if (bn) await flow("bangla", lang, width, async (t, page, ctx, errors) => {
    const leaks = {};
    const scan = async (label, sel) => { const l = englishLeft(await bodyOf(page, sel)); if (l.length) leaks[label] = [...new Set(l)].slice(0, 12); };
    await hadeethencOpen(page, "3", "4563");
    await page.click('[data-hadeethenc-card="4563"] [data-hadeethenc-explanation-toggle]');
    await settle(page, 300);
    await scan("hadeethenc card", ".hadeethenc-section"); // the pilot list below it is synthetic development data, a separate, Owner-held question
    await openBukhari(page);
    await scan("openiti chapter list", "#openitiSection .openiti-goto");
    await page.fill("[data-openiti-goto-input]", "6306");
    await page.click("[data-openiti-goto-btn]");
    await page.waitForSelector('[data-openiti-passage="6578"]', { timeout: 20000 });
    await scan("openiti narration", '[data-openiti-passage="6578"] .hadith-actions, [data-openiti-passage="6578"] summary');
    await duaTab(page);
    await ev(page, () => document.querySelector('[data-dua-card="2"] [data-dua-word="0"]')?.click());
    await settle(page, 600);
    await scan("dua card 2", '[data-dua-card="2"]');
    await scan("dua list header", ".dua-cards-count, .dua-pager");
    const clean = Object.keys(leaks).length === 0;
    if (PROBE || !clean) console.log(t, JSON.stringify(leaks));
    check(`${t}: no English left on the Hadith and Dua screens (except source/book names and Arabic)`, clean, JSON.stringify(leaks));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

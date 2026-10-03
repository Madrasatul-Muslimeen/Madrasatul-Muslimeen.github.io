// Word card rebuild, round 4 (#511) -- the Arabic in Depth tab: legend, five
// light accordions, a source tag on every line. Word 2:102:35 at 320/390/1280px
// in en and bn. Expected values are hand-written from the demo and the brief.
// Run from the repository root with `node serve.js` running.
//   --mutate-open  makes every section open by default (route rewrite of the
//   module); the "only the first is open" check must then fail.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const nfc = (s) => String(s).normalize("NFC");
const SECTIONS = ["root", "sarf", "conj", "nahw", "choice", "classical"];
const TITLES = {
  en: ["Root & Word Family", "Morphology (Ṣarf)", "Verb Conjugation", "Grammar in This Āyah (Naḥw)", "Word Choice & Distinctions", "Classical Arabic Usage"],
  bn: ["মূল ও শব্দ-পরিবার", "রূপতত্ত্ব (সার্ফ)", "ক্রিয়া-রূপান্তর", "এই আয়াতের ব্যাকরণ (নাহু)", "শব্দচয়ন ও পার্থক্য", "ধ্রুপদী আরবি ব্যবহার"],
};
const TAGS = { en: { data: "From the data", rule: "Grammar rule", needs: "Needs a source" }, bn: { data: "তথ্য থেকে", rule: "ব্যাকরণের নিয়ম", needs: "উৎস প্রয়োজন" } };
// Hand-written: tagged lines per section for 2:102:35.
// Round 5 added the conjugation section (one tagged line). #533: with every section opened, Naḥw
// carries the six old rows plus three Corpus lines (9) and Classical a fourth tag, the al-Mufradāt entry (4).
const TAGGED = [3, 7, 1, 9, 3, 4];
const FORM_V = { en: "Ta- in front of Form II", bn: "দ্বিতীয় রূপের আগে তা- যোগ হলে" };

async function openWord(page, surah, ayah, pos) {
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove())); await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(600);
  await page.evaluate((s) => { const e = document.getElementById("surahSelect"); e.value = String(s); e.dispatchEvent(new Event("change", { bubbles: true })); }, surah);
  await page.waitForTimeout(2500);
  await page.evaluate((a) => { const e = document.getElementById("ayahSelect"); if (e.querySelector(`option[value="${a}"]`)) { e.value = String(a); e.dispatchEvent(new Event("change", { bubbles: true })); } }, ayah);
  await page.waitForTimeout(1500);
  await page.evaluate(([s, a, p]) => { document.querySelector(`#readView [data-word-occurrence$=":${s}:${a}:${p}"]`)?.click(); }, [surah, ayah, pos]);
  await page.waitForSelector(".quran-word-card [data-word-card-facts], .quran-word-card", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
}
async function depth(page) {
  await page.click('[data-word-card-level="depth"]');
  await page.waitForSelector("[data-word-card-sec]", { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => document.querySelector('[data-word-card-sec="root"] [data-word-card-fam]'), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
}
const secInfo = (page) => page.evaluate(() => [...document.querySelectorAll("[data-word-card-sec]")].map((d) => ({
  key: d.dataset.wordCardSec, open: d.open, title: d.querySelector(".word-card-acc-t").textContent,
  tagged: d.querySelectorAll("[data-word-card-src]").length, bg: getComputedStyle(d).backgroundColor,
})));

for (const lang of ["en", "bn"]) {
  for (const width of [320, 390, 1280]) {
    const L = `${lang}/${width}`;
    console.log(`\n=== ${L}, 2:102:35 Depth ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: width > 600 ? 900 : 844 } });
    if (process.argv.includes("--mutate-open")) {
      await ctx.route("**/js/word-card-depth.js", async (route) => {
        const res = await route.fetch();
        const body = (await res.text()).replace('k === "root"', "true");
        await route.fulfill({ response: res, body });
      });
    }
    const requested = [];
    ctx.on("request", (r) => requested.push(r.url()));
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForTimeout(800);
    await openWord(page, 2, 102, 35);
    check(`${L}: I9 -- nothing for Depth is fetched before Depth is opened`, !requested.some((u) => /lemma-forms\.json/.test(u)));
    await depth(page);

    const legend = await page.evaluate(() => [...document.querySelectorAll("[data-word-card-legend] [data-word-card-src]")].map((e) => [e.dataset.wordCardSrc, e.textContent]));
    // Decision 61 (#533) added the fourth tag, "From a book".
    check(`${L}: legend names the four sources`, JSON.stringify(legend) === JSON.stringify([["data", TAGS[lang].data], ["rule", TAGS[lang].rule], ["needs", TAGS[lang].needs], ["book", lang === "bn" ? "বই থেকে" : "From a book"]]), JSON.stringify(legend));
    const secs = await secInfo(page);
    check(`${L}: six sections in order (round 5 added Verb Conjugation)`, JSON.stringify(secs.map((s) => s.key)) === JSON.stringify(SECTIONS) && JSON.stringify(secs.map((s) => s.title)) === JSON.stringify(TITLES[lang]), JSON.stringify(secs.map((s) => s.title)));
    check(`${L}: only the first section is open`, JSON.stringify(secs.map((s) => s.open)) === "[true,false,false,false,false,false]", JSON.stringify(secs.map((s) => s.open)));
    check(`${L}: accordions are light (#f6f8f7)`, secs.every((s) => s.bg === "rgb(246, 248, 247)"), secs[0]?.bg);

    // Open the other four so every line can be read.
    await page.evaluate(() => document.querySelectorAll("[data-word-card-sec]").forEach((d) => { d.open = true; }));
    await page.waitForTimeout(200);
    const secs2 = await secInfo(page);
    check(`${L}: tagged lines per section ${TAGGED.join("/")}`, JSON.stringify(secs2.map((s) => s.tagged)) === JSON.stringify(TAGGED), JSON.stringify(secs2.map((s) => s.tagged)));

    // Section 1
    const root = await page.evaluate(() => {
      const s = document.querySelector('[data-word-card-sec="root"]');
      return {
        fam: s.querySelector("[data-word-card-fam]")?.textContent || "",
        famTag: s.querySelector("[data-word-card-fam]")?.closest("[data-word-card-dline]")?.dataset.wordCardDline,
        meaning: s.querySelector("[data-word-card-root-meaning]")?.textContent || "",
        chips: [...s.querySelectorAll("[data-word-card-goto]")].map((c) => ({ n: c.dataset.wordCardGoto.split(":").pop(), bg: getComputedStyle(c).backgroundColor, cur: c.hasAttribute("data-word-card-chip-current") })),
        links: [...s.querySelectorAll("[data-word-card-dict-link]")].map((a) => a.dataset.wordCardDictLink),
        dictionary: !!s.querySelector("[data-word-card-dictionary]"), forms: !!s.querySelector(".word-card-forms"),
        expandable: s.querySelectorAll("[data-word-form-toggle]").length,
      };
    });
    check(`${L}: family line starts with the root and ← the 14 forms, tagged rule`, root.fam.startsWith("ع ل م ←") && root.fam.split("·").length === 14 && root.famTag === "rule", root.fam);
    check(`${L}: family line is in round 3's order (عَلِمَ first, عَلَٰمَٰت last)`, nfc(root.fam).includes(nfc("← عَلِمَ · عَلَّمَ · يَتَعَلَّمُ · عِلْم")) && nfc(root.fam).endsWith(nfc("عَلَٰمَٰت")), root.fam);
    check(`${L}: the root's meaning comes from the Form I verb (Wiktionary)`, root.meaning.length > 2 && /know/i.test(root.meaning), root.meaning);
    check(`${L}: "In this āyah" has 6 chips, word numbers 14 25 35 52 58 74`, JSON.stringify(root.chips.map((c) => c.n)) === '["14","25","35","52","58","74"]', JSON.stringify(root.chips.map((c) => c.n)));
    check(`${L}: only the chip for 35 is gold`, JSON.stringify(root.chips.filter((c) => c.bg === "rgb(255, 244, 214)").map((c) => c.n)) === '["35"]' && root.chips.filter((c) => c.cur).length === 1);
    check(`${L}: both dictionary links are kept`, JSON.stringify(root.links) === '["corpus","ejtaal"]' || JSON.stringify(root.links.slice(0, 2)) === '["corpus","ejtaal"]', JSON.stringify(root.links));
    check(`${L}: the old dictionary box and the expandable forms list are kept inside`, root.dictionary && root.forms && root.expandable === 14, `${root.dictionary} ${root.forms} ${root.expandable}`);

    // Section 2
    const sarf = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-word-card-morph-row]")].map((r) => [r.querySelector("th").textContent, { v: r.querySelector("td").innerText, tag: r.querySelector("[data-word-card-src]").dataset.wordCardSrc }])));
    const rows = Object.entries(sarf);
    const by = (i) => rows[i]?.[1];
    check(`${L}: Ṣarf has 7 rows`, rows.length === 7, JSON.stringify(rows.map((r) => r[0])));
    check(`${L}: Pieces "فَ + يَ + تَعَلَّمُ + ونَ"`, by(0) && nfc(by(0).v).includes(nfc("فَ + يَ + تَعَلَّمُ + ونَ")) && by(0).tag === "data", by(0)?.v);
    check(`${L}: Form`, by(1) && by(1).v.includes(lang === "bn" ? "ফর্ম ৫" : "Form V") && nfc(by(1).v).includes(nfc("تَفَعَّلَ")) && by(1).tag === "data", by(1)?.v);
    check(`${L}: Tense Present`, by(2) && by(2).v.includes(lang === "bn" ? "বর্তমান" : "Present") && by(2).tag === "data", by(2)?.v);
    check(`${L}: Who contains هُمْ`, by(3) && nfc(by(3).v).includes(nfc("هُمْ")) && by(3).v.includes(lang === "bn" ? "পুরুষ" : "3rd person, masculine, plural") && by(3).tag === "data", by(3)?.v);
    check(`${L}: Voice Active`, by(4) && by(4).v.includes(lang === "bn" ? "কর্তৃবাচ্য" : "Active") && by(4).tag === "data", by(4)?.v);
    check(`${L}: Mood Indicative, tagged Grammar rule`, by(5) && by(5).v.includes(lang === "bn" ? "মারফূ" : "Indicative") && by(5).tag === "rule", by(5)?.v);
    check(`${L}: family تَعَلَّمَ يَتَعَلَّمُ تَعَلُّم, tagged rule`, by(6) && ["تَعَلَّمَ", "يَتَعَلَّمُ", "تَعَلُّم"].every((w) => nfc(by(6).v).includes(nfc(w))) && by(6).tag === "rule", by(6)?.v);

    // Section 3
    const nahw = await page.evaluate(() => [...document.querySelectorAll("[data-word-card-irab]")].map((r) => ({ tag: r.dataset.wordCardIrab, t: r.innerText, cmp: r.dataset.wordCardCompare || "", mood: r.dataset.wordCardCompareMood || "" })));
    check(`${L}: Naḥw has 9 rows (the 6 old ones, then the Corpus's sentence lines)`, nahw.length === 9, String(nahw.length));
    check(`${L}: a particle row (resumption) tagged data`, nahw[0]?.tag === "data" && nahw[0].t.includes(lang === "bn" ? "পুনরারম্ভ" : "Resumption particle") && nfc(nahw[0].t).includes(nfc("حَرْفُ اسْتِئْنَاف")), nahw[0]?.t);
    check(`${L}: verb row names ثبوت النون, tagged rule`, nahw.some((r) => r.tag === "rule" && nfc(r.t).includes(nfc("ثُبُوتُ النُّون"))), JSON.stringify(nahw.map((r) => r.t)));
    check(`${L}: doer-ending row`, nahw.some((r) => nfc(r.t).includes(nfc("ضَمِيرٌ مُتَّصِلٌ فِي مَحَلِّ رَفْعِ فَاعِل"))));
    const c29 = nahw.find((r) => r.cmp === "29"), c34 = nahw.find((r) => r.cmp === "34");
    check(`${L}: compare row for word 34 تَكْفُرْ as jussive`, c34 && c34.mood === "JUS" && nfc(c34.t).includes(nfc("تَكْفُرْ")), c34?.t);
    check(`${L}: compare row for word 29 as subjunctive`, c29 && c29.mood === "SUBJ", c29?.t);
    check(`${L}: the old sixth row is still last of the old rows, and the rows after it are From the data (Corpus)`, nahw.slice(6).every((r) => r.tag === "data"), JSON.stringify(nahw.slice(5).map((r) => r.tag)));

    // Section 4
    const choice = await page.evaluate(() => ({
      trio: [...document.querySelectorAll("[data-word-card-trio-form]")].map((c) => ({ f: c.dataset.wordCardTrioForm, on: c.hasAttribute("data-word-card-trio-current"), bg: getComputedStyle(c).backgroundColor })),
      sentence: document.querySelector("[data-word-card-form-sentence]")?.textContent || "",
      last: [...document.querySelectorAll('[data-word-card-sec="choice"] [data-word-card-dline]')].pop()?.dataset.wordCardDline,
    }));
    check(`${L}: the trio shows Forms II, V, I with V gold`, JSON.stringify(choice.trio.map((c) => c.f)) === '["2","5","1"]' && JSON.stringify(choice.trio.filter((c) => c.bg === "rgb(255, 244, 214)").map((c) => c.f)) === '["5"]', JSON.stringify(choice.trio));
    check(`${L}: the Owner-reviewed Form V sentence`, choice.sentence.includes(FORM_V[lang]), choice.sentence);
    check(`${L}: near-synonym line needs a source`, choice.last === "needs");

    // Section 5
    const classical = await page.evaluate(() => ({
      intro: document.querySelector("[data-word-card-classical-intro]")?.textContent, note: document.querySelector("[data-word-card-classical-note]")?.textContent,
      chips: [...document.querySelectorAll("[data-word-card-chips2] > span")].map((c) => c.firstChild.textContent.trim()),
      lane: document.querySelector('[data-word-card-sec="classical"] [data-word-card-dict-link="lane"]')?.getAttribute("href"),
    }));
    check(`${L}: Classical Usage keeps the Owner's wording`, lang === "bn" || (classical.intro === "Attested dictionary expressions, early prose or poetry will be shown with the Arabic quotation, translation, work, author and exact page/reference." && classical.note === "No unattributed example or generated quotation will be shown."), classical.intro);
    check(`${L}: three chips and the Lane link`, classical.chips.length === 3 && /^https:\/\/ejtaal\.net\//.test(classical.lane || ""), JSON.stringify(classical));
    check(`${L}: Qur'anic usage chip says 14 forms`, lang === "bn" ? /১৪/.test(classical.chips[0]) : /^Qur'anic usage: \d+ times, 14 forms ✓$/.test(classical.chips[0]), classical.chips[0]);

    check(`${L}: no sideways scroll`, await page.evaluate(() => { const c = document.querySelector(".quran-word-card"); return c.scrollWidth <= c.clientWidth + 1 && document.documentElement.scrollWidth <= window.innerWidth + 1; }));
    check(`${L}: no text cut inside the sections`, await page.evaluate(() => [...document.querySelectorAll("[data-word-card-sec] *")].every((e) => e.scrollWidth <= e.clientWidth + 1 || getComputedStyle(e).display === "inline" || getComputedStyle(e).overflowX === "visible" && e.getBoundingClientRect().right <= document.querySelector(".quran-word-card").getBoundingClientRect().right + 1)));

    // Open state survives ‹ ›.
    await page.evaluate(() => document.querySelectorAll("[data-word-card-sec]").forEach((d) => { d.open = d.dataset.wordCardSec === "sarf"; }));
    await page.click('[data-word-card-move="next"]');
    await page.waitForTimeout(1200);
    await page.click('[data-word-card-move="previous"]');
    await page.waitForTimeout(1200);
    const after = await secInfo(page);
    check(`${L}: Morphology stays open (and Root stays closed) after › and ‹`, JSON.stringify(after.map((s) => s.open)) === "[false,true,false,false,false,false]", JSON.stringify(after.map((s) => s.open)));

    // Tap a chip.
    await page.evaluate(() => { document.querySelector('[data-word-card-sec="root"]').open = true; });
    await page.click('[data-word-card-goto$=":2:102:52"]');
    await page.waitForTimeout(1500);
    const moved = await page.evaluate(() => ({ id: document.querySelector(".quran-word-card").dataset.occurrenceId, ar: document.querySelector(".word-card-arabic").textContent, depth: !!document.querySelector('[data-word-card-panel="depth"]') }));
    check(`${L}: tapping chip 52 opens 2:102:52 (وَيَتَعَلَّمُونَ)`, /:2:102:52$/.test(moved.id) && nfc(moved.ar).includes(nfc("وَيَتَعَلَّمُونَ")) && moved.depth, JSON.stringify(moved));
    await page.screenshot({ path: `/tmp/depth-${lang}-${width}.png`, fullPage: false });
    await ctx.close();
  }
}

// A noun, and a particle with no root (1280 en).
{
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 } });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(800);
  await openWord(page, 2, 2, 2);
  await depth(page);
  await page.evaluate(() => document.querySelectorAll("[data-word-card-sec]").forEach((d) => { d.open = true; }));
  const noun = await page.evaluate(() => ({ labels: [...document.querySelectorAll("[data-word-card-morph-row] th")].map((t) => t.textContent), secs: document.querySelectorAll("[data-word-card-sec]").length }));
  check("noun 2:2:2 -- no Mood row, no family row, no Tense/Who/Voice", !noun.labels.some((l) => /Mood|family|Tense|Who|Voice/.test(l)) && noun.labels[0] === "Pieces", JSON.stringify(noun));
  check("noun 2:2:2 -- all five sections still render", noun.secs === 5);
  await ctx.close();
}
{
  const ctx = await newContext(browser, { appLang: "en", viewport: { width: 390, height: 844 } });
  const errors = [];
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.waitForTimeout(800);
  await openWord(page, 2, 6, 1);
  await depth(page).catch(() => {});
  await page.evaluate(() => document.querySelectorAll("[data-word-card-sec]").forEach((d) => { d.open = true; }));
  await page.waitForTimeout(1500); // #533: opening Naḥw now fetches its surah's treebank
  const p = await page.evaluate(() => ({ secs: document.querySelectorAll("[data-word-card-sec]").length, fam: !!document.querySelector("[data-word-card-fam]"), chips: document.querySelectorAll("[data-word-card-goto]").length, root: !!document.querySelector("[data-word-card-root-box]"), last: [...document.querySelectorAll('[data-word-card-irab]')].pop()?.dataset.wordCardIrab }));
  check("particle with no root 2:6:1 -- five sections, no root lines, no errors", !p.root && p.secs === 5 && !p.fam && p.chips === 0 && (p.last === "needs" || p.last === "data") && errors.length === 0, JSON.stringify({ ...p, errors }));
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

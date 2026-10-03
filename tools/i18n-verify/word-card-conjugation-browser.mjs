// Word card rebuild, round 5 (#515) -- the Verb Conjugation section of the Depth
// tab, in en and bn at 320/390/1280px. Expected values are hand-written (the
// demo's Form V of ع ل م and the brief), never read from the code under test.
// Run from the repository root with `node serve.js` running.
//   --mutate-gold  makes the wrong person gold (route rewrite of the module);
//   the "present 3MP is the one gold row" check must then fail.
//   --shots        writes screenshots of the opened section to /tmp/conj-*.png
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const nfc = (s) => String(s).normalize("NFC");
const SHOTS = process.argv.includes("--shots");

async function openWord(page, surah, ayah, pos) {
  console.log(`    [open ${surah}:${ayah}:${pos}]`);
  await page.evaluate(() => document.querySelector("[data-word-card-close]")?.click());
  await page.waitForTimeout(300);
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
  await page.waitForSelector(".quran-word-card", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
}
async function depth(page) {
  console.log("    [depth]");
  if (!(await page.$("[data-word-card-sec]"))) await page.click('[data-word-card-level="depth"]', { timeout: 8000 });
  await page.waitForSelector("[data-word-card-sec]", { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => document.querySelector('[data-word-card-sec="root"] [data-word-card-fam]'), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
}
const conj = (page) => page.evaluate(() => {
  const s = document.querySelector('[data-word-card-sec="conj"]');
  if (!s) return null;
  const tables = Object.fromEntries([...s.querySelectorAll("[data-word-card-conj-table]")].map((t) => [t.dataset.wordCardConjTable, {
    h4: t.querySelector("h4").textContent.trim(), lead: t.querySelector(".word-card-cj-lead").textContent.trim(),
    rows: [...t.querySelectorAll("tr")].map((r) => ({
      pgn: r.dataset.wordCardConjPgn, pr: r.querySelector(".word-card-cj-pr .word-card-ar").textContent,
      small: r.querySelector(".word-card-cj-pr small").textContent,
      form: r.querySelector("[data-word-card-conj-form]")?.dataset.wordCardConjForm ?? null,
      none: !!r.querySelector("[data-word-card-conj-none]"), here: r.hasAttribute("data-word-card-conj-here"),
      sep: r.classList.contains("word-card-cj-sep"), bg: getComputedStyle(r.querySelector("td:last-child")).backgroundColor,
      q: r.querySelector("[data-word-card-conj-count]")?.textContent ?? null,
      mood: r.querySelector("[data-word-card-conj-mood]")?.textContent ?? null,
      pCol: r.querySelector(".word-card-cj-p") ? getComputedStyle(r.querySelector(".word-card-cj-p")).color : null,
      eCol: r.querySelector(".word-card-cj-e") ? getComputedStyle(r.querySelector(".word-card-cj-e")).color : null,
    })),
  }]));
  return {
    open: s.open, title: s.querySelector(".word-card-acc-t").textContent, ico: s.querySelector(".word-card-acc-ico").textContent,
    text: s.querySelector(".word-card-acc-body").innerText, lines: [...s.querySelectorAll("[data-word-card-dline]")].map((l) => [l.dataset.wordCardDline, l.textContent]),
    tables, order: [...document.querySelectorAll("[data-word-card-sec]")].map((d) => d.dataset.wordCardSec),
    gridCols: getComputedStyle(s.querySelector("[data-word-card-conj-grid]") ?? s).gridTemplateColumns,
    unknown: s.querySelectorAll("[data-word-card-conj-unknown]").length, passive: !!s.querySelector("[data-word-card-conj-passive]"),
  };
});

const BN = "০১২৩৪৫৬৭৮৯";
// --lang=en|bn and --width=N narrow a run (default: all six).
const only = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
for (const lang of ["en", "bn"].filter((l) => !only("lang") || only("lang") === l)) {
  for (const width of [320, 390, 1280].filter((w) => !only("width") || Number(only("width")) === w)) {
    const L = `${lang}/${width}`;
    console.log(`\n=== ${L} ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: width > 600 ? 900 : 844 } });
    if (process.argv.includes("--mutate-gold")) {
      await ctx.route("**/js/word-card-depth.js", async (route) => {
        const res = await route.fetch();
        const body = (await res.text()).replace("here.pgn === p.pgn", "here.pgn !== p.pgn");
        await route.fulfill({ response: res, body });
      });
    }
    const verbReq = [];
    ctx.on("request", (r) => { if (/verb-forms\.json/.test(r.url())) verbReq.push(r.url()); });
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForTimeout(800);

    // 2:102:35 فَيَتَعَلَّمُونَ
    await openWord(page, 2, 102, 35);
    check(`${L}: I9 -- not requested before Depth is opened on the verb`, verbReq.length === 0, String(verbReq.length));
    await depth(page);
    await page.waitForSelector('[data-word-card-sec="conj"] [data-word-card-conj-table]', { timeout: 8000 }).catch(() => {});
    check(`${L}: I9 -- requested once when Depth is opened on a verb`, verbReq.length === 1, String(verbReq.length));
    let c = await conj(page);
    check(`${L}: 2:102:35 has the section, third in order, closed`, c && !c.open && JSON.stringify(c.order.slice(0, 3)) === '["root","sarf","conj"]', JSON.stringify(c?.order));
    check(`${L}: icon ت and title`, c && c.ico === "ت" && c.title === (lang === "bn" ? "ক্রিয়া-রূপান্তর" : "Verb Conjugation"), c?.title);
    await page.evaluate(() => { document.querySelector('[data-word-card-sec="conj"]').open = true; });
    await page.waitForTimeout(300);
    if (SHOTS) {
      await page.evaluate(() => document.querySelector('[data-word-card-sec="conj"]').scrollIntoView());
      await page.waitForTimeout(200);
      await page.screenshot({ path: `/tmp/conj-${lang}-${width}.png`, fullPage: false });
    }
    c = await conj(page);
    const T = c.tables;
    check(`${L}: three tables of 14 rows`, ["past", "pres", "imp"].every((k) => T[k]?.rows.length === 14), JSON.stringify(Object.keys(T)));
    const p3mp = T.pres?.rows[2];
    check(`${L}: present 3MP is يَتَعَلَّمُونَ`, p3mp && nfc(p3mp.form) === nfc("يَتَعَلَّمُونَ"), p3mp?.form);
    check(`${L}: present 3MP is the one gold row (and the only gold row in all three tables)`,
      p3mp?.here && p3mp.bg === "rgb(255, 244, 214)" && ["past", "pres", "imp"].flatMap((k) => T[k].rows).filter((r) => r.here).length === 1);
    check(`${L}: present 3MP says ✦ 2 times`, p3mp?.q === (lang === "bn" ? "✦ কুরআনে: ২ বার" : "✦ in the Qur'an: 2 times"), p3mp?.q);
    check(`${L}: past 3MS is تَعَلَّمَ`, nfc(T.past?.rows[0].form) === nfc("تَعَلَّمَ"), T.past?.rows[0].form);
    check(`${L}: command 2MS is تَعَلَّمْ`, nfc(T.imp?.rows[6].form) === nfc("تَعَلَّمْ"), T.imp?.rows[6].form);
    check(`${L}: command 3MS is ✕`, T.imp?.rows[0].none && T.imp.rows[0].form === null);
    check(`${L}: the ✕ is red`, await page.evaluate(() => getComputedStyle(document.querySelector("[data-word-card-conj-none]")).color) === "rgb(198, 40, 40)");
    check(`${L}: command ✕ for all of 3rd and 1st person, forms for the six 2nd`, T.imp.rows.map((r) => (r.none ? "x" : "f")).join("") === "xxxxxxffffffxx", T.imp?.rows.map((r) => (r.none ? "x" : "f")).join(""));
    check(`${L}: .sep before "you" (row 7) and before "I" (row 13) only`, T.pres.rows.map((r, i) => (r.sep ? i : -1)).filter((i) => i >= 0).join() === "6,12");
    check(`${L}: pronouns in Arabic first row هُوَ, last نَحْنُ; English/Bangla small text`,
      nfc(T.pres.rows[0].pr) === nfc("هُوَ") && nfc(T.pres.rows[13].pr) === nfc("نَحْنُ") && T.pres.rows[0].small === (lang === "bn" ? "সে" : "he") && T.pres.rows[13].small === (lang === "bn" ? "আমরা" : "we"), T.pres.rows[0].small);
    check(`${L}: leads show the 3MS form`, nfc(T.past.lead) === nfc("الْمَاضِي (تَعَلَّمَ)") && nfc(T.pres.lead) === nfc("الْمُضَارِع (يَتَعَلَّمُ)") && nfc(T.imp.lead) === nfc("الْأَمْر (تَعَلَّمْ)"), `${T.past.lead} | ${T.pres.lead} | ${T.imp.lead}`);
    check(`${L}: present heading carries the Dictionary meaning in brackets; past and command do not invent one`,
      /\(.+\)/.test(T.pres.h4) && !/\(/.test(T.past.h4) && !/\(/.test(T.imp.h4), `${T.past.h4} | ${T.pres.h4} | ${T.imp.h4}`);
    check(`${L}: prefix purple, ending orange`, p3mp?.pCol === "rgb(124, 58, 237)" && p3mp?.eCol === "rgb(194, 65, 12)", `${p3mp?.pCol} ${p3mp?.eCol}`);
    check(`${L}: first line names Form V and the spaced root ع ل م`, lang === "bn" ? c.text.includes("ফর্ম ৫") && c.text.includes("ع ل م") : c.text.includes("Form V of") && c.text.includes("ع ل م"), c.text.slice(0, 120));
    check(`${L}: first line is tagged as a grammar rule`, c.lines[0]?.[0] === "rule");
    check(`${L}: help sentence in ${lang}`, c.text.includes(lang === "bn" ? "সোনালি সারিটি এই আয়াতের" : "the gold row is the one in this āyah; ✦ = found in the Qur'an."));
    check(`${L}: the grid is ${width > 700 ? "three columns" : "one column (stacked)"}`, (c.gridCols.split(" ").length) === (width > 700 ? 3 : 1), c.gridCols);
    if (lang === "bn") check(`${L}: no ASCII digit in the conjugation text outside Arabic/Form numerals`, !/[0-9]/.test(c.text.replace(/[^\n]*[A-Za-z][^\n]*/g, "")), c.text.slice(0, 80));

    // Open state survives a re-render (‹ ›).
    check(`${L}: no sideways scroll with the section open`, await page.evaluate(() => { const c = document.querySelector(".quran-word-card"); return c.scrollWidth <= c.clientWidth + 1 && document.documentElement.scrollWidth <= window.innerWidth + 1; }));
    await page.click('[data-word-card-move="next"]');
    await page.waitForTimeout(1200);
    await page.click('[data-word-card-move="previous"]');
    await page.waitForTimeout(1200);
    const stay = await page.evaluate(() => document.querySelector('[data-word-card-sec="conj"]')?.open);
    check(`${L}: the section keeps its open state over › and ‹`, stay === true, String(stay));

    // 2:102:34 تَكْفُرْ  -- jussive: gold shows the indicative, with the In-this-āyah line.
    await openWord(page, 2, 102, 34);
    await depth(page);
    await page.waitForSelector('[data-word-card-sec="conj"] [data-word-card-conj-table]', { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => { const s = document.querySelector('[data-word-card-sec="conj"]'); if (s) s.open = true; });
    c = await conj(page);
    const k = c?.tables.pres?.rows[6];
    check(`${L}: 2:102:34 present 2MS تَكْفُرُ is gold`, k && k.here && nfc(k.form) === nfc("تَكْفُرُ"), k?.form);
    check(`${L}: 2:102:34 names the jussive and the word's own form تَكْفُرْ`, k?.mood && nfc(k.mood).includes(nfc("تَكْفُرْ")) && k.mood.includes(lang === "bn" ? "মাজযূম" : "jussive"), k?.mood);
    check(`${L}: I9 -- still one request over two verbs`, verbReq.length === 1, String(verbReq.length));

    // 2:8:4 يَقُولُ -- weak root.
    await openWord(page, 2, 8, 4);
    await depth(page);
    await page.waitForSelector('[data-word-card-sec="conj"] [data-word-card-dline="needs"]', { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => { const s = document.querySelector('[data-word-card-sec="conj"]'); if (s) s.open = true; });
    c = await conj(page);
    check(`${L}: 2:8:4 (weak root) has no table`, c && Object.keys(c.tables).length === 0);
    check(`${L}: 2:8:4 says why, tagged needs-a-source`, c && c.lines.length === 1 && c.lines[0][0] === "needs" && c.lines[0][1].includes(lang === "bn" ? "দুর্বল অক্ষর" : "weak letter"), JSON.stringify(c?.lines));
    check(`${L}: I9 -- still one request`, verbReq.length === 1, String(verbReq.length));

    // A passive verb: 2:102:? is not needed; use 2:183:2 كُتِبَ (passive).
    await openWord(page, 2, 4, 4);
    await depth(page);
    await page.waitForSelector('[data-word-card-sec="conj"]', { timeout: 5000 }).catch(() => {});
    await page.evaluate(() => { const s = document.querySelector('[data-word-card-sec="conj"]'); if (s) s.open = true; });
    await page.waitForTimeout(300);
    c = await conj(page);
    if (c && c.passive) {
      const golds = Object.values(c.tables).flatMap((t) => t.rows).filter((r) => r.here).length;
      check(`${L}: 2:183:2 (passive) has the note and no gold row`, golds === 0 && c.text.includes(lang === "bn" ? "কর্মবাচ্য" : "passive"), String(golds));
    } else {
      check(`${L}: 2:183:2 (passive) has the note and no gold row`, false, JSON.stringify(c && { passive: c.passive, lines: c.lines }));
    }
    await ctx.close();

    // I9: a noun's Depth tab never fetches the file (a page of its own, after the verbs).
    const nctx = await newContext(browser, { appLang: lang, viewport: { width, height: width > 600 ? 900 : 844 } });
    const nounReq = [];
    nctx.on("request", (r) => { if (/verb-forms\.json/.test(r.url())) nounReq.push(r.url()); });
    const { page: np } = await openPage(nctx, "/app/quranrevival.html");
    await np.waitForTimeout(800);
    await openWord(np, 1, 2, 2);
    await depth(np);
    check(`${L}: I9 -- not requested for a noun's Depth tab`, nounReq.length === 0, String(nounReq.length));
    check(`${L}: 1:2:2 (a noun) has no conjugation section`, (await conj(np)) === null);
    await nctx.close();
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);

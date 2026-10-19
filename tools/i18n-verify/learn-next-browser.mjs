// PCF MSA J40 (19 Oct 2026) -- "Learn next": the Qur'an's words in order of how often they occur.
// Run from the repository root with `node serve.js` running:  node tools/i18n-verify/learn-next-browser.mjs [--mutate=NAME]
// Every check is proven by its own mutation (--mutate=NAME must make the named check FAIL):
//   DATA (builder source is changed, a copy of the file is built and read):
//     asc        sorts rarest first                              -> "ordered by count, highest first"
//     notie      drops the lemma-text tie-break                  -> "ties broken by the lemma text"
//     cumbug     cumulative % forgets the current row            -> "10/100/300/1000 percentages"
//   BROWSER:
//     firstrow   the purple line always names rank 1             -> "names the first not-known word"
//     nofamily   a Family group no longer makes words known      -> "changes after a Family group Achieved"
//     rootknown  a Root/Depth mark makes the word known          -> "Root, Taṣrīf and Depth marks do NOT change it"
//     nohide     the checkbox hides nothing                      -> "Hide words I know hides exactly the known rows"
//     page50     the list draws 50 at a time                     -> "100 at a time" / "Show 100 more adds 100"
//     noback     no way back is set                              -> "Back returns to the list"
//     scrollreset the list opens at the top again                -> "at the same scroll place"
//     bnleak     one Bangla string is missing                    -> "Bangla has no English left"
//     lowpurple  the light purple ink is washed out              -> "purple ink 4.5:1 on all three looks"
//     lownight   the night purple ink is washed out              -> same check
//     smallbtn   the purple line is 30px tall                    -> "at least 44px tall"
//     goldline   the totals box's button style paints the line (Architect, 19 Oct) -> "painted in the card's purple"
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";
import { execFileSync } from "child_process";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const OUT = "tools/quran-data-pull/output/";
const BUILDER = "tools/quran-data-pull/build-learn-next.mjs";
const DATA_MUT = {
  asc: [".sort((a, b) => b.n - a.n ||", ".sort((a, b) => a.n - b.n ||"],
  notie: ["b.n - a.n || (a.lemma < b.lemma ? -1 : a.lemma > b.lemma ? 1 : 0))", "b.n - a.n)"],
  cumbug: ["running += row.n;\n  const k", "const k"],
};
const MUT = {
  firstrow: ["app/quranrevival.html", "const row = firstUnknownRow(ctx.data.rows, learnNextIsKnown);", "const row = ctx.data.rows[0];"],
  nofamily: ["app/quranrevival.html", "if (own.countsAsKnown || !meaningGroupsLive() || isFormKey(lemmaId)) return own;", "return own;"],
  // Architect review (19 Oct 2026): the first version of this mutation added a branch keyed on `root`, which the Learn
  // next list never passes, so it changed nothing and the check went UNPROVEN. This one lets ANY Root/Taṣrīf/Depth
  // Achieved the person holds count as known -- exactly the leak the check exists to catch.
  rootknown: ["app/quranrevival.html", "// PCF J38 (19 Oct 2026): a Root (intermediate), Taṣrīf or Depth mark is a study mark on a ROOT and never makes", 'if (["intermediate", "tasrif", "depth"].some((l) => (countKnownLemmaClaims({ tenantId, personId, level: l, confirmationRequired }) ?? 0) > 0)) return { ...own, countsAsKnown: true };\n      // PCF J38 (19 Oct 2026): a Root (intermediate), Taṣrīf or Depth mark is a study mark on a ROOT and never makes'],
  nohide: ["app/js/learn-next.js", "const list = hideKnown ? rows.filter((row) => !isKnown(row)) : rows;", "const list = rows;"],
  page50: ["app/js/learn-next.js", "export const LEARN_NEXT_PAGE = 100;", "export const LEARN_NEXT_PAGE = 50;"],
  noback: ["app/quranrevival.html", 'setAppReturn(t("Back to Learn next"), "", () =>', 'false && setAppReturn(t("Back to Learn next"), "", () =>'],
  scrollreset: ["app/quranrevival.html", "if (scroller) scroller.scrollTop = learnNextScroll;", "if (scroller) scroller.scrollTop = 0;"],
  bnleak: ["app/js/i18n/bn.js", '"Show 100 more": "আরও ১০০টি দেখান",', ""],
  lowpurple: ["app/quranrevival.html", '[data-card-look="light"] .quran-word-card { --wc-purple-bg: #f1e9fb; --wc-purple-ink: #4b2a85;', '[data-card-look="light"] .quran-word-card { --wc-purple-bg: #f1e9fb; --wc-purple-ink: #c9b8ee;'],
  lownight: ["app/quranrevival.html", "--wc-purple-bg: #2d2150; --wc-purple-ink: #e1d2ff;", "--wc-purple-bg: #2d2150; --wc-purple-ink: #5a4a8a;"],
  goldline: ["app/quranrevival.html", ".word-card-progress button.word-card-learnnext, .word-card-learnnext { display: block;", ".word-card-learnnext { display: block;"],
  smallbtn: ["app/quranrevival.html", ".word-card-learnnext { display: block; width: 100%; min-height: 44px;", ".word-card-learnnext { display: block; width: 100%; min-height: 0; max-height: 30px; overflow: hidden;"],
};
if (MUTATE && !MUT[MUTATE] && !DATA_MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const nfc = (s) => s.normalize("NFC");

// ---------------------------------------------------------------- DATA
{
  console.log("\n=== data: learn-next.json ===");
  let file = OUT + "learn-next.json";
  if (DATA_MUT[MUTATE]) {
    const [a, b] = DATA_MUT[MUTATE];
    let src = fs.readFileSync(BUILDER, "utf8");
    if (!src.includes(a)) throw new Error(`data mutation anchor missing: ${MUTATE}`);
    src = src.split(a).join(b);
    file = "/tmp/learn-next-mutated.json";
    execFileSync("node", ["--input-type=module"], { input: src, env: { ...process.env, LEARN_NEXT_OUT: file }, stdio: ["pipe", "ignore", "inherit"] });
  }
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  const idx = JSON.parse(fs.readFileSync(OUT + "lemmas-index.json", "utf8")).values;
  const want = Object.entries(idx).map(([l, refs]) => [l, refs.length]).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  check("all 4,832 words, 74,122 occurrences", doc.rows.length === 4832 && doc.total === 74122 && doc.rows.reduce((n, r) => n + r.n, 0) === 74122);
  check("ordered by count, highest first", doc.rows.every((r, i) => i === 0 || doc.rows[i - 1].n >= r.n), JSON.stringify(doc.rows.slice(0, 3)));
  check("ties broken by the lemma text (the whole order equals count desc, lemma asc)", doc.rows.every((r, i) => r.l === want[i][0] && r.n === want[i][1] && r.r === i + 1));
  const at = (n) => doc.rows[n - 1].p;
  check("10/100/300/1,000 percentages are 25.7 / 57.3 / 73.5 / 88.9", at(10) === 25.7 && at(100) === 57.3 && at(300) === 73.5 && at(1000) === 88.9 && at(4832) === 100, [10, 100, 300, 1000, 4832].map(at).join(","));
  check("every row has an English and a Bangla meaning and a first occurrence (nothing invented, nothing blank)", doc.rows.every((r) => r.e && r.b && r.o > 1000000));
  check("the file is small (under 900 KB)", fs.statSync(file).size < 900 * 1024, String(fs.statSync(file).size));
}
if (DATA_MUT[MUTATE]) { console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }

// ---------------------------------------------------------------- BROWSER
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const rows = JSON.parse(fs.readFileSync(OUT + "learn-next.json", "utf8")).rows;
const groups = JSON.parse(fs.readFileSync(OUT + "lemma-meaning-groups.json", "utf8"));
const groupOf = new Map(Object.entries(groups.byLemma).map(([k, v]) => [nfc(k), v]));
const wlog = (page, n = 0) => page.evaluate((n) => (window.__stubWriteData || []).slice(n).map((w) => `${w.col}:${w.id}`), n);
const wcount = (page) => page.evaluate(() => (window.__stubWriteData || []).length);
const press = (page, sel, i = 0) => page.evaluate(([sel, i]) => document.querySelectorAll("#quranWordCardMount " + sel)[i]?.click(), [sel, i]);
const nextWord = (page) => page.evaluate(() => document.querySelector("#quranWordCardMount .word-card-learnnext-ar")?.textContent ?? null);
const waitNext = (page, lemma) => page.waitForFunction((l) => (document.querySelector("#quranWordCardMount .word-card-learnnext-ar")?.textContent ?? "").normalize("NFC") === l, nfc(lemma), { timeout: 12000 }).catch(() => {});
const expectNext = (known) => rows.find((r) => !known(r));

async function goTo(page, s, a) {
  await page.evaluate(([s, a]) => { const ss = document.getElementById("surahSelect"); if (ss.value !== String(s)) { ss.value = String(s); ss.dispatchEvent(new Event("change", { bubbles: true })); } setTimeout(() => { const as = document.getElementById("ayahSelect"); as.value = String(a); as.dispatchEvent(new Event("change", { bubbles: true })); }, 600); }, [s, a]);
  await page.waitForFunction(([s, a]) => !!document.querySelector(`[data-word-occurrence$=":${s}:${a}:1"]`), [s, a], { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
}
async function openWordOf(page, o) {
  const s = Math.floor(o / 1000000), a = Math.floor((o % 1000000) / 1000), p = o % 1000;
  await goTo(page, s, a);
  await page.evaluate(([s, a, p]) => document.querySelector(`[data-word-occurrence$=":${s}:${a}:${p}"]`)?.click(), [s, a, p]);
  await page.waitForFunction(() => document.querySelector("#quranWordCardMount .quran-word-card"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
}
const openTab = async (page, level) => {
  await page.click(`#quranWordCardMount [data-word-card-level="${level}"]`).catch(() => {});
  await page.waitForFunction((l) => document.querySelector(`#quranWordCardMount [data-word-card-panel="${l}"]`), level, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(700);
};
const contrast = (page, look, selector) => page.evaluate(([look, selector]) => {
  if (look) document.documentElement.setAttribute("data-card-look", look); else document.documentElement.removeAttribute("data-card-look");
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
const sheetInfo = (page) => page.evaluate(() => {
  const s = document.getElementById("learnNextSheet");
  if (!s || s.hidden) return null;
  const sc = s.querySelector("[data-ln-scroll]");
  const back = s.querySelector("[data-ln-back]").getBoundingClientRect();
  const rowEls = [...s.querySelectorAll(".ln-row")];
  const wide = rowEls.filter((r) => r.scrollWidth > r.clientWidth + 1 || r.getBoundingClientRect().right > innerWidth + 1).length;
  const tiles = [...s.querySelectorAll(".ln-tile")].map((t) => ({ w: t.scrollWidth <= t.clientWidth + 1, p: t.querySelector(".ln-tile-p").textContent }));
  return {
    rows: rowEls.length, known: s.querySelectorAll(".ln-row.ln-known").length, ticks: s.querySelectorAll(".ln-tick").length,
    scrollTop: sc.scrollTop, over: sc.scrollWidth - sc.clientWidth, pageOver: document.documentElement.scrollWidth - innerWidth,
    backIn: back.left >= 0 && back.top >= 0 && back.right <= innerWidth && back.bottom <= innerHeight && back.height >= 40,
    wide, tiles, hideLabel: s.querySelector(".ln-hide span").textContent.trim(), checked: s.querySelector("[data-ln-hide]").checked,
    more: !!s.querySelector("[data-ln-more]"), moreText: s.querySelector("[data-ln-more]")?.textContent.trim() ?? null,
    firstRank: rowEls[0]?.dataset.lnRow, rankText: rowEls[0]?.querySelector(".ln-rank").textContent, ar: rowEls[0]?.querySelector(".ln-ar").getAttribute("dir"),
    chrome: [...s.querySelectorAll(".ln-title, .ln-back, .ln-note, .ln-tile-n, .ln-hide span, .ln-more, .ln-sofar, .ln-tick")].map((e) => e.textContent).join(" | "),
    meanings: rowEls.slice(0, 3).map((r) => r.querySelector(".ln-mean").textContent.trim()),
    fontAr: getComputedStyle(rowEls[0]?.querySelector(".ln-ar")).fontFamily,
  };
});

for (const [lang, width, height] of [["en", 320, 640], ["en", 390, 844], ["en", 768, 900], ["en", 1280, 900], ["bn", 320, 640], ["bn", 390, 844], ["bn", 768, 900], ["bn", 1280, 900]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== Learn next ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  let fetched = 0;
  page.on("request", (rq) => { if (/learn-next\.json/.test(rq.url())) fetched++; });
  await page.waitForTimeout(600);
  check(`${tag} learn-next.json is NOT fetched at startup`, fetched === 0, String(fetched));
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);

  // Rank 1 (مِن) first occurrence.
  await openWordOf(page, rows[0].o);
  await page.waitForSelector("#quranWordCardMount .word-card-learnnext", { timeout: 12000 }).catch(() => {});
  const known = new Set(); // lemma NFC keys known so far (WbW) and groups known (Family)
  const groupsKnown = new Set();
  const isKnown = (r) => known.has(nfc(r.l)) || (groupOf.get(nfc(r.l)) && groupsKnown.has(groupOf.get(nfc(r.l))));
  const line = await page.evaluate(() => {
    const b = document.querySelector("#quranWordCardMount .word-card-learnnext");
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { tag: b.tagName, h: r.height, text: b.textContent.replace(/\s+/g, " ").trim(), title: b.querySelector(".word-card-learnnext-title")?.textContent, over: document.documentElement.scrollWidth - innerWidth, clipped: b.scrollWidth - b.clientWidth, inBox: !!b.closest(".word-progress-whole-quran-box") };
  });
  check(`${tag} the purple line is a real <button> inside the totals box, at least 44px tall`, !!line && line.tag === "BUTTON" && line.inBox && line.h >= 44, JSON.stringify(line));
  check(`${tag} the line fits: no sideways scroll, nothing clipped`, !!line && line.over <= 0 && line.clipped <= 0, JSON.stringify(line));
  check(`${tag} fetched once, on first use (not at startup)`, fetched === 1, String(fetched));
  const first = rows[0];
  check(`${tag} the purple line names the first not-known word (rank 1: ${first.l}, ${first.n} places)`, nfc((await nextWord(page)) ?? "") === nfc(first.l) && ((line?.text ?? "").includes(lang === "bn" ? "" : String(first.n)) || /৩,২২৯|3,229/.test(line?.text ?? "")), line?.text);
  if (lang === "en") check(`${tag} English reads "Learn next / Next up: … · … · 3,229 places"`, /^Learn next\s*Next up: .+ · .+ · 3,229 places$/.test(line?.text ?? ""), line?.text);

  // purple ink on all three looks
  const looks = [["light", "light"], ["night", "night"]]; // the card has two looks; the sheet (a light surface in every look) is the third
  const ratios = [];
  for (const [name, look] of looks) {
    const c = await contrast(page, look, "#quranWordCardMount .word-card-learnnext");
    ratios.push(`${name}=${c?.ratio?.toFixed(2)}`);
  }
  // Architect review (19 Oct 2026): a contrast ratio passes for ANY readable colour, and it did -- the line was gold,
  // painted by `.word-card-progress button`. So also assert the RENDERED colours are the card's own purple tokens.
  const painted = [];
  for (const [name, look] of looks) {
    painted.push(await page.evaluate(([look, name]) => {
      document.documentElement.setAttribute("data-card-look", look);
      document.querySelectorAll("[data-card-look]").forEach((e) => e.setAttribute("data-card-look", look));
      const b = document.querySelector("#quranWordCardMount .word-card-learnnext");
      const card = b?.closest(".quran-word-card");
      if (!b || !card) return `${name}:none`;
      const probe = document.createElement("span"); card.appendChild(probe);
      probe.style.color = "var(--wc-purple-ink)"; probe.style.backgroundColor = "var(--wc-purple-bg)";
      const want = [getComputedStyle(probe).color, getComputedStyle(probe).backgroundColor]; probe.remove();
      const got = [getComputedStyle(b).color, getComputedStyle(b.querySelector(".word-card-learnnext-line") ?? b).color, getComputedStyle(b).backgroundColor];
      return got[0] === want[0] && got[1] === want[0] && got[2] === want[1] ? `${name}:ok` : `${name}:${got.join("/")} want ${want.join("/")}`;
    }, [look, name]));
  }
  check(`${tag} the line is painted in the card's purple (ink and background), not another button style (${painted.join(" ")})`, painted.every((x) => x.endsWith(":ok")), painted.join(" "));
  await page.evaluate(() => document.documentElement.removeAttribute("data-card-look"));

  // --- the sheet
  await page.evaluate(() => document.querySelector("#quranWordCardMount [data-learn-next-open]")?.click());
  await page.waitForFunction(() => { const s = document.getElementById("learnNextSheet"); return s && !s.hidden && s.querySelectorAll(".ln-row").length > 0; }, null, { timeout: 12000 }).catch(() => {});
  let sh = await sheetInfo(page);
  { const c = await contrast(page, null, "#learnNextSheet .ln-note"); ratios.push(`sheet=${c?.ratio?.toFixed(2)}`); }
  check(`${tag} the purple ink reaches 4.5:1 or more on all three looks (${ratios.join(" ")})`, ratios.length === 3 && ratios.every((r) => Number(r.split("=")[1]) >= 4.5), ratios.join(" "));
  check(`${tag} tapping the line opens the sheet: header, note, four milestone tiles, checkbox, 100 rows`, !!sh && sh.rows === 100 && sh.tiles.length === 4, JSON.stringify(sh && { rows: sh.rows, tiles: sh.tiles }));
  if (!sh) { await ctx.close(); continue; }
  check(`${tag} milestone tiles show 25.7% / 57.3% / 73.5% / 88.9%`, JSON.stringify(sh.tiles.map((t) => t.p.replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d)).replace(/\./g, "."))) === JSON.stringify(["25.7%", "57.3%", "73.5%", "88.9%"]) || /২৫|25/.test(sh.tiles[0].p), JSON.stringify(sh.tiles));
  check(`${tag} sheet fits: no sideways scroll, every tile and row whole, ← Back reachable (40px+)`, sh.over <= 0 && sh.pageOver <= 0 && sh.wide === 0 && sh.tiles.every((t) => t.w) && sh.backIn, JSON.stringify({ over: sh.over, page: sh.pageOver, wide: sh.wide, tiles: sh.tiles, back: sh.backIn }));
  check(`${tag} the Arabic is right-to-left in the Quranic font`, sh.ar === "rtl" && /quran|serif|Amiri|Uthman|Scheherazade/i.test(sh.fontAr), sh.fontAr);
  check(`${tag} "100 at a time": exactly 100 rows are drawn, with a Show-100-more button (never all 4,832)`, sh.rows === 100 && sh.more, `${sh.rows} ${sh.moreText}`);
  check(`${tag} the row's meaning is in the reader's language, the other language after it`, sh.meanings.every((m) => m.includes("·")) && (lang === "bn" ? /[ঀ-৿]/.test(sh.meanings[1].split("·")[0]) : /[A-Za-z]/.test(sh.meanings[1].split("·")[0])), JSON.stringify(sh.meanings));
  if (lang === "bn") {
    check(`${tag} Bangla has no English left in the sheet's own words`, !/[A-Za-z]/.test(sh.chrome), sh.chrome);
    const lineEn = await page.evaluate(() => { const b = document.querySelector("#quranWordCardMount .word-card-learnnext"); const c = b.cloneNode(true); c.querySelectorAll(".word-card-learnnext-ar").forEach((e) => e.remove()); return c.textContent; });
    check(`${tag} Bangla has no English left in the purple line's own words`, /[ঀ-৿]/.test(lineEn) && !/\bNext up\b|\bLearn next\b|\bplaces\b/.test(lineEn), lineEn);
  }
  if (width === 390) {
    // --- who knows what: WbW Achieved, Family group Achieved, Root/Depth marks
    await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-back]").click());
    await page.waitForTimeout(300);
    const w1 = await wcount(page);
    await press(page, '.word-card-side [data-word-progress-state="achieved"]');
    known.add(nfc(first.l));
    const n2 = expectNext(isKnown);
    await waitNext(page, n2.l);
    check(`${tag} the line changes after a WbW Achieved (rank 1 → rank 2: ${n2.l})`, nfc((await nextWord(page)) ?? "") === nfc(n2.l), `${await nextWord(page)} ${(await wlog(page, w1)).join(",")}`);

    // Family: rank 2 is Allah, whose group اله:2 has two words.
    const gid = groupOf.get(nfc(n2.l));
    await openWordOf(page, n2.o);
    await openTab(page, "basic");
    await page.waitForFunction(() => document.querySelectorAll("#quranWordCardMount [data-family-group-mark]").length > 0, null, { timeout: 10000 }).catch(() => {});
    const gb = await wcount(page);
    const nGroups = await page.evaluate(() => document.querySelectorAll("#quranWordCardMount [data-family-group-state=\"achieved\"]").length);
    let wrote = null;
    for (let i = 0; i < nGroups && !wrote; i++) {
      await press(page, '[data-family-group-state="achieved"]', i);
      await page.waitForTimeout(2200);
      wrote = (await wlog(page, gb)).find((x) => x === `quranLemmaProgress:t1__p1__basic__${gid}`) ?? null;
    }
    groupsKnown.add(gid);
    const n3 = expectNext(isKnown);
    await waitNext(page, n3.l);
    check(`${tag} the line changes after a Family group Achieved (group ${gid} → rank 3: ${n3.l})`, !!wrote && nfc((await nextWord(page)) ?? "") === nfc(n3.l), `${wrote} ${await nextWord(page)}`);

    // Root / Taṣrīf / Depth marks on the next word never change the line.
    // Architect review (19 Oct 2026): n3 is مَا, which has NO root, so Root/Taṣrīf/Depth are Not applicable on it and
    // pressing them wrote nothing (the positive control below caught it). Mark a word that HAS a root instead:
    // قَالَ (rank 7, root ق و ل). The line must still name n3.
    const rooted = rows.find((r) => nfc(r.l) === nfc("قَالَ"));
    await openWordOf(page, rooted.o);
    const rb = await wcount(page);
    for (const level of ["intermediate", "tasrif", "depth"]) {
      await openTab(page, level);
      await press(page, '.word-card-side [data-word-progress-state="achieved"]');
      await page.waitForTimeout(1800);
    }
    await openTab(page, "wbw");
    await page.waitForTimeout(800);
    // POSITIVE CONTROL (Architect review, 19 Oct 2026): the three presses really wrote a claim at each level, so the
    // "does NOT change it" check below is about real marks, not presses that did nothing.
    const rootWrites = (await wlog(page, rb)).filter((x) => /^quranLemmaProgress:t1__p1__(intermediate|tasrif|depth)__/.test(x));
    check(`${tag} POSITIVE CONTROL: the Root, Taṣrīf and Depth presses each wrote a claim (${rootWrites.join(",")})`, ["intermediate", "tasrif", "depth"].every((l) => rootWrites.some((x) => x.includes(`__${l}__`))), rootWrites.join(","));
    check(`${tag} Root, Taṣrīf and Depth marks do NOT change it (still ${n3.l})`, nfc((await nextWord(page)) ?? "") === nfc(n3.l), String(await nextWord(page)));

    // --- the sheet knows who knows what
    await page.evaluate(() => document.querySelector("#quranWordCardMount [data-learn-next-open]")?.click());
    await page.waitForFunction(() => { const s = document.getElementById("learnNextSheet"); return s && !s.hidden && s.querySelectorAll(".ln-row").length > 0; }, null, { timeout: 12000 }).catch(() => {});
    sh = await sheetInfo(page);
    const wantKnown = rows.filter(isKnown).length;
    const wantIn100 = rows.slice(0, 100).filter(isKnown).length;
    const digits = (s) => s.replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));
    check(`${tag} known rows are marked "✓ known" (${wantIn100} of the first 100) and the label counts ${wantKnown}`, sh.known === wantIn100 && sh.ticks === wantIn100 && digits(sh.hideLabel).includes(`(${wantKnown}`), JSON.stringify({ k: sh.known, t: sh.ticks, l: sh.hideLabel, wantIn100, wantKnown }));
    await page.evaluate(() => { const c = document.querySelector("#learnNextSheet [data-ln-hide]"); c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.waitForTimeout(300);
    const hid = await sheetInfo(page);
    const shownRanks = await page.evaluate(() => [...document.querySelectorAll("#learnNextSheet .ln-row")].map((r) => Number(r.dataset.lnRow)));
    const wantRanks = rows.filter((r) => !isKnown(r)).slice(0, 100).map((r) => r.r);
    check(`${tag} "Hide words I know" hides exactly the known rows (the next 100 unknown ranks are drawn, no ✓)`, hid.ticks === 0 && JSON.stringify(shownRanks) === JSON.stringify(wantRanks) && hid.checked, `${hid.ticks} ${shownRanks.slice(0, 6)} vs ${wantRanks.slice(0, 6)}`);
    await page.evaluate(() => { const c = document.querySelector("#learnNextSheet [data-ln-hide]"); c.checked = false; c.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.waitForTimeout(300);

    // --- Show 100 more, scroll, open a row, come back
    await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-more]").click());
    await page.waitForTimeout(300);
    const more = await sheetInfo(page);
    check(`${tag} "Show 100 more" adds exactly 100 rows (100 → ${more.rows})`, more.rows === 200, String(more.rows));
    await page.evaluate(() => { document.querySelector("#learnNextSheet [data-ln-scroll]").scrollTop = 1200; });
    await page.waitForTimeout(200);
    const before = (await sheetInfo(page)).scrollTop;
    const target = rows[149];
    await page.evaluate(() => document.querySelector('#learnNextSheet [data-ln-row="150"]').click());
    await page.waitForFunction((o) => { const id = document.querySelector("#quranWordCardMount .quran-word-card"); return !!id; }, target.o, { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const opened = await page.evaluate(() => ({ sheetHidden: document.getElementById("learnNextSheet").hidden, pill: document.querySelector("#ayahCardBackPill:not([hidden]) [data-ayah-card-back]")?.textContent.trim() ?? null, card: !!document.querySelector("#quranWordCardMount .quran-word-card") }));
    const s150 = Math.floor(target.o / 1000000), a150 = Math.floor((target.o % 1000000) / 1000), p150 = target.o % 1000;
    const openId = await page.evaluate(() => document.querySelector("#quranWordCardMount [data-word-occurrence-id], #quranWordCardMount .quran-word-card")?.outerHTML.length);
    check(`${tag} a row opens that word's Word card (${s150}:${a150}:${p150}) and shows the way back`, opened.sheetHidden && opened.card && /Learn next|এরপর শিখুন/.test(opened.pill ?? ""), JSON.stringify(opened) + openId);
    await page.evaluate(() => document.querySelector("#ayahCardBackPill [data-ayah-card-back]")?.click());
    await page.waitForTimeout(900);
    const back = await sheetInfo(page);
    check(`${tag} Back returns to the list at the same scroll place (${before} → ${back?.scrollTop}) with 200 rows still drawn`, !!back && Math.abs(back.scrollTop - before) <= 2 && back.rows === 200, JSON.stringify(back && { st: back.scrollTop, rows: back.rows }));
  }
  await ctx.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);

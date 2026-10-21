// PCF MSA J45 (the Owner, 20 Oct 2026: 1A combined side by side, stacked on a phone; 2A every place, wrapped; 3A no
// cross-row links; issue #982) -- the Family level's two meaning sections are ONE: a row per meaning group, the
// group's word cards and mark, and in purple how the Qur'an's word-by-word translation renders each word at every place.
// Real data (lemma-sense-index.json + lemmas-index.json), at 35:2:2 يَفْتَحِ.
// Run from the repository root with serve.js on :8080. Every mutation (--mutate=NAME) must make the suite exit 1:
//   noright    the purple column is not drawn                     -> the 35:2:2 rows / Judge row checks fail
//   noother    places numbered -1 are dropped                      -> "other renderings ×1 (2:76)" and the 16 fail
//   nothis     the current place is not marked                     -> the "this word" check fails
//   nogoto     a chip is not a way to its āyah                      -> the 48:1 tap / way-back checks fail
//   noscroll   Back does not restore the card's own scroll          -> the "same scroll" check fails
//   ink        the purple column's text is the card's text colour  -> the rendered-colour check fails
//   onecol     the wide layout is never applied                     -> the two-columns check fails
//   twocol     the two columns are forced on a phone too            -> the one-column check fails
//   eager      the files are fetched before Family opens             -> the network check fails
//   order      the current word's group is not first                 -> the "Open row first and gold" check fails
//   markkey    a group control writes the current word's group       -> the Family mark write check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const ONLY = (process.argv.find((a) => a.startsWith("--width=")) || "").slice(8);
const ONLY_LANG = (process.argv.find((a) => a.startsWith("--lang=")) || "").slice(7);
const JS = "app/js/quran-word-card.js", HTML = "app/quranrevival.html";
const MUT = {
  noright: [JS, "      familyRenderingsHtml(g.forms, context, text, formatNumber) +\n", ""],
  noother: [JS, "    line(text.familyRenderOther, other, true) +\n", ""],
  noscroll: [HTML, "        put();\n        requestAnimationFrame(put);", "        void put;"],
  nothis: [JS, "    const mine = refs.includes(fr.here);", "    const mine = false;"],
  nogoto: [JS, '"${mine ? \' aria-current="true"\' : ""} data-word-occurrence-goto="${s}:${a}:${w}"', '"${mine ? \' aria-current="true"\' : ""} data-x-goto="${s}:${a}:${w}"'],
  // Re-anchored 21 Oct 2026 for J60's plates (the rule gained a plate background; the mutation is the same ink swap).
  ink: [HTML, "padding: 0.4rem 0.55rem; min-width: 0; color: var(--wc-purple-ink); background: var(--wc-purple-plate);",
    "padding: 0.4rem 0.55rem; min-width: 0; color: var(--card-text); background: var(--wc-purple-plate);"],
  onecol: [HTML, "@container (min-width: 700px) {\n    .word-card-family-combined", "@container (min-width: 7000px) {\n    .word-card-family-combined"],
  twocol: [HTML, "@container (min-width: 700px) {\n    .word-card-family-combined", "@container (min-width: 1px) {\n    .word-card-family-combined"],
  eager: [HTML, 'if (quranWordCardState.level === "basic" && !familyRenderData && !familyRenderAsked && !familyRenderError) {', "if (!familyRenderData && !familyRenderAsked && !familyRenderError) {"],
  order: [JS, ".sort((x, y) => (y.mine - x.mine) || (y.total - x.total) || (x.first - y.first));", ".sort((x, y) => (y.total - x.total) || (x.first - y.first) || (y.mine - x.mine) || 0).reverse();"],
  markkey: [JS, "familyGroupMarkHtml(context.familyGroups, head.lemma, g.total, text, formatNumber) + `</div>`;", "familyGroupMarkHtml(context.familyGroups, layers.lemma, g.total, text, formatNumber) + `</div>`;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  return ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MOUNT = "#quranWordCardMount";
const wlog = (page, n = 0) => page.evaluate((n) => (window.__stubWriteData || []).slice(n).map((w) => `${w.col}:${w.id}`), n);
const wcount = (page) => page.evaluate(() => (window.__stubWriteData || []).length);
// Measured on main (dc83709) with the very same press, 20 Oct 2026: the second row ("a victory", فَتْح, a meaning of
// its own) writes quranLemmaProgress t1__p1__basic__فَتْح.
const EXPECT_KEY = "فَتْح";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function goTo(page, s, a) {
  await page.evaluate(([s, a]) => { const ss = document.getElementById("surahSelect"); if (ss.value !== String(s)) { ss.value = String(s); ss.dispatchEvent(new Event("change", { bubbles: true })); } setTimeout(() => { const as = document.getElementById("ayahSelect"); as.value = String(a); as.dispatchEvent(new Event("change", { bubbles: true })); }, 600); }, [s, a]);
  await page.waitForFunction(([s, a]) => !!document.querySelector(`[data-word-occurrence$=":${s}:${a}:1"]`), [s, a], { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
}
const rowsOf = (page) => page.evaluate(() => [...document.querySelectorAll("#quranWordCardMount [data-word-card-family-combined] [data-word-card-meaning-group]")].map((g) => ({
  current: g.classList.contains("word-card-meaning-group-current"),
  bg: getComputedStyle(g).backgroundColor,
  cards: [...g.querySelectorAll("[data-word-card-dcard] .word-card-dcard-ar")].map((e) => e.textContent.trim()),
  words: [...g.querySelectorAll("[data-word-card-family-word]")].map((w) => ({
    lemma: w.dataset.wordCardFamilyWord,
    who: w.querySelector(".word-card-family-who")?.textContent.trim() ?? "",
    senses: [...w.querySelectorAll("[data-word-card-family-sense]")].map((s) => ({
      label: s.querySelector("b")?.textContent.trim() ?? "",
      x: s.querySelector(".word-card-family-x")?.textContent.trim() ?? "",
      current: s.classList.contains("word-card-sense-current"),
      tag: s.querySelector(".word-card-sense-tag")?.textContent.trim() ?? "",
      chips: [...s.querySelectorAll(".word-card-family-chip")].map((c) => ({ goto: c.dataset.wordOccurrenceGoto ?? null, current: c.classList.contains("word-card-family-chip-current") })),
    })),
  })),
})));
const geometry = (page) => page.evaluate(() => {
  const card = document.querySelector("#quranWordCardMount .quran-word-card")?.getBoundingClientRect();
  const rows = [...document.querySelectorAll("#quranWordCardMount [data-word-card-family-combined] [data-word-card-meaning-group]")].map((g) => {
    const ce = g.querySelector(".word-card-dcards"), re = g.querySelector("[data-word-card-family-render]");
    if (!ce || !re) return { besides: false, under: false, missing: true };
    const c = ce.getBoundingClientRect(), r = re.getBoundingClientRect();
    const m = g.querySelector("[data-family-group-mark]")?.getBoundingClientRect() ?? null;
    return { besides: r.left >= c.right - 1 && r.top < c.bottom, under: r.top >= c.bottom - 1 && Math.abs(r.left - c.left) < 2 && (!m || m.top >= r.bottom - 1) };
  });
  const out = [...document.querySelectorAll("#quranWordCardMount [data-word-card-family-render], #quranWordCardMount [data-word-card-family-render] *")]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.left < card.left - 0.5 || r.right > card.right + 0.5); }).length;
  return { rows, out, over: document.documentElement.scrollWidth - innerWidth, cardW: Math.round(card.width) };
});

const runs = [["en", 1280], ["en", 900], ["en", 390], ["en", 320], ["bn", 1280], ["bn", 390], ["bn", 320]]
  .filter(([l, w]) => (!ONLY || String(w) === ONLY) && (!ONLY_LANG || l === ONLY_LANG));
for (const [lang, width] of runs) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== Family combined [${tag}] ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 900 : 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    const src = fs.readFileSync(file, "utf8");
    if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    await ctx.route(`**/${file}*`, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: src.split(a).join(b) }));
  }
  const asked = [];
  ctx.on("request", (r) => { if (/lemma-sense-index\.json/.test(r.url())) asked.push(r.url()); });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(600);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await goTo(page, 35, 2);
  await page.evaluate(() => document.querySelector('[data-word-occurrence$=":35:2:2"]')?.click());
  await page.waitForFunction(() => document.querySelector("#quranWordCardMount .quran-word-card"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  // The other levels are opened first, so "not before Family" covers them too.
  for (const l of ["intermediate", "tasrif", "depth"]) { await page.click(`${MOUNT} [data-word-card-level="${l}"]`).catch(() => {}); await page.waitForTimeout(500); }
  const before = asked.length;
  await page.click(`${MOUNT} [data-word-card-level="basic"]`).catch(() => {});
  await page.waitForFunction(() => document.querySelectorAll("#quranWordCardMount [data-word-card-family-word]").length > 0, null, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(600);
  check(`${tag} lemma-sense-index.json is NOT requested before the Family level opens, and IS when it opens`, before === 0 && asked.length >= 1, JSON.stringify({ before, after: asked.length }));

  const rows = await rowsOf(page);
  const first = rows[0];
  const fath = first?.words.find((w) => w.lemma && w.who.startsWith("فَتَحَ"));
  const sense = (label) => fath?.senses.find((s) => s.label === label);
  const total = fath ? fath.senses.reduce((n, s) => n + s.chips.length, 0) : 0;
  check(`${tag} the "Open" row is first and gold, holding فَتَحَ`, !!first && first.current && rows.slice(1).every((r) => !r.current) && first.cards.includes("فَتَحَ") && first.bg === "rgb(255, 244, 214)", JSON.stringify(rows.map((r) => [r.current, r.bg, r.cards])));
  check(`${tag} فَتَحَ is listed with 16 places in all (heading and chips agree)`, !!fath && total === 16 && /16|১৬/.test(fath.who), JSON.stringify(fath?.who));
  check(`${tag} its renderings: we opened ×10, so judge ×2, decide ×1, allah grants ×1, we have given victory ×1`,
    sense("we opened")?.chips.length === 10 && sense("so judge")?.chips.length === 2 && sense("decide")?.chips.length === 1 && sense("allah grants")?.chips.length === 1 && sense("we have given victory")?.chips.length === 1
      && /10|১০/.test(sense("we opened")?.x ?? ""), JSON.stringify(fath?.senses.map((s) => [s.label, s.x, s.chips.length])));
  const other = fath?.senses.find((s) => s.label === (lang === "bn" ? "অন্যান্য অনুবাদ" : "other renderings"));
  check(`${tag} the place with no main English word is kept, last, as "other renderings ×1" (2:76:15)`, !!other && fath.senses.at(-1) === other && other.chips.length === 1 && other.chips[0].goto === "2:76:15", JSON.stringify(other));
  const marked = fath?.senses.filter((s) => s.current) ?? [];
  check(`${tag} "allah grants" is the one line marked "this word", and its 35:2:2 chip is marked`, marked.length === 1 && marked[0].label === "allah grants" && marked[0].tag === (lang === "bn" ? "এই শব্দ" : "this word") && marked[0].chips.some((c) => c.goto === "35:2:2" && c.current)
    && rows.flatMap((r) => r.words.flatMap((w) => w.senses.flatMap((s) => s.chips))).filter((c) => c.current).length === 1, JSON.stringify(marked));
  // Found by فَٰتِحِين's exact key in the data (فَتَّاح's key writes its shadda and fatha in the other order).
  const judge = rows.find((r) => r.words.some((w) => w.lemma === "فَٰتِحِين"));
  check(`${tag} the "Judge" row (فَتَّاح, فَٰتِحِين) has its own renderings for both words`, !!judge && judge !== first && judge.words.length === 2 && judge.words.every((w) => w.senses.length >= 1 && w.senses.every((s) => s.chips.length >= 1)), JSON.stringify(judge));
  const allChips = rows.flatMap((r) => r.words.flatMap((w) => w.senses.flatMap((s) => s.chips)));
  check(`${tag} every chip is a way to its place (data-word-occurrence-goto s:a:w); 38 places in the root`, allChips.length === 38 && allChips.every((c) => /^\d+:\d+:\d+$/.test(c.goto ?? "")), String(allChips.length));
  check(`${tag} no "see also" link to another row (3A)`, !(await page.evaluate(() => /see also|আরও দেখুন/i.test(document.querySelector("#quranWordCardMount [data-word-card-family-combined]")?.textContent ?? ""))));

  // Rendered colours: the purple column's text IS --wc-purple-ink (not merely readable), on --wc-purple-bg.
  for (const look of ["night", "light"]) {
    const ink = await page.evaluate((look) => {
      document.documentElement.setAttribute("data-card-look", look);
      const card = document.querySelector("#quranWordCardMount .quran-word-card");
      const probe = document.createElement("span"); probe.style.color = "var(--wc-purple-ink)"; probe.style.backgroundColor = "var(--wc-purple-bg)"; card.appendChild(probe);
      const want = getComputedStyle(probe).color, wantBg = getComputedStyle(probe).backgroundColor; probe.remove();
      const box = card.querySelector("[data-word-card-family-render]");
      if (!box) return { want, wantBg, bg: null, got: [], n: 0 };
      const texts = [box.querySelector("h5"), ...box.querySelectorAll(".word-card-family-who, .word-card-family-sense b, .word-card-family-x, .word-card-family-chip")];
      return { want, wantBg, bg: getComputedStyle(box).backgroundColor, got: [...new Set(texts.map((e) => getComputedStyle(e).color))], n: texts.length };
    }, look);
    check(`${tag} [${look} card] every text in the purple column renders exactly --wc-purple-ink (${ink.want}) on --wc-purple-bg`, ink.n > 10 && ink.got.length === 1 && ink.got[0] === ink.want && ink.bg === ink.wantBg, JSON.stringify(ink));
  }
  await page.evaluate(() => document.documentElement.removeAttribute("data-card-look"));
  await page.waitForTimeout(200);

  const g = await geometry(page);
  if (width >= 900) check(`${tag} two columns: every row's renderings sit BESIDE its cards (card ${g.cardW}px)`, g.rows.length >= 5 && g.rows.every((r) => r.besides), JSON.stringify(g));
  else check(`${tag} one column: every row's renderings sit UNDER its cards and above its mark`, g.rows.length >= 5 && g.rows.every((r) => r.under && !r.besides), JSON.stringify(g));
  check(`${tag} nothing in the purple column leaves the card, and the page does not scroll sideways`, g.out === 0 && g.over <= 0, JSON.stringify({ out: g.out, over: g.over }));

  if (lang === "en" && (width === 390 || width === 1280)) {
    // The way to an āyah and back (way-back law): the same card, the same level, the same scroll.
    const s0 = await page.evaluate(() => { const c = document.querySelector('#quranWordCardMount [data-word-occurrence-goto="48:1:2"]'); c?.scrollIntoView({ block: "center" }); return null; });
    await page.waitForTimeout(300);
    const scrollBefore = await page.evaluate(() => { const c = document.querySelector('#quranWordCardMount [data-word-occurrence-goto="48:1:2"]'); return c ? Math.round(c.getBoundingClientRect().top) : null; });
    await page.click(`${MOUNT} [data-word-occurrence-goto="48:1:2"]`, { timeout: 3000 }).catch(() => {});
    await page.waitForFunction(() => document.querySelector("[data-word-card-origin-back]"), null, { timeout: 6000 }).catch(() => {});
    const there = await page.evaluate(() => ({ surah: document.getElementById("surahSelect").value, ayah: document.getElementById("ayahSelect").value, back: !!document.querySelector("[data-word-card-origin-back]") }));
    check(`${tag} the 48:1 chip opens 48:1, with "Back to Word Card"`, there.surah === "48" && there.ayah === "1" && there.back, JSON.stringify(there));
    await page.click("[data-word-card-origin-back]", { timeout: 3000 }).catch(() => {});
    await page.waitForFunction(() => document.querySelector('#quranWordCardMount [role="tab"][aria-selected="true"]')?.dataset.wordCardLevel === "basic" && document.querySelector('#quranWordCardMount [data-word-occurrence-goto="48:1:2"]'), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(900);
    const back = await page.evaluate(() => {
      const c = document.querySelector('#quranWordCardMount [data-word-occurrence-goto="48:1:2"]');
      return { level: document.querySelector('#quranWordCardMount [role="tab"][aria-selected="true"]')?.dataset.wordCardLevel ?? null, ref: document.querySelector("#quranWordCardMount .word-card-reference")?.textContent.trim() ?? null, top: c ? Math.round(c.getBoundingClientRect().top) : null };
    });
    check(`${tag} Back returns to the same Word card (35:2), on Family, at the same scroll (the chip within 40px of where it was)`,
      back.level === "basic" && /35:2/.test(back.ref ?? "") && back.top !== null && scrollBefore !== null && Math.abs(back.top - scrollBefore) <= 40, JSON.stringify({ back, scrollBefore }));

    // The Family marks still write exactly as on main: one Learning press on the "Open" row writes that group's key.
    await page.waitForFunction(() => document.querySelectorAll("#quranWordCardMount [data-family-group-mark]").length >= 5, null, { timeout: 10000 }).catch(() => {});
    const n0 = await wcount(page);
    await page.evaluate(() => document.querySelectorAll('#quranWordCardMount [data-word-card-meaning-group]')[1]?.querySelector('[data-family-group-state="learning"]')?.click());
    await page.waitForTimeout(2600);
    const log = (await wlog(page, n0)).filter((x) => /^quranLemmaProgress:/.test(x));
    check(`${tag} a Learning press on the second row writes the same document as on main (quranLemmaProgress t1__p1__basic__${EXPECT_KEY})`, log.length === 1 && log[0] === `quranLemmaProgress:t1__p1__basic__${EXPECT_KEY}`, JSON.stringify(log));
  }
  await ctx.close();
}
console.log(`\n==== Word card Family combined (J45)${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);

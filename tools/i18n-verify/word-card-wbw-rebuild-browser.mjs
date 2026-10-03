// Word card rebuild, round 2 (#504) -- the header ROOT box, the WbW facts row,
// the meaning bar and the word-part boxes, in a real browser at 320/390/1280px
// in English and Bangla. Expected values are hand-written, not read back from
// the code. Run from the repository root with `node serve.js` running.
//   node tools/i18n-verify/word-card-wbw-rebuild-browser.mjs --mutate-header
// puts the old header back (no ROOT box) and the ROOT-box checks must fail.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

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
  await page.waitForFunction(() => document.querySelector("[data-word-card-parts]") || document.querySelector(".quran-word-card [data-word-card-facts]"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

const rect = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; }), sel);
const overlap = (a, b) => a.x < b.r - 0.5 && b.x < a.r - 0.5 && a.y < b.b - 0.5 && b.y < a.b - 0.5;
const text = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => e.textContent.trim()), sel);

for (const lang of ["en", "bn"]) {
  for (const width of [320, 390, 1280]) {
    console.log(`\n=== ${lang} ${width}px, 2:102:35 ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: width > 600 ? 900 : 844 } });
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await openWord(page, 2, 102, 35);
    if (process.argv.includes("--mutate-header")) await page.evaluate(() => document.querySelectorAll("[data-word-card-root-box]").forEach((e) => e.remove()));
    const L = `${lang}/${width}`;

    check(`${L}: header ROOT box says "ع ل م"`, (await text(page, "header [data-word-card-root-box] span"))[0] === "ع ل م");
    check(`${L}: ROOT label`, (await text(page, "header [data-word-card-root-box] small"))[0] === (lang === "bn" ? "ধাতু" : "ROOT"));
    const facts = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-word-card-fact]")].map((f) => [f.dataset.wordCardFact, { label: f.querySelector("small").textContent, value: f.querySelector("b").textContent, sub: f.querySelector(".word-card-fact-sub")?.textContent || "" }])));
    check(`${L}: Root fact "ع ل م"`, facts.root?.value === "ع ل م", JSON.stringify(facts));
    check(`${L}: Dictionary word fact "يَتَعَلَّمُ"`, facts.dict?.value.normalize("NFC") === "يَتَعَلَّمُ".normalize("NFC"), JSON.stringify(facts));
    check(`${L}: Dictionary label`, facts.dict?.label === (lang === "bn" ? "অভিধানের শব্দ" : "Dictionary word"));
    check(`${L}: Form fact`, facts.form?.value === (lang === "bn" ? "ফর্ম ৫" : "Form V") && facts.form?.sub === "تَفَعَّلَ", JSON.stringify(facts.form));
    const fr = await rect(page, "[data-word-card-fact]");
    check(`${L}: facts right to left (Root rightmost, then Dictionary word, then Form)`, fr.length === 3 && fr[0].x > fr[1].x && fr[1].x > fr[2].x, JSON.stringify(fr.map((r) => r.x)));

    const parts = await page.evaluate(() => [...document.querySelectorAll("[data-word-card-part]")].map((p) => ({
      id: p.dataset.wordCardPart, piece: p.querySelector(".word-card-part-piece").textContent, ar: p.querySelector(".word-card-part-arname").textContent,
      name: p.querySelector(".word-card-part-name").textContent, meaning: p.querySelector(".word-card-part-meaning")?.textContent || "" })));
    check(`${L}: four part boxes`, parts.length === 4, JSON.stringify(parts));
    const prs = await rect(page, "[data-word-card-part]");
    check(`${L}: parts run right to left (the first, فَ, is rightmost or top-right)`, prs.length === 4 && (width <= 520 ? (prs[0].x > prs[1].x && prs[2].x > prs[3].x && prs[2].y > prs[0].y) : (prs[0].x > prs[1].x && prs[1].x > prs[2].x && prs[2].x > prs[3].x)), JSON.stringify(prs.map((r) => [r.x | 0, r.y | 0])));
    check(`${L}: part 1 فَ "حَرْفُ اسْتِئْنَاف"`, parts[0]?.piece === "فَ" && parts[0]?.ar === "حَرْفُ اسْتِئْنَاف", JSON.stringify(parts[0]));
    check(`${L}: part 2 يَ "حَرْفُ الْمُضَارَعَة" with its meaning`, parts[1]?.piece === "يَ" && parts[1]?.ar === "حَرْفُ الْمُضَارَعَة" && parts[1]?.meaning === (lang === "bn" ? "তারা (এখন করে)" : "they (doing it now)"), JSON.stringify(parts[1]));
    check(`${L}: part 3 تَعَلَّم with the verb-stem name`, parts[2]?.piece.normalize("NFC") === "تَعَلَّمُ".normalize("NFC") && parts[2]?.ar === "فِعْل · الْبَاب الْخَامِس", JSON.stringify(parts[2]));
    check(`${L}: part 4 ونَ "وَاوُ الْجَمَاعَة"`, parts[3]?.piece === "ونَ" && parts[3]?.ar === "وَاوُ الْجَمَاعَة", JSON.stringify(parts[3]));
    if (lang === "bn") check(`${L}: stem meaning is the word's Bangla gloss`, parts[2]?.meaning.length > 0, JSON.stringify(parts[2]));
    else check(`${L}: stem meaning (English dictionary) appears once loaded`, parts[2]?.meaning.length > 0, JSON.stringify(parts[2]));
    if (width <= 520) check(`${L}: two per row`, Math.abs(prs[0].y - prs[1].y) < 2 && Math.abs(prs[2].y - prs[3].y) < 2 && prs[2].y > prs[0].y + 10);
    else check(`${L}: one row`, prs.every((r) => Math.abs(r.y - prs[0].y) < 2));

    const mb = await rect(page, ".word-card-meaning-bar > *");
    if (width >= 1000) check(`${L}: meaning bar is one row`, mb.length === 3 && mb.every((r) => Math.abs(r.y - mb[0].y) < 4), JSON.stringify(mb.map((r) => r.y)));
    else check(`${L}: meaning bar items inside the card`, mb.length === 3 && mb.every((r) => r.r <= width));

    const hdr = await page.evaluate(() => [...document.querySelector(".quran-word-card header").children].map((e) => { const r = e.getBoundingClientRect(); return { n: e.className || e.tagName, x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; }));
    let ov = [];
    for (let i = 0; i < hdr.length; i++) for (let j = i + 1; j < hdr.length; j++) if (overlap(hdr[i], hdr[j])) ov.push(`${hdr[i].n}/${hdr[j].n}`);
    check(`${L}: no header element overlaps another`, ov.length === 0, ov.join(","));
    const arabic = await page.evaluate(() => { const a = document.querySelector(".word-card-arabic"), c = a.parentElement; const r = a.getBoundingClientRect(), cr = c.getBoundingClientRect(); return { sw: a.scrollWidth, cw: c.clientWidth, in: r.x >= cr.x - 1 && r.right <= cr.right + 1 }; });
    check(`${L}: the word fits inside its cell`, arabic.in && arabic.sw <= arabic.cw + 1, JSON.stringify(arabic));
    check(`${L}: "lemma" appears nowhere in the card's visible text`, !/lemma/i.test(await page.evaluate(() => document.querySelector(".quran-word-card").innerText)));
    await ctx.close();
  }
}

// A long word: 15:22:9 فَأَسْقَيْنَٰكُمُوهُ -- header must not overlap at the narrowest widths.
for (const lang of ["en", "bn"]) for (const width of [320, 360, 390]) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 844 } });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await openWord(page, 15, 22, 9);
  const hdr = await page.evaluate(() => [...document.querySelector(".quran-word-card header").children].map((e) => { const r = e.getBoundingClientRect(); return { n: e.className || e.tagName, x: r.x, y: r.y, r: r.right, b: r.bottom }; }));
  let ov = [];
  for (let i = 0; i < hdr.length; i++) for (let j = i + 1; j < hdr.length; j++) if (overlap(hdr[i], hdr[j])) ov.push(`${hdr[i].n}/${hdr[j].n}`);
  const a = await page.evaluate(() => { const e = document.querySelector(".word-card-arabic"); return e.scrollWidth <= e.parentElement.clientWidth + 1; });
  check(`${lang}/${width}: 15:22:9 header has no overlap and the word fits`, hdr.length >= 4 && ov.length === 0 && a, ov.join(",") + " fit=" + a);
  await ctx.close();
}

// A particle (2:102:1 is a verb; 2:102:2 is the relative pronoun الَّذِي-type word with no root).
for (const lang of ["en", "bn"]) for (const width of [320, 1280]) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 844 } });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await openWord(page, 2, 102, 2);
  const has = await page.evaluate(() => !!document.querySelector("[data-word-card-root-box]"));
  const hdr = await page.evaluate(() => [...document.querySelector(".quran-word-card header").children].map((e) => { const r = e.getBoundingClientRect(); return { n: e.className || e.tagName, x: r.x, y: r.y, r: r.right, b: r.bottom }; }));
  let ov = 0;
  for (let i = 0; i < hdr.length; i++) for (let j = i + 1; j < hdr.length; j++) if (overlap(hdr[i], hdr[j])) ov++;
  check(`${lang}/${width}: word with no root has no ROOT box and no overlap`, !has && hdr.length === 4 && ov === 0, `root=${has} children=${hdr.length} overlaps=${ov}`);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

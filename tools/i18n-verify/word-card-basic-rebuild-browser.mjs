// Word card rebuild, round 3 (#508) -- the Basic tab: facts row and the derived
// forms as ordered cards, for word 2:102:35 at 320/390/1280px in en and bn.
// Expected values are hand-written from the demo's FORMS table.
// Run from the repository root with `node serve.js` running.
//   --mutate-order  reverses the group order in the page's module before it
//   loads (route rewrite); the order check must then fail.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const nfc = (s) => String(s).normalize("NFC");
const EXPECT = ["عَلِمَ", "عَلَّمَ", "يَتَعَلَّمُ", "عِلْم", "عَٰلِم", "مَّعْلُوم", "مَّعْلُومَٰت", "مُعَلَّم", "عَلِيم", "عَلَّٰم", "أَعْلَم", "عَٰلَمِين", "أَعْلَٰم", "عَلَٰمَٰت"].map(nfc);

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
  await page.waitForSelector(".quran-word-card [data-word-card-facts]", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

for (const lang of ["en", "bn"]) {
  for (const width of [320, 390, 1280]) {
    const L = `${lang}/${width}`;
    console.log(`\n=== ${L}, 2:102:35 Basic ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: width > 600 ? 900 : 844 } });
    if (process.argv.includes("--mutate-order")) {
      await ctx.route("**/js/word-grammar-tables.js", async (route) => {
        const res = await route.fetch();
        const body = (await res.text()).replace('["verb", "masdar", "doer", "done", "intens", "elative", "noun", "other"]', '["other", "noun", "elative", "intens", "done", "doer", "masdar", "verb"]');
        await route.fulfill({ response: res, body });
      });
    }
    const requested = [];
    ctx.on("request", (r) => requested.push(r.url()));
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForTimeout(800);
    check(`${L}: I9 -- the landing page fetches no lemma-forms.json`, !requested.some((u) => u.includes("lemma-forms.json")));
    await openWord(page, 2, 102, 35);
    check(`${L}: I9 -- opening the card on WbW still fetches no lemma-forms.json`, !requested.some((u) => u.includes("lemma-forms.json")));
    await page.click('[data-word-card-level="basic"]');
    await page.waitForSelector("[data-word-card-dcard]", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
    check(`${L}: opening Basic fetches lemma-forms.json`, requested.some((u) => u.includes("lemma-forms.json")));

    const facts = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-word-card-panel="basic"] [data-word-card-fact]')].map((f) => [f.dataset.wordCardFact, f.querySelector("b").textContent])));
    check(`${L}: facts Root "ع ل م"`, facts.root === "ع ل م", JSON.stringify(facts));
    check(`${L}: facts Dictionary word "يَتَعَلَّمُ"`, nfc(facts.dict || "") === nfc("يَتَعَلَّمُ"), JSON.stringify(facts));
    check(`${L}: facts Form`, facts.form === (lang === "bn" ? "ফর্ম ৫" : "Form V"), JSON.stringify(facts));

    const cards = await page.evaluate(() => [...document.querySelectorAll("[data-word-card-dcard]")].map((c) => {
      const cs = getComputedStyle(c), r = c.getBoundingClientRect();
      const lines = [...c.children].map((e) => e.scrollWidth <= e.clientWidth + 1);
      return { ar: c.querySelector(".word-card-dcard-ar").textContent, group: c.querySelector(".word-card-dcard-group")?.textContent || "", pos: c.querySelector(".word-card-dcard-pos").textContent,
        count: c.querySelector(".word-card-dcard-count").textContent, bg: cs.backgroundColor, cur: c.hasAttribute("data-word-card-form-current"), top: Math.round(r.top), x: r.x, r: r.right, uncut: lines.every(Boolean), cardUncut: c.scrollWidth <= c.clientWidth + 1 };
    }));
    check(`${L}: 14 cards`, cards.length === 14, String(cards.length));
    check(`${L}: the 14 cards in the exact order`, JSON.stringify(cards.map((c) => nfc(c.ar))) === JSON.stringify(EXPECT), cards.map((c) => c.ar).join(" "));
    check(`${L}: group tag on card 4 (Verbal noun)`, cards[3]?.group === (lang === "bn" ? "ক্রিয়াবাচক বিশেষ্য" : "Verbal noun"), cards[3]?.group);
    check(`${L}: group tag on card 5 (The one who does it)`, cards[4]?.group === (lang === "bn" ? "কর্তাবাচক" : "The one who does it"), cards[4]?.group);
    check(`${L}: group tag on card 11 (Comparative)`, cards[10]?.group === (lang === "bn" ? "তুলনাবাচক" : "Comparative"), cards[10]?.group);
    check(`${L}: card 3 verb label carries the Form number`, cards[2]?.pos.includes(lang === "bn" ? "৫" : "V"), cards[2]?.pos);
    check(`${L}: counts use the reader's digits and word`, lang === "bn" ? /বার$/.test(cards[3]?.count) && /[০-৯]/.test(cards[3]?.count) : /^\d+×$/.test(cards[3]?.count), cards[3]?.count);
    const gold = cards.map((c, i) => c.bg === "rgb(255, 244, 214)" ? i : -1).filter((i) => i >= 0);
    check(`${L}: card 3 is the only gold card (computed background)`, JSON.stringify(gold) === "[2]", JSON.stringify(gold));
    check(`${L}: only card 3 carries the current marker`, cards.filter((c) => c.cur).length === 1 && cards[2]?.cur);
    const perRow = new Set(cards.slice(0, 14).map((c) => c.top));
    const first = cards.filter((c) => c.top === cards[0].top);
    const want = width >= 1000 ? 7 : 3;
    check(`${L}: ${want} cards per row`, first.length === want, `${first.length} rows=${perRow.size}`);
    check(`${L}: the first card is the rightmost in its row`, first.every((c) => c.x <= cards[0].x + 0.5));
    check(`${L}: no card text is cut`, cards.every((c) => c.uncut && c.cardUncut), JSON.stringify(cards.filter((c) => !c.uncut || !c.cardUncut).map((c) => c.ar)));
    check(`${L}: no sideways scroll`, await page.evaluate(() => { const c = document.querySelector(".quran-word-card"); return c.scrollWidth <= c.clientWidth + 1 && document.documentElement.scrollWidth <= window.innerWidth + 1; }));
    const head = await page.evaluate(() => ({ h: document.querySelector("[data-word-card-dcards] h4").textContent, s: document.querySelector(".word-card-forms-summary").textContent }));
    check(`${L}: heading`, head.h === (lang === "bn" ? "এই ধাতু থেকে উৎপন্ন রূপসমূহ" : "Derived forms of this root"), head.h);
    check(`${L}: summary says 14 forms`, lang === "bn" ? /^১৪টি রূপ · মোট .+ বার$/.test(head.s) : /^14 forms · \d+ times in all$/.test(head.s), head.s);
    check(`${L}: the record buttons and root count still follow the cards`, await page.evaluate(() => { const p = document.querySelector('[data-word-card-panel="basic"]'); const d = p.querySelector("[data-word-card-dcards]"); return !!d.nextElementSibling; }));
    check(`${L}: "lemma" appears nowhere in the visible text`, !/lemma/i.test(await page.evaluate(() => document.querySelector(".quran-word-card").innerText)));
    await page.screenshot({ path: `/tmp/basic-${lang}-${width}.png` });
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

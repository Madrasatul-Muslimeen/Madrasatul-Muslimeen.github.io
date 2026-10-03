// Word card rebuild, round 6 (#518) -- the 🔍 Search in the card header, in en
// and bn at 320/390/1280px. Expected values are hand-written (the brief and the
// demo's real figures), never read from the code under test.
// Run from the repository root with `node serve.js` running.
//   --mutate-strip  stops word-card-search.js stripping Arabic marks (route
//                   rewrite); the "Arabic search" checks must then fail.
//   --shots         writes screenshots of the open row to /tmp/search-*.png
//   --lang=en|bn, --width=N  narrow a run.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const nfc = (s) => String(s).normalize("NFC");
const SHOTS = process.argv.includes("--shots");
const only = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const BN = "০১২৩৪৫৬৭৮৯";
const bnDigits = (s) => String(s).replace(/\d/g, (d) => BN[d]);

async function openWord(page, surah, ayah, pos) {
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
const refOf = (page) => page.evaluate(() => document.querySelector(".quran-word-card .word-card-reference")?.textContent.trim());
const status = (page) => page.evaluate(() => document.querySelector("[data-word-card-search-status]")?.textContent.trim() ?? null);
const results = (page) => page.evaluate(() => [...document.querySelectorAll(".word-card-search-res")].map((b) => ({
  ar: b.querySelector(".word-card-search-res-ar").textContent, t: b.querySelector(".word-card-search-res-t").textContent, n: b.querySelector(".word-card-search-res-n").textContent })));
async function search(page, value) {
  await page.fill("[data-word-card-search-input]", value);
  await page.click("[data-word-card-search-go]");
  await page.waitForFunction(() => { const s = document.querySelector("[data-word-card-search-status]"); return s && s.textContent.trim() && !/…$/.test(s.textContent.trim()); }, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(300);
}
// WCAG contrast of an element's text colour against the first opaque background above it.
const contrast = (page, selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel); if (!el) return 0;
  const parse = (c) => c.match(/[\d.]+/g).map(Number);
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  let bg = null;
  for (let n = el; n && !bg; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c.length < 4 || c[3] > 0.99) bg = c; }
  const l1 = lum(parse(getComputedStyle(el).color)), l2 = lum(bg ?? [255, 255, 255]);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}, selector);

for (const lang of ["en", "bn"].filter((l) => !only("lang") || only("lang") === l)) {
  for (const width of [320, 390, 1280].filter((w) => !only("width") || Number(only("width")) === w)) {
    const L = `${lang}/${width}`;
    console.log(`\n=== ${L} ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: width > 600 ? 900 : 844 } });
    if (process.argv.includes("--mutate-strip")) {
      await ctx.route("**/js/word-card-search.js", async (route) => {
        const res = await route.fetch();
        const body = (await res.text()).replace('.replace(MARKS, "")', "");
        await route.fulfill({ response: res, body });
      });
    }
    const idxReq = [];
    ctx.on("request", (r) => { if (/word-forms-index\.json/.test(r.url())) idxReq.push(r.url()); });
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForTimeout(800);
    check(`${L}: I9 -- not requested at startup`, idxReq.length === 0, String(idxReq.length));

    await openWord(page, 2, 42, 8);
    check(`${L}: I9 -- not requested when the card opens`, idxReq.length === 0, String(idxReq.length));
    check(`${L}: the card opened on 2:42:8`, (await refOf(page)) === (lang === "bn" ? bnDigits("2:42:8") : "2:42:8"), await refOf(page));

    // Header: ‹ · 🔍 · word · ROOT · › · ✕
    const hd = await page.evaluate(() => {
      const h = document.querySelector(".quran-word-card header"); const r = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, w: b.width, h: b.height }; };
      const prev = h.querySelector('[data-word-card-move="previous"]'), s = h.querySelector("[data-word-card-search-toggle]"), w = h.querySelector(".word-card-head-word");
      return { prev: r(prev), s: s && r(s), w: r(w), pressed: s?.getAttribute("aria-pressed"), label: s?.getAttribute("aria-label"), text: s?.textContent, order: [...h.children].map((c) => c.getAttribute("data-word-card-search-toggle") !== null ? "search" : c.className || c.getAttribute("aria-label")).length,
        over: h.scrollWidth - h.clientWidth, doc: document.documentElement.scrollWidth - window.innerWidth, card: (() => { const c = document.querySelector(".quran-word-card"); return c.scrollWidth - c.clientWidth; })() };
    });
    check(`${L}: 🔍 sits between ‹ and the word`, hd.s && hd.prev.r <= hd.s.l + 0.5 && hd.s.r <= hd.w.l + 0.5, JSON.stringify(hd));
    check(`${L}: 🔍 is a square tile the size of ‹ (${width > 520 ? 40 : 36}px)`, hd.s && hd.s.w === hd.prev.w && hd.s.h === hd.prev.h && hd.s.w === hd.s.h && hd.s.w === (width > 520 ? 40 : 36), JSON.stringify(hd.s));
    check(`${L}: 🔍 starts unpressed, with a translated aria-label`, hd.pressed === "false" && hd.label === (lang === "bn" ? "শব্দ খুঁজুন" : "Search for a word") && hd.text === "🔍", `${hd.pressed} ${hd.label}`);
    check(`${L}: the header and page do not overflow`, hd.over <= 0 && hd.doc <= 0 && hd.card <= 0, JSON.stringify([hd.over, hd.doc, hd.card]));

    await page.click("[data-word-card-search-toggle]");
    await page.waitForTimeout(300);
    check(`${L}: pressing 🔍 opens the row, aria-pressed true, no fetch`, (await page.$("[data-word-card-search]")) && (await page.getAttribute("[data-word-card-search-toggle]", "aria-pressed")) === "true" && idxReq.length === 0, String(idxReq.length));
    const box = await page.evaluate(() => {
      const s = document.querySelector("[data-word-card-search]"), h = document.querySelector(".quran-word-card header"), c = document.querySelector(".quran-word-card");
      return { under: s.getBoundingClientRect().top >= h.getBoundingClientRect().bottom - 0.5, inside: s.getBoundingClientRect().right <= c.getBoundingClientRect().right + 0.5,
        label: s.querySelector("label").textContent, go: s.querySelector("[data-word-card-search-go]").textContent, chips: [...s.querySelectorAll("[data-word-card-search-try]")].map((b) => [b.dataset.wordCardSearchTry, b.textContent]),
        over: c.scrollWidth - c.clientWidth, focus: document.activeElement?.hasAttribute("data-word-card-search-input"), ph: s.querySelector("input").getBoundingClientRect().height };
    });
    check(`${L}: the row is under the header, inside the card, input focused`, box.under && box.inside && box.focus, JSON.stringify(box));
    check(`${L}: label and Search button are in ${lang}`, box.go === (lang === "bn" ? "খুঁজুন" : "Search") && /২:৪২:৮|2:42:8/.test(box.label) && (lang === "bn" ? /[ঀ-৿]/.test(box.label) : /^Find a word/.test(box.label)), box.label);
    const wantChips = lang === "bn" ? [["تعلمون", "تعلمون"], ["জান", "জান"], ["2:30:28", bnDigits("2:30:28")]] : [["تعلمون", "تعلمون"], ["know", "know"], ["2:30:28", "2:30:28"]];
    check(`${L}: the three Try chips`, JSON.stringify(box.chips) === JSON.stringify(wantChips), JSON.stringify(box.chips));
    check(`${L}: opening the row does not overflow the card`, box.over <= 0, String(box.over));

    // Arabic search
    await search(page, "تعلمون");
    check(`${L}: I9 -- requested once, on the first Search`, idxReq.length === 1, String(idxReq.length));
    let res = await results(page);
    check(`${L}: Arabic search -- تعلمون lists تَعْلَمُونَ first with 54`, res[0] && nfc(res[0].ar) === nfc("تَعْلَمُونَ") && res[0].n === (lang === "bn" ? `${bnDigits(54)} ×` : "54 ×"), JSON.stringify(res[0]));
    check(`${L}: Arabic search -- تَّعْلَمُونَ is a separate row, with 1`, res.some((r) => nfc(r.ar) === nfc("تَّعْلَمُونَ") && r.n.startsWith(lang === "bn" ? BN[1] : "1")), JSON.stringify(res.map((r) => r.ar)));
    check(`${L}: Arabic search -- status counts the forms`, (await status(page)) === (lang === "bn" ? `${bnDigits(res.length)}টি রূপ পাওয়া গেছে। কোথায় আছে দেখতে একটিতে চাপুন।` : `${res.length} forms found. Tap one to see where it is.`), await status(page));
    check(`${L}: result row carries transliteration and a meaning`, res[0] && res[0].t.includes("ʿlamūna") && res[0].t.includes(" · "), res[0]?.t);
    await search(page, "تعلمون");
    check(`${L}: I9 -- a second Search does not request the list again`, idxReq.length === 1, String(idxReq.length));

    if (SHOTS) { await page.evaluate(() => document.querySelector("[data-word-card-search]").scrollIntoView()); await page.screenshot({ path: `/tmp/search-${lang}-${width}-results.png` }); }
    await page.click('.word-card-search-res[data-word-card-search-form="0"]');
    await page.waitForTimeout(300);
    const places = await page.evaluate(() => [...document.querySelectorAll(".word-card-search-place")].map((b) => b.textContent.trim()));
    const want242 = lang === "bn" ? bnDigits("2:42:8") : "2:42:8";
    check(`${L}: tapping the form lists its 54 places, including 2:42:8`, places.length === 54 && places.includes(want242), `${places.length} ${places.slice(0, 3)}`);
    check(`${L}: places status`, (await status(page)).includes(lang === "bn" ? `${bnDigits(54)}টি স্থান` : "54 places. Tap one to open it."), await status(page));
    const scrolls = await page.evaluate(() => { const p = document.querySelector("[data-word-card-search-places]"); return { sh: p.scrollHeight, ch: p.clientHeight, over: document.querySelector(".quran-word-card").scrollWidth - document.querySelector(".quran-word-card").clientWidth }; });
    check(`${L}: the places sit in a scrolling box, nothing overflows sideways`, scrolls.ch <= 161 && scrolls.over <= 0, JSON.stringify(scrolls));

    await page.click(`[data-word-card-search-place="2042008"]`);
    await page.waitForTimeout(1500);
    check(`${L}: tapping 2:42:8 opens that word -- the card's reference reads 2:42:8`, (await refOf(page)) === want242, await refOf(page));
    const cur = await page.evaluate(() => [...document.querySelectorAll('[data-word-card-search-place][aria-current="true"]')].map((b) => b.dataset.wordCardSearchPlace));
    check(`${L}: that place has aria-current and the row is still open`, cur.join() === "2042008" && !!(await page.$("[data-word-card-search]")), cur.join());

    // Another place of the same form, in another surah: the card follows.
    await page.click(`[data-word-card-search-place="26049014"]`);
    await page.waitForFunction((w) => document.querySelector(".quran-word-card .word-card-reference")?.textContent.trim() === w, lang === "bn" ? bnDigits("26:49:14") : "26:49:14", { timeout: 15000 }).catch(() => {});
    check(`${L}: a place in another surah opens too (26:49:14)`, (await refOf(page)) === (lang === "bn" ? bnDigits("26:49:14") : "26:49:14"), await refOf(page));
    const arabicNow = await page.evaluate(() => document.querySelector(".quran-word-card .word-card-arabic")?.textContent.trim());
    check(`${L}: the card shows the written word at 26:49:14`, nfc(arabicNow).replace(/\s*[ۖ-ۛ]\s*$/, "") === nfc("تَعْلَمُونَ") || nfc(arabicNow).includes(nfc("تَعْلَمُونَ")), arabicNow);

    // Stays open over › and a re-render; what was typed stays.
    await page.fill("[data-word-card-search-input]", "تعلمون xyz");
    await page.click('[data-word-card-move="next"]');
    await page.waitForTimeout(1500);
    const kept = await page.evaluate(() => ({ open: !!document.querySelector("[data-word-card-search]"), value: document.querySelector("[data-word-card-search-input]")?.value, pressed: document.querySelector("[data-word-card-search-toggle]")?.getAttribute("aria-pressed") }));
    check(`${L}: the row stays open after › and what was typed is still there`, kept.open && kept.value === "تعلمون xyz" && kept.pressed === "true", JSON.stringify(kept));

    // Place search
    await search(page, lang === "bn" ? "২:৩০:২৮" : "2:30:28");
    await page.waitForFunction((w) => document.querySelector(".quran-word-card .word-card-reference")?.textContent.trim() === w, lang === "bn" ? bnDigits("2:30:28") : "2:30:28", { timeout: 15000 }).catch(() => {});
    check(`${L}: place search -- ${lang === "bn" ? "২:৩০:২৮" : "2:30:28"} opens 2:30:28 directly`, (await refOf(page)) === (lang === "bn" ? bnDigits("2:30:28") : "2:30:28"), await refOf(page));
    check(`${L}: place search status`, (await status(page)) === (lang === "bn" ? `${bnDigits("2:30:28")} খোলা হয়েছে।` : "Opened 2:30:28."), await status(page));
    await search(page, "2:30:999");
    check(`${L}: an unknown place says so`, (await status(page)) === (lang === "bn" ? `${bnDigits("2:30:999")}-এ কোনো শব্দ নেই।` : "There is no word at 2:30:999."), await status(page));

    // Meaning search
    await search(page, lang === "bn" ? "জান" : "know");
    res = await results(page);
    check(`${L}: meaning search -- "${lang === "bn" ? "জান" : "know"}" finds تَعْلَمُونَ among the results`, res.some((r) => nfc(r.ar) === nfc("تَعْلَمُونَ")), JSON.stringify(res.slice(0, 5).map((r) => r.ar)));
    check(`${L}: meaning search -- at most 30 results, most frequent first`, res.length <= 30 && res.length > 0 && res.every((r, i) => i === 0 || true), String(res.length));
    const counts = res.map((r) => Number(String(r.n).replace(/[০-৯]/g, (d) => BN.indexOf(d)).replace(/[^\d]/g, "")));
    check(`${L}: results are ordered by count, high first`, counts.every((n, i) => i === 0 || counts[i - 1] >= n), counts.join());
    if (res.length === 30) check(`${L}: more than 30 matches says how many`, /\d/.test(await status(page)) && (await status(page)).includes(lang === "bn" ? "সবচেয়ে বেশি ব্যবহৃত" : "most frequent"), await status(page));

    // No match
    await search(page, "zzzz");
    check(`${L}: no match shows the no-match line`, (await status(page)) === (lang === "bn" ? "কোনো শব্দ পাওয়া যায়নি। বানান দেখুন, অথবা হরকত ছাড়া চেষ্টা করুন।" : "No word found. Check the spelling, or try without vowel marks.") && (await results(page)).length === 0, await status(page));

    // Contrast (WCAG AA 4.5:1) of the status text and the result rows
    await search(page, "تعلمون");
    for (const [name, sel] of [["status", ".word-card-search-status"], ["label", ".word-card-search label"], ["result Arabic", ".word-card-search-res-ar"], ["result meaning", ".word-card-search-res-t"], ["result count", ".word-card-search-res-n"], ["Try chip", ".word-card-search-chips button"], ["Search button", ".word-card-search-go"]]) {
      const c = await contrast(page, sel);
      check(`${L}: contrast of the ${name} is at least 4.5:1`, c >= 4.5, c.toFixed(2));
    }
    if (SHOTS) { await page.click('.word-card-search-res[data-word-card-search-form="0"]'); await page.waitForTimeout(300); await page.screenshot({ path: `/tmp/search-${lang}-${width}-places.png` }); }

    // Pressing 🔍 again closes the row; the input is gone, still no extra fetch
    await page.click("[data-word-card-search-toggle]");
    await page.waitForTimeout(300);
    check(`${L}: pressing 🔍 again closes the row`, !(await page.$("[data-word-card-search]")) && (await page.getAttribute("[data-word-card-search-toggle]", "aria-pressed")) === "false" && idxReq.length === 1, String(idxReq.length));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

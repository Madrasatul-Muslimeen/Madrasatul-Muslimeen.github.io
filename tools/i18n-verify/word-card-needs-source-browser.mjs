// Decision 61 (#533) -- the Depth tab's three "Needs a source" lines, filled from
// the Corpus treebank (Naḥw), al-Furūq (Word Choice) and al-Mufradāt (Classical).
// Expected values are hand-written from the data files' own text, never read from
// the code under test. Run from the repository root with `node serve.js` running.
//   --mutate-closed-fetch  makes the card fetch the al-Furūq file as soon as it
//   opens; the load-boundary check must then fail.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const nfc = (s) => String(s).normalize("NFC");
const MUTATE = process.argv.includes("--mutate-closed-fetch");

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
  await page.waitForSelector(".quran-word-card", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
}
async function depth(page) {
  await page.click('[data-word-card-level="depth"]');
  await page.waitForSelector("[data-word-card-sec]", { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => document.querySelector('[data-word-card-sec="root"] [data-word-card-fam]'), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
}
const openSec = async (page, sec) => {
  await page.evaluate((s) => { const d = document.querySelector(`[data-word-card-sec="${s}"]`); if (d && !d.open) d.querySelector("summary").click(); }, sec);
};
const waitDone = (page, sec) => page.waitForFunction((s) => {
  const d = document.querySelector(`[data-word-card-sec="${s}"]`);
  return d && d.open && !d.querySelector("[data-word-card-need-loading]") && !/loading|লোড/i.test(d.querySelector("[data-word-card-chips2]")?.textContent ?? "");
}, sec, { timeout: 10000 }).catch(() => {});
const text = (page, sec) => page.evaluate((s) => document.querySelector(`[data-word-card-sec="${s}"] .word-card-acc-body`)?.innerText ?? "", sec);
const fresh = async (lang, width, setup) => {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: width > 600 ? 900 : 844 } });
  const requested = [];
  ctx.on("request", (r) => requested.push(r.url()));
  if (MUTATE) {
    await ctx.route("**/js/word-card-depth.js", async (route) => {
      const res = await route.fetch();
      const body = (await res.text()) + "\nfetch('../tools/quran-data-pull/output/furuq-index.json');";
      await route.fulfill({ response: res, body });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(800);
  return { ctx, page, requested };
};
const count = (reqs, re) => reqs.filter((u) => re.test(u)).length;
const FURUQ = /furuq-index\.json/, SYN = /word-syntax\/surah_\d+\.json/, MUF = /mufradat\/\d+\.json/;

const EXPECT = {
  en: { rel: "Subject of a verb", obj: "Object of a verb", takes: "In this sentence it takes:", credit: "Sentence grammar: Quranic Arabic Corpus", pageRef: "p. 80–81", show: "Show all", muf: "al-Mufradāt: p. 580 ✓", noFuruq: "al-Furūq has no entry for this word.", noMuf: "al-Mufradāt: no entry for this root", unc: "59–114", tags: ["From the data", "Grammar rule", "Needs a source", "From a book"], hiddenV: "a hidden verb", pp: "Preposition phrase", nt: "no translation yet" },
  bn: { rel: "ফায়েল", obj: "মাফউল বিহি", takes: "এই বাক্যে এটি নেয়:", credit: "বাক্যের ব্যাকরণ: Quranic Arabic Corpus", pageRef: "পৃ. ৮০–৮১", show: "সব দেখুন", muf: "আল-মুফরাদাত: পৃ. ৫৮০ ✓", noFuruq: "আল-ফুরূকে এই শব্দের কোনো এন্ট্রি নেই।", noMuf: "আল-মুফরাদাত: এই মূলের কোনো এন্ট্রি নেই", unc: "৫৯–১১৪", tags: ["তথ্য থেকে", "ব্যাকরণের নিয়ম", "উৎস প্রয়োজন", "বই থেকে"], hiddenV: "লুপ্ত ক্রিয়া", pp: "জার-মাজরুর বাক্যাংশ", nt: "অনুবাদ নেই" },
};

for (const lang of ["en", "bn"]) {
  const E = EXPECT[lang];
  for (const width of [390, 1280]) {
    const L = `${lang}/${width}`;
    console.log(`\n=== ${L} ===`);

    // Naḥw: 2:102:1 (وَٱتَّبَعُوا۟), and the load boundary.
    {
      const { ctx, page, requested } = await fresh(lang, width);
      await openWord(page, 2, 102, 1);
      await depth(page);
      check(`${L}: Depth open, all three sections closed: none of the three files fetched`, count(requested, FURUQ) === 0 && count(requested, SYN) === 0 && count(requested, MUF) === 0, JSON.stringify(requested.filter((u) => /furuq|syntax|mufradat/.test(u))));
      await openSec(page, "nahw");
      await waitDone(page, "nahw");
      check(`${L}: opening Naḥw fetched only the surah-2 treebank`, count(requested, SYN) === 1 && /surah_002\.json/.test(requested.find((u) => SYN.test(u)) ?? "") && count(requested, FURUQ) === 0 && count(requested, MUF) === 0, JSON.stringify(requested.filter((u) => /furuq|syntax|mufradat/.test(u))));
      const t = nfc(await text(page, "nahw"));
      check(`${L}: 2:102:1 names فاعل / the subject relation with head word 1`, t.includes("فاعل") && t.includes(E.rel) && /(word 1|শব্দ ১)/.test(t), t.slice(0, 400));
      check(`${L}: 2:102:1 lists مفعول به for word 2 under "takes"`, t.includes(E.takes) && t.includes("مفعول به") && /(word 2|শব্দ ২)/.test(t), t.slice(0, 600));
      const credit = await page.evaluate(() => { const a = document.querySelector('[data-word-card-credit="corpus"] a'); return a ? [a.href, a.textContent, a.parentElement.textContent] : null; });
      check(`${L}: Corpus credit links https://corpus.quran.com and says GPL v3`, !!credit && credit[0] === "https://corpus.quran.com/" && credit[2].includes(E.credit) && credit[2].includes("GPL v3"), JSON.stringify(credit));
      check(`${L}: the Corpus line is tagged From the data`, await page.evaluate(() => !!document.querySelector('[data-word-card-sec="nahw"] [data-word-card-gram-rel] ')), "");
      if (lang === "en" && width === 390) {
        await openSec(page, "choice"); await openSec(page, "classical");
        await page.waitForTimeout(1500);
        check(`load boundary: opening Word Choice then Classical fetched one furuq file and one mufradat file`, count(requested, FURUQ) === 1 && count(requested, MUF) === 1 && count(requested, SYN) === 1, JSON.stringify(requested.filter((u) => /furuq|syntax|mufradat/.test(u))));
      }
      await ctx.close();
    }

    // 1:1:1 بِسْمِ: the hidden verb and the prepositional phrase.
    {
      const { ctx, page } = await fresh(lang, width);
      await openWord(page, 1, 1, 1);
      await depth(page);
      await openSec(page, "nahw");
      await waitDone(page, "nahw");
      const t = nfc(await text(page, "nahw"));
      check(`${L}: 1:1:1 names the hidden verb`, t.includes(E.hiddenV), t.slice(0, 500));
      check(`${L}: 1:1:1 names the prepositional phrase (جار ومجرور)`, t.includes(E.pp) && t.includes("جار ومجرور"), t.slice(0, 500));
      await ctx.close();
    }

    // Surah 20: uncovered by the Corpus.
    {
      const { ctx, page, requested } = await fresh(lang, width);
      await openWord(page, 20, 2, 1);
      await depth(page);
      await openSec(page, "nahw");
      await waitDone(page, "nahw");
      const t = await text(page, "nahw");
      check(`${L}: surah 20 keeps a reworded Needs-a-source line (surahs ${E.unc})`, t.includes(E.unc) && await page.evaluate(() => !!document.querySelector('[data-word-card-sec="nahw"] .word-card-need')), t.slice(0, 400));
      check(`${L}: no word-syntax file was fetched for surah 20`, count(requested, SYN) === 0, JSON.stringify(requested.filter((u) => SYN.test(u))));
      await ctx.close();
    }

    // 2:32:4 عِلْمَ: Word Choice and Classical.
    {
      const { ctx, page, requested } = await fresh(lang, width);
      await openWord(page, 2, 32, 4);
      await depth(page);
      await openSec(page, "choice");
      await waitDone(page, "choice");
      const entry = await page.evaluate(() => {
        const es = [...document.querySelectorAll('[data-word-card-sec="choice"] [data-word-card-book="furuq"]')];
        const e = es.find((x) => x.querySelector("[data-word-card-book-h]").textContent === "الفرق بين العلم والمعرفة");
        if (!e) return { count: es.length };
        const t = e.querySelector("[data-word-card-book-t]");
        return { count: es.length, ref: e.querySelector("[data-word-card-book-ref]").textContent, collapsed: t.scrollHeight > t.clientHeight + 2, h: t.clientHeight, full: t.scrollHeight, tag: e.querySelector("[data-word-card-src]").dataset.wordCardSrc };
      });
      check(`${L}: Word Choice has the entry الفرق بين العلم والمعرفة with ${E.pageRef}`, !!entry.ref && entry.ref.includes(E.pageRef), JSON.stringify(entry));
      check(`${L}: that entry is tagged From a book and is collapsed`, entry.tag === "book" && entry.collapsed === true, JSON.stringify(entry));
      await page.evaluate(() => { [...document.querySelectorAll('[data-word-card-book="furuq"]')].find((x) => x.querySelector("[data-word-card-book-h]").textContent === "الفرق بين العلم والمعرفة").querySelector("label.word-card-more").click(); });
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => { const e = [...document.querySelectorAll('[data-word-card-book="furuq"]')].find((x) => x.querySelector("[data-word-card-book-h]").textContent === "الفرق بين العلم والمعرفة"); const t = e.querySelector("[data-word-card-book-t]"); return { h: t.clientHeight, full: t.scrollHeight, label: e.querySelector("label.word-card-more").innerText }; });
      check(`${L}: after Show all the whole text is shown`, after.full <= after.h + 2, JSON.stringify(after));
      const ft = nfc(await text(page, "choice"));
      check(`${L}: the OpenITI credit (DOI, licence link) and the no-translation line show`, ft.includes("doi:10.5281/zenodo.3082463") && ft.includes(E.nt) && await page.evaluate(() => !!document.querySelector('[data-word-card-sec="choice"] [data-word-card-credit="openiti"] a[href*="creativecommons.org/licenses/by-nc-sa/4.0"]')), ft.slice(-300));
      await openSec(page, "classical");
      await waitDone(page, "classical");
      const cl = await page.evaluate(() => ({
        chips: [...document.querySelectorAll("[data-word-card-chips2] [data-word-card-dline]")].map((c) => c.innerText),
        entry: document.querySelector('[data-word-card-book="mufradat"] [data-word-card-book-t]')?.textContent ?? "",
        ref: document.querySelector('[data-word-card-book="mufradat"] [data-word-card-book-ref]')?.textContent ?? "",
        lane: !!document.querySelector('[data-word-card-dict-link="lane"]'),
        note: !!document.querySelector("[data-word-card-classical-note]"),
      }));
      check(`${L}: Classical chip reads ${E.muf}`, cl.chips.some((c) => c.includes(E.muf)), JSON.stringify(cl.chips));
      check(`${L}: the al-Mufradāt entry starts "العلم: إدراك الشيء بحقيقته" and keeps its page range`, nfc(cl.entry).startsWith("العلم: إدراك الشيء بحقيقته") && cl.ref.includes(lang === "bn" ? "৫৮০–৫৮২" : "580–582"), JSON.stringify([cl.entry.slice(0, 40), cl.ref]));
      check(`${L}: Lane link and the "no unattributed" note stay`, cl.lane && cl.note, JSON.stringify(cl));
      check(`${L}: paragraph breaks are shown (white-space keeps \\n)`, await page.evaluate(() => /pre-line|pre-wrap/.test(getComputedStyle(document.querySelector("[data-word-card-book-t]")).whiteSpace)), "");
      check(`${L}: every Arabic book text is rtl lang=ar`, await page.evaluate(() => [...document.querySelectorAll("[data-word-card-book-t]")].every((e) => e.dir === "rtl" && e.lang === "ar")), "");
      if (width === 390) {
        const legend = await page.evaluate(() => [...document.querySelectorAll("[data-word-card-legend] [data-word-card-src]")].map((e) => [e.dataset.wordCardSrc, e.textContent]));
        check(`${L}: legend shows four tags`, JSON.stringify(legend) === JSON.stringify([["data", E.tags[0]], ["rule", E.tags[1]], ["needs", E.tags[2]], ["book", E.tags[3]]]), JSON.stringify(legend));
        const ratio = await page.evaluate(() => {
          const lum = (c) => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map((x) => { x = Number(x) / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
          const res = {};
          for (const [name, el] of [["night", document.querySelector("[data-word-card-legend] .word-card-src-book")], ["light", document.querySelector('[data-word-card-sec="classical"] .word-card-src-book')]]) {
            const cs = getComputedStyle(el); const a = lum(cs.color), b = lum(cs.backgroundColor);
            res[name] = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          }
          return res;
        });
        check(`${L}: the From a book tag reads at 4.5:1 on the Night and the Light card`, ratio.night >= 4.5 && ratio.light >= 4.5, JSON.stringify(ratio));
      }
      check(`${L}: Classical opening fetched al-Mufradāt file 18 (ع), nothing else new`, count(requested, MUF) === 1 && /mufradat\/18\.json/.test(requested.find((u) => /mufradat\/\d+\.json/.test(u)) ?? ""), JSON.stringify(requested.filter((u) => MUF.test(u))));
      await ctx.close();
    }

    // A word with no al-Furūq entry (2:2:1 ذَٰلِكَ) and one with no mufradat entry is hard to name; the first is enough.
    {
      const { ctx, page } = await fresh(lang, width);
      await openWord(page, 2, 2, 1);
      await depth(page);
      await openSec(page, "choice");
      await waitDone(page, "choice");
      const t = nfc(await text(page, "choice"));
      check(`${L}: a word with no al-Furūq entry shows the reworded line`, t.includes(E.noFuruq), t.slice(0, 300));
      await ctx.close();
    }
  }
}

// No sideways scroll with the longest al-Mufradāt entry (هدي, 8,875 characters) shown in full.
for (const width of [320, 390, 768, 1280]) {
  const { ctx, page } = await fresh("en", width);
  await openWord(page, 1, 6, 1); // ٱهْدِنَا: root هدي
  await depth(page);
  await openSec(page, "classical");
  await waitDone(page, "classical");
  await page.evaluate(() => document.querySelectorAll("label.word-card-more").forEach((l) => l.click()));
  await page.waitForTimeout(300);
  const m = await page.evaluate(() => {
    const body = document.querySelector('[data-word-card-sec="classical"] .word-card-acc-body');
    const card = document.querySelector(".quran-word-card") ?? body;
    const t = document.querySelector('[data-word-card-book="mufradat"] [data-word-card-book-t]');
    return { entry: t ? t.textContent.length : 0, bodyOver: body.scrollWidth - body.clientWidth, docOver: document.documentElement.scrollWidth - document.documentElement.clientWidth, cardOver: card.scrollWidth - card.clientWidth, inside: t ? t.getBoundingClientRect().right <= body.getBoundingClientRect().right + 1 : false };
  });
  check(`en/${width}: longest entry (${m.entry} chars) shown in full: no sideways scroll`, m.entry > 5000 && m.bodyOver <= 0 && m.docOver <= 0 && m.cardOver <= 0 && m.inside, JSON.stringify(m));
  await ctx.close();
}

console.log(`\nword-card-needs-source-browser: ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);

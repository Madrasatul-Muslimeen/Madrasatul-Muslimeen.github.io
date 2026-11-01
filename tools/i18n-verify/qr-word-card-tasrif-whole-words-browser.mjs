// QR Lead audit 6b, 1 Nov 2026 (asked by the MSA Architect after v13.04, 7:09 pm and 7:29 pm 31 Oct): a Qur'an word never
// splits in Taṣrīf. Measured on main v13.09 with this suite's probe: the noun cells and case heads carried
// overflow-wrap:anywhere for their English and broke the Arabic inside the word ("بِأَسْمَ / آئِهِمْ" even at 320x640 100%,
// "مَنْصُو / ب" in the heads at 200%), and the verb tables were worse: at 768x1024 200% three tables sat side by side and
// even هُمْ broke as هُ / مْ. Now the Arabic never wraps, a word too wide for its box is shrunk to fit (never below 0.8 of its
// ordinary-text size), a word too wide even then takes the whole grid row, and the verb tables stack under 40rem.
//   node tools/i18n-verify/qr-word-card-tasrif-whole-words-browser.mjs [--mutate=NAME]   (serve.js on :8080 or QR_BASE, repo root)
//   no-nowrap     the noun Arabic may wrap again         -> "no Qur'an word splits" FAILS (nouns)
//   no-verb-wrap  the verb Arabic may wrap again         -> "no Qur'an word splits" FAILS (verbs)
//   no-fit        fitTasrifArabic() does nothing         -> "every word lies inside its box" FAILS at 320 200%
//   no-wide       a word never takes the whole row       -> the forced long-word case FAILS
//   low-floor     the floor is 0.3, not 0.8              -> "never below 0.8" and the forced case FAIL
//   px-stack      the verb tables stack at 640px again   -> "no verb word has to be shrunk" FAILS at 768/740/1280 with larger text
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
// [from, to, copies]: every copy is replaced, and the count must be exactly as written.
const MUT = {
  "no-nowrap": [".word-card-ncell-ar, .word-card-ntable-ar { white-space: nowrap; overflow-wrap: normal; }", ".word-card-ncell-ar, .word-card-ntable-ar { }", 1],
  "no-verb-wrap": [".word-card-cj-pr .word-card-ar, td.word-card-cj-vb { white-space: nowrap; overflow-wrap: normal; }", ".word-card-cj-pr .word-card-ar, td.word-card-cj-vb { }", 1],
  "no-fit": ["      if (!mount || mount.hidden) return;\n      const words = [", "      return;\n      const words = [", 1],
  "no-wide": ['          td.classList.add("word-card-ntd-wide");', "", 1],
  "low-floor": ["const floor = 0.8 * base * 16 / rootPx;", "const floor = 0.3 * base * 16 / rootPx;", 1],
  "px-stack": ["@container (max-width: 40rem) { .word-card-conj {", "@container (max-width: 640px) { .word-card-conj {", 1],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function open(w, h, lang, size, word, extraCss = "") {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) await ctx.route("**/app/quranrevival.html*", async (r) => {
    const res = await r.fetch(); let body = await res.text();
    const [from, to, n] = MUT[MUTATE]; const c = body.split(from).length - 1;
    if (c !== n) throw new Error(`mutation ${MUTATE}: anchor found ${c} times, not ${n}`);
    r.fulfill({ response: res, body: body.split(from).join(to) });
  });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.querySelector("#wheelContainer svg"), null, { timeout: 30000 });
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((e) => e.remove()));
  await page.evaluate(() => { const m = document.getElementById("mushafToggle"); if (m.checked) { m.checked = false; m.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.evaluate(([s, css]) => { document.documentElement.style.fontSize = s; if (css) { const st = document.createElement("style"); st.textContent = css; document.head.append(st); } }, [size, extraCss]);
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById("tabReadBtn").click()); await page.waitForTimeout(1500);
  const [su, ay] = word.split(":");
  if (word !== "1:1:1") {
    await page.evaluate(([su, ay]) => { const ss = document.getElementById("surahSelect"); ss.value = su; ss.dispatchEvent(new Event("change", { bubbles: true })); setTimeout(() => { const as = document.getElementById("ayahSelect"); as.value = ay; as.dispatchEvent(new Event("change", { bubbles: true })); }, 600); }, [su, ay]);
    await page.waitForFunction((wd) => !!document.querySelector(`#readView [data-word-occurrence$=":${wd}"]`), word, { timeout: 8000 }).catch(() => {});
  }
  await page.evaluate((wd) => document.querySelector(`#readView [data-word-occurrence$=":${wd}"]`)?.click(), word);
  await page.waitForFunction(() => document.querySelector('#quranWordCardMount [data-word-card-level="tasrif"]'), null, { timeout: 10000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('#quranWordCardMount [data-word-card-level="tasrif"]')?.click());
  await page.waitForFunction(() => document.querySelector("#quranWordCardMount .word-card-ntable, #quranWordCardMount .word-card-cj table"), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(900);
  return { ctx, page };
}

// Every Qur'an word in Taṣrīf: is it on one line, inside its own box, inside the card, and never below its floor?
const measure = (page) => page.evaluate(() => {
  const mount = document.getElementById("quranWordCardMount"), card = mount.getBoundingClientRect();
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const out = [];
  for (const e of mount.querySelectorAll(".word-card-ncell-ar, .word-card-ntable-ar, td.word-card-cj-vb, .word-card-cj-pr .word-card-ar")) {
    const parts = e.matches("td.word-card-cj-vb") ? [...e.querySelectorAll(".word-card-cj-p, .word-card-cj-st, .word-card-cj-e")].filter((x) => x.textContent) : [e];
    if (!parts.length || !e.getClientRects().length) continue;
    const fs = parseFloat(getComputedStyle(parts[0]).fontSize);
    // A word is split when one of its parts has two line boxes (inline: two client rects; block: two lines tall), or
    // its coloured parts sit on different lines.
    const lines = (x) => { const cs = getComputedStyle(x); if (cs.display === "inline") return x.getClientRects().length; return Math.round(x.getBoundingClientRect().height / parseFloat(cs.lineHeight)); };
    const tops = parts.map((x) => x.getClientRects()[0].top);
    const split = parts.some((x) => lines(x) > 1) || Math.max(...tops) - Math.min(...tops) > fs * 0.3;
    const rg = document.createRange(); rg.setStartBefore(parts[0]); rg.setEndAfter(parts[parts.length - 1]);
    const rr = rg.getBoundingClientRect();
    const box = (e.matches("td") ? e : e.closest("button, th, td")).getBoundingClientRect();
    const own = e.style.fontSize; e.style.removeProperty("font-size");
    const base = parseFloat(getComputedStyle(parts[0]).fontSize); if (own) e.style.fontSize = own;
    out.push({ t: e.textContent.trim().slice(0, 16), split, outBox: Math.round(Math.max(box.left - rr.left, rr.right - box.right)),
      outCard: Math.round(Math.max(card.left - rr.left, rr.right - card.right)), shrunk: !!own, fs: Math.round(fs * 10) / 10, floor: Math.round(0.8 * base * 16 / rootPx * 10) / 10 });
  }
  const over = [...mount.querySelectorAll(".word-card-ntable, .word-card-cj table")].filter((t) => t.getClientRects().length).map((t) => Math.round(t.getBoundingClientRect().width - t.parentElement.clientWidth)).filter((d) => d > 1);
  return { words: out, nouns: mount.querySelectorAll("[data-noun-cell]").length, verbs: mount.querySelectorAll("td.word-card-cj-vb").length,
    wide: mount.querySelectorAll(".word-card-ntd-wide").length, over };
});

const short = (a) => JSON.stringify(a.slice(0, 4));
for (const [word, kind] of [["1:1:1", "noun"], ["1:5:2", "verb"]]) for (const [w, h, lang] of [[320, 640, "en"], [320, 640, "bn"], [360, 740, "en"], [390, 844, "bn"], [768, 1024, "en"], [740, 360, "bn"], [1280, 800, "en"]]) for (const size of ["100%", "150%", "200%"]) {
  const tag = `${kind} ${w}x${h} ${lang} ${size}`;
  const { ctx, page } = await open(w, h, lang, size, word);
  const m = await measure(page);
  check(`${tag}: POSITIVE CONTROL Taṣrīf shows its ${kind} table with its Qur'an words`, kind === "noun" ? m.nouns >= 9 && m.words.length >= 9 : m.verbs >= 10 && m.words.length >= 20, `${m.nouns} cells, ${m.verbs} verbs, ${m.words.length} words`);
  const split = m.words.filter((x) => x.split), outBox = m.words.filter((x) => x.outBox > 1), outCard = m.words.filter((x) => x.outCard > 1), low = m.words.filter((x) => x.fs < x.floor - 0.2);
  check(`${tag}: no Qur'an word splits`, !split.length, short(split));
  check(`${tag}: every word lies inside its box`, !outBox.length, short(outBox));
  check(`${tag}: every word lies inside the card, and no table is wider than its box`, !outCard.length && !m.over.length, short(outCard) + " " + m.over);
  check(`${tag}: no word is below 0.8 of its ordinary-text size`, !low.length, short(low));
  // The verb tables stack under 40rem, so their words keep the size J61 gives them; shrinking is only a safety net there.
  if (kind === "verb") { const sh = m.words.filter((x) => x.shrunk); check(`${tag}: no verb word has to be shrunk (the tables stack instead)`, !sh.length, short(sh)); }
  await ctx.close();
}
// A word too long even at its floor (the last box's word made three times as long) takes the whole row of the stacked grid.
for (const lang of ["en", "bn"]) {
  const tag = `noun 320x640 ${lang} 200% with a word too long for its third`;
  const { ctx, page } = await open(320, 640, lang, "200%", "1:1:1");
  // The last box's word written three times over with no space: about 147px at its floor in a 66px third, and 250px of
  // row. (letter-spacing cannot make it: Chromium ignores it on joined Arabic.) The card's observer refits on the change.
  await page.evaluate(() => { const w = [...document.querySelectorAll("#quranWordCardMount .word-card-ncell-ar")].pop(); w.textContent = w.textContent.repeat(3); });
  await page.waitForTimeout(600);
  const m = await measure(page);
  check(`${tag}: POSITIVE CONTROL the noun table is shown`, m.nouns >= 9, `${m.nouns}`);
  check(`${tag}: the word takes the whole row`, m.wide >= 1, `${m.wide} wide cells`);
  check(`${tag}: no word splits, and every word lies inside its box and above its floor`, m.words.every((x) => !x.split && x.outBox <= 1 && x.fs >= x.floor - 0.2), short(m.words.filter((x) => x.split || x.outBox > 1 || x.fs < x.floor - 0.2)));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

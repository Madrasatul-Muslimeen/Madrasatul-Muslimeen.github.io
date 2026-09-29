// Derived-form MEANING on the Word Card -- rendered geometry, both languages,
// six widths, both tabs, real-length content (the longest meanings in
// lemma-meaning-index.json). Run from the repository root.
// Screenshots go to $SHOTS (default /tmp/form-meaning-shots).
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const shots = process.env.SHOTS || "/tmp/form-meaning-shots";
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

// The longest meanings, read off the index for the report.
const idx = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/lemma-meaning-index.json", "utf8"));
for (const l of ["en", "bn"]) {
  const top = Object.entries(idx.values).filter(([, v]) => v[l]).sort((a, b) => b[1][l].length - a[1][l].length).slice(0, 5);
  console.log(`  longest ${l}: ${top.map(([k, v]) => `${v[l].length} (${k})`).join(", ")}`);
}

// [surah, ayah, position, what it carries]
const WORDS = [
  [35, 12, 28, "تَشْكُرُونَ (owner's example)"],
  [24, 33, 17, "كَاتِبُ -- longest Bangla meaning (50)"],
  [2, 220, 22, "أَعْنَتَ -- longest English meaning (44)"],
];

async function openWord(page, [s, a, p]) {
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(200); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(600);
  await page.evaluate((s) => { const e = document.getElementById("surahSelect"); e.value = String(s); e.dispatchEvent(new Event("change", { bubbles: true })); }, s);
  await page.waitForTimeout(2500);
  await page.evaluate((a) => { const e = document.getElementById("ayahSelect"); if (e.querySelector(`option[value="${a}"]`)) { e.value = String(a); e.dispatchEvent(new Event("change", { bubbles: true })); } }, a);
  await page.waitForTimeout(1500);
  await page.evaluate(([s, a, p]) => document.querySelector(`#readView [data-word-occurrence$=":${s}:${a}:${p}"]`)?.click(), [s, a, p]);
  await page.waitForTimeout(1000);
}

const measure = () => {
  const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  // The card paints a GRADIENT, so every colour stop of the nearest painted
  // ancestor is a candidate background; the worst one is what is measured.
  const bgsOf = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const stops = (cs.backgroundImage.match(/rgba?\([^)]*\)/g) || []).filter((c) => { const m = c.match(/[\d.]+/g); return m.length < 4 || Number(m[3]) > 0.99; });
      if (stops.length) return stops;
      const m = cs.backgroundColor.match(/[\d.]+/g);
      if (m && (m.length < 4 || Number(m[3]) > 0.99)) return [cs.backgroundColor];
    }
    return ["rgb(255,255,255)"];
  };
  const contentBox = document.querySelector(".word-card-content").getBoundingClientRect();
  const rows = [...document.querySelectorAll("[data-word-card-panel] .word-card-form")].map((li) => {
    const liR = li.getBoundingClientRect();
    const box = (sel) => { const e = li.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, sw: e.scrollWidth, cw: e.clientWidth, e }; };
    const pos = box(".word-card-form-pos"), ar = box(".word-card-form-arabic"), me = box(".word-card-form-meaning"), ct = box(".word-card-form-count");
    const items = [pos, ar, me, ct].filter(Boolean);
    let contrast = null;
    if (me) { const a = lum(getComputedStyle(me.e).color); contrast = Math.min(...bgsOf(me.e).map((bg) => { const b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); })); }
    const mid = (x) => (x.t + x.b) / 2;
    return {
      hasMeaning: !!me,
      order: items.every((x, i) => i === 0 || x.l >= 0) && (!me || (ar.r <= me.l + 1 || me.t >= ar.b - 4 || ar.l >= me.r - 1)),
      inside: items.every((x) => x.l >= contentBox.left - 1 && x.r <= contentBox.right + 1),
      noClip: items.every((x) => x.sw <= x.cw + 1),
      // Count beside the meaning (same line, small gap) or directly under it.
      countPlaced: !ct || !me || (mid(ct) >= me.t && mid(ct) <= me.b ? ct.l - me.r <= 24 && ct.l >= me.r - 1 : ct.t >= me.b - 4 && ct.l <= me.r),
      contrast,
      liInside: liR.right <= contentBox.right + 1,
    };
  });
  return { n: rows.length, withMeaning: rows.filter((r) => r.hasMeaning).length, rows, docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
};

for (const lang of ["en", "bn"]) for (const width of [320, 360, 390, 412, 768, 1280]) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: width >= 768 ? 900 : 844 } });
  try {
    for (const w of WORDS) {
      // A fresh page per word: the open card covers the surah picker.
      const { page } = await openPage(ctx, "/app/quranrevival.html");
      await openWord(page, w);
      for (const tab of ["basic", "depth"]) {
        await page.click(`#quranWordCardMount [data-word-card-level="${tab}"]`);
        await page.waitForTimeout(2800);
        const m = await page.evaluate(measure);
        const tag = `${lang} ${width}px ${w[0]}:${w[1]}:${w[2]} ${tab}`;
        check(`${tag}: forms render and most carry a meaning`, m.n > 0 && m.withMeaning >= m.n - 1, `n=${m.n} withMeaning=${m.withMeaning}`);
        check(`${tag}: nothing outside the card, nothing clipped`, m.rows.every((r) => r.inside && r.noClip && r.liInside) && m.docOverflow <= 0, JSON.stringify({ o: m.docOverflow, bad: m.rows.map((r, i) => [i, r.inside, r.noClip]).filter((x) => !x[1] || !x[2]) }));
        check(`${tag}: order category, Arabic, meaning; count beside or under the meaning`, m.rows.every((r) => r.order && r.countPlaced), JSON.stringify(m.rows.map((r, i) => [i, r.order, r.countPlaced]).filter((x) => !x[1] || !x[2])));
        check(`${tag}: meaning contrast >= 4.5:1`, m.rows.every((r) => r.contrast === null || r.contrast >= 4.5), String(Math.min(...m.rows.map((r) => r.contrast ?? 99)).toFixed(2)));
        if (w[0] === 35 && w[1] === 12 && tab === "basic" && (width === 360 || width === 1280)) {
          await page.locator(".quran-word-card").screenshot({ path: `${shots}/${lang}-${width}-35-12-28-basic.png` });
        }
        if (w[0] !== 35 && width === 320 && tab === "basic") await page.locator(".quran-word-card").screenshot({ path: `${shots}/${lang}-320-${w[0]}-${w[1]}-${w[2]}.png` });
      }
      await page.close();
    }
  } catch (e) { check(`${lang} ${width}px measurement ran`, false, e.message.split("\n")[0]); }
  await ctx.close();
}

console.log(`\n==== word-card form meaning (browser): ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);

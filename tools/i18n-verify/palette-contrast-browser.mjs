// Owner, 1 Oct 2026 (a phone photo of Explore's "Track the Status of
// Approaches" list in the Night card look: the Approach names black on navy).
// Every drop-down palette on the Quran page's landing view and Explore, opened
// with its REAL toggle in BOTH card looks: every piece of text inside it must
// read at 4.5:1 or better against the background actually behind it. Measured
// before the fix: Explore's rows 1.1:1, Choose a Unit's "Study Unit" label
// 2.35:1, the section headings 4.2:1. A palette belongs to its surface.
// Run from the repository root with `node serve.js` running.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `
        ${detail}` : ""}`); }
}
const browser = await chromium.launch();
const SWEEP = () => {
  const parse = (s) => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0],p[1],p[2],p[3]===undefined?1:p[3]]; };
  const lum = ([r,g,b]) => { const l=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)}; return 0.2126*l(r)+0.7152*l(g)+0.0722*l(b); };
  const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c[3] > 0.5) return c; } return [255,255,255,1]; };
  const out = [];
  for (const pal of document.querySelectorAll(".bar-palette")) {
    if (getComputedStyle(pal).display === "none") continue;
    for (const el of pal.querySelectorAll("*")) {
      const txt = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(" ");
      if (!txt || el.getBoundingClientRect().width === 0) continue;
      const cs = getComputedStyle(el); const fg = parse(cs.color); const bg = bgOf(el);
      const op = parseFloat(cs.opacity);
      const a = lum(fg), b = lum(bg); const cr = (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
      if (cr < 4.5) out.push({ pal: pal.dataset.barPalette, tag: el.tagName + "." + [...el.classList].join("."), txt: txt.slice(0,30), cr: Math.round(cr*100)/100, fg: cs.color, bg: `rgb(${bg.slice(0,3)})` });
    }
  }
  return out;
};

const TEXT_COUNT = () => [...document.querySelectorAll(".bar-palette")].filter((p) => getComputedStyle(p).display !== "none").reduce((n, p) => n + [...p.querySelectorAll("*")].filter((el) => [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) && el.getBoundingClientRect().width > 0).length, 0);
for (const look of ["night", "light"]) {
  for (const width of [390, 1280]) {
    const ctx = await newContext(browser, { viewport: { width, height: 844 } });
    await ctx.addInitScript((l) => { try { localStorage.setItem("mm_card_look", l); } catch {} }, look);
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForSelector("#wheelUnitBtn", { state: "visible", timeout: 20000 });
    await page.waitForTimeout(800);
    check(`[${look} ${width}] the page really is in the ${look} card look`, (await page.evaluate(() => document.documentElement.dataset.cardLook)) === look);
    for (const [where, toggle] of [["landing", "wheelUnit"], ["explore", "exploreApproach"]]) {
      if (where === "explore") { await page.evaluate(() => document.getElementById("tabExploreBtn")?.click()); await page.waitForSelector('[data-bar-palette-toggle="exploreApproach"]', { state: "visible", timeout: 10000 }); await page.waitForTimeout(600); }
      await page.click(`[data-bar-palette-toggle="${toggle}"]`);
      await page.waitForTimeout(300);
      const n = await page.evaluate(TEXT_COUNT);
      // Positive control: the palette is open and holds text, or a "nothing below 4.5" result means nothing.
      check(`[${look} ${width}] ${toggle} opens with text in it (${n} text elements)`, n >= 2, String(n));
      const low = await page.evaluate(SWEEP);
      check(`[${look} ${width}] every text in the ${toggle} palette reads at 4.5:1 or better`, low.length === 0, JSON.stringify(low.slice(0, 4)));
      await page.keyboard.press("Escape"); await page.waitForTimeout(150);
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`
palette-contrast-browser: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

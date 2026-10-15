// Audit part 10 (PCF J29 item 16b): every text label of a wheel lies wholly inside the box that shows it.
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const PROBE = process.argv.includes("--probe");
const browser = await chromium.launch();
const click = (page, id) => page.evaluate((id) => document.getElementById(id)?.click(), id);

// Measures every <text> in every visible wheel svg against the svg's own box and every clipping ancestor.
const MEASURE = () => {
  const out = [];
  for (const svg of document.querySelectorAll("svg.mastery-wheel")) {
    const sb = svg.getBoundingClientRect();
    if (!(sb.width > 0)) continue;
    const clips = [];
    if (getComputedStyle(svg).overflow !== "visible") clips.push({ n: "svg", l: sb.left, r: sb.right, t: sb.top, b: sb.bottom });
    for (let a = svg.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
        const b = a.getBoundingClientRect(), x = cs.overflowX !== "visible", y = cs.overflowY === "hidden" || cs.overflowY === "clip"; // a scrolling box only scrolls down to a label; it does not cut it
        clips.push({ n: a.id || String(a.className) || a.tagName, l: x ? b.left : -1e9, r: x ? b.right : 1e9, t: y ? b.top : -1e9, b: y ? b.bottom : 1e9 });
      }
    }
    const cut = [];
    const texts = [...svg.querySelectorAll("text")].filter((t) => t.textContent.trim() && t.getBoundingClientRect().width > 0);
    for (const t of texts) {
      const r = t.getBoundingClientRect();
      for (const c of clips) {
        if (r.left < c.l - 0.5 || r.right > c.r + 0.5 || r.top < c.t - 0.5 || r.bottom > c.b + 0.5) { cut.push(`${t.textContent.trim()}@${c.n}`); break; }
      }
    }
    out.push({ id: svg.id || svg.parentElement?.id || String(svg.getAttribute("class")), texts: texts.length, cut, w: Math.round(sb.width), clips: clips.map((c) => c.n) });
  }
  return out;
};

async function flow(tag, fn) {
  const [lang, width] = tag.split(" ");
  let ctx;
  try {
    ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width: parseInt(width), height: 900 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForTimeout(1500);
    await Promise.race([fn(tag, page), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 90000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await ctx.close().catch(() => {});
}
async function verdict(t, page, label, min) {
  const m = await page.evaluate(MEASURE);
  if (PROBE) console.log(t, label, JSON.stringify(m));
  const texts = m.reduce((n, x) => n + x.texts, 0);
  check(`${t}: POSITIVE CONTROL ${label} rendered labels (${texts})`, texts >= min);
  const cut = m.flatMap((x) => x.cut);
  check(`${t}: ${label}: every label whole inside its box`, cut.length === 0, cut.slice(0, 6).join(", "));
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check(`${t}: ${label}: nothing scrolls sideways (${over})`, over <= 0);
}

for (const lang of ["en", "bn"]) for (const width of [320, 390, 820, 1440]) {
  const tag = `${lang} ${width}px`;
  await flow(`${tag} landing`, async (t, page) => { await verdict(t, page, "landing wheel", 3); });
  await flow(`${tag} qcr`, async (t, page) => {
    await click(page, "tabExploreBtn"); await page.waitForTimeout(700);
    await click(page, "explorePaletteQcrBtn"); await page.waitForTimeout(900);
    const count = await page.evaluate(() => document.getElementById("qcrLevelSelect")?.options.length ?? 0);
    let best = -1, bestN = 0;
    for (let i = 0; i < count; i++) {
      await page.evaluate((i) => { const s = document.getElementById("qcrLevelSelect"); s.selectedIndex = i; s.dispatchEvent(new Event("change", { bubbles: true })); }, i);
      await page.waitForTimeout(400);
      const n = await page.evaluate(() => document.querySelectorAll("svg.mastery-wheel text").length);
      if (n > bestN) { bestN = n; best = i; }
    }
    if (best >= 0) { await page.evaluate((i) => { const s = document.getElementById("qcrLevelSelect"); s.selectedIndex = i; s.dispatchEvent(new Event("change", { bubbles: true })); }, best); await page.waitForTimeout(600); }
    await verdict(t, page, "QCR wheel", 5);
  });
  for (const [name, btn] of [["Quran", "explorePaletteQuranBtn"], ["Asma", "explorePaletteAsmaBtn"], ["WordByWord", "explorePaletteWbwBtn"]]) {
    await flow(`${tag} ${name}`, async (t, page) => {
      await click(page, "tabExploreBtn"); await page.waitForTimeout(700);
      if (PROBE) console.log(await page.evaluate(() => [...document.querySelectorAll('[id^="explorePalette"]')].map((e) => e.id).join(",")));
      await click(page, btn); await page.waitForTimeout(1200);
      await verdict(t, page, `${name} wheel`, 3);
    });
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// QR Lead, audit part 131 (Builder report docs/reports/2026-10-30-audit-part131-large-text.md, findings 3 and 4, handed to the
// QR Lead by the MSA Architect, 30 Oct 2026): with the reader's text at 150% / 200% (the root font size), the Quran Study
// landing scrolled sideways at 360/390 (scrollWidth 440 at 150%, 584 at 200%: the bottom tabs and the 🧰 ran past the edge),
// and at 768 200% the wheel area spilled under the docked tabs, where no scroll could reach Read, Unit, Know Your Status or
// the folder groups. Measured before the fix on main v12.121 with this suite's own probe.
// Now: the tabs and the Wheel / Legend / Unit row wrap; above 720px a landing whose content does not fit scrolls as on a phone
// (body.landing-tall, set only while it really spills); and the phone wheel never shrinks below 60% of its column (200px).
// At 100% the landing is unchanged: 480 measurements at 20 width/language pairs were identical to main.
//   node tools/i18n-verify/qr-landing-large-text-browser.mjs [--mutate=NAME]   (serve.js on :8080, from the repo root)
//   no-wrap   the tab row does not wrap        -> "no sideways scroll" FAILS at 360/390
//   no-tall   the fit watcher is not started   -> "every control is reachable" FAILS at 768 200%
//   no-floor  the wheel's floor removed        -> "the wheel keeps a real size" FAILS at 360/390 150% and 200%
//   no-zab-lift  the tabs' lift over the Zab bar removed -> "the docked tabs sit above the Zab bar" FAILS at 768/820 200%
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-wrap": ["  #tabRow { display: flex; flex-wrap: wrap; gap: 0.4rem; }\n", "  #tabRow { display: flex; gap: 0.4rem; }\n"],
  "no-tall": ["    if (typeof ResizeObserver === \"function\") watchLandingFit(); // audit part 131: large text above 720px\n", ""],
  "no-zab-lift": ["  @media (min-width: 768px) { body.zab-bar-on.landing-view.landing-tall #dock { bottom: 44px; } }\n", ""],
  "no-floor": ["const cap = Math.floor(Math.max(floor, wheel.getBoundingClientRect().width - over)) + \"px\";", "const cap = Math.floor(wheel.getBoundingClientRect().width - over) + \"px\";"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

for (const [w, h, lang] of [[360, 780, "en"], [360, 780, "bn"], [390, 844, "en"], [390, 844, "bn"], [768, 1024, "en"], [768, 1024, "bn"], [820, 1180, "en"], [1024, 768, "en"], [1440, 900, "en"]]) {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: w, height: h } });
  if (MUTATE) {
    const [from, to] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const res = await r.fetch(); const body = await res.text();
      if (body.split(from).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found exactly once`);
      r.fulfill({ response: res, body: body.replace(from, to) });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForSelector("#readContentsBtn", { state: "visible", timeout: 20000 });
  await page.waitForTimeout(1000);
  for (const size of ["100%", "150%", "200%"]) {
    const tag = `[${lang} ${w} text ${size}]`;
    await page.evaluate((s) => { document.documentElement.style.fontSize = s; document.scrollingElement.scrollTop = 0; }, size);
    await page.waitForTimeout(900);
    const m = await page.evaluate(async () => {
      const s = document.scrollingElement;
      const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const ctrls = [...document.querySelectorAll("#stage button, #stage select, #dock button")]
        .filter((b) => b.getBoundingClientRect().width > 0 && getComputedStyle(b).visibility !== "hidden" && !b.closest("[hidden], .qr-panel, #studyPillarMenu"));
      const stuck = [];
      for (const c of ctrls) {
        c.scrollIntoView({ block: "center", inline: "nearest" });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const r = c.getBoundingClientRect();
        const pts = [[0.5, 0.5], [0.2, 0.5], [0.8, 0.5]];
        const ok = r.right <= innerWidth + 1 && r.left >= -1 && pts.some(([fx, fy]) => { const e = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy); return !!e && (e === c || c.contains(e)); });
        if (!ok) stuck.push(c.id || (c.textContent || "").trim().slice(0, 16));
      }
      s.scrollTop = 0;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const col = document.querySelector("#wheelSection .wheel-col"), wheel = document.querySelector("#wheelSection .mastery-wheel");
      const dk = document.getElementById("dock").getBoundingClientRect(), zb = document.querySelector("#zabBar, .zab-bar");
      const zr = zb && getComputedStyle(zb).display !== "none" ? zb.getBoundingClientRect() : null;
      return { dockBottom: Math.round(dk.bottom), zabTop: zr && zr.height > 0 ? Math.round(zr.top) : null, root, sw: s.scrollWidth, cw: s.clientWidth, n: ctrls.length, stuck, tall: document.body.classList.contains("landing-tall"),
        wheelW: wheel ? Math.round(wheel.getBoundingClientRect().width) : 0, colW: col ? Math.round(col.getBoundingClientRect().width) : 0 };
    });
    const want = size === "100%" ? 16 : size === "150%" ? 24 : 32;
    check(`${tag} POSITIVE CONTROL: the root text is ${want}px and ${m.n} landing controls are measured`, Math.abs(m.root - want) < 0.5 && m.n >= 10, JSON.stringify(m));
    check(`${tag} no sideways scroll (scrollWidth ${m.sw} vs ${m.cw})`, m.sw <= m.cw + 1, JSON.stringify(m));
    check(`${tag} every control is reachable by a finger once scrolled to (tabs, Wheel / Legend / Unit, 🧰, Read, Know Your Status, the groups)`, m.stuck.length === 0, JSON.stringify(m.stuck));
    if (m.zabTop !== null) check(`${tag} the docked tabs sit above the Zab bar (dock bottom ${m.dockBottom}, bar top ${m.zabTop})`, m.dockBottom <= m.zabTop + 1, JSON.stringify(m));
    if (w <= 720) check(`${tag} the wheel keeps a real size (${m.wheelW}px of a ${m.colW}px column; floor 60%, 200px at least)`, m.wheelW >= Math.min(m.colW, Math.max(200, m.colW * 0.6)) - 1, JSON.stringify(m));
    // above 720px the fixed screen stays fixed while the content fits, and scrolls only when it does not
    if (w > 720 && size === "100%") check(`${tag} at ordinary text the landing keeps its fixed screen (no landing-tall)`, !m.tall, JSON.stringify(m));
    if (w > 720 && size === "200%" && w === 768) check(`${tag} with the content spilling, the landing scrolls (landing-tall)`, m.tall, JSON.stringify(m));
    if (size === "200%" && (w === 360 || w === 768)) await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/qr-landing-large-${lang}-${w}-200.png` });
  }
  // back to 100%: the class goes away again (measured afresh in the fixed layout)
  if (w > 720) {
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    await page.waitForTimeout(900);
    check(`[${lang} ${w}] back at ordinary text, the fixed screen returns (landing-tall cleared)`, !(await page.evaluate(() => document.body.classList.contains("landing-tall"))));
  }
  await ctx.close();
}
await browser.close();
console.log(`\n==== QR landing with large text${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

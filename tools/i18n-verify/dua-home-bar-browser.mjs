// Dua Study's Home bar (the Owner, 7 Nov 2026; the Architect's findings on the D23 review):
//   - the page's Menu dropdown, opened from the Menu button at the right of the Home bar, lies inside the screen;
//   - the ▶ and ⤢ glyphs of the card's top bar are centred in their 44px tiles, like ‹ › and Menu.
//   node tools/i18n-verify/dua-home-bar-browser.mjs [--mutate=left|glyph]     (server on :8080)
//   --mutate=left   the dropdown is anchored to the Menu button's left edge again: the "inside the screen" checks must FAIL.
//   --mutate=glyph  the tiles stop centring their glyph: the "centred" checks must FAIL.
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}
const MUTATIONS = {
  left: ".dua-topnav details > .nav-cat-links { right: auto !important; left: 0 !important; }",
  glyph: ".dua-tile { display: block !important; text-align: left !important; line-height: 1 !important; }",
};

const browser = await chromium.launch();
for (const lang of ["en", "bn"]) {
  for (const width of [320, 390, 768, 1280]) {
    const tag = `${lang} ${width}px`;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
    try {
      const { page } = await openPage(ctx, "/app/dua-study.html?g=rasul&open=8");
      page.setDefaultTimeout(15000);
      await page.waitForSelector("[data-dua-topbar]", { timeout: 25000 });
      if (MUTATE) await page.addStyleTag({ content: MUTATIONS[MUTATE] });
      await page.waitForTimeout(500);
      // Positive control: the three Home-bar controls are there, in order, before measuring anything about them.
      const order = await page.evaluate(() => [...document.querySelectorAll(".dua-topnav > *")].map((e) => e.id));
      check(`[${tag}] the Home bar holds Home, Bookmarks and Menu, in that order`, order.join() === "duaHomeLink,duaBookmarksLink,accountHomeMenu", order.join());
      await page.click("#accountHomeMenu > summary");
      await page.waitForSelector("#accountHomeMenu .nav-cat-links", { state: "visible" });
      const box = await page.evaluate(() => { const r = document.querySelector("#accountHomeMenu .nav-cat-links").getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width) }; });
      check(`[${tag}] the open Menu dropdown lies inside the screen (${box.l}–${box.r})`, box.l >= 0 && box.r <= width && box.w > 100, JSON.stringify(box));
      const mine = await page.evaluate(() => { const b = document.querySelector("#accountHomeMenu > summary").getBoundingClientRect(), p = document.querySelector("#accountHomeMenu .nav-cat-links").getBoundingClientRect(); return { right: Math.round(b.right), pr: Math.round(p.right) }; });
      check(`[${tag}] the dropdown is right-aligned to the Menu button`, Math.abs(mine.right - mine.pr) <= 2, JSON.stringify(mine));
      // Glyph centring: the text's own box against its tile.
      for (const [sel, name] of [["[data-dua-play]", "▶"], ["[data-dua-popout]", "⤢"], ["[data-dua-card-prev]", "‹"]]) {
        const g = await page.evaluate((s) => {
          const t = document.querySelector(s); const r = t.getBoundingClientRect();
          const rg = document.createRange(); rg.selectNodeContents(t); const q = rg.getBoundingClientRect();
          return { dx: Math.round(Math.abs((q.left + q.right) / 2 - (r.left + r.right) / 2)), dy: Math.round(Math.abs((q.top + q.bottom) / 2 - (r.top + r.bottom) / 2)), w: Math.round(r.width), h: Math.round(r.height) };
        }, sel);
        check(`[${tag}] ${name} is centred in its ${g.w}×${g.h} tile (off by ${g.dx},${g.dy}px)`, g.dx <= 2 && g.dy <= 3 && g.w >= 40 && g.h >= 40, JSON.stringify(g));
      }
    } catch (e) { fail++; console.log(`  FAIL  the walk at ${tag} stopped -- ${String(e.message).split("\n")[0]}`); }
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== Dua Home bar${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

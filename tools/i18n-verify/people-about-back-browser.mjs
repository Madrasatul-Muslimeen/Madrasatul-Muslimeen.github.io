// Audit part 135 (PCF MSA J29, issue #1335): About opened from People's Home menu shows ← Back, the button is the element at
// its own centre point (not its row, not something covering it), and pressing it lands on people.html.
//
//   node tools/i18n-verify/people-about-back-browser.mjs            (needs node serve.js on 8080)
//   --mutate=<name>   reintroduce a cause so the suite must FAIL:
//        row    tap the centre of the whole [data-bm-back] row (the old manual-claims check) instead of the button; at 390px
//               the words are hidden, so the row's centre falls on the gap between ← and ✕ and nothing is pressed
//        dead   a capturing handler swallows the click on the button (the handler "does nothing")
//        cover  an invisible fixed layer sits over the button
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

for (const lang of [null, "bn"]) {
  for (const w of [360, 390, 768, 1024, 1440]) {
    const tag = `${w}px ${lang || "en"}`;
    const ctx = await newContext(browser, { banner: false, appLang: lang, viewport: { width: w, height: 844 } });
    const { page } = await openPage(ctx, "/app/people.html");
    await page.waitForSelector("#navBar details.nav-cat", { state: "attached", timeout: 15000 });
    await page.waitForTimeout(500);
    await page.locator("#topNav .nav-cat-home > summary, #topNav details.nav-cat-home summary").first().click();
    await page.waitForTimeout(200);
    await page.click('.nav-cat-home a[href^="about.html"]');
    await page.waitForSelector("[data-bm-back-link]", { state: "visible", timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
    if (MUTATE === "dead") await page.evaluate(() => document.querySelector("[data-bm-back-link]")?.addEventListener("click", (e) => { e.preventDefault(); e.stopImmediatePropagation(); }, true));
    if (MUTATE === "cover") await page.evaluate(() => { const r = document.querySelector("[data-bm-back-link]").getBoundingClientRect(); const d = document.createElement("div"); d.id = "mutCover"; d.style.cssText = `position:fixed;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;z-index:2147483647`; document.body.appendChild(d); });
    const info = await page.evaluate(() => {
      const b = document.querySelector("[data-bm-back-link]");
      const row = document.querySelector("[data-bm-back]");
      if (!b) return { found: false, url: location.pathname.split("/").pop() };
      const r = b.getBoundingClientRect(), rr = row.getBoundingClientRect();
      const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { found: true, url: location.pathname.split("/").pop(), onScreen: r.width > 0 && r.height > 0 && r.bottom <= innerHeight && r.right <= innerWidth, own: at === b || b.contains(at), at: at && `${at.tagName}.${at.className}`, rowCentre: [rr.x + rr.width / 2, rr.y + rr.height / 2] };
    });
    check(`[${tag}] About opened from People's Home menu shows ← Back, on screen`, info.found && info.url === "about.html" && info.onScreen, JSON.stringify(info));
    check(`[${tag}] the button is the element at its own centre point`, info.found && info.own, JSON.stringify(info));
    if (MUTATE === "row" && info.found) await page.mouse.click(info.rowCentre[0], info.rowCentre[1]);
    else if (info.found) await page.click("[data-bm-back-link]", { force: MUTATE === "cover", timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
    check(`[${tag}] pressing it lands on people.html`, new URL(page.url()).pathname.endsWith("/people.html"), page.url());
    await ctx.close();
  }
}
await browser.close();
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

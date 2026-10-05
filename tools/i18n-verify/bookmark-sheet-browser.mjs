// The Owner, 5 Oct 2026: "Enlarge bookmark to take the entire screen so other
// screen below won't distract eyes." (screenshot: the Bookmark menu as a small
// dropdown over the Bookmarks page, the page showing all round it).
//
// Open, the Bookmark menu is a full-screen opaque sheet at every width: it
// covers the whole viewport (what is at each corner and the centre is the
// sheet), the page behind does not scroll, its Close button is a real tap
// target and closes it, Escape closes it, and the other categories keep the
// ordinary dropdown. Pages: the Bookmarks page (the Owner's screenshot) and
// the Qur'an page. en/bn, 320/390/768/1280.
// Mutation: --mutate-off (the shell.css sheet rules removed: the coverage
// checks fail). Run from the repository root with serve.js.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const OFF = process.argv.includes("--mutate-off");
function mutatedCss() {
  let src = fs.readFileSync("app/css/shell.css", "utf8");
  const a = src.indexOf(".nav-cat-bookmark[open] > .nav-cat-links {");
  const b = src.indexOf("body:has(.nav-cat-bookmark[open])");
  if (a < 0 || b < 0) { console.log("mutation did not apply"); process.exit(2); }
  return src.slice(0, a) + src.slice(src.indexOf("\n", b) + 1);
}
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const SHOTS = process.env.SHOT_DIR;

for (const file of ["bookmarks.html", "quranrevival.html"]) {
  for (const lang of ["en", "bn"]) {
    for (const [w, h] of [[320, 640], [390, 844], [768, 1024], [1280, 800]]) {
      const tag = `${file} ${lang} ${w}px`;
      const ctx = await newContext(browser, { appLang: lang, viewport: { width: w, height: h } });
      if (OFF) { const body = mutatedCss(); await ctx.route("**/app/css/shell.css*", (r) => r.fulfill({ status: 200, contentType: "text/css", body })); }
      const { page, errors } = await openPage(ctx, `/app/${file}`);
      await page.waitForSelector(".nav-cat-bookmark > summary", { timeout: 20000 });
      // Something scrollable behind, so "the page stays still" can fail.
      await page.evaluate(() => { const d = document.createElement("div"); d.style.height = "3000px"; d.id = "__tall"; document.body.appendChild(d); });
      const closedAt = await page.evaluate(() => { const l = document.querySelector(".nav-cat-bookmark > .nav-cat-links"); const e = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return !!e && !l.contains(e); });
      check(`${tag}: POSITIVE CONTROL -- closed, the centre of the screen is the page`, closedAt);
      await page.evaluate(() => document.querySelector(".nav-cat-bookmark > summary").click());
      await page.waitForFunction(() => !/Loading|লোড/.test(document.getElementById("navBookmarkList")?.textContent || ""), null, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(200);
      const m = await page.evaluate(() => {
        const sheet = document.querySelector(".nav-cat-bookmark > .nav-cat-links");
        const r = sheet.getBoundingClientRect();
        const W = innerWidth, H = innerHeight;
        const pts = [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3], [W / 2, H / 2], [W / 2, H - 3]];
        const inSheet = pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && sheet.contains(e); });
        const bg = getComputedStyle(sheet).backgroundColor;
        const close = sheet.querySelector("[data-nav-bm-close]"); const cr = close ? close.getBoundingClientRect() : null;
        const list = document.getElementById("navBookmarkList").getBoundingClientRect();
        const manage = [...sheet.querySelectorAll("a, span")].find((x) => /bookmarks\.html/.test(x.getAttribute("href") || "") || x.classList.contains("nav-current"));
        return { r: [r.left, r.top, r.width, r.height], W, H, inSheet, bg, close: cr && [cr.width, cr.height, cr.left >= 0 && cr.right <= W, cr.top >= 0 && cr.bottom <= H],
          closeText: close?.textContent.trim(), listInside: list.left >= 0 && list.right <= W + 0.5 && list.width > 0, sx: document.documentElement.scrollWidth - W };
      });
      check(`${tag}: the open menu covers the whole screen`, Math.abs(m.r[0]) < 1 && Math.abs(m.r[1]) < 1 && Math.abs(m.r[2] - m.W) < 1 && Math.abs(m.r[3] - m.H) < 1, JSON.stringify(m.r) + ` vs ${m.W}x${m.H}`);
      check(`${tag}: ...what is at every corner and the centre is the menu, not the page`, m.inSheet.every(Boolean), JSON.stringify(m.inSheet));
      check(`${tag}: ...on an opaque background`, m.bg === "rgb(255, 255, 255)", m.bg);
      check(`${tag}: the bookmark list sits inside the screen`, m.listInside && m.sx <= 0, JSON.stringify(m));
      check(`${tag}: a Close button >=40px tall, on screen, in ${lang === "bn" ? "Bangla" : "English"}`, !!m.close && m.close[1] >= 40 && m.close[2] && (lang === "bn" ? /বন্ধ/.test(m.closeText) : /Close/.test(m.closeText)), JSON.stringify(m.close) + m.closeText);
      const y0 = await page.evaluate(() => scrollY);
      await page.mouse.move(m.W / 2, m.H / 2); await page.mouse.wheel(0, 600); await page.waitForTimeout(250);
      const y1 = await page.evaluate(() => scrollY);
      check(`${tag}: the page behind does not scroll while it is open`, y1 === y0, `${y0} -> ${y1}`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/bm-${file.replace(".html", "")}-${lang}-${w}.png` });
      await page.click("[data-nav-bm-close]", { timeout: 4000 }).catch(() => {});
      check(`${tag}: Close closes it`, await page.evaluate(() => !document.querySelector(".nav-cat-bookmark").open));
      await page.evaluate(() => document.querySelector(".nav-cat-bookmark > summary").click());
      await page.keyboard.press("Escape");
      check(`${tag}: Escape closes it`, await page.evaluate(() => !document.querySelector(".nav-cat-bookmark").open));
      await page.evaluate(() => document.querySelector(".nav-cat-home > summary").click());
      const home = await page.evaluate(() => { const r = document.querySelector(".nav-cat-home > .nav-cat-links").getBoundingClientRect(); return [r.width, r.height, innerWidth, innerHeight]; });
      check(`${tag}: Home keeps the ordinary dropdown (not full screen)`, home[0] > 0 && (home[0] < home[2] - 1 || home[1] < home[3] - 1), JSON.stringify(home));
      check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
      await ctx.close();
    }
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

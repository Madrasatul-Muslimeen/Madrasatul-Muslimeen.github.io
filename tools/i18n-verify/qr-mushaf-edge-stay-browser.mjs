// QR Lead (the Owner, 29 Oct 2026, a phone screenshot of Al-Hijr's Mushaf page): "Whenever the page scrolling touches
// the end of the page, either way it moves/ flips to the next page without intending it to. FIX. It needs to stay
// unless deliberately scrolls for the next page."
// Measured before the fix at 600px: page 262 is 1230px tall in a 700px box; two 200px flicks reach its end, and the
// third ordinary 200px flick (starting at the end) turned to 263; the same at the top turned back to 262.
// Now, in the page strip, reaching an end STAYS there, and a page turns only on a deliberate pull from that end: a swipe
// of at least 35% of the screen height (220px minimum), or a wheel burst adding up to 600px; one burst turns one page.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/qr-mushaf-edge-stay-browser.mjs [--mutate=NAME]
//   old-pull        the strip swipe needs only 55px again        -> "ordinary flicks at the end stay" FAILS (touch)
//   no-strip-wheel  the strip's wheel rule removed                -> "ordinary wheel at the end stays" FAILS
//   wheel-many      a long burst may turn more than one page      -> "one burst turns ONE page" FAILS
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "old-pull": ["Math.abs(dy) > (touchStartInStrip ? stripSwipePull() : SWIPE)", "Math.abs(dy) > SWIPE"],
  "no-strip-wheel": ["        if (wheelBurstInStrip) {\n", "        if (false) {\n"],
  "wheel-many": ["if (wheelBurstTurned || Math.abs(wheelBurstSum) < STRIP_WHEEL_PULL) return;", "if (Math.abs(wheelBurstSum) < STRIP_WHEEL_PULL) return;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function open(width, height, touch, lang = "en") {
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height }, hasTouch: touch, isMobile: touch });
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
  await page.click("#readContentsBtn");
  await page.locator("#readContentsMount button", { hasText: /Al-Hijr|আল-হিজর/ }).first().click();
  await page.waitForFunction(() => !!document.getElementById("mushafPageRef")?.dataset.page, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  return { ctx, page };
}
const pageNow = (page) => page.evaluate(() => Number(document.getElementById("mushafPageRef")?.dataset.page || 0));
// the page on screen and how far it is scrolled inside its own box
const box = (page) => page.evaluate(() => {
  const n = Number(document.getElementById("mushafPageRef")?.dataset.page || 0);
  const el = document.querySelector(`#pageViewContainer > .hifz-page[data-mushaf-page="${n}"]`);
  return el ? { top: Math.round(el.scrollTop), max: el.scrollHeight - el.clientHeight, h: el.clientHeight } : null;
});

for (const [width, height, lang] of [[600, 860, "en"], [390, 844, "en"], [390, 844, "bn"]]) {
  const tag = `[touch ${lang} ${width}]`;
  const { ctx, page } = await open(width, height, true, lang);
  const cdp = await ctx.newCDPSession(page);
  const swipe = async (dy) => {
    const x = width / 2, y = dy < 0 ? height * 0.8 : height * 0.3, steps = 10;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= steps; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + (dy * i) / steps }] }); await page.waitForTimeout(16); }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(900);
  };
  const p0 = await pageNow(page), b0 = await box(page);
  check(`${tag} POSITIVE CONTROL: Al-Hijr's first page (262) is on screen and taller than its box`, p0 === 262 && !!b0 && b0.max > 100, JSON.stringify(b0));
  // ordinary 200px flicks: down to the end, then three more at the end
  for (let i = 0; i < 6; i++) await swipe(-200);
  const b1 = await box(page);
  check(`${tag} ordinary flicks scroll the page down to its end and STAY on it (still 262)`, (await pageNow(page)) === 262 && !!b1 && b1.max - b1.top <= 24, JSON.stringify(b1));
  // a deliberate long pull from the end turns to the next page
  const pull = Math.ceil(Math.max(220, height * 0.35)) + 40;
  await swipe(-pull);
  check(`${tag} a deliberate long pull (${pull}px) from the end turns to the next page (263)`, (await pageNow(page)) === 263, String(await pageNow(page)));
  // back up: 263 starts at its top, so ordinary flicks there must stay; then a long pull turns back
  await page.evaluate(() => document.querySelectorAll("#pageViewContainer > .hifz-page").forEach((e) => { e.scrollTop = 0; }));
  for (let i = 0; i < 3; i++) await swipe(200);
  check(`${tag} ordinary flicks at the TOP stay too (still 263)`, (await pageNow(page)) === 263, String(await pageNow(page)));
  await swipe(pull);
  check(`${tag} a deliberate long pull down from the top turns back (262)`, (await pageNow(page)) === 262, String(await pageNow(page)));
  if (width === 600) await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/qr-mushaf-edge-${lang}-${width}.png` });
  await ctx.close();
}

{
  const tag = "[wheel en 600]";
  const { ctx, page } = await open(600, 860, false);
  const p0 = await pageNow(page);
  await page.mouse.move(300, 500);
  // ordinary scrolling: separate bursts (more than 350ms apart) of two 100px notches -- down to the end and three more
  for (let i = 0; i < 9; i++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(60); await page.mouse.wheel(0, 100); await page.waitForTimeout(700); }
  const b1 = await box(page);
  check(`${tag} POSITIVE CONTROL: the wheel scrolls page 262 to its end`, p0 === 262 && !!b1 && b1.max - b1.top <= 24, JSON.stringify(b1));
  check(`${tag} ordinary wheel bursts at the end STAY (still 262)`, (await pageNow(page)) === 262, String(await pageNow(page)));
  // one long deliberate burst (30 notches, 40ms apart: 3000px, 1.2s) turns ONE page
  for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(40); }
  await page.waitForTimeout(1200);
  check(`${tag} one long burst from the end turns exactly ONE page (263)`, (await pageNow(page)) === 263, String(await pageNow(page)));
  await ctx.close();
}
await browser.close();
console.log(`\n==== QR Mushaf: the end of a page stays${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

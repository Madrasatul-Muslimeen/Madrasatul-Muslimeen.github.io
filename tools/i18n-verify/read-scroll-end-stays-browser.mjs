// The Owner, 9 Oct 2026 (a photo of 6:100 in the Read view): "moving to end of the Ayah up or down jumps to next Ayah
// even though i don't intend it. Fix. Moving to the end should not meant to move to next/ previous Ayah."
// Reaching an end only STOPS there. A scroll or swipe moves to the next/previous āyah only when it STARTS with the text
// already at that end (the Owner's earlier ask, "moving to the next Ayah ... scrolling down", is kept that way).
// Fixture: 2:282, the longest āyah, in the Read view at 390x844, where its text scrolls.
// Run from the repository root, serve.js on :8080.
//   --mutate=burst   the wheel reads the edge on EVERY event (the old behaviour) -> the wheel "stays" check fails
//   --mutate=touch   a swipe reads the edge when it ENDS (the old behaviour)     -> the swipe "stays" check fails
//   --mutate=keep    the next āyah keeps the old scroll position                  -> the "opens at its top" check fails
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  burst: ["quranrevival.html", "        if (now - wheelLastAt > WHEEL_GAP) {", "        if (true) {"],
  touch: ["quranrevival.html", "          if (dy < 0 && touchStartAtBottom) advance(1);", "          if (dy < 0 && (!nearestScroller(e.target, boundary) || nearBottom(nearestScroller(e.target, boundary)))) advance(1);"],
  keep: ["quranrevival.html", "if (ayahPanels.dataset.shownAyah !== shownAyah) { ayahPanels.scrollTop = 0;", "if (ayahPanels.dataset.shownAyah !== shownAyah) {"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 844 } });
await ctx.route("**/archive.org/**", (r) => r.abort());
if (MUTATE) {
  const [file, a, b] = MUT[MUTATE];
  await ctx.route(`**/app/${file}*`, async (r) => {
    const src = fs.readFileSync(`app/${file}`, "utf8");
    const n = src.split(a).length - 1;
    if (n !== 1) throw new Error(`mutation anchor found ${n} times in ${file}`);
    await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) });
  });
}
const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
P.on("dialog", (d) => d.dismiss().catch(() => {}));
await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
if (!(await P.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
await P.click("#tabReadBtn"); await P.waitForTimeout(400);
await P.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
await P.waitForFunction(() => document.querySelectorAll("#ayahSelect option").length > 280, null, { timeout: 20000 }).catch(() => {});

const ayahNow = () => P.evaluate(() => document.getElementById("ayahSelect")?.value);
async function goTo(n) {
  await P.evaluate((n) => { const el = document.getElementById("ayahSelect"); el.value = String(n); el.dispatchEvent(new Event("change", { bubbles: true })); }, n);
  await P.waitForFunction((n) => document.querySelector(`#readView .ayah-quick-wrap[data-unit-key="ayah:2:${n}"]`), n, { timeout: 15000 }).catch(() => {});
  await P.waitForTimeout(700); // past the 550ms step cooldown
}
// The element that really scrolls the āyah's text (as the app's own nearestScroller() finds it).
const scroller = () => P.evaluate(() => {
  const rs = document.getElementById("readScroll");
  const all = [rs, ...rs.querySelectorAll("*")].filter((n) => { const cs = getComputedStyle(n); return (cs.overflowY === "auto" || cs.overflowY === "scroll") && n.scrollHeight > n.clientHeight + 2 && n.getClientRects().length; });
  const s = all.sort((a, b) => b.clientHeight - a.clientHeight)[0];
  if (!s) return null;
  s.dataset.testScroller = "1";
  const r = s.getBoundingClientRect();
  return { top: s.scrollTop, max: s.scrollHeight - s.clientHeight, x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 300) };
});
// A point inside the scroller over plain text (the translation), never over a button: every Arabic word is a
// button, and a gesture that starts on a button is a tap, not a scroll (the app ignores it, as it should).
const plainPoint = () => P.evaluate(() => {
  const el = document.querySelector("[data-test-scroller]");
  const r = el.getBoundingClientRect();
  const INTERACTIVE = "button, a, input, select, textarea, label, [role='button'], [contenteditable]";
  for (let y = r.top + 20; y < r.bottom - 10; y += 15) for (let x = r.left + 20; x < r.right - 20; x += 25) {
    const t = document.elementFromPoint(x, y);
    if (t && el.contains(t) && !t.closest(INTERACTIVE)) return { x, y };
  }
  return null;
});
const setScroll = (where) => P.evaluate((where) => { const s = document.querySelector("[data-test-scroller]"); s.scrollTop = where === "bottom" ? s.scrollHeight : where === "top" ? 0 : (s.scrollHeight - s.clientHeight) / 2; }, where);
// A synthetic finger: touchstart, moves (the page scrolls natively under a real finger; here `scrollTo` does that,
// partway through, to `scrollTo`), touchend. dy < 0 is a swipe UP (towards the end of the text).
const swipe = (dy, scrollTo) => P.evaluate(async ({ dy, scrollTo }) => {
  const el = document.querySelector("[data-test-scroller]");
  const r = el.getBoundingClientRect();
  const INTERACTIVE = "button, a, input, select, textarea, label, [role='button'], [contenteditable]";
  let x = 0, y0 = 0, target = null;
  for (let y = r.top + 20; y < r.bottom - 10 && !target; y += 15) for (let xx = r.left + 20; xx < r.right - 20; xx += 25) {
    const t = document.elementFromPoint(xx, y);
    if (t && el.contains(t) && !t.closest(INTERACTIVE)) { target = t; x = xx; y0 = y; break; }
  }
  if (!target) throw new Error("no plain-text point inside the scroller");
  const fire = (type, y) => {
    const t = new Touch({ identifier: 1, target, clientX: x, clientY: y });
    target.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, composed: true, touches: type === "touchend" ? [] : [t], targetTouches: type === "touchend" ? [] : [t], changedTouches: [t] }));
  };
  fire("touchstart", y0);
  for (let i = 1; i <= 4; i++) {
    if (i === 2 && scrollTo) el.scrollTop = scrollTo === "bottom" ? el.scrollHeight : 0;
    fire("touchmove", y0 + (dy * i) / 4);
    await new Promise((d) => setTimeout(d, 16));
  }
  fire("touchend", y0 + dy);
}, { dy, scrollTo });

// ---- the wheel
await goTo(282);
let s = await scroller();
check("2:282 at 390px: its text really scrolls (positive control)", !!s && s.max > 200, JSON.stringify(s));
if (s) {
  await setScroll("top");
  // One continuous scroll, events 60ms apart, on past the end; the pointer kept over plain text as the text moves.
  for (let i = 0; i < 40; i++) {
    const pt = await plainPoint();
    if (pt) await P.mouse.move(pt.x, pt.y);
    await P.mouse.wheel(0, 120); await P.waitForTimeout(60);
  }
  s = await scroller();
  check("[wheel] scrolling down to the end of 2:282 stops there (still 2:282, at its end)", (await ayahNow()) === "282" && !!s && s.max - s.top <= 24, JSON.stringify({ ayah: await ayahNow(), s }));
  await P.waitForTimeout(700);
  let pt = await plainPoint(); if (pt) await P.mouse.move(pt.x, pt.y);
  await P.mouse.wheel(0, 120); await P.waitForTimeout(700);
  check("[wheel] ...a NEW scroll down, starting at the end, moves to 2:283", (await ayahNow()) === "283", await ayahNow());
  const s283 = await scroller();
  check("[wheel] ...and 2:283 opens at its top, not where 2:282 was scrolled to", !s283 || s283.top === 0, JSON.stringify(s283));
  if (await scroller()) { pt = await plainPoint(); if (pt) await P.mouse.move(pt.x, pt.y); }
  await P.mouse.wheel(0, -120); await P.waitForTimeout(700);
  check("[wheel] ...and a new scroll up at the top of 2:283 moves back to 2:282", (await ayahNow()) === "282", await ayahNow());
}

// ---- the finger
await goTo(282);
s = await scroller();
if (s) {
  await setScroll("middle");
  await swipe(-260, "bottom");
  await P.waitForTimeout(700);
  s = await scroller();
  check("[swipe] a swipe up that reaches the end of 2:282 stops there (still 2:282)", (await ayahNow()) === "282" && !!s && s.max - s.top <= 24, JSON.stringify({ ayah: await ayahNow(), s }));
  await swipe(-260);
  await P.waitForTimeout(700);
  check("[swipe] ...a NEW swipe up, starting at the end, moves to 2:283", (await ayahNow()) === "283", await ayahNow());
  await goTo(282);
  await scroller();
  await setScroll("middle");
  await swipe(260, "top");
  await P.waitForTimeout(700);
  check("[swipe] a swipe down that reaches the top of 2:282 stops there (still 2:282)", (await ayahNow()) === "282", await ayahNow());
  await swipe(260);
  await P.waitForTimeout(700);
  check("[swipe] ...a NEW swipe down, starting at the top, moves to 2:281", (await ayahNow()) === "281", await ayahNow());
}
check("no page errors", errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource|quran\.foundation/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
await browser.close();
console.log(`\n==== Read view: reaching the end of an āyah stays there: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

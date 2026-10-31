// QR Lead audit, 31 Oct 2026 (Read view and Read contents list, PCF User Manual 0am29hq / oh2hkjo): the Read view is a
// fixed-height screen, and with large text the header, the wrapped read bar and the docked tabs together passed the screen
// height. Measured on main v12.135 with this suite's own probe: at 360x740 200% the reading area was 0px tall (no Qur'an text
// at all) and 10 of the read bar's 11 buttons (☰, Play, 📖 Meaning, full screen, ⋮ ...) lay under the tabs with no scroll to
// reach them; 390/414 at 200% 5-7 buttons; and on a phone turned sideways (740x360) Take / Record / Status were under the tabs
// even at ORDINARY text. Now checkReadFit() sets body.read-tall only while that is really so: the page scrolls as the landing
// does, and the reading area keeps the screen's height less the tabs, never more (it pages sideways, so a line under the tabs
// could never be scrolled to). At ordinary text on a phone held upright, a tablet or a computer nothing changes.
//   node tools/i18n-verify/qr-read-tall-browser.mjs [--mutate=NAME]   (serve.js on :8080, from the repo root)
//   no-watch  the watcher is not started             -> "every read-bar button can be reached" and "text has room" FAIL
//   no-css    body.read-tall's page scroll removed    -> the same FAIL (the class is set, nothing scrolls)
//   no-cap    the reading area floored at 12rem       -> "the page of text ends above the tabs" FAILS sideways at 150/200%
//   no-full   full screen excluded from read-tall      -> "in full screen the text has room" FAILS sideways at 200% (0px, as on main)
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-watch": ['    if (typeof ResizeObserver === "function" && document.getElementById("readView")) watchReadFit();\n', ""],
  "no-css": ["  body.read-tall { height: auto; min-height: 100vh; min-height: 100dvh; overflow: visible; }\n", ""],
  "no-cap": ["Math.max(Math.round(4 * rem), innerHeight", "Math.max(Math.round(12 * rem), innerHeight"],
  "no-full": ['if (!reading || !dockEl || body.classList.contains("read-windowed")) {', 'if (!reading || !dockEl || body.classList.contains("immersive-read") || body.classList.contains("read-windowed")) {'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SHOT_DIR = process.env.SHOT_DIR || "";
// The reading area's height at ordinary text, measured on main v12.135 (before this round) and written by hand.
const PLAIN = { "en 360x740": 311, "en 390x844": 430, "en 414x896": 482, "en 768x1024": 634, "bn 360x740": 322, "bn 390x844": 426, "bn 414x896": 478, "bn 768x1024": 634 };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function boot(lang, w, h, size) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [from, to] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const res = await r.fetch(); const body = await res.text();
      if (body.split(from).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found exactly once`);
      r.fulfill({ response: res, body: body.replace(from, to) });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.querySelector("#wheelContainer svg"), null, { timeout: 30000 });
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((e) => e.remove()));
  await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, size); await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById("tabReadBtn").click()); await page.waitForTimeout(900);
  return { ctx, page };
}
const measure = (page) => page.evaluate(() => {
  const R = (e) => e.getBoundingClientRect(), dock = document.getElementById("dock"), rsEl = document.getElementById("readScroll");
  const btns = [...document.querySelectorAll("#readBar button, #readListBtn")].filter((e) => R(e).width > 0);
  const unreachable = btns.filter((e) => {
    e.scrollIntoView({ block: "center" });
    const r = R(e), x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) return true;
    const at = document.elementFromPoint(x, y); return !at || !e.contains(at);
  }).map((e) => (e.id || e.getAttribute("aria-label") || e.textContent).trim().slice(0, 18));
  rsEl.scrollIntoView({ block: "start" });
  const rs = R(rsEl), d = R(dock), rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const r = { tall: document.body.classList.contains("read-tall"), n: btns.length, unreachable, rsH: Math.round(rs.height),
    textRoom: Math.round(Math.min(rs.bottom, d.top) - Math.max(rs.top, 0)), rsBottom: Math.round(rs.bottom), dockTop: Math.round(d.top), rem,
    sideways: document.scrollingElement.scrollWidth > innerWidth };
  document.scrollingElement.scrollTop = 0; return r;
});

for (const [w, h, lang] of [[360, 740, "en"], [360, 740, "bn"], [390, 844, "en"], [390, 844, "bn"], [414, 896, "en"], [414, 896, "bn"], [768, 1024, "en"], [768, 1024, "bn"], [1280, 800, "en"], [740, 360, "en"], [740, 360, "bn"], [844, 390, "en"]]) {
  for (const size of ["100%", "150%", "200%"]) {
    const { ctx, page } = await boot(lang, w, h, size);
    const m = await measure(page);
    const tag = `[${lang} ${w}x${h} ${size}]`, J = JSON.stringify(m);
    check(`${tag} every read-bar button can be scrolled to and tapped (${m.n})`, m.n >= 10 && m.unreachable.length === 0, J);
    check(`${tag} the Qur'an text has room (at least 4rem above the tabs)`, m.textRoom >= 4 * m.rem - 1, J);
    check(`${tag} the page of text ends above the tabs (no line hidden under them)`, m.rsBottom <= m.dockTop + 1, J);
    check(`${tag} no sideways scroll`, !m.sideways, J);
    const plain = PLAIN[`${lang} ${w}x${h}`];
    if (size === "100%" && plain) check(`${tag} ordinary text, phone upright / tablet: unchanged (not read-tall, reading area ${plain}px)`, !m.tall && Math.abs(m.rsH - plain) <= 1, J);
    if (SHOT_DIR && (size === "200%" || w === 740)) await page.screenshot({ path: `${SHOT_DIR}/read-tall-${lang}-${w}-${size.replace("%", "")}.png` });
    await ctx.close();
  }
}
// Full screen (the read bar's own button) hides the tabs but not the read bar: on main, at 740x360 200%, the wrapped read bar
// took the whole height and the text had 0px. In full screen the text gets the screen (no tabs to leave room for).
for (const [w, h, size] of [[360, 740, "200%"], [740, 360, "150%"], [740, 360, "200%"], [740, 360, "100%"]]) {
  const { ctx, page } = await boot("en", w, h, size);
  await page.evaluate(() => document.getElementById("hideChromeBtn").scrollIntoView({ block: "center" }));
  await page.click("#hideChromeBtn"); await page.waitForTimeout(700);
  const m = await page.evaluate(() => {
    const rs = document.getElementById("readScroll"); rs.scrollIntoView({ block: "start" });
    const r = rs.getBoundingClientRect(), rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const x = document.getElementById("hideChromeBtn"); x.scrollIntoView({ block: "center" }); const xr = x.getBoundingClientRect();
    const at = document.elementFromPoint(xr.left + xr.width / 2, xr.top + xr.height / 2);
    return { imm: document.body.classList.contains("immersive-read"), rsH: Math.round(r.height), inView: Math.round(Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)), rem, exitReach: !!at && x.contains(at) };
  });
  const tag = `[en ${w}x${h} ${size}] full screen:`;
  check(`${tag} the text has room (at least 4rem, all of it on screen when scrolled to)`, m.imm && m.rsH >= 4 * m.rem - 1 && m.inView >= m.rsH - 1, JSON.stringify(m));
  check(`${tag} the button that leaves full screen can be reached`, m.exitReach, JSON.stringify(m));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Read view with large text, every control reachable (QR Lead audit): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

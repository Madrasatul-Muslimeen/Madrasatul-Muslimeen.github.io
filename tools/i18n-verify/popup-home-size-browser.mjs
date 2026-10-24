// PCF MSA J72 (the Owner, 22 Oct 2026, a computer screenshot of the Mastery Wheel window): "Check the resize buttons of
// the pop-out landing screen. Enable it resizeable from all side and all corners. Enable this size globally for all
// pop-ups. Then, conduct a global check of the entire app, all screen that opens from a click should appear in the same
// size of the home screen it was click from and must have a back button/ arrow to come back to home screen where it was
// click from." Measured before: the bottom and right edges did nothing (inside a scrolling window), the corners were
// 14px; 19 of 20 menu pages had no way back; the Read list opened smaller; Know Your Status and the Āyah card had only ×.
// (1) Each of the landing window's 8 handles is the thing under its own point and moves only its own edge(s).
// (2) Resize Explore: the landing window, the Āyah card, the Notes window, the Word card, the Read window, Know Your Status,
//     the Read list and Learn next all open at exactly that rect (the outside edge).
// (3) The Read list, Know Your Status and the Āyah card carry a 40px ← Back that closes them.
// (4) Every menu link carries navBack=1 and the page it opens shows ← Back to the page it came from.
// (5) A phone (390) is unchanged: the Read list and the Āyah card still fill the screen.
// Run from the repository root, serve.js on :8080 (QR_BASE for another port).
//   --mutate=noframe    the handles stay inside the window        -> (1) the bottom/right handles fail
//   --mutate=notshared  SHARED off                                 -> (2) fails after Explore is resized
//   --mutate=nonavback  menu links without navBack=1              -> (4) fails
//   --mutate=nohome     placeAtHome() does nothing                -> (2) the Read list and Learn next fail
//   --mutate=nozabrefit the Zab bar's arrival does not refit the landing window -> (0) fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  // QR Lead (24 Oct 2026, audit part 73): the Zab bar's lift of #dock refits the landing window (bn 1440: s / se / sw were under the tab row)
  nozabrefit: ["quranrevival.html", "if (on !== zabOn) { zabOn = on; queueFit(); }", ""],
  noframe: ["js/note-popup.js", "resizeHandleEls.forEach((h) => frame.appendChild(h));", "void frame;"],
  notshared: ["js/home-window.js", "export const SHARED = true;", "export const SHARED = false;"],
  nonavback: ["js/nav.js", '`${l.href}${l.href.includes("?") ? "&" : "?"}navBack=1`', "l.href"],
  nohome: ["js/home-window.js", "  const r = homeRect();\n  const props", "  const r = null;\n  const props"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function ctxFor(lang, width, height) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
  }
  return ctx;
}
const clean = (P) => P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
const R = (P, sel) => P.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null; }, sel);
const same = (a, b, t = 2) => !!a && !!b && Math.abs(a.x - b.x) <= t && Math.abs(a.y - b.y) <= t && Math.abs(a.w - b.w) <= t && Math.abs(a.h - b.h) <= t;
async function drag(P, from, dx, dy) { await P.mouse.move(from.x, from.y); await P.mouse.down(); await P.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 4 }); await P.mouse.move(from.x + dx, from.y + dy, { steps: 4 }); await P.mouse.up(); await P.waitForTimeout(250); }
async function toRead(P) {
  if (!(await P.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(500);
  await P.evaluate(() => { const s = document.getElementById("surahSelect"); if (s.value !== "2") { s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await P.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 15000 });
  await P.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "18"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForTimeout(800); await clean(P);
}
const openCard = async (P) => { await P.evaluate(() => document.querySelector('[data-ayah-num-badge="2:18"]')?.click()); await P.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 }); await P.waitForTimeout(400); };
const cardSel = "[data-ayah-sheet].ayah-sheet, [data-ayah-sheet] .ayah-sheet";

for (const lang of ["en", "bn"]) {
  const tag = `[${lang} 1440]`;
  const ctx = await ctxFor(lang, 1440, 900);
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  await clean(P); await P.waitForTimeout(1000);
  // (0) QR Lead (24 Oct 2026, audit part 73): the Zab bar loads after the page (v12.38) and lifts the dock by its 44px spacer.
  // A window first sized for the un-lifted dock must be refitted when the bar arrives, or its bottom edge (and the s / se / sw
  // handles) sit under the tab row. Made deterministic: size it with the bar away (and the room the page holds for it,
  // html.zab-reserve), then bring the bar back. On a page of its
  // own, so the bar's coming and going leaves this flow's window exactly as it was.
  {
    const ctx0 = await ctxFor(lang, 1440, 900);
    const { page: P } = await openPage(ctx0, "/app/quranrevival.html");
    await clean(P); await P.waitForTimeout(1000);
    const bottomVsTabs = () => P.evaluate(() => { const w = document.querySelector('[data-popup-win-frame="wheel"]') || document.getElementById("wheelPopupView"); const t = document.getElementById("tabRow"); return { win: Math.round(w.getBoundingClientRect().bottom), tabs: Math.round(t.getBoundingClientRect().top) }; });
    const had = await P.evaluate(() => document.body.classList.contains("zab-bar-on") && !!document.getElementById("zabSpacer"));
    await P.evaluate(() => { document.getElementById("zabSpacer").style.display = "none"; document.body.classList.remove("zab-bar-on"); document.documentElement.classList.remove("zab-reserve"); window.dispatchEvent(new Event("resize")); });
    await P.waitForTimeout(400);
    const away = await bottomVsTabs();
    await P.evaluate(() => { document.getElementById("zabSpacer").style.display = ""; document.body.classList.add("zab-bar-on"); document.documentElement.classList.add("zab-reserve"); });
    await P.waitForTimeout(400);
    const back = await bottomVsTabs();
    check(`${tag} POSITIVE CONTROL the Zab bar is on, and taking it away lowers the tab row`, had && away.tabs > back.tabs, JSON.stringify({ had, away, back }));
    check(`${tag} landing window: when the Zab bar arrives, the window is refitted clear of the tab row`, back.win <= back.tabs + 1, JSON.stringify({ away, back }));
    await ctx0.close();
  }
  // (1) the 8 handles of the landing window
  for (const d of ["n", "s", "e", "w", "ne", "nw", "se", "sw"]) {
    const h = await P.evaluate((d) => { const v = document.getElementById("wheelPopupView"); const e = document.querySelector(`[data-popup-win-frame="wheel"] [data-note-resize="${d}"]`) || v.querySelector(`[data-note-resize="${d}"]`); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height, self: document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2) === e }; }, d);
    const r0 = await R(P, "#wheelPopupView");
    const dx = d.includes("e") ? -40 : d.includes("w") ? 40 : 0, dy = d.includes("s") ? -30 : d.includes("n") ? 30 : 0;
    await drag(P, h, dx, dy);
    const r1 = await R(P, "#wheelPopupView");
    const exp = { x: r0.x + (d.includes("w") ? dx : 0), y: r0.y + (d.includes("n") ? dy : 0), w: r0.w + (d.includes("e") ? dx : d.includes("w") ? -dx : 0), h: r0.h + (d.includes("s") ? dy : d.includes("n") ? -dy : 0) };
    check(`${tag} landing window: handle ${d} is under its own point and moves only its own edge(s)`, h.self && same(r1, exp), JSON.stringify({ h, r0, r1, exp }));
    if (d.length === 2) check(`${tag} ...corner ${d} is at least 22px`, h.w >= 21.5 && h.h >= 21.5, JSON.stringify(h));
  }
  // (2) resize Explore, then every pop-up opens at its rect
  await P.click("#tabExploreBtn"); await P.waitForTimeout(700);
  const se = await P.evaluate(() => { const b = document.querySelector('[data-popup-win-frame="explore"] [data-note-resize="se"]').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  await drag(P, se, -220, -110);
  const home = await R(P, "#exploreView");
  await P.click("#tabApproachBtn"); await P.waitForTimeout(600);
  check(`${tag} after Explore is resized, the landing window takes its size and place ${JSON.stringify(home)}`, same(await R(P, "#wheelPopupView"), home), JSON.stringify(await R(P, "#wheelPopupView")));
  await P.evaluate(() => [...document.querySelectorAll("#wheelPopupView button")].find((x) => x.textContent.trim() === "Read" || x.textContent.trim() === "পড়ুন")?.click()); await P.waitForTimeout(800);
  const rcOpen = await P.evaluate(() => !document.getElementById("readContentsMount").hidden);
  check(`${tag} the Read list opens at that rect`, rcOpen && same(await R(P, "#readContentsCard"), home), JSON.stringify(await R(P, "#readContentsCard")));
  const rcBack = await P.evaluate(() => { const b = document.getElementById("readContentsBackBtn"); const r = b?.getBoundingClientRect(); return r ? { h: r.height, text: b.textContent } : null; });
  check(`${tag} the Read list has a 40px ← Back`, rcBack && rcBack.h >= 39.5 && /←/.test(rcBack.text), JSON.stringify(rcBack));
  await P.click("#readContentsBackBtn"); await P.waitForTimeout(300);
  check(`${tag} ...which closes it, back on the landing screen`, await P.evaluate(() => document.getElementById("readContentsMount").hidden && document.getElementById("wheelPopupView").getBoundingClientRect().width > 0));
  await P.evaluate(() => [...document.querySelectorAll("#wheelPopupView button")].find((x) => /Know Your Status|আপনার অবস্থা/.test(x.textContent) && x.getBoundingClientRect().width)?.click()); await P.waitForTimeout(1000);
  check(`${tag} Know Your Status opens at that rect`, same(await R(P, "#myStatusCard"), home), JSON.stringify(await R(P, "#myStatusCard")));
  const kysBack = await P.evaluate(() => { const b = document.getElementById("myStatusBackBtn"); const r = b?.getBoundingClientRect(); return r ? r.height : 0; });
  check(`${tag} Know Your Status has a 40px ← Back`, kysBack >= 39.5, String(kysBack));
  await P.click("#myStatusBackBtn"); await P.waitForTimeout(300);
  check(`${tag} ...which closes it`, await P.evaluate(() => document.getElementById("myStatusMount")?.hidden !== false || document.getElementById("myStatusCard").getBoundingClientRect().width === 0));
  await P.evaluate(() => document.getElementById("tabVocabularyBtn").click());
  await P.waitForFunction(() => document.querySelector("#learnNextSheet [data-ln-tile]"), null, { timeout: 20000 });
  check(`${tag} Learn next (Vocabulary) opens at that rect`, same(await R(P, "#learnNextSheet"), home), JSON.stringify(await R(P, "#learnNextSheet")));
  await P.click("#learnNextSheet [data-ln-back]"); await P.waitForTimeout(300);
  await toRead(P);
  await openCard(P);
  check(`${tag} the Āyah card opens at that rect`, same(await R(P, cardSel), home), JSON.stringify(await R(P, cardSel)));
  const cb = await P.evaluate(() => { const b = document.querySelector("[data-ayah-sheet] [data-ayah-sheet-homeback]"); const r = b?.getBoundingClientRect(); return r ? { w: r.width, h: r.height, t: b.textContent } : null; });
  check(`${tag} the Āyah card has a 40px ← Back`, cb && cb.w >= 39.5 && cb.h >= 39.5 && /←/.test(cb.t), JSON.stringify(cb));
  await P.click("[data-ayah-sheet] [data-ayah-sheet-note]"); await P.waitForTimeout(1500);
  check(`${tag} the Notes window (from the Āyah card) opens at that rect`, same(await R(P, "#readNotePane"), home), JSON.stringify(await R(P, "#readNotePane")));
  await P.click("#readNotePane .rnp-close"); await P.waitForTimeout(400); await P.keyboard.press("Escape"); await P.waitForTimeout(300);
  await P.evaluate(() => document.querySelectorAll("[data-ayah-sheet] [data-ayah-sheet-close]")[0]?.click()); await P.waitForTimeout(300);
  await P.evaluate(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:18:"]')?.click()); await P.waitForTimeout(1500);
  check(`${tag} the Word card opens at that rect`, same(await R(P, "#quranWordCardMount"), home), JSON.stringify(await R(P, "#quranWordCardMount")));
  await P.keyboard.press("Escape"); await P.waitForTimeout(300);
  await P.evaluate(() => document.getElementById("readWindowBtn")?.click()); await P.waitForTimeout(700);
  check(`${tag} the Read window opens at that rect`, same(await R(P, "#readView"), home), JSON.stringify(await R(P, "#readView")));
  await P.evaluate(() => document.getElementById("readWindowBtn")?.click()); await P.waitForTimeout(300);
  // (4) a menu page. Updated for PCF MSA J74 (n72b B): on the landing screen a menu link now opens a page WINDOW
  // (page-window-browser), so the page-to-page way back is proven from another page's menu: People -> Records.
  await P.goto(P.url().replace(/quranrevival\.html.*$/, "people.html"), { waitUntil: "networkidle" }); await P.waitForTimeout(800);
  const href = await P.evaluate(() => [...document.querySelectorAll(".nav-cat-links a[href]")].find((a) => /^records\.html/.test(a.getAttribute("href")))?.getAttribute("href") ?? "");
  check(`${tag} a menu link carries navBack=1 (${href})`, /navBack=1/.test(href), href);
  // clicked, as a reader does (the page learns where it came from from the click itself)
  await Promise.all([P.waitForNavigation({ waitUntil: "networkidle" }), P.evaluate((h) => [...document.querySelectorAll(".nav-cat-links a[href]")].find((a) => a.getAttribute("href") === h).click(), href)]);
  await P.waitForTimeout(800);
  const chip = await P.evaluate(() => { const b = document.querySelector("[data-bm-back] .bm-back"); const r = b?.getBoundingClientRect(); return r && r.width ? { text: b.textContent.trim(), href: b.getAttribute("href") || "" } : null; });
  check(`${tag} the page it opens shows ← Back to the page it came from`, !!chip && /←/.test(chip.text) && /people\.html/.test(chip.href), JSON.stringify(chip));
  check(`${tag} no page errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
// (5) a phone is unchanged
{
  const ctx = await ctxFor("en", 390, 844);
  const { page: P } = await openPage(ctx, "/app/quranrevival.html");
  await clean(P); await P.waitForTimeout(800);
  await toRead(P); await openCard(P);
  check("[en 390] the Āyah card still fills the phone's screen", same(await R(P, cardSel), { x: 0, y: 0, w: 390, h: 844 }), JSON.stringify(await R(P, cardSel)));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Pop-ups on a computer: every edge resizes, one size for all, ← Back everywhere (J72): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

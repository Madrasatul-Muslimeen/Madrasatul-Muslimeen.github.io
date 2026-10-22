// PCF MSA J81 (the Owner, 23 Oct 2026, a PC screenshot of a Note open in the Mapping My Journey window, the bottom
// buttons circled): "While I am on this view I click the bottom buttons, Study, Explore, no button displays what i
// clicked for. Fix this. *Also add a minimise button on the top bar (beside cross) in all pop-up window globally."
// app/js/minimise.js: a 40px – before every listed window's ✕; a minimised window is only hidden and waits as a chip
// (one tap brings it back); a press on the bottom row first steps open windows aside, and the window that button
// opens comes back instead. Real app, en and bn, 1708x1049 (the Owner's screen) and 390 (a phone).
// Run from the repository root, with `node serve.js` running (QR_BASE for another port).
//   --mutate=nobtn       the – is never added                      -> the button checks fail
//   --mutate=nodock      the bottom row no longer steps windows aside -> "Explore / Study is seen" fail
//   --mutate=norestore   reopening the tray does not bring it back -> "Mapping My Journey brings it back" fails
//   --mutate=noayahrestore  the Āyah card's openers no longer bring it back (all 4 calls) -> "shows the card again" fails
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  nobtn: ["app/js/minimise.js", "**/app/js/minimise.js*", "      close.before(btn);", "      void btn;"],
  nodock: ["app/js/minimise.js", "**/app/js/minimise.js*", "    minimiseAll({ except: keep });", "    void keep;"],
  noayahrestore: ["app/quranrevival.html", "**/app/quranrevival.html*", " restoreWindow(ayahActionSheetOverlayEl); // J81: a card opened while minimised is shown", "", 4],
  norestore: ["app/js/journey-tray.js", "**/app/js/journey-tray.js*", "  restoreWindow(tray); // PCF MSA J81: opening it again brings a minimised tray back\n", ""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

async function open(lang, width, height) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, glob, from, to, times = 1] = MUT[MUTATE];
    const src = fs.readFileSync(file, "utf8");
    if (src.split(from).length - 1 !== times) throw new Error(`mutation anchor for ${MUTATE} found ${src.split(from).length - 1} times, expected ${times}`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: src.split(from).join(to) }));
  }
  const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
  await P.waitForTimeout(1500);
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, P, errors };
}
const tap = (P, sel) => P.evaluate((s) => { const e = document.querySelector(s); if (!e) throw new Error(`no ${s}`); e.click(); }, sel);
const state = (P) => P.evaluate(() => {
  const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).display !== "none" && getComputedStyle(e).visibility !== "hidden";
  const onTop = (e) => { if (!vis(e)) return false; const b = e.getBoundingClientRect(); const x = document.elementFromPoint(b.left + b.width / 2, b.top + Math.min(b.height / 2, 20)); return !!x && (x === e || e.contains(x)); };
  const tray = document.getElementById("journeyTray"), min = tray?.querySelector(".mm-min-btn"), close = tray?.querySelector(".jt-close");
  const mb = min?.getBoundingClientRect(), cb = close?.getBoundingClientRect();
  const chip = document.querySelector('[data-mm-min-chip="journey"]');
  const explore = document.getElementById("exploreView"), study = document.getElementById("studyPillarMenu");
  return { tray: vis(tray), min: vis(min), minBeside: !!min && min.nextElementSibling === close && !!cb && cb.left - mb.right >= -1 && cb.left - mb.right <= 8, minW: mb ? Math.round(mb.width) : 0, minH: mb ? Math.round(mb.height) : 0, minTop: onTop(min),
    chip: vis(chip), chipTop: onTop(chip), explore: vis(explore) && onTop(explore), study: onTop(study) };
});

for (const lang of ["en", "bn"]) for (const [width, height] of [[1708, 1049], [390, 844]]) {
  const tag = `${lang}/${width}`;
  const { ctx, P, errors } = await open(lang, width, height);
  await tap(P, "#tabJourneyBtn");
  await P.waitForFunction(() => { const t = document.getElementById("journeyTray"); return t && !t.hidden; }, null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(500);
  let s = await state(P);
  check(`${tag}: POSITIVE CONTROL Mapping My Journey opens its window`, s.tray, JSON.stringify(s));
  check(`${tag}: the window's bar has a – right before its ✕, 40px or more, on top`, s.min && s.minBeside && s.minW >= 40 && s.minH >= 40 && s.minTop, JSON.stringify(s));
  // The Owner's report: a bottom button pressed while the window is open shows what was pressed.
  await P.evaluate(() => document.getElementById("tabExploreBtn").click());
  await P.waitForTimeout(800);
  s = await state(P);
  check(`${tag}: Explore pressed with the window open: the window steps aside and Explore is seen`, !s.tray && s.explore, JSON.stringify(s));
  check(`${tag}: ...the window waits as a chip, on top`, s.chip && s.chipTop, JSON.stringify(s));
  await P.evaluate(() => document.querySelector('[data-mm-min-chip="journey"]')?.click()); await P.waitForTimeout(400); // a missing chip fails the next check by name
  s = await state(P);
  check(`${tag}: one tap on the chip brings the window back, and the chip goes`, s.tray && !s.chip, JSON.stringify(s));
  await P.evaluate(() => document.getElementById("tabStudyBtn").click());
  await P.waitForTimeout(500);
  s = await state(P);
  check(`${tag}: Study pressed with the window open: its menu is seen, on top`, !s.tray && s.study, JSON.stringify(s));
  await P.keyboard.press("Escape").catch(() => {});
  await tap(P, "#tabJourneyBtn"); await P.waitForTimeout(500);
  s = await state(P);
  check(`${tag}: Mapping My Journey pressed while its window is minimised brings it back`, s.tray && !s.chip, JSON.stringify(s));
  // The – itself.
  await P.evaluate(() => document.querySelector("#journeyTray .mm-min-btn")?.click()); await P.waitForTimeout(300);
  s = await state(P);
  check(`${tag}: the – minimises the window to a chip`, !s.tray && s.chip, JSON.stringify(s));
  // A Mapping My Journey link OUTSIDE the bottom row (the menu bar's): the tray's own opening brings it back.
  const navLink = await P.evaluate(() => { const a = [...document.querySelectorAll('a[href*="journey-map.html"]')].find((x) => !x.closest("#tabRow")); if (!a) return false; a.click(); return true; });
  await P.waitForTimeout(500);
  s = await state(P);
  check(`${tag}: ...and a Mapping My Journey link elsewhere (the menu bar) brings it back`, navLink && s.tray && !s.chip, JSON.stringify({ navLink, ...s }));
  // The Āyah card (a computer): its – sits beside × in the card's own ordered header; opening another āyah while the
  // card is minimised shows the card again.
  if (width >= 900) {
    await P.evaluate(() => { document.getElementById("journeyTray") && (document.querySelector("#journeyTray .jt-close")?.click()); });
    if (!(await P.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) await P.evaluate(() => document.getElementById("tabStudyBtn").click());
    await P.evaluate(() => document.getElementById("tabReadBtn").click()); await P.waitForTimeout(400);
    await P.evaluate(() => { const x = document.getElementById("surahSelect"); x.value = "22"; x.dispatchEvent(new Event("change", { bubbles: true })); });
    await P.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:22:"]'), null, { timeout: 15000 }).catch(() => {});
    await P.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "3"; el.dispatchEvent(new Event("change", { bubbles: true })); });
    await P.waitForFunction(() => document.querySelector('[data-ayah-num-badge="22:3"]'), null, { timeout: 8000 }).catch(() => {});
    await P.waitForTimeout(500);
    await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    await P.evaluate(() => document.querySelector('[data-ayah-num-badge="22:3"]')?.click()); await P.waitForTimeout(900);
    const card = () => P.evaluate(() => { const o = document.getElementById("ayahActionSheetOverlay"), sh = o?.querySelector("[data-ayah-sheet]"); const m = sh?.querySelector(".mm-min-btn"), c = sh?.querySelector(".ayah-sheet-close"); const mb = m?.getBoundingClientRect(), cb = c?.getBoundingClientRect();
      return { shown: !!sh && getComputedStyle(o).display !== "none" && sh.getClientRects().length > 0, ref: sh?.querySelector(".ayah-sheet-ref")?.textContent ?? "", min: !!mb && mb.width >= 40 && mb.height >= 40, beside: !!mb && !!cb && cb.left - mb.right >= -1 && cb.left - mb.right <= 12, chip: !!document.querySelector('[data-mm-min-chip="ayah"]') }; });
    let c = await card();
    check(`${tag}: POSITIVE CONTROL the Āyah card opens`, c.shown, JSON.stringify(c));
    check(`${tag}: the Āyah card's – sits right beside its ×, 40px+`, c.min && c.beside, JSON.stringify(c));
    await P.evaluate(() => document.querySelector("#ayahActionSheetOverlay .mm-min-btn")?.click()); await P.waitForTimeout(300);
    c = await card();
    check(`${tag}: the – hides the card and leaves its chip`, !c.shown && c.chip, JSON.stringify(c));
    // (The Read view is on the single āyah 22:3, so its own number is the āyah on screen to tap.)
    const badge = await P.evaluate(() => { const b = document.querySelector('[data-ayah-num-badge="22:3"]'); b?.click(); return !!b; }); await P.waitForTimeout(900);
    c = await card();
    check(`${tag}: tapping an āyah number while the card is minimised shows the card again, the chip gone`, badge && c.shown && !c.chip, JSON.stringify({ badge, ...c }));
  }
  check(`${tag}: no page errors`, errors.filter((e) => !/net::|archive\.org|ERR_CERT/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

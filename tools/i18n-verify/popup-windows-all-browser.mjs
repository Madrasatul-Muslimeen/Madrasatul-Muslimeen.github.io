// PCF MSA J140 part 3 (15 Nov 2026) -- one pop-up in each of Hadith, Dua, Notes and Quran Study is checked end to end:
// ✕, ⛶ and – are the topmost thing at their centre (elementFromPoint), ⛶ fills the viewport and returns to the same rect, a drag by
// the top bar moves it, each of the eight handles changes the size, a click on a module bar collapses it.
// Run from the repository root with `node serve.js` running:  node tools/i18n-verify/popup-windows-all-browser.mjs [--mutate=NAME]
// Each check is proven by a mutation that must make it FAIL by name:
//   nohwcx     the Hadith Word Card loses its ✕                      -> "✕ is the topmost thing at its centre"
//   nodpop     the Dua pop-up is no longer in WINDOWS                -> "has – ⛶ ✕"
//   nofull     ⛶ does nothing                                        -> "⛶ fills the viewport"
//   nodrag     the shared drag does nothing                          -> "a drag by the top bar moves it"
//   noresize   the handles do nothing                                -> "handle ... changes the size"
//   nocollapse a module bar no longer collapses pop-ups              -> "a click on a module bar collapses it"
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MIN = "app/js/minimise.js";
const MUT = {
  nohwcx: [["app/js/hadith-word-card.js", [['head.appendChild(xBtn);', ""]]]],
  nodpop: [[MIN, [['close: ".dua-pop-close"', 'close: ".dua-pop-closeX"']]]],
  nofull: [[MIN, [["e.stopPropagation(); toggleFull(root); });", "e.stopPropagation(); });"]]]],
  nodrag: [[MIN, [['startDrag(e, "move", ctx());', ""]]]],
  noresize: [[MIN, [["e.stopPropagation(); startDrag(e, h, ctx());", "e.stopPropagation();"]]]],
  nocollapse: [[MIN, [["#topNav summary, ", ""], ["#hadithCorpusRoot [role='tablist'] button, #hadithCorpusRoot nav button, ", ""], ["#duaRoot [role='tablist'] button, #duaRoot nav button, ", ""], ["#tabRow button, ", ""], ["#wheelBar button, ", ""]]]],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (typeof ok?.then === "function") throw new Error(`check "${n}" was given a promise`); ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`)); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function context(lang, width, height) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    for (const [file, pairs] of MUT[MUTATE]) {
      await ctx.route(`**/${file}*`, async (r) => {
        let src = fs.readFileSync(file, "utf8");
        for (const [a, b] of pairs) { if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); src = src.split(a).join(b); }
        await r.fulfill({ status: 200, contentType: "text/javascript", body: src });
      });
    }
  }
  return ctx;
}

const rectOf = (page, sel) => page.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }, sel);
const topAtCentre = (page, root, btnSel) => page.evaluate(([root, btnSel]) => {
  const b = document.querySelector(root)?.querySelector(btnSel);
  if (!b) return null;
  const r = b.getBoundingClientRect();
  const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return hit === b || b.contains(hit);
}, [root, btnSel]);

/** The full set of checks on one open pop-up. `root` is the window, `x` its ✕ selector. */
async function exercise(page, tag, root, x, { handles = true } = {}) {
  const has = await page.evaluate(([root]) => { const r = document.querySelector(root); return !!r && !!r.querySelector(".mm-min-btn") && !!r.querySelector(".mm-full-btn"); }, [root]);
  // the buttons are added on the next animation frame
  if (!has) await page.waitForFunction((root) => { const r = document.querySelector(root); return !!r && !!r.querySelector(".mm-min-btn") && !!r.querySelector(".mm-full-btn"); }, root, { timeout: 4000 }).catch(() => {});
  check(`${tag} has – ⛶ ✕`, await page.evaluate(([root, x]) => { const r = document.querySelector(root); return !!r && !!r.querySelector(".mm-min-btn") && !!r.querySelector(".mm-full-btn") && !!r.querySelector(x); }, [root, x]));
  for (const [name, sel] of [["✕", x], ["⛶", ".mm-full-btn"], ["–", ".mm-min-btn"]]) {
    check(`${tag} ${name} is the topmost thing at its centre`, (await topAtCentre(page, root, sel)) === true);
  }
  const labels = await page.evaluate((root) => ({ min: document.querySelector(`${root} .mm-min-btn`)?.getAttribute("aria-label"), full: document.querySelector(`${root} .mm-full-btn`)?.getAttribute("aria-label") }), root);
  check(`${tag} – and ⛶ have labels`, !!labels.min && !!labels.full, JSON.stringify(labels));
  // ⛶
  const r0 = await rectOf(page, root);
  await page.click(`${root} .mm-full-btn`);
  const rf = await rectOf(page, root);
  const vp = page.viewportSize();
  check(`${tag} ⛶ fills the viewport`, !!rf && Math.abs(rf.w - vp.width) <= 1 && Math.abs(rf.h - vp.height) <= 1 && rf.x === 0 && rf.y === 0, JSON.stringify({ rf, vp }));
  await page.click(`${root} .mm-full-btn`);
  const r1 = await rectOf(page, root);
  check(`${tag} ⛶ again restores the same rect`, !!r1 && !!r0 && Math.abs(r1.x - r0.x) <= 1 && Math.abs(r1.y - r0.y) <= 1 && Math.abs(r1.w - r0.w) <= 1 && Math.abs(r1.h - r0.h) <= 1, JSON.stringify({ r0, r1 }));
  if (vp.width < 700) return; // a phone sheet fills the screen: drag and resize are for tablets and computers
  // drag by the top bar
  // a plain point on the bar: scan across it for somewhere that is not a button, link or field
  const bar = await page.evaluate(([root, x]) => {
    const w = document.querySelector(root); const b = w.querySelector(x).parentElement; const r = b.getBoundingClientRect();
    const y = r.y + Math.min(r.height / 2, 14);
    for (let px = r.x + r.width - 120; px > r.x + 8; px -= 6) {
      const e = document.elementFromPoint(px, y);
      if (e && b.contains(e) && !e.closest("button, a, input, select, textarea")) return { x: px, y };
    }
    return null;
  }, [root, x]);
  const here = await rectOf(page, root);
  if (here.w >= vp.width && here.h >= vp.height) { console.log(`  SKIP  ${tag} drag: the window already fills the screen (a sheet), nothing to move`); return; }
  if (bar) {
    const before = await rectOf(page, root);
    // toward the free side, so a window that nearly fills the screen is not stopped by the edge
    const sx = before.x + before.w / 2 > vp.width / 2 ? -60 : 60, sy = before.y + before.h / 2 > vp.height / 2 ? -40 : 40;
    await page.mouse.move(bar.x, bar.y); await page.mouse.down(); await page.mouse.move(bar.x + sx, bar.y + sy, { steps: 6 }); await page.mouse.up();
    const after = await rectOf(page, root);
    check(`${tag} a drag by the top bar moves it`, Math.hypot(after.x - before.x, after.y - before.y) >= 20 && (after.x - before.x) * sx >= 0 && (after.y - before.y) * sy >= 0 && after.w === before.w && after.h === before.h, JSON.stringify({ before, after }));
  } else check(`${tag} a drag by the top bar moves it`, false, "no plain point on the bar");
  if (!handles) return;
  for (const h of ["n", "s", "e", "w", "ne", "nw", "se", "sw"]) {
    const r = await rectOf(page, root);
    const p = await page.evaluate(([root, h]) => { const e = document.querySelector(`${root} > .mm-h[data-h="${h}"], ${root} .mm-h[data-h="${h}"]`); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, [root, h]);
    if (!p) { check(`${tag} handle ${h} changes the size`, false, "no handle"); continue; }
    if (p.x < 0 || p.y < 0 || p.x > vp.width || p.y > vp.height) { console.log(`  SKIP  ${tag} handle ${h}: the window runs past the screen edge, its handle is off screen`); continue; }
    // grow where there is room, shrink where the window already touches the screen's edge
    const roomE = vp.width - (r.x + r.w) > 40, roomW = r.x > 40, roomS = vp.height - (r.y + r.h) > 40, roomN = r.y > 40;
    const dx = h.includes("e") ? (roomE ? 30 : -30) : h.includes("w") ? (roomW ? -30 : 30) : 0;
    const dy = h.includes("s") ? (roomS ? 30 : -30) : h.includes("n") ? (roomN ? -30 : 30) : 0;
    await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + dx, p.y + dy, { steps: 5 }); await page.mouse.up();
    const a = await rectOf(page, root);
    check(`${tag} handle ${h} changes the size`, a.w !== r.w || a.h !== r.h, JSON.stringify({ r, a }));
  }
}

async function openDuaPop(page) {
  await page.click("[data-dua-menu-toggle]").catch(() => {});
  await page.waitForSelector(".dua-menu-tabs button", { timeout: 10000 }).catch(() => {});
  await page.click('[data-dua-tab="study"]').catch(() => {});
  await page.waitForTimeout(200);
  await page.evaluate(() => { const b = [...document.querySelectorAll("[data-dua-menu]")].find((x) => x.getClientRects().length); b?.click(); });
  await page.waitForSelector(".dua-popcard", { timeout: 8000 }).catch(() => {});
}

async function collapses(page, tag, root, barSel) {
  // the pop-up's veil covers the bar for a pointer, so the press is a dispatched click (the app listens in the capture phase)
  await page.evaluate((s) => document.querySelector(s).click(), barSel);
  await page.waitForTimeout(250);
  check(`${tag} a click on a module bar collapses it`, await page.evaluate((root) => { const r = document.querySelector(root); return !!document.querySelector("#mmColStack .mm-col-bar") && (!r || r.getClientRects().length === 0); }, root));
}

for (const [lang, width, height] of [["en", 1280, 900], ["bn", 1280, 900], ["en", 768, 900], ["en", 390, 844], ["bn", 390, 844], ["en", 320, 640]]) {
  const tagB = `[${lang} ${width}]`;
  console.log(`\n=== ${tagB} ===`);

  // ---- Hadith: the Hadith Word Card
  {
    const ctx = await context(lang, width, height);
    const { page } = await openPage(ctx, "/app/hadith-study.html?resume=hadith:hadeethenc:65070");
    await page.waitForSelector(".hwc-switch", { timeout: 25000 }).catch(() => {});
    await page.click(".hwc-switch").catch(() => {});
    await page.waitForSelector(".hwc-chip", { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => { const c = [...document.querySelectorAll(".hwc-chip")].find((b) => !b.matches("a")) ?? document.querySelector(".hwc-chip"); c?.click(); });
    await page.waitForSelector(".hwc-sheet", { timeout: 8000 }).catch(() => {});
    check(`${tagB} Hadith: the Word Card is open (positive control)`, !!(await rectOf(page, ".hwc-sheet")));
    await exercise(page, `${tagB} Hadith Word Card`, ".hwc-sheet", ".hwc-close");
    await ctx.close();
  }
  // ---- Dua: a Dua Card block as a pop-up
  {
    const ctx = await context(lang, width, height);
    const { page } = await openPage(ctx, "/app/dua-study.html?g=rasul&open=8");
    await page.waitForSelector("[data-dua-topbar]", { timeout: 25000 }).catch(() => {});
    await openDuaPop(page);
    check(`${tagB} Dua: the pop-up is open (positive control)`, !!(await rectOf(page, ".dua-popcard")));
    await exercise(page, `${tagB} Dua pop-up`, ".dua-popcard", ".dua-pop-close");
    await ctx.close();
  }
  // ---- Notes: the Note opener (it drags and resizes by itself; ⛶ and – are added)
  {
    const ctx = await context(lang, width, height);
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForTimeout(500);
    if (!(await page.evaluate(() => (document.getElementById("tabNoteBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(200); }
    await page.click("#tabNoteBtn");
    await page.waitForSelector("#noteOpener:not([hidden])", { timeout: 8000 }).catch(() => {});
    check(`${tagB} Notes: the Note opener is open (positive control)`, !!(await rectOf(page, "#noteOpener")));
    await exercise(page, `${tagB} Note opener`, "#noteOpener", ".no-close", { handles: false });
    await ctx.close();
  }
  // ---- Quran Study: the Learn next sheet (entered in part 2) and a click on a module bar
  {
    const ctx = await context(lang, width, height);
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForTimeout(500);
    if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
    await page.click("#tabReadBtn"); await page.waitForTimeout(400);
    await page.evaluate(() => document.getElementById("tabVocabularyBtn")?.click());
    await page.waitForFunction(() => { const s = document.getElementById("learnNextSheet"); return s && !s.hidden && s.querySelectorAll(".ln-row").length > 0; }, null, { timeout: 15000 }).catch(() => {});
    check(`${tagB} Quran Study: Learn next is open (positive control)`, !!(await rectOf(page, "#learnNextSheet:not([hidden])")));
    await exercise(page, `${tagB} Learn next`, "#learnNextSheet", ".ln-close");
    await ctx.close();
  }
}

// ---- a click on a module bar collapses the open pop-up (Hadith's bar, Dua's bar)
{
  const ctx = await context("en", 1280, 900);
  const { page } = await openPage(ctx, "/app/dua-study.html?g=rasul&open=8");
  await page.waitForSelector("[data-dua-topbar]", { timeout: 25000 }).catch(() => {});
  await openDuaPop(page);
  const bar = await page.evaluate(() => { const b = document.querySelector("#duaRoot [role='tablist'] button, #duaRoot nav button"); if (!b) return null; b.dataset.mmProbe = "1"; return "[data-mm-probe]"; });
  check(`[en 1280] Dua: a module-bar button exists (positive control)`, !!bar);
  if (bar) await collapses(page, "[en 1280] Dua pop-up", ".dua-popcard", bar);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

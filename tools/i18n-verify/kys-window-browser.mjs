// Know Your Status as a window (the Owner, 6 Oct 2026): "Enable Know Your Status Card moveable, resizeable and the
// same (resize) for wheel inside it and any other cards popout from there should have the same functions", then
// "the numbers are cut below the wheel ... enable back buttons from other pops."
// Seeds 40 Approaches (the live tenant's count: with 40, one number sits at the very bottom of the wheel).
// Run from the repository root with serve.js on :8080. Expected values are written by hand.
//   --mutate=no-room    the wheel keeps its old 0..360 box      -> the "numbers inside" checks fail
//   --mutate=no-float   the card never floats                  -> the move/resize checks fail
//   --mutate=no-back    leaving for Explore offers no way back  -> the Back chip checks fail
//   --mutate=stored     the card opens from a stored size again -> the J50 "opens large" checks fail
//   --mutate=under-zab  the card runs to the screen's bottom   -> "its resize corner free" and the resize check fail
// UPDATED IN PLACE 20 Oct 2026 (PCF MSA J50, the Owner: "enable the window to appear in this size in PC always"): on a
// PC the card now opens LARGE at every start (92% wide, at most 1,280px; down to 12px above the Zab bar), never from a
// size an earlier visit stored, so "opens centred, 832 wide", "its place is remembered" and "opens where it was left"
// now assert the large opening, that no place is stored, and that an old stored place is ignored. The wheel's own size
// is still remembered.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const W = { en: { back: "← Back", backTo: "← Back to Know Your Status" }, bn: { back: "← ফিরে যান", backTo: "← ফিরে যান: আপনার অবস্থা জানুন" } };
const SEED = `
for (let i = 11; i <= 40; i++) DATA.trackables.push({ _id: TENANT_ID + "__extra" + i, tenantId: TENANT_ID, subjectId: "quran", order: 100 + i, status: "active",
  name: lang("Approach number " + i, "পদ্ধতি " + i), groupName: lang("More", "আরও"), guide: { what: lang("w", "w"), how: lang("h", "h"), measure: lang("m", "m") }, panels: ["text"] });`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function start(lang, width, height, store = null) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (store) await ctx.addInitScript((kv) => { for (const [k, v] of Object.entries(kv)) try { localStorage.setItem(k, v); } catch {} }, store);
  if (MUTATE) {
    let body = fs.readFileSync("app/quranrevival.html", "utf8");
    const swap = (a, b) => { if (!body.includes(a)) throw new Error(`mutation anchor missing: ${a.slice(0, 60)}`); body = body.split(a).join(b); };
    if (MUTATE === "no-room") { swap("names, roomForNumbers: true });", "names });"); swap("centerSub, roomForNumbers: true });", "centerSub });"); }
    else if (MUTATE === "no-float") swap('when: () => window.innerWidth >= 900', "when: () => false");
    else if (MUTATE === "under-zab") swap("h = Math.max(300, zabTop - 24);", "h = window.innerHeight - 24;");
    else if (MUTATE === "stored") swap("initial: myStatusWinLarge, fill: true });", "initial: myStatusWinStart(0) });");
    else if (MUTATE === "no-back") swap('      mountBackRow(`← ${t("Back to {page}", { page: t("Know Your Status") })}`, {', "      ({");
    else throw new Error(`unknown mutation ${MUTATE}`);
    await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body }));
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay, .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
const openKys = async (page) => {
  await page.click("#myStatusWideBtn");
  await page.waitForFunction(() => !!document.querySelector("#myStatusOverviewWheel svg .wheel-seg-num"), null, { timeout: 10000 });
  await page.waitForTimeout(300);
};
const rectOf = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null; }, sel);
const numbers = (page) => page.evaluate(() => {
  const svg = document.querySelector("#myStatusOverviewWheel svg"); const sr = svg.getBoundingClientRect();
  // PCF MSA J100: the unit rows are closed under the top-bar button until it is tapped, and a closed row measures top 0,
  // which put EVERY number "under the buttons". The question is still whether the numbers clear the rows when they are
  // open, so they are opened for the measurement and closed again. Updated in place, reason recorded.
  const sw = document.getElementById("myStatusWheelSwitch"), wasHidden = !!sw?.hidden;
  if (sw) sw.hidden = false;
  const pillTop = Math.min(...[...document.querySelectorAll("#myStatusWheelSwitch button")].map((b) => b.getBoundingClientRect().top));
  if (sw) sw.hidden = wasHidden;
  const nums = [...svg.querySelectorAll("text.wheel-seg-num")].map((t) => t.getBoundingClientRect());
  return { count: nums.length, outside: nums.filter((r) => r.left < sr.left - 0.5 || r.right > sr.right + 0.5 || r.top < sr.top - 0.5 || r.bottom > sr.bottom + 0.5).length,
    overPills: nums.filter((r) => r.bottom > pillTop).length, svgW: sr.width };
});
async function dragBy(page, sel, dx, dy) {
  const r = await rectOf(page, sel);
  const x = r.x + Math.min(r.w / 2, 60), y = r.y + Math.min(r.h / 2, 20);
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 5 }); await page.mouse.move(x + dx, y + dy, { steps: 5 });
  await page.mouse.up();
}

for (const lang of ["en", "bn"]) {
  // ---- PC: the card is a window ----
  {
    const tag = `${lang}/1280`;
    console.log(`\n=== ${tag} ===`);
    const { ctx, page, errors } = await start(lang, 1280, 800);
    await openKys(page);
    const n = await numbers(page);
    check(`${tag}: the wheel shows all 40 Approach numbers`, n.count === 40, String(n.count));
    check(`${tag}: no number is cut by the wheel's edge`, n.outside === 0, `${n.outside} outside`);
    check(`${tag}: no number runs into the unit buttons under the wheel`, n.overPills === 0, `${n.overPills} over`);
    const floating = await page.evaluate(() => document.getElementById("myStatusCard").hasAttribute("data-fc-floating"));
    check(`${tag}: the card is a window (it floats)`, floating);
    const r0 = await rectOf(page, "#myStatusCard");
    // J50: 1280 x 0.92 = 1,177.6 wide, centred (x 51.2); from y 12 down to 12px above the Zab bar, and its resize corner
    // is the thing at its own point (the Zab bar covered it when the window ran to the screen's bottom).
    const zabTop = await page.evaluate(() => { const z = document.getElementById("zabBar"); return z && z.offsetHeight ? z.getBoundingClientRect().top : innerHeight; });
    const seFree = await page.evaluate(() => { const h = document.querySelector('#myStatusCard .fc-h[data-h="se"]'); const r = h.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === h; });
    // UPDATED IN PLACE for PCF MSA J72 (the Owner, 22 Oct 2026: "Enable this size globally for all pop-ups", newer than
    // J50's large card): the card opens at the home window's size and place, the same as every other pop-up.
    const hr = await page.evaluate(() => JSON.parse(localStorage.getItem("mmsa-home-window-v1") || "null"));
    check(`${tag}: it opens at the home window's size and place ${JSON.stringify(hr)}, above the Zab bar, its resize corner free`, !!r0 && !!hr && Math.abs(r0.w - hr.w) < 2 && Math.abs(r0.x - hr.x) < 2 && Math.abs(r0.y - hr.y) < 2 && Math.abs(r0.h - hr.h) < 2 && r0.y + r0.h <= zabTop && seFree, JSON.stringify({ r0, zabTop, seFree }));
    // Updated in place (J50): the window now opens large, so it is resized first (its corner is on screen) and then
    // moved 30px left and 40px down (a 150px move would push the large window off the screen's left edge, which the
    // window rightly refuses).
    await dragBy(page, '#myStatusCard .fc-h[data-h="se"]', -120, -100);
    const r1 = await rectOf(page, "#myStatusCard");
    check(`${tag}: dragging its corner resizes it`, !!r1 && Math.abs(r1.w - (r0.w - 120)) < 4 && Math.abs(r1.h - (r0.h - 100)) < 4, JSON.stringify(r1));
    await dragBy(page, "#myStatusCard header h2", 30, 40); // J72: rightwards -- the home rect starts near the left edge
    const r2 = await rectOf(page, "#myStatusCard");
    check(`${tag}: dragging its title bar moves it`, !!r2 && Math.abs(r2.x - (r1.x + 30)) < 3 && Math.abs(r2.y - (r1.y + 40)) < 3, JSON.stringify(r2));
    // the wheel's own grip
    const w0 = await rectOf(page, "#myStatusOverviewWheel svg");
    await page.evaluate(() => document.querySelector("#myStatusOverviewWheel [data-fc-grip]")?.scrollIntoView({ block: "center" }));
    await dragBy(page, "#myStatusOverviewWheel [data-fc-grip]", -90, -90);
    const w1 = await rectOf(page, "#myStatusOverviewWheel svg");
    check(`${tag}: the wheel's corner grip makes it smaller`, !!w0 && !!w1 && w1.w < w0.w - 40, `${w0?.w} -> ${w1?.w}`);
    const n2 = await numbers(page);
    check(`${tag}: ...and at its new size no number is cut`, n2.outside === 0 && n2.overPills === 0, JSON.stringify(n2));
    const stored = await page.evaluate(() => ({ rect: localStorage.getItem("mm_kys_rect"), wheel: localStorage.getItem("mm_kys_wheel") }));
    check(`${tag}: J50: the card's place is NOT stored (it opens large every time); the wheel size is remembered`, !stored.rect && !!stored.wheel, JSON.stringify(stored));
    // the Approach card: a window too, with ← Back
    await page.evaluate(() => document.querySelector('#myStatusOverviewWheel .wheel-seg[data-key]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await page.waitForFunction(() => !document.getElementById("myStatusDetailMount").hidden, null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    const det = await page.evaluate(() => { const b = document.getElementById("myStatusDetailBackBtn"); const r = b?.getBoundingClientRect(); return { floating: document.getElementById("myStatusDetailCard").hasAttribute("data-fc-floating"), text: b?.textContent.trim(), h: r?.height, w: r?.width }; });
    check(`${tag}: the Approach card is a window too`, det.floating);
    check(`${tag}: it has "${W[lang].back}", at least 40px tall`, det.text === W[lang].back && det.h >= 40, JSON.stringify(det));
    const dr0 = await rectOf(page, "#myStatusDetailCard");
    await dragBy(page, "#myStatusDetailCard [data-fc-handle]", 100, 30);
    const dr1 = await rectOf(page, "#myStatusDetailCard");
    check(`${tag}: ...and it moves by its ⠿ handle`, !!dr1 && Math.abs(dr1.x - dr0.x - 100) < 3, `${dr0?.x} -> ${dr1?.x}`);
    await page.click("#myStatusDetailBackBtn");
    await page.waitForTimeout(200);
    check(`${tag}: ← Back returns to the Know Your Status list`, await page.evaluate(() => document.getElementById("myStatusDetailMount").hidden && !document.getElementById("myStatusMount").hidden));
    // to Explore and back
    const key = await page.evaluate(() => document.querySelector('#myStatusOverviewWheel .wheel-seg[data-key]')?.dataset.key);
    await page.evaluate(() => document.querySelector('#myStatusOverviewWheel .wheel-seg[data-key]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await page.waitForSelector("#myStatusSeeInExploreBtn", { timeout: 5000 }).catch(() => {});
    await page.click("#myStatusSeeInExploreBtn").catch(() => {});
    await page.waitForTimeout(800);
    const chip = await page.evaluate(() => { const b = document.querySelector("#kysBackRow .bm-back"); const r = b?.getBoundingClientRect(); return { text: b?.textContent.trim(), h: r?.height, kysClosed: document.getElementById("myStatusMount").hidden }; });
    check(`${tag}: in Explore, "${W[lang].backTo}" is offered`, chip.kysClosed && chip.text === W[lang].backTo && chip.h >= 40, JSON.stringify(chip));
    await page.click("#kysBackRow .bm-back").catch(() => {});
    await page.waitForFunction(() => !document.getElementById("myStatusDetailMount").hidden, null, { timeout: 8000 }).catch(() => {});
    const back = await page.evaluate(() => ({ kys: !document.getElementById("myStatusMount").hidden, detail: !document.getElementById("myStatusDetailMount").hidden, chip: !!document.getElementById("kysBackRow"), sel: document.getElementById("myStatusDetailApproachSelect")?.value }));
    check(`${tag}: ...which reopens Know Your Status on the same Approach card, and goes away`, back.kys && back.detail && !back.chip && back.sel === key, JSON.stringify({ ...back, key }));
    // ...and it is the thing on top, not hidden behind Explore (found by LOOKING at this suite's own screenshot).
    const onTop = await page.evaluate(() => { const r = document.getElementById("myStatusDetailCard").getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + 10); return { explore: document.body.dataset.stageView ?? null, hit: !!el && !!el.closest("#myStatusDetailCard"), exploreShown: (() => { const e = document.getElementById("explorePanel"); return !!e && !e.hidden && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== "none"; })() }; });
    check(`${tag}: ...on top, with Explore closed (not behind it)`, onTop.hit && !onTop.exploreShown, JSON.stringify(onTop));
    check(`${tag}: no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await page.screenshot({ path: `/tmp/asma-shots/kys-after-${lang}-1280.png` });
    await ctx.close();
  }
  // ---- remembered after a reload ----
  {
    const tag = `${lang}/1280 reopened`;
    const saved = JSON.stringify({ x: 40, y: 30, w: 600, h: 500 });
    const { ctx, page } = await start(lang, 1280, 800, { mm_kys_rect: saved });
    await openKys(page);
    const r = await rectOf(page, "#myStatusCard");
    const hr = await page.evaluate(() => JSON.parse(localStorage.getItem("mmsa-home-window-v1") || "null"));
    check(`${tag}: J50/J72: an old stored place (600x500 at 40,30) is ignored; the card opens at the home rect`, !!r && !!hr && Math.abs(r.w - hr.w) < 2 && Math.abs(r.h - hr.h) < 2 && Math.abs(r.y - hr.y) < 2, JSON.stringify({ r, hr }));
    await ctx.close();
  }
  // ---- phone: full screen, as before ----
  {
    const tag = `${lang}/390`;
    console.log(`\n=== ${tag} ===`);
    const { ctx, page } = await start(lang, 390, 844);
    await openKys(page);
    const n = await numbers(page);
    check(`${tag}: no number is cut or under the buttons`, n.count === 40 && n.outside === 0 && n.overPills === 0, JSON.stringify(n));
    const ph = await page.evaluate(() => ({ floating: document.getElementById("myStatusCard").hasAttribute("data-fc-floating"), r: document.getElementById("myStatusCard").getBoundingClientRect().width, grip: !!document.querySelector("#myStatusOverviewWheel [data-fc-grip]") }));
    check(`${tag}: the card stays full-screen (it does not float on a phone)`, !ph.floating && Math.round(ph.r) === 390, JSON.stringify(ph));
    check(`${tag}: the wheel still has its resize grip`, ph.grip);
    await page.evaluate(() => document.querySelector('#myStatusOverviewWheel .wheel-seg[data-key]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await page.waitForTimeout(500);
    const hdr = await page.evaluate(() => { const h = document.querySelector("#myStatusDetailCard header"); const kids = [...h.children].map((c) => c.getBoundingClientRect()); const b = document.getElementById("myStatusDetailBackBtn").getBoundingClientRect(); return { fits: kids.every((r) => r.right <= innerWidth + 0.5 && r.left >= -0.5), backH: b.height, backW: b.width }; });
    check(`${tag}: the Approach card's header fits, with ← Back at least 40px`, hdr.fits && hdr.backH >= 40 && hdr.backW > 0, JSON.stringify(hdr));
    check(`${tag}: no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `/tmp/asma-shots/kys-after-${lang}-390.png` });
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== Know Your Status as a window: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

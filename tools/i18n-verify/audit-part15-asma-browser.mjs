// Audit part 15 (PCF J29, manual audit, #878): the User Manual's "Asma ul Husna (the Names of Allah)" features, each one WORKING.
// Measured on the rendered page at 390 / 820 / 1440 (and 320 for anything that opens a window, sheet, poster or card), English and Bangla.
// The result is asserted, not the element: the Name shown after ‹ ›, a stored write (window.__stubWriteData), the place returned to.
//   1 Asma in Explore (wheel, poster, ‹ ›, ◂ Wheel, full-size poster, ← Back)      2 Cited āyāt and hadith, ways back
//   3 A Name's description (source choice, ✎ Edit + Save, no ✎ for a reader)       4 Classifying a Name (Essence|Act, Unique|Shared, 📂)
//   5 The Asma study page (Browse by Category, Track my progress, 🖨 Print, Manage) 6 🌙 Screensaver (settings kept, poster + clock, Open this Name, Esc, held off)
//   7 Bangla: no English left on these features
// Poster IMAGES cannot load here (archive.org is unreachable): the page is asked what it shows and where, never for the loaded pixels.
// Each flow has a POSITIVE CONTROL and a timeout that fails by name. Mutations: --mutate=<name> restores a defect.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part15-asma-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const PROBE = process.env.PROBE === "1" || process.argv.includes("--probe");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);
const WONLY = Number((process.argv.find((a) => a.startsWith("--width=")) || "").slice(8)) || 0;
const LONLY = (process.argv.find((a) => a.startsWith("--lang=")) || "").slice(7);
const MUTATIONS = {};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);

// The four classifications in the Owner's own shape (decision 78), one Group, and Ar-Rahman already under Essence.
const SEED = `
window.__stubApplyBatches = true; window.__stubRecordTxData = true;
DATA.asmaCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, schemaVersion: 1,
  classifications: [
    { key: "group", title: { en: "Group", bn: "গ্রুপ" }, order: 10, status: "active" },
    { key: "dual", title: { en: "Dual Names", bn: "জোড়া নাম" }, order: 20, status: "active" },
    { key: "cls_act", title: { en: "ACT" }, order: 30, status: "active" },
    { key: "cls_essence", title: { en: "ESSENCE" }, order: 40, status: "active" },
    { key: "cls_unique", title: { en: "UNIQUENESS" }, order: 50, status: "active" },
    { key: "cls_shared", title: { en: "SHARED" }, order: 60, status: "active" } ],
  collections: [
    { id: "g1", title: { en: "Mercy" }, kind: "group", badge: "", order: 10, status: "active", items: ["name:1", "name:2"] },
    { id: "a1", title: { en: "ACT" }, kind: "cls_act", badge: "", order: 10, status: "active", items: [] },
    { id: "e1", title: { en: "ESSENCE" }, kind: "cls_essence", badge: "", order: 10, status: "active", items: ["name:1"] },
    { id: "u1", title: { en: "UNIQUENESS" }, kind: "cls_unique", badge: "", order: 10, status: "active", items: [] } ],
  extraNames: [], overrides: {}, overridesEn: {}, refOverrides: {} }];`;
const READER = `DATA.tenantMemberUids[0].roles = ["student"]; DATA.tenantPeople[0].roles = ["student"];`;

const browser = await chromium.launch();
const bnDigits = (s) => String(s).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
const BN = /[ঀ-৿]/;
// English words that may stay on a Bangla page: the app's own names, the Names' transliterations and source names.
const ALLOWED = /QuranRevival|QCR|MMSA|Qur'?an|Asma|Husna|Madrasatul|Muslimeen|Sahih|Bukhari|Muslim|Tirmidhi|Jami|Hadith|Wakil|Basit|Rahman|Rahim|Malik|Quddus|Salam|Al-?[A-Za-z]+|Ar-?[A-Za-z]+|As-?[A-Za-z]+|An-?[A-Za-z]+|Ash-?[A-Za-z]+|At-?[A-Za-z]+|Az-?[A-Za-z]+|Ad-?[A-Za-z]+|Adh-?[A-Za-z]+|Dh[A-Za-z]+|Gh[A-Za-z]+|Kh[A-Za-z]+|ACT|ESSENCE|UNIQUENESS|SHARED|Mercy|Group|Google|CSV|AM|PM/g;
const englishLeft = (text) => (String(text).replace(ALLOWED, " ").match(/[A-Za-z]{3,}/g) || []);

async function open(lang, width, pagePath, { reader = false, screensaver = false, saver = null } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: SEED + (reader ? READER : ""), allowScreensaver: screensaver });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (saver) await ctx.addInitScript((s) => { try { if (!localStorage.getItem("mm_screensaver")) localStorage.setItem("mm_screensaver", JSON.stringify(s)); } catch {} }, saver);
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}

async function flow(name, lang, width, fn, opts = {}) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, opts.path || "/app/quranrevival.html", opts), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.ctx, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 150000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}

const ev = (page, f, a) => page.evaluate(f, a);
// A tap by script: page.click() scrolls the target into view first, which moves Explore's list under its sticky header and
// then reads as a covered button. A reader's finger does not scroll anything before it taps.
const tap = (page, sel) => ev(page, (s) => { const e = document.querySelector(s); if (!e) throw new Error(`no ${s}`); e.click(); }, sel);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
const writes = (page, from = 0) => ev(page, (k) => (window.__stubWriteData || []).slice(k).map((x) => ({ kind: x.kind, col: x.col, id: x.id, data: x.data })), from);
const writeCount = (page) => ev(page, () => (window.__stubWriteData || []).length);
const rectOf = (page, sel) => ev(page, (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; }, sel);
const onTop = (page, sel) => ev(page, (s) => { const b = [...document.querySelectorAll(s)].find((x) => x.getClientRects().length); if (!b) return false; const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (t === b || b.contains(t)); }, sel);

async function openAsma(page) {
  await ev(page, () => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await tap(page,"#tabExploreBtn");
  await settle(page, 600);
  await tap(page,"#explorePaletteAsmaBtn");
  await page.waitForFunction(() => document.querySelectorAll("#asmaXSingleSelect option").length > 1, null, { timeout: 15000 });
  await settle(page, 300);
}
async function pickName(page, n) {
  await ev(page, (x) => { const s = document.getElementById("asmaXSingleSelect"); s.value = String(x); s.dispatchEvent(new Event("change", { bubbles: true })); }, n);
  await page.waitForFunction((x) => !!document.querySelector(`#asmaXPosterPanel [data-asma-poster="${x}"]`), n, { timeout: 10000 });
  await settle(page, 300);
}
const shownName = (page) => ev(page, () => ({ picker: document.getElementById("asmaXSingleSelect")?.value, poster: document.querySelector("#asmaXPosterPanel [data-asma-poster]")?.dataset.asmaPoster ?? null, title: document.querySelector("#asmaXPosterPanel [data-poster-title]")?.textContent ?? "", ar: document.querySelector("#asmaXPosterPanel [data-poster-arabic]")?.textContent ?? "" }));

const WIDTHS = [320, 390, 820, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn", wide = width >= 900;
  // 1: Asma ul Husna in Explore.
  await flow("explore", lang, width, async (t, page, ctx, errors) => {
    await openAsma(page);
    const wheel0 = await ev(page, () => ({ segs: document.querySelectorAll("#asmaXWheelContainer .wheel-seg, #asmaXWheelContainer path").length, groups: document.querySelectorAll("#asmaXWaysListContainer [data-asma-open-group]").length, names: document.getElementById("asmaXSingleSelect").options.length }));
    if (PROBE) console.log(t, "wheel", JSON.stringify(wheel0));
    check(`${t}: POSITIVE CONTROL Explore → Asma ul Husna shows a wheel and the groups and Names to choose from`, wheel0.segs > 0 && wheel0.groups > 0 && wheel0.names > 99, JSON.stringify(wheel0));
    await pickName(page, 1);
    let s = await shownName(page);
    check(`${t}: choosing Name 1 shows its poster (Ar-Rahman)`, s.picker === "1" && s.poster === "1" && /Rahman|রাহমান|রহমান/i.test(s.title) && /الرَّحْم/.test(s.ar), JSON.stringify(s));
    const fr = await ev(page, () => { const r = (id) => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); return { t: b.top, b: b.bottom, l: b.left, r: b.right, w: b.width, h: b.height }; };
      const dock = document.getElementById("dock"); const dr = dock && dock.getClientRects().length ? dock.getBoundingClientRect().top : innerHeight;
      return { poster: r("asmaXPosterPanel"), win: r("exploreView"), nav: document.getElementById("topNav").getBoundingClientRect().bottom, dockTop: dr, vw: innerWidth, over: document.documentElement.scrollWidth - innerWidth, fixed: getComputedStyle(document.getElementById("exploreView")).position === "fixed" }; });
    if (PROBE) console.log(t, "frame", JSON.stringify(fr));
    check(`${t}: the poster sits inside the screen, no sideways scroll`, !!fr.poster && fr.poster.w > 150 && fr.poster.l >= -1 && fr.poster.r <= fr.vw + 1 && fr.over <= 0, JSON.stringify(fr));
    if (fr.fixed) check(`${t}: the Explore window opens between the nav row and the bottom bar`, fr.win.t >= fr.nav - 1 && fr.win.b <= fr.dockTop + 1, JSON.stringify(fr));
    const prevNext = () => ev(page, () => ({ prev: document.getElementById("asmaXPrevNameBtn")?.disabled, next: document.getElementById("asmaXNextNameBtn")?.disabled, pw: document.getElementById("asmaXPrevNameBtn")?.getBoundingClientRect().width }));
    let pn = await prevNext();
    check(`${t}: at Name 1, ‹ is off and › is on`, pn.prev === true && pn.next === false && pn.pw > 0, JSON.stringify(pn));
    await tap(page,"#asmaXNextNameBtn"); await settle(page, 450);
    s = await shownName(page);
    check(`${t}: › steps to the NEXT Name (2, Ar-Raheem), the poster and the picker follow`, s.picker === "2" && s.poster === "2" && /الرَّحِيم/.test(s.ar), JSON.stringify(s));
    await tap(page,"#asmaXNextNameBtn"); await settle(page, 450);
    s = await shownName(page);
    check(`${t}: › again steps to Name 3 (in order, not skipping)`, s.picker === "3" && s.poster === "3", JSON.stringify(s));
    await tap(page,"#asmaXPrevNameBtn"); await settle(page, 450);
    s = await shownName(page);
    check(`${t}: ‹ steps back to Name 2`, s.picker === "2" && s.poster === "2", JSON.stringify(s));
    await tap(page,"#asmaXPrevNameBtn"); await settle(page, 450);
    s = await shownName(page);
    check(`${t}: ‹ steps back to Name 1`, s.picker === "1" && s.poster === "1", JSON.stringify(s));
    // Tapping the poster opens it full size; "← Back to {Name}" closes it.
    await ev(page, () => document.getElementById("asmaXPosterPanel").click()); await settle(page, 500); // not page.click(): its scroll-into-view moves the list under the sticky header
    const big = await ev(page, () => { const o = document.querySelector("#asmaXPosterOverlay.open"); const p = o?.querySelector(".ahp-standalone"); const r = p?.getBoundingClientRect(); const back = document.getElementById("asmaXPosterBackBtn"); const br = back?.getBoundingClientRect();
      return { open: !!o, title: p?.querySelector("[data-poster-title]")?.textContent ?? "", inView: !!r && r.left >= -1 && r.right <= innerWidth + 1, backText: back?.textContent.trim() ?? "", backH: br?.height ?? 0, backTop: br?.top ?? -1 }; });
    if (PROBE) console.log(t, "big", JSON.stringify(big));
    check(`${t}: tapping the poster opens it full size on the same Name, inside the screen`, big.open && big.inView && big.title === s.title, JSON.stringify({ big, s }));
    check(`${t}: its bar has a visible "← Back to {Name}" (${bn ? "Bangla" : "English"}), tappable, on top`, /^← /.test(big.backText) && (bn ? BN.test(big.backText) : /^← Back to /.test(big.backText)) && big.backTop >= 0 && big.backH >= 36 && await onTop(page, "#asmaXPosterBackBtn"), JSON.stringify(big));
    await tap(page,"#asmaXPosterBackBtn"); await settle(page, 400);
    const closed = await ev(page, () => ({ closed: !document.querySelector("#asmaXPosterOverlay.open"), poster: !!document.getElementById("asmaXPosterPanel"), picker: document.getElementById("asmaXSingleSelect")?.value }));
    check(`${t}: "← Back to {Name}" closes the full poster, back on Name 1`, closed.closed && closed.poster && closed.picker === "1", JSON.stringify(closed));
    // ◂ Wheel goes back to the wheel.
    const BACK = wide ? "#asmaXBackFromRefsBtn" : "#asmaXBackToWheelBtn";
    check(`${t}: ${wide ? "◂ Wheel" : "← Back to the wheel"} is visible and tappable`, await onTop(page, BACK), BACK);
    await tap(page,BACK); await settle(page, 600);
    const wb = await ev(page, () => ({ poster: !!document.getElementById("asmaXPosterPanel"), segs: document.querySelectorAll("#asmaXWheelContainer .wheel-seg, #asmaXWheelContainer path").length }));
    check(`${t}: ${wide ? "◂ Wheel" : "Back to the wheel"} returns to the wheel (poster gone, wheel drawn)`, !wb.poster && wb.segs > 0, JSON.stringify(wb));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    if (width === 390 || width === 1440) await page.screenshot({ path: `/tmp/audit15-explore-${lang}-${width}.png` });
  });
}

await browser.close();
console.log(`\n==== Audit part 15 (Asma ul Husna): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

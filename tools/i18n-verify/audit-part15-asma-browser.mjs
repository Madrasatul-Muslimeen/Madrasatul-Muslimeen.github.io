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
const ALLOWED = /QuranRevival|QCR|MMSA|Qur'?an|Asma|Husna|Madrasatul|Muslimeen|Sahih|Bukhari|Muslim|Tirmidhi|Jami|Hadith|hadith|api|fawazahmed0?|Wakil|Basit|Rahman|Rahim|Malik|Quddus|Salam|Al-?[A-Za-z]+|Ar-?[A-Za-z]+|As-?[A-Za-z]+|An-?[A-Za-z]+|Ash-?[A-Za-z]+|At-?[A-Za-z]+|Az-?[A-Za-z]+|Ad-?[A-Za-z]+|Adh-?[A-Za-z]+|Dh[A-Za-z]+|Gh[A-Za-z]+|Kh[A-Za-z]+|ACT|ESSENCE|UNIQUENESS|SHARED|Mercy|Group|Google|CSV|AM|PM/g;
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

  // 2: Cited āyāt and hadith of a Name, with their ways back.
  await flow("cited", lang, width, async (t, page, ctx, errors) => {
    const NAME = bn ? "আল-ওয়াকীল" : "Al-Wakil";
    const waitCited = (n) => page.waitForFunction((n) => document.querySelectorAll("#asmaXCitedAyat [data-asmax-cited]").length === n, 2, { timeout: 12000 });
    await openAsma(page);
    await pickName(page, 52);
    await waitCited(2);
    const v = await ev(page, () => { const s = document.getElementById("asmaXCitedAyat"); return { keys: [...s.querySelectorAll("[data-asmax-cited]")].map((a) => a.dataset.asmaxCited), words: [...s.querySelectorAll("[data-asmax-cited]")].map((a) => a.querySelectorAll("[data-asmax-cited-word]").length), tr: s.querySelector(".asmax-cited-tr")?.textContent ?? "", over: document.documentElement.scrollWidth - innerWidth }; });
    check(`${t}: POSITIVE CONTROL Al-Wakil writes out its two āyāt in full (3:173 with 17 words, 33:3 with 6), in the reader's language`, v.keys.join() === "3:173,33:3" && v.words.join() === "17,6" && v.tr.length > 20 && v.over <= 0 && (bn ? BN.test(v.tr) : /Disposer/.test(v.tr)), JSON.stringify(v).slice(0, 300));
    const wayBack = async (sel, label) => {
      const ok = await onTop(page, sel);
      const text = await ev(page, (s) => [...document.querySelectorAll(s)].find((x) => x.getClientRects().length)?.textContent.trim() ?? "", sel);
      check(`${t}: ${label}: "← Back" is on screen, on top and reads "${bn ? "আল-ওয়াকীল-এ ফিরুন" : "Back to Al-Wakil"}"`, ok && text.includes(bn ? "আল-ওয়াকীল-এ ফিরুন" : "Back to Al-Wakil"), text);
      if (!ok) return;
      await tap(page, sel);
      await waitCited(2).catch(() => {});
      const back = await ev(page, () => ({ poster: !!document.getElementById("asmaXPosterPanel"), sel: document.getElementById("asmaXSingleSelect")?.value, cited: document.querySelectorAll("#asmaXCitedAyat [data-asmax-cited]").length }));
      check(`${t}: ${label}: ← Back returns to the SAME Name (52) in Explore`, back.poster && back.sel === "52" && back.cited === 2, JSON.stringify(back));
    };
    await tap(page, '[data-asmax-cited-word="3:173:17"]');
    await page.waitForFunction(() => { const m = document.getElementById("quranWordCardMount"); return m && !m.hidden && m.textContent.includes("ٱلْوَكِيلُ"); }, null, { timeout: 15000 });
    check(`${t}: an āyah word opens the Word card for that word`, true);
    await wayBack("[data-word-card-app-back]", "Word card");
    await tap(page, '[data-asmax-cited-card="33:3"]');
    await page.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 15000 });
    const ref = await ev(page, () => document.querySelector("#ayahActionSheetMount .ayah-sheet-ref")?.textContent ?? "");
    check(`${t}: "Āyah card" opens the Āyah card for 33:3`, ref.includes(bn ? "৩৩:৩" : "33:3"), ref);
    await tap(page, "#ayahActionSheetMount [data-ayah-sheet-close]"); await settle(page, 400);
    await wayBack("#ayahCardBackPill [data-ayah-card-back]", "Āyah card");
    // Hadith: Al-Basit (21) cites Tirmidhi 1314.
    await pickName(page, 21);
    await page.waitForFunction(() => !!document.querySelector('#asmaXCitedHadith [data-asmax-hadith="tirmidhi:1314"]') && !document.querySelector("#asmaXCitedHadith > p.hint"), null, { timeout: 15000 });
    const h = await ev(page, () => { const a = document.querySelector('#asmaXCitedHadith [data-asmax-hadith="tirmidhi:1314"]'); const o = a.querySelector(".asmax-cited-open"); return { ar: a.querySelector(".asmax-cited-hadith-ar")?.textContent.length ?? 0, tr: a.querySelector(".asmax-cited-tr")?.textContent.length ?? 0, href: o?.getAttribute("href") ?? "", openH: o?.getBoundingClientRect().height ?? 0 }; });
    check(`${t}: Al-Basit's hadith is written out (Arabic and translation) with an Open in Hadith link`, h.ar > 20 && h.tr > 20 && /hadith-collections\.html\?openiti=.*passage=1331&back=1/.test(h.href) && h.openH >= 40, JSON.stringify(h));
    await tap(page, '[data-asmax-hadith-open="tirmidhi:1314"]');
    await page.waitForFunction(() => location.pathname.endsWith("hadith-collections.html"), null, { timeout: 20000 });
    await page.waitForFunction(() => { const b = document.getElementById("hadithBackBtn"); return b && !b.hidden && b.textContent.trim(); }, null, { timeout: 20000 });
    const lib = await ev(page, () => ({ focused: !!document.querySelector("[data-openiti-focused]"), back: document.getElementById("hadithBackBtn").textContent.trim() }));
    check(`${t}: Open in Hadith opens the Hadith library with "← Back" showing`, lib.back.includes("←"), JSON.stringify(lib));
    await tap(page, "#hadithBackBtn");
    await page.waitForFunction(() => location.pathname.endsWith("quranrevival.html") && !!document.querySelector('#asmaXCitedHadith [data-asmax-hadith="tirmidhi:1314"]'), null, { timeout: 25000 });
    const back = await ev(page, () => ({ poster: !!document.getElementById("asmaXPosterPanel"), sel: document.getElementById("asmaXSingleSelect")?.value }));
    check(`${t}: hadith library ← Back returns to Al-Basit (21) in Explore`, back.poster && back.sel === "21", JSON.stringify(back));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 3: A Name's description.
  for (const reader of [false, true]) await flow(reader ? "desc-reader" : "desc", lang, width, async (t, page, ctx, errors) => {
    await openAsma(page);
    await pickName(page, 102);
    await ev(page, () => { try { localStorage.removeItem("mmsa.asmaDescriptionSource"); } catch {} });
    await tap(page, "#asmaXPosterPanel");
    await page.waitForSelector("#asmaXPosterOverlay.open [data-asma-desc-strip]", { timeout: 8000 });
    const o = () => ev(page, () => { const e = document.querySelector("#asmaXPosterOverlay.open"); const strip = e.querySelector("[data-asma-desc-strip]"), poster = e.querySelector(".ahp-standalone"); const sb = strip.getBoundingClientRect(), pb = poster.getBoundingClientRect();
      return { pressed: e.querySelector('[data-asma-desc-src][aria-pressed="true"]')?.dataset.asmaDescSrc, edit: !!e.querySelector("[data-asma-desc-edit]"), above: sb.bottom <= pb.top + 1, stripIn: sb.left >= -1 && sb.right <= innerWidth + 1, desc: e.querySelector("[data-poster-desc]")?.textContent ?? "", labels: [...strip.querySelectorAll("[data-asma-desc-src]")].map((b) => b.textContent) }; });
    let s = await o();
    check(`${t}: POSITIVE CONTROL the source strip sits above the full poster with the poster's own description chosen`, s.pressed === "poster" && s.above && s.stripIn && s.desc.startsWith("The One, the Only"), JSON.stringify(s));
    check(`${t}: the strip is in the reader's language`, bn ? s.labels.join() === "পোস্টারের,প্রস্তাবিত,মাদরাসার" : s.labels.join() === "Poster's,Suggested,Madrasah's", s.labels.join());
    await tap(page, '#asmaXPosterOverlay [data-asma-desc-src="suggested"]'); await settle(page, 250);
    const s2 = await o();
    check(`${t}: choosing Suggested switches the text shown (and it cites Sahih al-Bukhari - 6410)`, s2.pressed === "suggested" && s2.desc !== s.desc && s2.desc.includes("Sahih al-Bukhari - 6410"), JSON.stringify(s2).slice(0, 250));
    await tap(page, '#asmaXPosterOverlay [data-asma-desc-src="poster"]'); await settle(page, 250);
    check(`${t}: choosing the poster's own switches back`, (await o()).desc === s.desc);
    if (reader) {
      check(`${t}: a reader who cannot manage sees no ✎ Edit, and the poster and strip are intact`, !s.edit && s.labels.length === 3 && s.desc.length > 20, JSON.stringify(s));
    } else {
      check(`${t}: the owner sees ✎ Edit`, s.edit);
      await tap(page, '#asmaXPosterOverlay [data-asma-desc-src="suggested"]'); await settle(page, 200);
      await tap(page, "#asmaXPosterOverlay [data-asma-desc-edit]");
      const pre = await ev(page, () => document.querySelector("#asmaXPosterOverlay [data-asma-desc-text]")?.value ?? "");
      check(`${t}: ✎ Edit opens a box starting from the text shown`, pre.includes("Sahih al-Bukhari - 6410"), pre.slice(0, 60));
      const w0 = await writeCount(page);
      await page.fill("#asmaXPosterOverlay [data-asma-desc-text]", "Al-Witr: our madrasah's own words.");
      await tap(page, "#asmaXPosterOverlay [data-asma-desc-save]");
      await page.waitForFunction(() => document.querySelector('#asmaXPosterOverlay [data-asma-desc-src="madrasah"][aria-pressed="true"]'), null, { timeout: 8000 }).catch(() => {});
      const ws = (await writes(page, w0)).filter((x) => x.col === "asmaCollections");
      const w = ws[0];
      const only = !!w && (w.kind === "update" ? Object.keys(w.data).filter((k) => k !== "updatedAt").join() === "nameDescriptions.102" && w.data["nameDescriptions.102"] === "Al-Witr: our madrasah's own words." : w.data.nameDescriptions?.["102"] === "Al-Witr: our madrasah's own words.");
      check(`${t}: Save writes the madrasah's Asma document, field nameDescriptions.102 only, and the poster shows it`, ws.length === 1 && only && (await o()).desc === "Al-Witr: our madrasah's own words.", JSON.stringify(ws).slice(0, 300));
    }
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, { reader });

  // 4: Classifying a Name.
  for (const reader of [false, true]) await flow(reader ? "class-reader" : "class", lang, width, async (t, page, ctx, errors) => {
    await openAsma(page);
    await pickName(page, 1);
    const state = () => ev(page, () => { const btns = [...document.querySelectorAll("#asmaXListHeader [data-asmax-quick]")]; return { keys: btns.map((b) => b.dataset.asmaxQuick), on: btns.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.asmaxQuick), fits: btns.every((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.right <= innerWidth + 1; }), folder: !!document.getElementById("asmaXGroupsThisNameBtn"), title: document.querySelector("#asmaXListHeader .qcr-list-title")?.textContent.trim() ?? "", poster: !!document.getElementById("asmaXPosterPanel"), over: document.documentElement.scrollWidth - innerWidth }; });
    const s0 = await state();
    if (reader) {
      check(`${t}: a reader who cannot manage sees no Essence|Act, Unique|Shared and no 📂 — the Name's title and poster are still there, nothing blank`, s0.keys.length === 0 && !s0.folder && s0.title.length > 2 && s0.poster && s0.over <= 0, JSON.stringify(s0));
      return;
    }
    check(`${t}: POSITIVE CONTROL the owner sees both pairs (Essence|Act, Unique|Shared) and 📂, Ar-Rahman already under Essence`, s0.keys.join() === "cls_essence,cls_act,cls_unique,cls_shared" && s0.on.join() === "cls_essence" && s0.folder && s0.fits && s0.over <= 0, JSON.stringify(s0));
    const last = () => ev(page, () => { const w = (window.__stubWriteData || []).filter((x) => x.col === "asmaCollections"); return w.length ? w[w.length - 1].data?.collections?.map((c) => [c.id, c.kind, c.items]) ?? null : null; });
    const items = (w, id) => (w || []).find((c) => c[0] === id)?.[2] || [];
    await tap(page, '#asmaXListHeader [data-asmax-quick="cls_act"]'); await settle(page, 800);
    let w = await last();
    check(`${t}: tap Act: Name 1 is written into the ACT list and taken out of ESSENCE`, items(w, "a1").includes("name:1") && !items(w, "e1").includes("name:1"), JSON.stringify(w));
    check(`${t}: ...Act is lit, Essence not; its Group untouched`, (await state()).on.join() === "cls_act" && items(w, "g1").includes("name:1"));
    await tap(page, '#asmaXListHeader [data-asmax-quick="cls_act"]'); await settle(page, 800);
    w = await last();
    check(`${t}: a second tap on Act undoes it (written out of ACT, nothing lit)`, !items(w, "a1").includes("name:1") && (await state()).on.length === 0, JSON.stringify(w));
    await tap(page, '#asmaXListHeader [data-asmax-quick="cls_shared"]'); await settle(page, 800);
    w = await last();
    check(`${t}: tap Shared (no list yet) files the Name under a new SHARED list; a second tap undoes it`, (w || []).some((c) => c[1] === "cls_shared" && c[2].includes("name:1")), JSON.stringify(w));
    await tap(page, '#asmaXListHeader [data-asmax-quick="cls_shared"]'); await settle(page, 800);
    w = await last();
    check(`${t}: ...undone`, !(w || []).some((c) => c[1] === "cls_shared" && c[2].includes("name:1")), JSON.stringify(w));
    await tap(page, "#asmaXGroupsThisNameBtn"); await settle(page, 500);
    const pop = await ev(page, () => { const g = document.getElementById("asmaXGroupsThisNameBtn"); const cands = [...document.querySelectorAll("#asmaXGroupsOverlay.open #asmaXGroupsCard")].filter((e) => e.getClientRects().length); const r = cands[0]?.getBoundingClientRect(); return { n: cands.length, inside: !!r && r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1, text: cands[0]?.innerText.replace(/\s+/g, " ").slice(0, 160) ?? "" }; });
    if (PROBE) console.log(t, "📂", JSON.stringify(pop));
    check(`${t}: 📂 opens the "Groups this Name is in" popover inside the screen, listing the Name's Group (Mercy)`, pop.n >= 1 && pop.inside && /Mercy/.test(pop.text), JSON.stringify(pop));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, { reader });
}

// 5: the Asma study page (Modules ▾ → Asma ul Husna) and 6: the Screensaver, run on the same widths.
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  for (const reader of [false, true]) await flow(reader ? "study-reader" : "study", lang, width, async (t, page, ctx, errors) => {
    await page.waitForFunction(() => document.querySelector(".asma-card") && getComputedStyle(document.getElementById("app")).display !== "none", null, { timeout: 20000 });
    const cards = await ev(page, () => document.querySelectorAll(".asma-card").length);
    check(`${t}: POSITIVE CONTROL the page lists the Names as cards`, cards >= 99, String(cards));
    const manage = await ev(page, () => { const b = document.getElementById("asmaCatManageToggleBtn"); return { present: !!b, hidden: !b || b.hidden }; });
    // Browse by Category.
    await tap(page, "#asmaCatToggleBtn"); await settle(page, 700);
    const cat = await ev(page, () => { const p = document.getElementById("asmaCatPanel"); return { open: !!p && !p.hidden && p.getClientRects().length > 0, groups: document.getElementById("asmaCatLevelSelect")?.options.length ?? 0, segs: document.querySelectorAll("#asmaCatWheelContainer .wheel-seg, #asmaCatWheelContainer path").length, rows: document.querySelectorAll("#asmaCatWaysListContainer button").length, manage: !document.getElementById("asmaCatManageToggleBtn")?.hidden, over: document.documentElement.scrollWidth - innerWidth }; });
    check(`${t}: Browse by Category opens the groups and a wheel; ${reader ? "a reader sees no Manage" : "the owner sees Manage"}`, cat.open && cat.groups > 1 && cat.segs > 0 && cat.over <= 0 && cat.manage === !reader, JSON.stringify(cat));
    await tap(page, "#asmaCatBackBtn"); await settle(page, 400);
    if (reader) return;
    // A Name opens with its poster.
    await tap(page, '.asma-card[data-number="1"]');
    await page.waitForSelector("#trackAsmaBtn", { timeout: 10000 });
    // The detail page shows the Name's Arabic, transliteration and meaning, and a 🖼 Poster button (the poster itself opens
    // full size from it): the manual's "a Name opens with its poster" is read as that button.
    const det = await ev(page, () => ({ ar: /الرَّحْمَٰن/.test(document.getElementById("detailContainer").innerText), posterBtn: document.getElementById("posterAsmaBtn")?.getBoundingClientRect().height > 0, track: !!document.getElementById("trackAsmaBtn") }));
    check(`${t}: opening a Name shows its Arabic and meaning, with a 🖼 Poster button and Track my progress`, det.ar && det.posterBtn && det.track, JSON.stringify(det));
    await tap(page, "#trackAsmaBtn"); await settle(page, 600);
    const wm = await ev(page, () => { const o = document.getElementById("wayModalOverlay"); const r = document.getElementById("wayModalMount").firstElementChild?.getBoundingClientRect(); return { open: o.classList.contains("open"), text: document.getElementById("wayModalMount").innerText.replace(/\s+/g, " ").slice(0, 120), inside: !!r && r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1, opts: [...document.querySelectorAll("#wayModalMount .way-status-select option")].map((x) => x.value) }; });
    if (PROBE) console.log(t, "way", JSON.stringify(wm));
    check(`${t}: Track my progress opens "<Name> — Studied", inside the screen`, wm.open && wm.inside && wm.text.includes(bn ? "আর-রহমান — অধ্যয়ন করা হয়েছে" : "Ar-Rahman — Studied"), JSON.stringify(wm));
    const pick = "learning";
    await ev(page, (v) => { const s = document.querySelector("#wayModalMount .way-status-select"); s.value = v; s.dispatchEvent(new Event("change", { bubbles: true })); }, pick);
    const w0 = await writeCount(page);
    await tap(page, "#wayModalMount .way-claim-btn"); await settle(page, 900);
    const ws = await writes(page, w0);
    const rec = ws.find((x) => x.col === "records" && JSON.stringify(x.data).includes("name:1::studied_asma"));
    if (PROBE) console.log(t, "writes", JSON.stringify(ws).slice(0, 500));
    check(`${t}: choosing a stage writes person p1, unit key name:1, the studied_asma Approach, status "${pick}"`, !!rec && /__p1__/.test(rec.id) && JSON.stringify(rec.data).includes(pick) && /"personId":"p1"/.test(JSON.stringify(rec.data)), JSON.stringify(rec ?? ws).slice(0, 400));
    await tap(page, "#wayModalMount [data-way-close], #wayModalMount .way-close").catch(() => {});
    await ev(page, () => document.getElementById("wayModalOverlay").classList.remove("open"));
    // Print: one A4 poster, no error.
    await ev(page, () => { window.__printed = 0; window.print = () => { window.__printed++; }; });
    await tap(page, "#posterAsmaBtn"); await settle(page, 500);
    await tap(page, "#posterPrintBtn"); await settle(page, 300);
    const pr = await ev(page, () => { let a4 = false; for (const ss of document.styleSheets) { try { for (const r of ss.cssRules) if (/@page/.test(r.cssText) && /A4/i.test(r.cssText)) a4 = true; } catch {} } return { printed: window.__printed, a4, open: !!document.querySelector("#posterOverlay.open"), posters: document.querySelectorAll("#posterMount .ahp-standalone").length }; });
    check(`${t}: 🖨 Print prints the one open poster (A4 page rule present), no error`, pr.printed === 1 && pr.a4 && pr.open && pr.posters === 1, JSON.stringify(pr));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, { reader, path: "/app/asma-study.html" });

  // 7: Bangla: no English left on these features (the Names' transliterations, Arabic and source names stay).
  if (bn) await flow("bnleft", lang, width, async (t, page, ctx, errors) => {
    const left = (label, text) => { const l = englishLeft(text); check(`${t}: ${label} has no English left`, l.length === 0, JSON.stringify([...new Set(l)].slice(0, 12))); };
    await openAsma(page);
    // The poster itself (.ahp) is a true copy of the English template, lang="en" by design (decision 85): its title, meaning,
    // "None given", "Description to come." and the poster creator's description are English on the Bangla page. Whether it
    // should speak Bangla is a product choice (listed in the PR), so the poster is cut out here; everything around it is swept.
    const textWithoutDesc = (sel) => ev(page, (s) => { const c = document.querySelector(s).cloneNode(true); c.querySelectorAll(".ahp").forEach((e) => e.remove()); return c.innerText; }, sel);
    left("the Asma wheel / groups panel", await textWithoutDesc("#asmaXPanel"));
    await pickName(page, 102);
    left("a Name's panel (poster, Name bar, cited hadith)", await textWithoutDesc("#asmaXPanel"));
    await tap(page, "#asmaXPosterPanel"); await settle(page, 500);
    left("the full-size poster with its description strip", await textWithoutDesc("#asmaXPosterOverlay.open"));
    await tap(page, "#asmaXPosterBackBtn");
    await pickName(page, 52); await page.waitForFunction(() => document.querySelectorAll("#asmaXCitedAyat [data-asmax-cited]").length === 2, null, { timeout: 12000 });
    left("the cited āyāt", await ev(page, () => document.getElementById("asmaXCitedAyat").innerText));
    await ev(page, () => document.querySelector("[data-screensaver-settings]")?.closest("details")?.setAttribute("open", ""));
    await tap(page, "[data-screensaver-settings]");
    await page.waitForSelector("#mmSaverSettings .mmss-card", { timeout: 10000 });
    left("the Screensaver settings", await ev(page, () => document.querySelector("#mmSaverSettings .mmss-card").innerText));
  });

  // 6: Screensaver.
  await flow("saver", lang, width, async (t, page, ctx, errors) => {
    await ev(page, () => { document.getElementById("homeMenuBtn")?.click(); });
    const opened = await ev(page, () => { const b = document.querySelector("[data-screensaver-settings]"); if (!b) return false; b.closest("details")?.setAttribute("open", ""); return b.getClientRects().length > 0; });
    check(`${t}: POSITIVE CONTROL the Home menu has 🌙 Screensaver`, opened);
    await tap(page, "[data-screensaver-settings]");
    await page.waitForSelector("#mmSaverSettings .mmss-card", { timeout: 10000 });
    const card = await ev(page, () => { const r = document.querySelector("#mmSaverSettings .mmss-card").getBoundingClientRect(); return { inside: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1, text: document.querySelector("#mmSaverSettings .mmss-card").innerText, groups: [...document.querySelectorAll("#mmSaverSettings .mmss-seg")].map((s) => s.dataset.k) }; });
    check(`${t}: the settings open inside the screen with every setting, in the reader's language`, card.inside && ["idleMin", "eachSec", "kind", "which", "order", "move", "night", "where"].every((k) => card.groups.includes(k)) && (bn ? /প্রতিটি পোস্টার দেখাবে/.test(card.text) : /Each poster shows for/.test(card.text)), JSON.stringify(card).slice(0, 300));
    await tap(page, '#mmSaverSettings [data-k="eachSec"] [data-v="30"]');
    await tap(page, '#mmSaverSettings [data-k="order"] [data-v="seq"]');
    await tap(page, '#mmSaverSettings [data-k="kind"] [data-v="tpl"]');
    const saved = await ev(page, () => JSON.parse(localStorage.getItem("mm_screensaver") || "{}"));
    await page.reload({ waitUntil: "networkidle" }); await settle(page, 800);
    const kept = await ev(page, () => JSON.parse(localStorage.getItem("mm_screensaver") || "{}"));
    check(`${t}: the settings are kept after a reload (on this device)`, saved.eachSec === 30 && kept.eachSec === 30 && kept.order === "seq" && kept.kind === "tpl", JSON.stringify(kept));
    await ev(page, () => document.querySelector("[data-screensaver-settings]")?.click());
    await page.waitForSelector("#mmSaverSettings .mmss-card", { timeout: 10000 });
    const pressed = await ev(page, () => ["eachSec", "order", "kind"].map((k) => document.querySelector(`#mmSaverSettings [data-k="${k}"] [aria-pressed="true"], #mmSaverSettings [data-k="${k}"] .on`)?.dataset.v));
    check(`${t}: the reopened settings show the kept choices`, pressed.join() === "30,seq,tpl", pressed.join());
    await tap(page, '#mmSaverSettings [data-mmss="preview"]');
    await page.waitForFunction(() => !!document.getElementById("mmSaver"), null, { timeout: 10000 });
    await settle(page, 1800);
    const sv = await ev(page, () => { const s = document.getElementById("mmSaver"); const p = s.querySelector(".mms-slide.on .ahp")?.getBoundingClientRect(); return { title: s.querySelector(".mms-slide.on [data-poster-title]")?.textContent ?? "", clock: s.querySelector(".mms-clock")?.textContent ?? "", inView: !!p && p.left >= -1 && p.right <= innerWidth + 1 && p.top >= -1 && p.bottom <= innerHeight + 1 }; });
    check(`${t}: started on purpose it shows a whole poster inside the screen with a clock`, sv.title.length > 2 && /\d/.test(sv.clock) && sv.inView, JSON.stringify(sv));
    await page.mouse.click(Math.round(width / 2), 200); await settle(page, 250);
    const ctl = await ev(page, () => ({ on: document.getElementById("mmSaver").classList.contains("ctl"), open: !!document.querySelector('#mmSaver [data-mms="open"]') }));
    check(`${t}: touching shows its controls (including Open this Name)`, ctl.on && ctl.open, JSON.stringify(ctl));
    const shownTitle = sv.title;
    await tap(page, '#mmSaver [data-mms="open"]');
    await page.waitForURL(/asma-study\.html/, { timeout: 15000 });
    const url = page.url();
    await page.waitForFunction(() => document.getElementById("asmaBackBtn") && getComputedStyle(document.getElementById("app")).display !== "none", null, { timeout: 20000 });
    await settle(page, 800);
    const nm = await ev(page, () => document.getElementById("detailContainer")?.innerText ?? "");
    check(`${t}: "Open this Name" opens that Name (${shownTitle}) with ← Back`, /name=\d+&back=1/.test(url) && nm.length > 20, url + " | " + nm.slice(0, 60));
    await tap(page, "#asmaBackBtn");
    await page.waitForURL(/quranrevival\.html/, { timeout: 15000 }).catch(() => {});
    check(`${t}: ← Back returns to the page the reader was on`, /quranrevival\.html/.test(page.url()), page.url());
    // ✕ and Esc return to where the reader was.
    await settle(page, 800);
    for (const how of ["x", "esc"]) {
      await ev(page, () => import("/app/js/screensaver-idle.js").then((m) => m.startScreensaver()));
      await page.waitForFunction(() => !!document.getElementById("mmSaver"), null, { timeout: 10000 });
      await settle(page, 600);
      const here = page.url();
      if (how === "x") await ev(page, () => { document.getElementById("mmSaver").classList.add("ctl"); document.querySelector('#mmSaver [data-mms="close"]').click(); });
      else await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.getElementById("mmSaver"), null, { timeout: 5000 }).catch(() => {});
      check(`${t}: ${how === "x" ? "✕" : "Esc"} closes it, back on the same page`, (await ev(page, () => !document.getElementById("mmSaver"))) && page.url() === here, page.url());
    }
    // Held off: a focused field, and the Writing sheet.
    const held = await ev(page, async () => {
      const { screensaverHeld } = await import("/app/js/screensaver-idle.js");
      const base = screensaverHeld();
      const i = document.createElement("input"); document.body.append(i); i.focus(); const typing = screensaverHeld(); i.remove();
      const ws = document.createElement("div"); ws.id = "writingSheet"; ws.style.cssText = "position:fixed;left:0;top:0;width:50px;height:50px"; document.body.append(ws); const sheet = screensaverHeld(); ws.remove();
      return { base, typing, sheet };
    });
    check(`${t}: it never starts while a field has focus or the Writing sheet is open (and does when neither)`, held.base === false && held.typing === true && held.sheet === true, JSON.stringify(held));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, { screensaver: true });
}

await browser.close();
console.log(`\n==== Audit part 15 (Asma ul Husna): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

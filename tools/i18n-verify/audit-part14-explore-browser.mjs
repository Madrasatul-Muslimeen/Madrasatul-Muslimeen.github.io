// Audit part 14 (PCF J29, manual audit, #875): the User Manual's "Qur'an: Explore" features, each one WORKING.
// Measured on the rendered page at 390 / 820 / 1440 (and 320 for anything that opens a window or card), English and Bangla.
// The result is asserted, not the element: a repainted segment colour, a stored write (window.__stubWriteData), a returned-to view.
//   1 Explore the Qur'an (drill, views, Back, ‹ ›, full screen, Word by Word)   2 Track the status of Approaches (picker, All/One)
//   3 Take ▸ from Explore (sheet, Record write, repaint, way back)   4 QCR collections (open, read + back, attach, manage, add āyah)
//   5 Bangla: no English left on these features
// Each flow has a POSITIVE CONTROL and a timeout that fails by name. Mutations: --mutate=<name> restores a defect.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part14-explore-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
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
const MUTATIONS = {
  // Explore's ▾ Approach list options were 31px tall.
  "optsize": ["app/quranrevival.html", "**/quranrevival.html*", "    min-height: 40px; /* audit14: 31px was too small for a finger */\n", ""],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);

// At-Takwir (81) ayah 3: memorise Achieved, recite Practising; ayah 5: memorise Mastered. Both owned by p1 (the signed-in person).
const claim = (tid, st) => `{ unitType: "ayah", subjectId: "quran", trackableId: "${tid}", claimedStatus: "${st}", confirmedStatus: null, confirmState: "pending" }`;
const SEED = `
window.__stubApplyBatches = true;
DATA.records.push({ _id: TENANT_ID + "__p1__surah_81", tenantId: TENANT_ID, personId: "p1", chunkKey: "surah_81", entries: {
  "ayah:81:3::memorise": ${claim("memorise", "achieved")},
  "ayah:81:3::recite": ${claim("recite", "practising")},
  "ayah:81:5::memorise": ${claim("memorise", "mastered")},
} });`;
const browser = await chromium.launch();
const bnDigits = (s) => String(s).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
const refText = (lang, s) => (lang === "bn" ? bnDigits(s) : s);
// English words that may stay on a Bangla page: the app's own names and source names.
const ALLOWED = /QuranRevival|QCR|MMSA|Qur'?an|Hifz|Tajweed|Tadabbur|CSV|Google|Mushaf|Asma|Hizb|Juz|Ruku|Ayah|Surah|Madrasatul|Muslimeen|Al-?[A-Za-z]+|Faatiha|Naẓar|Tafakkur|Tafaqquh|Tadhakkur|Fahm/g;
const englishLeft = (text) => (String(text).replace(ALLOWED, " ").match(/[A-Za-z]{3,}/g) || []);

async function open(lang, width, pagePath = "/app/quranrevival.html") {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}

async function flow(name, lang, width, fn, pagePath) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, pagePath), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.ctx, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 120000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}

const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
const writes = (page, from = 0) => ev(page, (k) => (window.__stubWriteData || []).slice(k).map((x) => ({ col: x.col, id: x.id, data: x.data })), from);
const writeCount = (page) => ev(page, () => (window.__stubWriteData || []).length);
const inside = (r, vw, vh) => !!r && r.width > 0 && r.left >= -1 && r.right <= vw + 1 && r.top >= -1 && r.bottom <= vh + 1;
const rectOf = (page, sel) => ev(page, (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; }, sel);

async function openExplore(page) {
  await ev(page, () => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await page.click("#tabExploreBtn");
  await page.waitForFunction(() => !!document.querySelector("#exploreWheelContainer svg"), null, { timeout: 15000 });
  await settle(page, 300);
}
// A real click on a wheel segment (the segments are SVG paths; the harness dispatches the same MouseEvent the wheel listens for).
const clickSeg = (page, key, kind) => ev(page, ([k, kd]) => { const s = [...document.querySelectorAll("#exploreWheelContainer .wheel-seg")].find((x) => x.dataset.key === k && (!kd || x.dataset.ringKind === kd)); if (!s) return false; s.dispatchEvent(new MouseEvent("click", { bubbles: true })); return true; }, [String(key), kind || null]);
const crumbs = (page) => ev(page, () => [...document.querySelectorAll("#exploreBreadcrumb .explore-crumb")].map((c) => c.textContent.trim()));
const gotoSurah = async (page, n) => { await clickSeg(page, n, "surah"); await page.waitForFunction(() => !!document.querySelector(".aa-wheel, #exploreModeRow button"), null, { timeout: 15000 }); await settle(page, 400); };
const segFill = (page, key) => ev(page, (k) => { const s = [...document.querySelectorAll("#exploreWheelContainer .wheel-seg")].find((x) => x.dataset.key === k); const p = s && (s.matches("path") ? s : s.querySelector("path")); return p ? getComputedStyle(p).fill : null; }, String(key));

const WIDTHS = [320, 390, 820, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
for (const lang of LANGS) for (const width of WIDTHS) {
  const vh = width > 600 ? 900 : 844;
  // 1: Explore the Qur'an.
  await flow("drill", lang, width, async (t, page, ctx, errors) => {
    await openExplore(page);
    let c = await crumbs(page);
    const whole = await ev(page, () => ({ juz: [...document.querySelectorAll("#exploreWheelContainer .wheel-seg")].filter((s) => s.dataset.ringKind === "juz").length, surah: [...document.querySelectorAll("#exploreWheelContainer .wheel-seg")].filter((s) => s.dataset.ringKind === "surah").length }));
    if (PROBE) console.log(t, JSON.stringify({ c, whole }));
    check(`${t}: POSITIVE CONTROL the wheel opens at the Whole Quran with 30 Juz and 114 Surah segments`, c.length === 1 && whole.juz === 30 && whole.surah === 114, JSON.stringify({ c, whole }));
    // The Juz / Surahs / Hizb views change what the wheel and its list show.
    const view = async (id) => { await ev(page, (i) => document.getElementById(i).click(), id); await settle(page, 700); return ev(page, () => ({ segs: document.querySelectorAll("#exploreWheelContainer .wheel-seg").length, side: document.querySelector("#exploreSidebarContainer")?.innerText.replace(/\s+/g, " ").slice(0, 40) ?? "", pressed: [...document.querySelectorAll("#exploreViewToggle button")].filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.id).join() })); };
    const vJ = await view("exploreViewPrimaryBtn"), vS = await view("exploreViewSurahsBtn"), vH = await view("exploreViewHizbBtn");
    if (PROBE) console.log(t, "wholeviews", JSON.stringify([vJ, vS, vH]));
    check(`${t}: Whole Quran, Juz view lists the Juz and marks its button pressed`, vJ.side.includes(refText(lang, "1")) && vJ.pressed === "exploreViewPrimaryBtn", JSON.stringify(vJ));
    check(`${t}: Whole Quran, Surahs view lists the Surahs (a different list)`, vS.side !== vJ.side && vS.pressed === "exploreViewSurahsBtn", JSON.stringify([vJ.side, vS.side]));
    check(`${t}: Whole Quran, Hizb view draws the 60 Hizb`, vH.segs === 60 && vH.pressed === "exploreViewHizbBtn", JSON.stringify(vH));
    await view("exploreViewSurahsBtn");
    // Juz
    await clickSeg(page, 1, "juz"); await settle(page, 700);
    c = await crumbs(page);
    const views = await ev(page, () => [...document.querySelectorAll("#exploreViewToggle button")].filter((b) => !b.hidden).map((b) => [b.dataset.view || "", b.getAttribute("aria-pressed")]));
    if (PROBE) console.log(t, "juz", JSON.stringify({ c, views }));
    check(`${t}: tapping Juz 1 drills into it (breadcrumb Whole Quran > Juz 1)`, c.length === 2 && c[1].includes(refText(lang, "1")), JSON.stringify(c));
    // Pages / Surahs views switch
    const segsOf = () => ev(page, () => [...new Set([...document.querySelectorAll("#exploreWheelContainer .wheel-seg")].map((s) => s.dataset.ringKind))].join());
    const before = await segsOf();
    await ev(page, () => document.getElementById("exploreViewSurahsBtn").click()); await settle(page, 600);
    const pressed = await ev(page, () => [document.getElementById("exploreViewPrimaryBtn").getAttribute("aria-pressed"), document.getElementById("exploreViewSurahsBtn").getAttribute("aria-pressed")]);
    const after = await segsOf();
    if (PROBE) console.log(t, "views", before, after, pressed);
    check(`${t}: the Surahs view button switches the view (pressed state flips)`, pressed.join() === "false,true", JSON.stringify(pressed));
    await ev(page, () => document.getElementById("exploreViewPrimaryBtn").click()); await settle(page, 600);
    check(`${t}: the Pages view button switches back`, (await ev(page, () => document.getElementById("exploreViewPrimaryBtn").getAttribute("aria-pressed"))) === "true");
    // Back to the Whole Quran through the breadcrumb
    await ev(page, () => document.querySelector("#exploreBreadcrumb .explore-crumb").click()); await settle(page, 600);
    check(`${t}: the first breadcrumb returns to the Whole Quran`, (await crumbs(page)).length === 1);
    // Surah -> Back / next / prev
    await gotoSurah(page, 2);
    c = await crumbs(page);
    const nav = await ev(page, () => [...document.querySelectorAll("#exploreNavBar [data-aa]")].map((b) => [b.dataset.aa, b.disabled, b.getBoundingClientRect().height, b.getBoundingClientRect().right]));
    if (PROBE) console.log(t, "surah", JSON.stringify({ c, nav }));
    check(`${t}: tapping Al-Baqara opens the Surah (crumb, ← Back, ‹ ›), every nav button >=40px high and on screen`, c.length === 2 && nav.map((n) => n[0]).join() === "back,prev-surah,next-surah" && nav.every((n) => n[2] >= 40 && n[3] <= width + 1), JSON.stringify({ c, nav }));
    await ev(page, () => document.querySelector('#exploreNavBar [data-aa="next-surah"]').click()); await settle(page, 700);
    const c3 = await crumbs(page);
    check(`${t}: › moves to the next Surah (Aal-i-Imraan)`, c3.length === 2 && c3[1] !== c[1], JSON.stringify(c3));
    await ev(page, () => document.querySelector('#exploreNavBar [data-aa="prev-surah"]').click()); await settle(page, 700);
    check(`${t}: ‹ moves back to Al-Baqara`, (await crumbs(page))[1] === c[1]);
    await ev(page, () => document.querySelector('#exploreNavBar [data-aa="back"]').click()); await settle(page, 700);
    check(`${t}: ← Back returns to the Whole Quran`, (await crumbs(page)).length === 1 && (await ev(page, () => document.getElementById("exploreNavBar").hidden)));
    // Surah 1 has no previous
    await gotoSurah(page, 1);
    check(`${t}: Al-Faatiha's ‹ is disabled (nothing before it)`, await ev(page, () => document.querySelector('#exploreNavBar [data-aa="prev-surah"]').disabled));
    // ayah level
    await ev(page, () => { const s = document.querySelector(".aa-wheel .wheel-seg, #exploreWheelContainer .wheel-seg"); s.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await settle(page, 700);
    const ay = await ev(page, () => ({ nav: [...document.querySelectorAll("#exploreNavBar [data-aa]")].map((b) => b.dataset.aa).join(), ar: !!document.querySelector("[data-aa-ayah] .aa-ayah-ar")?.textContent.trim(), crumbs: document.querySelectorAll("#exploreBreadcrumb .explore-crumb").length }));
    if (PROBE) console.log(t, "ayah", JSON.stringify(ay));
    check(`${t}: tapping an Āyah slice opens the Āyah (its Arabic, ← Surah / ‹ ›)`, ay.nav === "up,ayah-prev,ayah-next" && ay.ar && ay.crumbs === 3, JSON.stringify(ay));
    await ev(page, () => document.querySelector('#exploreNavBar [data-aa="ayah-next"]').click()); await settle(page, 600);
    const crumbAyah = await crumbs(page);
    await ev(page, () => document.querySelector('#exploreNavBar [data-aa="ayah-prev"]').click()); await settle(page, 600);
    check(`${t}: › and ‹ move between Āyāt`, (await crumbs(page))[2] !== crumbAyah[2], JSON.stringify([crumbAyah, await crumbs(page)]));
    await ev(page, () => document.querySelector('#exploreNavBar [data-aa="up"]').click()); await settle(page, 600);
    check(`${t}: ← Surah returns to the Surah`, (await crumbs(page)).length === 2);
    // Full screen and back
    const fs0 = await ev(page, () => document.getElementById("exploreBar").getBoundingClientRect().height);
    await page.click("#exploreFullscreenBtn"); await settle(page, 400);
    const fs1 = await ev(page, () => ({ on: document.body.classList.contains("explore-immersive"), pressed: document.getElementById("exploreFullscreenBtn").getAttribute("aria-pressed"), nav: Math.max(0, document.getElementById("topNav")?.getBoundingClientRect().height ?? 0), btn: document.getElementById("exploreFullscreenBtn").getBoundingClientRect().width > 0 }));
    if (PROBE) console.log(t, "fs", fs0, JSON.stringify(fs1));
    check(`${t}: ⤢ goes full screen and its button stays reachable`, fs1.on && fs1.pressed === "true" && fs1.btn, JSON.stringify(fs1));
    await page.click("#exploreFullscreenBtn"); await settle(page, 400);
    check(`${t}: ⤢ again leaves full screen`, !(await ev(page, () => document.body.classList.contains("explore-immersive"))));
    check(`${t}: no sideways scroll`, await ev(page, () => document.documentElement.scrollWidth <= innerWidth + 1));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 2: Track the status of Approaches -- the picker recolours the wheel; All / One Approach inside a Surah.
  await flow("approach", lang, width, async (t, page, ctx, errors) => {
    await openExplore(page);
    await gotoSurah(page, 81);
    check(`${t}: POSITIVE CONTROL All Approaches is the default inside a Surah, with a stacked-band slice per Āyah (29)`, await ev(page, () => document.querySelector("#exploreModeRow [data-v=all]").getAttribute("aria-pressed") === "true" && Number(document.querySelector(".aa-wheel")?.dataset.slices) === 29 && document.querySelectorAll(".aa-slice .aa-band").length > 29));
    const bands = await ev(page, () => [...document.querySelectorAll('.aa-slice[data-slice="2"] .aa-band')].map((b) => b.dataset.band));
    if (PROBE) console.log(t, "bands ayah3", bands.join());
    check(`${t}: All Approaches shows the seeded stages stacked on Āyah 3 (Achieved, Practising, rest Not started)`, bands.length >= 3 && bands.includes("achieved") && bands.includes("practising") && bands.includes("not_started"), bands.join());
    await ev(page, () => document.querySelector("#exploreModeRow [data-v=one]").click()); await settle(page, 600);
    const one = await ev(page, () => ({ pressed: document.querySelector("#exploreModeRow [data-v=one]").getAttribute("aria-pressed"), aa: !!document.querySelector(".aa-wheel"), segs: document.querySelectorAll("#exploreWheelContainer .wheel-seg").length, row: document.getElementById("exploreApproachRow").getBoundingClientRect().height, keys: [...document.querySelectorAll("#exploreWheelContainer .wheel-seg")].slice(0, 6).map((s) => s.dataset.key) }));
    if (PROBE) console.log(t, "one", JSON.stringify(one));
    check(`${t}: One Approach shows a single ring of Āyah slices (no stacked bands) and brings the Approach picker back`, one.pressed === "true" && !one.aa && one.segs >= 29 && one.row > 20, JSON.stringify(one));
    // The picker recolours the wheel: memorise has Āyah 3 Achieved and Āyah 5 Mastered; recite has Āyah 3 Practising only.
    // The slice's stage is on the path (data-status) and its fill; read both.
    const fills = async () => ev(page, () => Object.fromEntries([...document.querySelectorAll('#exploreWheelContainer .wheel-seg[data-ring-kind="ayah"]')].map((s) => [s.dataset.key, [s.dataset.status, s.getAttribute("fill")]])));
    const mem = await fills();
    await ev(page, () => document.getElementById("exploreApproachBtn").click()); await settle(page, 300);
    const listRect = await rectOf(page, "#exploreApproachList");
    const optH = await ev(page, () => document.querySelector("#exploreApproachList .explore-approach-opt").getBoundingClientRect().height);
    if (PROBE) console.log(t, "list", JSON.stringify(listRect), optH);
    check(`${t}: the ▾ Approach list opens inside the screen's width and its options are tap-sized (>=36px)`, !!listRect && listRect.left >= -1 && listRect.right <= width + 1 && listRect.width > 100 && optH >= 36, JSON.stringify({ listRect, optH }));
    await ev(page, () => document.querySelector('#exploreApproachList [data-approach-id="recite"]').click()); await settle(page, 800);
    const rec = await fills();
    if (PROBE) console.log(t, "fills", JSON.stringify({ mem: [mem[3], mem[5], mem[1]], rec: [rec[3], rec[5], rec[1]] }));
    check(`${t}: POSITIVE CONTROL Memorise paints Āyah 3 Achieved and Āyah 5 Mastered from the seeded records`, mem[3]?.[0] === "achieved" && mem[5]?.[0] === "mastered", JSON.stringify([mem[3], mem[5]]));
    check(`${t}: choosing Recite repaints the wheel: Āyah 3 becomes Practising (new colour) and Āyah 5 becomes Not started`, rec[3]?.[0] === "practising" && rec[3][1] !== mem[3][1] && rec[5]?.[0] === "not_started" && rec[5][1] !== mem[5][1], JSON.stringify([mem[3], rec[3], mem[5], rec[5]]));
    check(`${t}: an unrecorded Āyah keeps the Not started colour in both Approaches`, mem[1][0] === "not_started" && rec[1][0] === "not_started" && mem[1][1] === rec[1][1]);
    check(`${t}: the picker button now names Recite`, (await ev(page, () => document.getElementById("exploreApproachBtn").innerText)).length > 0 && (await ev(page, () => document.querySelector('#exploreApproachList [data-approach-id="recite"]').getAttribute("aria-selected"))) === "true");
    // And the whole-Qur'an wheel reflects it too.
    await ev(page, () => document.querySelector('#exploreBreadcrumb .explore-crumb').click()); await settle(page, 700);
    check(`${t}: back at the Whole Quran the wheel is still drawn for the chosen Approach`, (await ev(page, () => document.querySelectorAll("#exploreWheelContainer .wheel-seg").length)) === 144);
    check(`${t}: no sideways scroll`, await ev(page, () => document.documentElement.scrollWidth <= innerWidth + 1));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 1b: Word by Word instead of Quran shows word counts per part.
  await flow("wbw", lang, width, async (t, page, ctx, errors) => {
    await openExplore(page);
    await ev(page, () => document.getElementById("explorePaletteWbwBtn").click()); await settle(page, 1500);
    const w = await ev(page, () => ({ body: !document.getElementById("wbwBody").hidden, cap: document.getElementById("wbwCoverageCaption").innerText, side: document.getElementById("wbwSidebarContainer").innerText.replace(/\s+/g, " ").slice(0, 80), segs: document.querySelectorAll("#wbwWheelContainer .wheel-seg").length, pressed: document.getElementById("explorePaletteWbwBtn").getAttribute("aria-pressed") }));
    if (PROBE) console.log(t, "wbw", JSON.stringify(w));
    check(`${t}: POSITIVE CONTROL Word by Word is the pressed palette and its panel is showing 30 Juz`, w.pressed === "true" && w.body && w.segs === 30, JSON.stringify(w));
    check(`${t}: Word by Word shows word counts (the whole-Qur'an total, 77429) and a per-Juz percentage list`, /77[,٬]?429|৭৭[,٬]?৪২৯/.test(w.cap) && /%/.test(w.side), JSON.stringify([w.cap, w.side]));
    await ev(page, () => document.getElementById("explorePaletteQuranBtn").click()); await settle(page, 700);
    check(`${t}: Quran brings the Quran wheel back`, await ev(page, () => document.getElementById("wbwPanel").hidden && document.querySelectorAll("#exploreWheelContainer .wheel-seg").length > 100));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

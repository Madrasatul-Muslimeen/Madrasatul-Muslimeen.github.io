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
  // A QCR row's meaning snippet was always the English translation, even on the Bangla page.
  "qcrsnippet": ["app/quranrevival.html", "**/quranrevival.html*", 'ayah?.translations?.[getAppLang() === "bn" ? "bn" : "en"] ?? ayah?.translations?.en ?? ""; // audit14: the row\'s meaning follows the app language, as the add preview does', 'ayah?.translations?.en ?? "";'],
  // Take ▸ -> Read it left the reader in the reading view with no way back to Explore (the way-back law).
  "noreadback": ["app/quranrevival.html", "**/quranrevival.html*", 'await goToAyahFromExplore(take.sn, u.ayah, u.half); setAppReturn(t("Back to Explore"), backLabel, backToExplore); return; }', "await goToAyahFromExplore(take.sn, u.ayah, u.half); return; }"],
  // Explore's ▾ Approach list options were 31px tall.
  "optsize": ["app/quranrevival.html", "**/quranrevival.html*", "    min-height: 40px; /* audit14: 31px was too small for a finger */\n", ""],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);

// At-Takwir (81) ayah 3: memorise Achieved, recite Practising; ayah 5: memorise Mastered. Both owned by p1 (the signed-in person).
const claim = (tid, st) => `{ unitType: "ayah", subjectId: "quran", trackableId: "${tid}", claimedStatus: "${st}", confirmedStatus: null, confirmState: "pending" }`;
const SEED = `
window.__stubApplyBatches = true;
// Tajweed is the writing Approach here (the platform's approach_05), so only its Take sheet offers Write.
DATA.trackables.find((t) => t._id === TENANT_ID + "__tajweed").sourceTemplateId = "approach_05";
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
    const view = async (id) => { await ev(page, (i) => document.getElementById(i).click(), id); await settle(page, 700); return ev(page, () => ({ segs: document.querySelectorAll("#exploreWheelContainer .wheel-seg").length, side: document.querySelector("#exploreSidebarContainer")?.innerText.replace(/\s+/g, " ") ?? "", pressed: [...document.querySelectorAll("#exploreViewToggle button")].filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.id).join() })); };
    const vJ = await view("exploreViewPrimaryBtn"), vS = await view("exploreViewSurahsBtn"), vH = await view("exploreViewHizbBtn");
    if (PROBE) console.log(t, "wholeviews", JSON.stringify([vJ, vS, vH]));
    check(`${t}: Whole Quran, Juz view lists the Juz and marks its button pressed`, vJ.side.length > 100 && vJ.pressed === "exploreViewPrimaryBtn", JSON.stringify(vJ));
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

  // 3: Take ▸ from Explore -- on a Surah and on an Āyah row.
  await flow("take", lang, width, async (t, page, ctx, errors) => {
    await openExplore(page);
    await gotoSurah(page, 81);
    // Surah row
    await ev(page, () => document.querySelector('[data-aa-row="recite"] .aa-take').click());
    await page.waitForSelector(".aa-sheet [data-aa-act]", { timeout: 8000 });
    const acts = () => ev(page, () => [...document.querySelectorAll(".aa-sheet [data-aa-act]")].map((b) => b.dataset.aaAct));
    const sheetBox = await rectOf(page, ".aa-sheet");
    const navBottom = await ev(page, () => Math.max(0, document.getElementById("topNav")?.getBoundingClientRect().bottom ?? 0));
    const a1 = await acts();
    const title = await ev(page, () => document.querySelector("[data-gac-record-title]").textContent);
    if (PROBE) console.log(t, "surah sheet", JSON.stringify({ a1, sheetBox, navBottom, title }));
    check(`${t}: POSITIVE CONTROL Take ▸ on a Surah row opens the sheet with Read, Listen, Guide (no Write for a non-writing Approach) and Record, inside the screen`, a1.join() === "read,listen,guide" && inside(sheetBox, width, vh) && sheetBox.top >= navBottom - 1, JSON.stringify({ a1, sheetBox, navBottom }));
    check(`${t}: the Surah sheet records for the whole Surah`, /Surah|সূরা/i.test(title), title);
    // a writing Approach gets Write
    await ev(page, () => document.querySelector("[data-aa-close]").click()); await settle(page, 300);
    const ids = await ev(page, () => [...document.querySelectorAll("[data-aa-row]")].map((r) => r.dataset.aaRow));
    const withWrite = [];
    for (const id of ids) {
      await ev(page, (i) => document.querySelector(`[data-aa-row="${i}"] .aa-take`).click(), id);
      await settle(page, 150);
      if ((await acts()).includes("write")) withWrite.push(id);
      await ev(page, () => document.querySelector("[data-aa-close]").click()); await settle(page, 100);
    }
    if (PROBE) console.log(t, "writing approaches", withWrite.join(), ids.join());
    check(`${t}: of ten Approaches only the writing one (Tajweed here) adds Write to its Take ▸ sheet`, ids.length === 10 && withWrite.join() === "tajweed", withWrite.join());
    // Āyah row: open Āyah 3 (the slice is the third one) and Take Memorise
    await ev(page, () => { const s = document.querySelector(".aa-wheel .wheel-seg, #exploreWheelContainer .wheel-seg"); s.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await settle(page, 600);
    for (let i = 0; i < 2; i++) { await ev(page, () => document.querySelector('#exploreNavBar [data-aa="ayah-next"]').click()); await settle(page, 500); }
    const cr = await crumbs(page);
    const ayahStatus = () => ev(page, () => document.querySelector('[data-aa-row="memorise"]').dataset.status);
    const before = await ayahStatus();
    await ev(page, () => document.querySelector('[data-aa-row="memorise"] .aa-take').click());
    await page.waitForSelector(".aa-sheet [data-aa-rec]", { timeout: 8000 });
    const a2 = await acts();
    const sheetBox2 = await rectOf(page, ".aa-sheet");
    check(`${t}: POSITIVE CONTROL Take ▸ on an Āyah row (Āyah 3) opens the sheet (Read, Listen, Guide) with the stages, inside the screen`, a2.join() === "read,listen,guide" && inside(sheetBox2, width, vh) && before === "achieved", JSON.stringify({ a2, sheetBox2, before, cr }));
    // Record: Practising
    const n = await writeCount(page);
    await ev(page, () => document.querySelector('.aa-sheet [data-aa-rec="practising"]').click());
    await page.waitForFunction(() => !document.querySelector(".aa-sheet"), null, { timeout: 8000 }).catch(() => {});
    await settle(page, 900);
    const w = await writes(page, n);
    const rec = w.find((x) => x.col === "records");
    const ent = rec?.data?.["entries.ayah:81:3::memorise"];
    check(`${t}: Record writes the right person (p1), chunk (surah_81) and unit key (ayah:81:3) for Memorise as Practising`, !!rec && rec.id.endsWith("__p1__surah_81") && rec.data.personId === "p1" && ent?.claimedStatus === "practising" && ent?.trackableId === "memorise" && ent?.unitType === "ayah", JSON.stringify(w).slice(0, 400));
    check(`${t}: exactly one records write was made (no stray writes)`, w.filter((x) => x.col === "records").length === 1);
    const after = await ayahStatus();
    const sliceNow = await ev(page, () => { const e = document.querySelector('#exploreWheelContainer [data-key="memorise"]'); return e ? { html: e.outerHTML.slice(0, 220), fill: e.getAttribute("fill") ?? e.querySelector("[fill]")?.getAttribute("fill") } : null; });
    if (PROBE) console.log(t, "repaint", after, JSON.stringify(sliceNow));
    check(`${t}: the Āyah's Memorise row and its wheel slice repaint with the new stage (Achieved -> Practising, the Practising colour)`, before === "achieved" && after === "practising" && sliceNow?.fill?.toLowerCase() === "#c9a24b", JSON.stringify({ before, after, sliceNow }));
    check(`${t}: a toast confirms what was recorded`, await ev(page, () => /./.test(document.querySelector(".aa-toast")?.textContent ?? "")) );
    // Read leaves a visible way back to Explore, to the same Āyah
    await ev(page, () => document.querySelector('[data-aa-row="recite"] .aa-take').click());
    await page.waitForSelector('.aa-sheet [data-aa-act="read"]', { timeout: 8000 });
    await ev(page, () => document.querySelector('.aa-sheet [data-aa-act="read"]').click());
    await page.waitForFunction(() => !document.getElementById("readView").hidden, null, { timeout: 8000 });
    await settle(page, 900);
    const pill = await ev(page, () => { const b = document.querySelector("#ayahCardBackPill [data-ayah-card-back]"); const r = b?.getBoundingClientRect(); return { text: b?.innerText.replace(/\s+/g, " ") ?? null, r: r && { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }, shown: !!r && r.width > 0 }; });
    if (PROBE) console.log(t, "pill", JSON.stringify(pill));
    check(`${t}: Read opens the reading view and leaves a visible "Back to Explore" pill, on screen`, pill.shown && /Explore|অন্বেষণ/.test(pill.text) && inside(pill.r, width, vh), JSON.stringify(pill));
    await page.click("#ayahCardBackPill [data-ayah-card-back]"); await settle(page, 1500);
    const back = await ev(page, () => ({ explore: !document.getElementById("exploreView").hidden, crumbs: [...document.querySelectorAll("#exploreBreadcrumb .explore-crumb")].map((c) => c.textContent.trim()), nav: [...document.querySelectorAll("#exploreNavBar [data-aa]")].map((b) => b.dataset.aa).join(), pill: !document.getElementById("ayahCardBackPill") || document.getElementById("ayahCardBackPill").hidden }));
    if (PROBE) console.log(t, "back", JSON.stringify(back));
    check(`${t}: the pill returns to Explore on the same Āyah (breadcrumb ${cr.length} levels deep, ← Surah / ‹ › present) and goes away`, back.explore && back.crumbs.length === cr.length && back.crumbs.join() === cr.join() && back.nav === "up,ayah-prev,ayah-next" && back.pill, JSON.stringify({ back, cr }));
    check(`${t}: no sideways scroll`, await ev(page, () => document.documentElement.scrollWidth <= innerWidth + 1));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 4: QCR collections.
  await flow("qcr", lang, width, async (t, page, ctx, errors) => {
    await openExplore(page);
    await ev(page, () => document.getElementById("explorePaletteQcrBtn").click());
    await page.waitForFunction(() => document.querySelectorAll("#qcrWheelContainer .wheel-seg").length > 0, null, { timeout: 10000 });
    await settle(page, 400);
    const opts = await ev(page, () => [...document.getElementById("qcrLevelSelect").options].map((o) => [o.value, o.text]));
    // The first collection that has āyāt in it.
    const info = async () => ev(page, () => ({ cur: document.getElementById("qcrLevelSelect").value, rows: document.querySelectorAll("#qcrWaysListContainer .qcr-way-row").length, segs: document.querySelectorAll("#qcrWheelContainer .wheel-seg").length, count: document.querySelector(".qcr-list-count")?.textContent ?? "", title: document.querySelector(".qcr-list-title")?.textContent ?? "", manage: !document.getElementById("qcrLevelManageActions").hidden, add: !!document.getElementById("qcrAddItemBtn") }));
    let first = null;
    for (const [id] of opts) { await page.selectOption("#qcrLevelSelect", id); await settle(page, 300); const i = await info(); if (i.rows > 0) { first = { id, ...i }; break; } }
    if (PROBE) console.log(t, "collections", opts.length, JSON.stringify(first));
    check(`${t}: POSITIVE CONTROL QCR lists the tenant's collections and one of them holds āyāt (${first?.id})`, opts.length >= 10 && !!first, JSON.stringify({ n: opts.length, first }));
    check(`${t}: choosing a collection draws one wheel slice per āyah and one row per āyah`, first && first.segs === first.rows, JSON.stringify(first));
    const pick = await ev(page, () => { const r = document.querySelector("#qcrWaysListContainer [data-qcr-jump]"); return { key: r.dataset.qcrJump, text: r.innerText.replace(/\s+/g, " ") }; });
    if (PROBE) console.log(t, "pick", JSON.stringify(pick));
    await ev(page, () => document.querySelector("#qcrWaysListContainer [data-qcr-jump]").click());
    await page.waitForFunction(() => !document.getElementById("readView").hidden, null, { timeout: 10000 });
    await settle(page, 1200);
    const [, sn, an] = pick.key.match(/^ayah:(\d+):(\d+)/) || [];
    const read = await ev(page, () => ({ surah: document.getElementById("surahSelect")?.value, ayah: document.getElementById("ayahSelect")?.value, pill: document.querySelector("#ayahCardBackPill [data-ayah-card-back]")?.innerText.replace(/\s+/g, " ") ?? null }));
    if (PROBE) console.log(t, "read", JSON.stringify(read));
    check(`${t}: tapping a row opens that āyah in the Read view (${pick.key})`, read.surah === sn && read.ayah === an, JSON.stringify(read));
    check(`${t}: a "Back to QCR" pill is on screen`, !!read.pill && /QCR/.test(read.pill) && inside(await rectOf(page, "#ayahCardBackPill [data-ayah-card-back]"), width, vh), String(read.pill));
    await page.click("#ayahCardBackPill [data-ayah-card-back]"); await settle(page, 1500);
    const back = await info();
    check(`${t}: ← Back to QCR returns to the SAME collection (${first?.id})`, back.cur === first.id && back.rows === first.rows && (await ev(page, () => !document.getElementById("qcrPanel").hidden)), JSON.stringify({ back, first: first?.id }));
    // A wheel slice opens its āyah too (the second one), and the way back lands on the same collection.
    const key2 = await ev(page, () => { const s = [...document.querySelectorAll("#qcrWheelContainer .wheel-seg")][1]; s.dispatchEvent(new MouseEvent("click", { bubbles: true })); return s.dataset.key; });
    await page.waitForFunction(() => !document.getElementById("readView").hidden, null, { timeout: 10000 });
    await settle(page, 1200);
    const read2 = await ev(page, () => `ayah:${document.getElementById("surahSelect")?.value}:${document.getElementById("ayahSelect")?.value}`);
    check(`${t}: tapping a wheel slice opens its āyah in the Read view (${key2})`, read2 === key2, `${read2} vs ${key2}`);
    await page.click("#ayahCardBackPill [data-ayah-card-back]"); await settle(page, 1500);
    check(`${t}: ...and ← Back to QCR returns to the same collection again`, (await info()).cur === first.id);
    check(`${t}: no sideways scroll`, await ev(page, () => document.documentElement.scrollWidth <= innerWidth + 1));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 4b: Āyah card -> 📚 QCR: tick a collection, Attach, and the write lands.
  await flow("qcrattach", lang, width, async (t, page, ctx, errors) => {
    await ev(page, () => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    if (!(await ev(page, () => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await settle(page, 200); }
    await page.click("#tabReadBtn");
    await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 8000 });
    await settle(page, 600);
    await ev(page, () => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 15000 });
    await ev(page, () => { const el = document.getElementById("ayahSelect"); el.value = "255"; el.dispatchEvent(new Event("change", { bubbles: true })); });
    await settle(page, 900);
    await ev(page, () => document.querySelector('[data-ayah-num-badge="2:255"]')?.click());
    await page.waitForSelector("[data-ayah-sheet] [data-ayah-sheet-qcr]", { timeout: 8000 });
    await settle(page, 400);
    const unit = await ev(page, () => document.querySelector("[data-ayah-sheet]").dataset.unitKey);
    await ev(page, () => document.querySelector("[data-ayah-sheet] [data-ayah-sheet-qcr]").click());
    await page.waitForFunction(() => { const p = document.getElementById("qcrPopup"); return p && !p.hidden && p.querySelector("[data-note-collection-toggle]"); }, null, { timeout: 12000 });
    await settle(page, 400);
    const pop = await ev(page, () => { const b = document.querySelector("#qcrPopup .qcr-pop-box").getBoundingClientRect(); return { box: { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width }, ticks: [...document.querySelectorAll("#qcrPopup [data-note-collection-toggle]")].filter((c) => c.getClientRects().length).length, back: document.querySelector("#qcrPopup [data-qcr-pop-back]")?.textContent.trim() ?? null, nav: Math.max(0, document.getElementById("topNav")?.getBoundingClientRect().bottom ?? 0) }; });
    if (PROBE) console.log(t, "pop", unit, JSON.stringify(pop));
    check(`${t}: POSITIVE CONTROL the Āyah card's 📚 QCR opens a pop-up listing the collections to tick (${unit})`, pop.ticks >= 10 && inside(pop.box, width, vh), JSON.stringify(pop)); // the pop-up is a full-window layer above the nav, with its own ← Back and ✕
    check(`${t}: ...with a visible ← Back`, !!pop.back && pop.back.startsWith("←"), String(pop.back));
    const n = await writeCount(page);
    const id = await ev(page, () => { const cb = [...document.querySelectorAll("#qcrPopup [data-note-collection-toggle]")].find((c) => c.getClientRects().length && !c.checked); cb.click(); return cb.dataset.noteCollectionToggle; });
    await page.waitForFunction((k) => (window.__stubWriteData || []).length > k, n, { timeout: 8000 }).catch(() => {});
    await settle(page, 500);
    const w = (await writes(page, n)).filter((x) => x.col === "ayahCollections");
    const col = w.at(-1)?.data?.collections?.find((c) => c.id === id);
    check(`${t}: ticking collection ${id} writes ayahCollections with ${unit} filed in it, once`, w.length === 1 && !!col && col.items.includes(unit), JSON.stringify(w).slice(0, 300));
    check(`${t}: ...and the tick shows checked after the re-render`, await ev(page, (c) => !!document.querySelector(`#qcrPopup [data-note-collection-toggle="${c}"]`)?.checked, id));
    await page.click("#qcrPopup [data-qcr-pop-close]").catch(() => {});
    await settle(page, 400);
    check(`${t}: the pop-up closes`, await ev(page, () => !document.getElementById("qcrPopup") || document.getElementById("qcrPopup").hidden));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 4c: owner/prime manage: add, rename, archive a collection; "+ Add āyah" follows the Al-Fātiḥah count and previews the āyah.
  await flow("qcrmanage", lang, width, async (t, page, ctx, errors) => {
    await openExplore(page);
    await ev(page, () => document.getElementById("explorePaletteQcrBtn").click());
    await page.waitForFunction(() => document.querySelectorAll("#qcrWheelContainer .wheel-seg").length > 0, null, { timeout: 10000 });
    await settle(page, 400);
    const dialogs = [];
    let answer = null;
    page.on("dialog", async (d) => { dialogs.push([d.type(), d.message()]); if (d.type() === "prompt") await d.accept(answer ?? ""); else await d.accept(); });
    const opts = () => ev(page, () => [...document.getElementById("qcrLevelSelect").options].map((o) => [o.value, o.text]));
    const n0 = (await opts()).length;
    await ev(page, () => { const p = document.getElementById("qcrPaletteBtn"); if (p.getAttribute("aria-expanded") !== "true") p.click(); });
    await settle(page, 300);
    const palette = await ev(page, () => { const r = (id) => { const e = document.getElementById(id).getBoundingClientRect(); return { left: e.left, right: e.right, top: e.top, bottom: e.bottom, width: e.width, height: e.height }; }; return { rename: r("qcrRenameLevelBtn"), archive: r("qcrArchiveLevelBtn"), add: r("qcrAddLevelBtn") }; });
    if (PROBE) console.log(t, "palette", JSON.stringify(palette));
    check(`${t}: POSITIVE CONTROL the ⋯ palette shows ✎ / 🗄 / + inside the screen, each >=36px`, Object.values(palette).every((r) => inside(r, width, vh) && r.width >= 36 && r.height >= 36), JSON.stringify(palette));
    // add
    let nw = await writeCount(page);
    answer = refText(lang, "Audit collection");
    await page.click("#qcrAddLevelBtn"); await settle(page, 900);
    let w = (await writes(page, nw)).filter((x) => x.col === "ayahCollections");
    const o1 = await opts();
    const added = o1.find(([, tx]) => tx.includes("Audit collection") || tx.includes(answer));
    check(`${t}: + asks for a name, adds the collection (one write) and selects it`, o1.length === n0 + 1 && !!added && w.length === 1 && w[0].data.collections.length === n0 + 1 && (await ev(page, () => document.getElementById("qcrLevelSelect").value)) === added[0], JSON.stringify({ n0, now: o1.length, w: w.length, dialogs }));
    // rename
    nw = await writeCount(page);
    answer = "Renamed audit";
    await page.click("#qcrRenameLevelBtn"); await settle(page, 900);
    w = (await writes(page, nw)).filter((x) => x.col === "ayahCollections");
    const o2 = await opts();
    check(`${t}: ✎ renames the selected collection (one write, the name changes, the count stays)`, o2.length === n0 + 1 && o2.some(([v, tx]) => v === added[0] && tx.includes("Renamed audit")) && w.length === 1, JSON.stringify({ o2: o2.slice(-2), w: w.length }));
    // archive
    nw = await writeCount(page);
    await page.click("#qcrArchiveLevelBtn"); await settle(page, 900);
    w = (await writes(page, nw)).filter((x) => x.col === "ayahCollections");
    const o3 = await opts();
    const arch = w.at(-1)?.data?.collections?.find((c) => c.id === added[0]);
    check(`${t}: 🗄 archives it (kept in the data as archived, never deleted; gone from the list)`, arch?.status === "archived" && !o3.some(([v]) => v === added[0]) && w.length === 1, JSON.stringify({ status: arch?.status, n: o3.length }));
    check(`${t}: ...the three actions each raised their own prompt/confirm (${dialogs.map((d) => d[0]).join(",")})`, dialogs.map((d) => d[0]).join() === "prompt,prompt,confirm", JSON.stringify(dialogs));
    check(`${t}: no sideways scroll`, await ev(page, () => document.documentElement.scrollWidth <= innerWidth + 1));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 4d: "+ Add āyah" follows the Al-Fātiḥah count and previews the āyah's Arabic and meaning before adding.
  await flow("qcradd", lang, width, async (t, page, ctx, errors) => {
    const openQcr = async () => {
      await openExplore(page);
      await ev(page, () => document.getElementById("explorePaletteQcrBtn").click());
      await page.waitForFunction(() => document.getElementById("qcrAddItemBtn"), null, { timeout: 10000 });
      await settle(page, 400);
    };
    await openQcr();
    const type = async (surah, n) => { await page.selectOption("#qcrAddSurahSelect", String(surah)); await page.fill("#qcrAddAyahInput", String(n)); await page.waitForFunction(() => !document.getElementById("qcrAddPreview").hidden || true, null, { timeout: 3000 }); await settle(page, 700); };
    const preview = () => ev(page, () => { const p = document.getElementById("qcrAddPreview"); const r = p.getBoundingClientRect(); return { shown: !p.hidden && r.width > 0, ref: p.querySelector(".qcr-add-preview-ref")?.textContent ?? "", ar: p.querySelector(".qcr-add-preview-ar")?.textContent ?? "", tr: p.querySelector(".qcr-add-preview-tr")?.textContent ?? "", key: p.dataset.unitKey, r: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width } }; });
    const add = async () => { const n = await writeCount(page); await page.click("#qcrAddItemBtn"); await settle(page, 900); const w = (await writes(page, n)).filter((x) => x.col === "ayahCollections"); const sel = await ev(page, () => document.getElementById("qcrLevelSelect").value); return { w, col: w.at(-1)?.data?.collections?.find((c) => c.id === sel), sel }; };
    // Count ON (the default): displayed 1 is "Al-ḥamdu lillāh" = stored ayah 2; displayed 7 is stored ayah 8.
    check(`${t}: POSITIVE CONTROL the Al-Fātiḥah count is on (stored)`, await ev(page, () => localStorage.getItem("mm_fatiha_bismillah_unnumbered") !== "0"));
    await type(1, 1);
    let p = await preview();
    if (PROBE) console.log(t, "preview 1", JSON.stringify(p));
    check(`${t}: count ON, typing 1 previews "${refText(lang, "1:1")}" with the āyah's Arabic and its meaning, inside the screen (not the Bismillah)`, p.shown && p.ref.includes(refText(lang, "1:1")) && /ٱ?لْ?حَمْدُ|الحمد/.test(p.ar) && !/بِسْمِ/.test(p.ar) && p.tr.length > 5 && p.key === "ayah:1:2" && inside(p.r, width, vh), JSON.stringify(p));
    let r = await add();
    check(`${t}: count ON, + Add āyah files ayah:1:2 (one write)`, r.w.length === 1 && r.col?.items.includes("ayah:1:2") && !r.col.items.includes("ayah:1:1"), JSON.stringify(r.w).slice(0, 300));
    await type(1, 7);
    p = await preview();
    r = await add();
    check(`${t}: count ON, 7 previews ${refText(lang, "1:7")} and files ayah:1:8`, p.shown && p.key === "ayah:1:8" && r.col?.items.includes("ayah:1:8"), JSON.stringify({ p, items: r.col?.items }));
    await type(1, 8);
    const nw = await writeCount(page);
    await page.click("#qcrAddItemBtn"); await settle(page, 500);
    const msg = await ev(page, () => { const m = document.getElementById("qcrAddMsg"); return { shown: getComputedStyle(m).display !== "none", text: m.textContent }; });
    check(`${t}: count ON, 8 is refused with a message naming the surah's ayah count (7) and nothing is written`, msg.shown && msg.text.includes(refText(lang, "7")) && (await writeCount(page)) === nw, JSON.stringify(msg));
    // Count OFF: the number is the stored āyah.
    await ev(page, () => localStorage.setItem("mm_fatiha_bismillah_unnumbered", "0"));
    await page.reload(); await page.waitForTimeout(1500);
    await ev(page, () => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    await openQcr();
    await type(1, 1);
    p = await preview();
    r = await add();
    check(`${t}: count OFF, typing 1 is the Bismillah, ayah:1:1 (as before)`, p.key === "ayah:1:1" && r.col?.items.includes("ayah:1:1"), JSON.stringify({ key: p.key, items: r.col?.items }));
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
// 5: Bangla -- no English left on these features (the app's own names and source names may stay).
if (!LONLY || LONLY === "bn") for (const width of [390, 1440].filter((w) => !WONLY || w === WONLY)) {
  await flow("bnleak", "bn", width, async (t, page, ctx, errors) => {
    const seen = {};
    await openExplore(page);
    seen.whole = await ev(page, () => document.getElementById("exploreView").innerText);
    await gotoSurah(page, 81);
    seen.surahAll = await ev(page, () => document.getElementById("exploreView").innerText);
    await ev(page, () => document.querySelector("#exploreModeRow [data-v=one]").click()); await settle(page, 500);
    await ev(page, () => document.getElementById("exploreApproachBtn").click()); await settle(page, 300);
    seen.approachList = await ev(page, () => document.getElementById("exploreApproachList").innerText);
    await ev(page, () => document.querySelector("#exploreModeRow [data-v=all]").click()); await settle(page, 500);
    await ev(page, () => document.querySelector('[data-aa-row="tajweed"] .aa-take').click());
    await page.waitForSelector(".aa-sheet", { timeout: 8000 });
    seen.takeSheet = await ev(page, () => document.querySelector(".aa-sheet").innerText);
    await ev(page, () => document.querySelector("[data-aa-close]").click()); await settle(page, 300);
    await ev(page, () => document.getElementById("explorePaletteWbwBtn").click()); await settle(page, 1500);
    seen.wbw = await ev(page, () => document.getElementById("wbwPanel").innerText);
    await ev(page, () => document.getElementById("explorePaletteQcrBtn").click()); await settle(page, 1200);
    // The collection titles are the tenant's own data (written in English: "Sayr fil-Arḍ", "Audience Epithets"), so they are not scanned.
    seen.qcr = await ev(page, () => ["qcrWaysListContainer", "qcrHint", "qcrLegendContainer"].map((i) => { const c = document.getElementById(i).cloneNode(true); c.querySelectorAll("select").forEach((s) => s.remove()); document.body.appendChild(c); const x = c.innerText; c.remove(); return x; }).join(" "));
    // ...and the Move-to selects' own first option (the app's words) is read on its own.
    seen.qcrMove = await ev(page, () => [...document.querySelectorAll("#qcrWaysListContainer [data-qcr-move] option:first-child")].map((o) => o.textContent).join(" "));
    await ev(page, () => { const p = document.getElementById("qcrPaletteBtn"); if (p.getAttribute("aria-expanded") !== "true") p.click(); }); await settle(page, 300);
    seen.qcrTitles = await ev(page, () => ["qcrRenameLevelBtn", "qcrArchiveLevelBtn", "qcrAddLevelBtn", "qcrShowArchivedToggle"].map((i) => document.getElementById(i)?.title || document.getElementById(i)?.parentElement?.innerText || "").join(" "));
    for (const [k, v] of Object.entries(seen)) {
      const left = englishLeft(v);
      if (PROBE) console.log(t, k, JSON.stringify(left));
      check(`${t}: ${k}: POSITIVE CONTROL there is Bangla text to scan`, /[ঀ-৿]/.test(v), String(v).slice(0, 80));
      check(`${t}: ${k}: no English left (${left.slice(0, 6).join(", ") || "none"})`, left.length === 0, JSON.stringify(left));
    }
  });
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

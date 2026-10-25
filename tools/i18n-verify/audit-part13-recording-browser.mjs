// Audit part 13 (PCF J29, manual audit, #872): the User Manual's "Qur'an: recording progress and status" features, each one WORKING.
// Measured on the rendered page at 390 / 820 / 1440 (and 320 for anything that opens a window or card), English and Bangla.
// The result is asserted, not the element: a stored write (window.__stubWriteData), a rendered status, a downloaded file.
//   1 The Take / Record / Know-your-status bar   2 Record Your Progress (write + re-render)   3 👥 Recording for family
//   4 The Approach card (Track / Guide / Breakdown / Coverage)   5 Records page   6 Monitor (weekly, monthly, CSV, print)
//   7 Bangla: no English left on these features
// Each flow has a POSITIVE CONTROL and a timeout that fails by name. Mutations: --mutate=<name> restores a defect.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part13-recording-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
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
  // The four Approach-card tabs need 302px; a 320px phone's card gives 262: Coverage ran off the end.
  "tabsfit": ["app/quranrevival.html", "**/quranrevival.html*", "  .way-tab-bar { flex-wrap: wrap; }\n  @media (max-width: 399px) { .way-tab-bar { gap: 0.1rem; } .way-tab-btn { padding: 0.4rem 0.3rem; font-size: 0.85rem; } }", ""],
  // The 👥 row wraps to its own line at 320px but its list is anchored to the right edge of the row: it opened off the left of the screen.
  "popleft": ["app/quranrevival.html", "**/quranrevival.html*", "  .claim-for-line > .claim-for-row { margin: 0 0 0 auto; } /* audit13: auto, so a row that wraps to its own line stays at the right, under the right-anchored list (it opened 108px off the left edge at 320px) */", "  .claim-for-line > .claim-for-row { margin: 0; }"],
  // The 👥 list opens below the fold of the scrolling Āyah card and nothing brings it into view.
  // The Monitor week label: dates in the device's short local style and its own zone (Architect, after audit part 13).
  "weeklabel": ["app/monitor.html", "**/monitor.html*", 'const fmtDate = (d) => num(d.toLocaleDateString(dateLocale(), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }));', "const fmtDate = (d) => num(d.toLocaleDateString(dateLocale()));"],
  // Only the zone: the dates formatted in the device's own zone (a day early west of Greenwich).
  "weeklabeltz": ["app/monitor.html", "**/monitor.html*", 'year: "numeric", timeZone: "UTC" }));', 'year: "numeric" }));'],
  "popscroll": ["app/js/way-modal.js", "**/way-modal.js*", '        if (open) popover.scrollIntoView({ block: "nearest" }); // audit13: bring the opened list into view, it can open below the fold of a scrolling card\n', ""],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);

const SEED = `
window.__stubApplyBatches = true;
DATA.records.push({ _id: TENANT_ID + "__p2__surah_1", tenantId: TENANT_ID, personId: "p2", chunkKey: "surah_1", entries: {} });`;
const NAMES = { en: ["Ahsan", "Maryam"], bn: ["আহসান", "মারইয়াম"] };
const browser = await chromium.launch();
const bnDigits = (s) => String(s).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
const refText = (lang, s) => (lang === "bn" ? bnDigits(s) : s);
// English words that may stay on a Bangla page: the app's own names and source names.
const ALLOWED = /QuranRevival|QCR|MMSA|Qur'?an|Hifz|Tajweed|Tadabbur|CSV|Google|Bukhari|Muslim|Tirmidhi|Abu|Dawud|Nasai|Ibn|Majah|Mushaf|Asma|Hizb|Juz|Ruku|Ayah|Surah|Madrasatul|Muslimeen|Al-?[A-Za-z]+|Faatiha/g;
// ...and data, not interface: the chunk key shown on Records (surah_1) and the fixture's own return note ("Try again").
const DATA_TEXT = /\bsurah_\d+\b|Try again/g;
const englishLeft = (text) => (String(text).replace(DATA_TEXT, " ").replace(ALLOWED, " ").match(/[A-Za-z]{3,}/g) || []);

async function open(lang, width, pagePath = "/app/quranrevival.html", timezoneId = null) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: SEED, timezoneId });
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

async function flow(name, lang, width, fn, pagePath, timezoneId = null) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, pagePath, timezoneId), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.ctx, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 120000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}

const ev = (page, f, a) => page.evaluate(f, a);
// PCF MSA J99 (the Owner, 25 Oct 2026: "put those 3 buttons inside the dots on the card"): below 600px Take / Record /
// Status live in the Read bar's ⋯ card, so a tap opens the card first, as a reader does. Updated in place, reason recorded.
async function openBarCard(page) {
  if (await page.evaluate(() => !!document.querySelector("#readToolsMenu #readApproachBar") && !document.getElementById("readToolsMenu").classList.contains("open"))) {
    await page.click("#readToolsBtn"); await page.waitForTimeout(250);
  }
}
async function tapBar(page, sel) { await openBarCard(page); await page.click(sel); }
// The week the Monitor page actually read: the date at the end of the activity document id it fetched (t1__p1__<weekKey>).
const weekKeyRead = (page) => ev(page, () => ((window.__fsLog || []).find((x) => x.kind === "getDoc" && x.col === "activity")?.id || "").match(/(\d{4}-\d\d-\d\d)$/)?.[1] ?? null);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
async function openRead(page) {
  await ev(page, () => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!(await ev(page, () => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await settle(page, 200); }
  await page.click("#tabReadBtn");
  await page.waitForFunction(() => !document.getElementById("readView").hidden && document.getElementById("ayahPanels").textContent.trim().length > 20, null, { timeout: 8000 });
  await settle(page, 400);
}
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));
const writes = (page, from = 0) => ev(page, (k) => (window.__stubWriteData || []).slice(k).map((x) => ({ col: x.col, id: x.id, data: x.data })), from);
const writeCount = (page) => ev(page, () => (window.__stubWriteData || []).length);
const inside = (r, vw, vh) => !!r && r.width > 0 && r.left >= -1 && r.right <= vw + 1 && r.top >= -1 && r.bottom <= vh + 1;
const rectOf = (page, sel) => ev(page, (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; }, sel);
const closeSheet = async (page) => { await ev(page, () => document.querySelectorAll("#ayahActionSheetOverlay.open [data-ayah-sheet-close]").forEach((b) => b.click())); await settle(page, 300); };
const pickApproach = async (page, id) => { await page.selectOption("#ayahSheetApproachSelect", id); await settle(page, 500); };
const stageState = (page) => ev(page, () => [...document.querySelectorAll("[data-ayah-sheet] [data-approach-stage-btn]")].map((b) => [b.dataset.approachStageBtn, b.disabled, b.getAttribute("aria-pressed")]));

const WIDTHS = [320, 390, 820, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
for (const lang of LANGS) for (const width of WIDTHS) {
  // 1: the three bar buttons each open what their label says.
  await flow("bar", lang, width, async (t, page, ctx, errors) => {
    await openRead(page);
    const vw = width, vh = width > 600 ? 900 : 844;
    await openBarCard(page);
    const bar = await ev(page, () => [...document.querySelectorAll("#readApproachBar button")].map((b) => { const r = b.getBoundingClientRect(); return { id: b.id, w: r.width, h: r.height, r: r.right, l: r.left }; }));
    if (PROBE) console.log(t, JSON.stringify(bar));
    check(`${t}: POSITIVE CONTROL the bar has Take / Record / Status buttons`, bar.map((b) => b.id).join() === "readBarTakeBtn,readBarRecordBtn,readBarStatusBtn", JSON.stringify(bar));
    check(`${t}: the three buttons sit inside the screen and are tap targets (>=36px high)`, bar.every((b) => b.w > 0 && b.l >= 0 && b.r <= vw + 1 && b.h >= 36), JSON.stringify(bar));
    // Know Your Status
    await tapBar(page, "#readBarStatusBtn"); await settle(page, 1200);
    const st = await ev(page, () => { const c = document.getElementById("myStatusCard").getBoundingClientRect(); const x = document.getElementById("myStatusCloseBtn").getBoundingClientRect(); return { open: !document.getElementById("myStatusMount").hidden, title: document.getElementById("myStatusTitle").textContent, rows: document.querySelectorAll("#myStatusBody .my-status-row, #myStatusBody [data-trackable-id]").length, text: document.getElementById("myStatusBody").innerText.length, c: { l: c.left, r: c.right, t: c.top, b: c.bottom }, closeOn: x.width > 0 && x.top >= 0 && x.right <= innerWidth + 1, nav: Math.max(0, document.getElementById("topNav")?.getBoundingClientRect().bottom ?? 0) }; });
    if (PROBE) console.log(t, "status", JSON.stringify(st));
    check(`${t}: Know Your Status opens its card (whole-Qur'an status by Approach), inside the screen, with a visible ✕`, st.open && st.text > 80 && st.c.l >= -1 && st.c.r <= vw + 1 && st.c.t >= -1 && st.c.b <= vh + 1 && st.closeOn, JSON.stringify(st));
    await page.click("#myStatusCloseBtn"); await settle(page, 400);
    check(`${t}: ✕ closes Know Your Status`, await ev(page, () => document.getElementById("myStatusMount").hidden), "");
    // Record Your Progress
    await tapBar(page, "#readBarRecordBtn"); await settle(page, 900);
    const rc = await ev(page, () => { const sh = document.querySelector("[data-ayah-sheet]"); const r = sh?.getBoundingClientRect(); const c = sh?.querySelector("[data-ayah-sheet-close]")?.getBoundingClientRect(); return { open: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), unit: sh?.dataset.unitKey, stages: sh ? sh.querySelectorAll("[data-approach-stage-btn]").length : 0, r: r && { l: r.left, r: r.right, t: r.top, b: r.bottom }, closeOn: !!c && c.width > 0 && c.top >= 0 && c.right <= innerWidth + 1 }; });
    if (PROBE) console.log(t, "record", JSON.stringify(rc));
    check(`${t}: Record Your Progress opens the card for the chosen unit (ayah:1:1) with the stage buttons, inside the screen`, rc.open && rc.unit === "ayah:1:1" && rc.stages === 6 && rc.r.l >= -1 && rc.r.r <= vw + 1 && rc.r.t >= -1 && rc.r.b <= vh + 1 && rc.closeOn, JSON.stringify(rc));
    await closeSheet(page);
    // Take an Approach
    await tapBar(page, "#readBarTakeBtn"); await settle(page, 1200);
    const tk = await ev(page, () => { const w = document.getElementById("wheelSection").getBoundingClientRect(); return { readHidden: document.getElementById("readView").hidden, wheelH: w.height, wheelW: w.width, segs: document.querySelectorAll("#wheelContainer .wheel-seg").length, sheet: document.getElementById("ayahActionSheetOverlay")?.classList.contains("open") }; });
    if (PROBE) console.log(t, "take", JSON.stringify(tk));
    check(`${t}: Take an Approach shows the Approach wheel (Read view hidden, the wheel drawn with its Approach slices)`, tk.readHidden && tk.wheelH > 100 && tk.segs >= 3 && !tk.sheet, JSON.stringify(tk));
    check(`${t}: no sideways scroll`, await ev(page, () => document.documentElement.scrollWidth <= innerWidth + 1));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 2: Record Your Progress -- the write and the re-render.
  await flow("record", lang, width, async (t, page, ctx, errors) => {
    await openRead(page);
    await tapBar(page, "#readBarRecordBtn"); await settle(page, 900);
    let st = await stageState(page);
    check(`${t}: POSITIVE CONTROL the stage buttons start disabled until an Approach is chosen`, st.length === 6 && st.every(([, d]) => d), JSON.stringify(st));
    await pickApproach(page, "recite");
    st = await stageState(page);
    check(`${t}: choosing an Approach enables the stage buttons (Recite correctly, not started)`, st.every(([, d]) => !d) && st.find(([s]) => s === "not_started")?.[2] === "true", JSON.stringify(st));
    const n = await writeCount(page);
    await ev(page, () => document.querySelector('[data-ayah-sheet] [data-approach-stage-btn="practising"]').click());
    await settle(page, 1500);
    const w = await writes(page, n);
    if (PROBE) console.log(t, JSON.stringify(w).slice(0, 500));
    const rec = w.find((x) => x.col === "records" && x.id === "t1__p1__surah_1" && x.data?.["entries.ayah:1:1::recite"]?.claimedStatus === "practising");
    check(`${t}: Practising is written to Ahsan's surah_1 record under ayah:1:1::recite, claimed by Ahsan`, !!rec && rec.data["entries.ayah:1:1::recite"].claimedByPersonId === "p1" && rec.data["entries.ayah:1:1::recite"].trackableId === "recite", JSON.stringify(w.map((x) => [x.col, x.id])));
    check(`${t}: nothing was written for Maryam`, !w.some((x) => /__p2__/.test(String(x.id))), JSON.stringify(w.map((x) => x.id)));
    check(`${t}: an activity line was logged for the claim`, w.some((x) => /activity/.test(String(x.col))), JSON.stringify(w.map((x) => x.col)));
    st = await stageState(page);
    check(`${t}: after the card redraws, Practising is the pressed stage`, st.find(([s]) => s === "practising")?.[2] === "true" && st.find(([s]) => s === "not_started")?.[2] !== "true", JSON.stringify(st));
    // close, reopen: the status survives the re-render
    await closeSheet(page);
    await tapBar(page, "#readBarRecordBtn"); await settle(page, 900);
    await pickApproach(page, "recite");
    st = await stageState(page);
    check(`${t}: reopened, the card still shows Practising for that Approach`, st.find(([s]) => s === "practising")?.[2] === "true", JSON.stringify(st));
    const summary = await ev(page, () => document.querySelector("[data-ayah-sheet]").innerText);
    check(`${t}: the card's status line names the new stage for Recite correctly`, lang === "bn" ? true : /Recite correctly: Practising/.test(summary), summary.slice(0, 300));
    await closeSheet(page);
    // Know Your Status reads the claim: Recite correctly gains a non-zero count
    await tapBar(page, "#readBarStatusBtn"); await settle(page, 1500);
    const ms = await ev(page, () => document.getElementById("myStatusBody").innerText.replace(/\s+/g, " "));
    check(`${t}: Know Your Status still opens after the claim and lists the Approaches`, ms.length > 100, ms.slice(0, 200));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 3: 👥 Recording for family members.
  await flow("family", lang, width, async (t, page, ctx, errors) => {
    await openRead(page);
    await tapBar(page, "#readBarRecordBtn"); await settle(page, 900);
    const pk = await ev(page, () => { const r = document.querySelector("[data-claim-for]"); const b = r?.querySelector("[data-assign-trigger]")?.getBoundingClientRect(); return r ? { label: r.querySelector("[data-assign-trigger-label]").textContent, rows: [...r.querySelectorAll("[data-assign-list] input")].map((i) => [i.value, i.checked]), h: b.height, w: b.width, inside: b.left >= 0 && b.right <= innerWidth + 1 } : null; });
    if (PROBE) console.log(t, JSON.stringify(pk));
    check(`${t}: POSITIVE CONTROL 👥 shows, naming the Student (${NAMES[lang][0]}) alone ticked`, !!pk && pk.label === NAMES[lang][0] && JSON.stringify(pk.rows) === JSON.stringify([["p1", true], ["p2", false]]), JSON.stringify(pk));
    check(`${t}: 👥 is a tap target (>=36px) inside the screen`, !!pk && pk.h >= 36 && pk.inside, JSON.stringify(pk));
    await pickApproach(page, "recite");
    // tick Maryam, untick Ahsan: record for Maryam only
    await page.click("[data-claim-for] [data-assign-trigger]"); await settle(page, 200);
    const pop = await rectOf(page, "[data-claim-for] [data-assign-popover]");
    check(`${t}: the 👥 list opens inside the screen`, inside(pop, width, width > 600 ? 900 : 844), JSON.stringify(pop));
    await page.click('[data-claim-for] [data-assign-list] input[value="p2"]');
    await page.click('[data-claim-for] [data-assign-list] input[value="p1"]');
    await page.click("[data-claim-for] [data-assign-trigger]"); await settle(page, 150);
    const lbl = await page.textContent("[data-claim-for] [data-assign-trigger-label]");
    check(`${t}: with only Maryam ticked the chip names her`, lbl === NAMES[lang][1], lbl);
    let n = await writeCount(page);
    await ev(page, () => document.querySelector('[data-ayah-sheet] [data-approach-stage-btn="learning"]').click());
    await settle(page, 1500);
    let w = await writes(page, n);
    if (PROBE) console.log(t, JSON.stringify(w).slice(0, 600));
    const forP2 = w.find((x) => x.col === "records" && x.id === "t1__p2__surah_1" && x.data?.["entries.ayah:1:1::recite"]?.claimedStatus === "learning");
    check(`${t}: Learning is written for Maryam (p2) on ayah:1:1::recite`, !!forP2 && forP2.data["entries.ayah:1:1::recite"].claimedByPersonId, JSON.stringify(w.map((x) => [x.col, x.id])));
    check(`${t}: nothing is written to Ahsan's own record (D10: no handover, his record is unchanged)`, !w.some((x) => x.col === "records" && x.id === "t1__p1__surah_1"), JSON.stringify(w.map((x) => [x.col, x.id])));
    const act = w.find((x) => /activity/.test(String(x.col)) && /__p2__/.test(String(x.id)));
    check(`${t}: the activity line is Maryam's`, !!act, JSON.stringify(w.map((x) => [x.col, x.id])));
    const notice = await ev(page, () => document.getElementById("qrStudyNotice")?.textContent || "");
    check(`${t}: the page says it was recorded for Maryam`, notice.includes(NAMES[lang][1]), notice);
    const st = await stageState(page);
    check(`${t}: Ahsan's card still shows his own stage (not started), not Maryam's`, st.find(([s]) => s === "not_started")?.[2] === "true" && st.find(([s]) => s === "learning")?.[2] !== "true", JSON.stringify(st));
    // both: tick Ahsan too, record practising
    await page.click("[data-claim-for] [data-assign-trigger]"); await settle(page, 150);
    await page.click('[data-claim-for] [data-assign-list] input[value="p1"]');
    await page.click("[data-claim-for] [data-assign-trigger]"); await settle(page, 150);
    n = await writeCount(page);
    await ev(page, () => document.querySelector('[data-ayah-sheet] [data-approach-stage-btn="practising"]').click());
    await settle(page, 1500);
    w = await writes(page, n);
    const ids = w.filter((x) => x.col === "records" && x.data?.["entries.ayah:1:1::recite"]?.claimedStatus === "practising").map((x) => x.id).sort();
    check(`${t}: with both ticked, Practising is written for both Ahsan and Maryam`, ids.join() === "t1__p1__surah_1,t1__p2__surah_1", JSON.stringify(ids));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 3b (Architect's review): the same 👥 list in Explore's Take ▸ sheet. Its long title ("Record your progress for the
  // whole Surah") pushes the 👥 row onto its own line, which the Read view's sheet never does: this is where popleft shows.
  await flow("familyexplore", lang, width, async (t, page, ctx, errors) => {
    await page.click("#tabExploreBtn");
    await page.waitForFunction(() => !!document.querySelector("#exploreWheelContainer svg"), null, { timeout: 15000 });
    await ev(page, () => { const s = [...document.querySelectorAll("#exploreWheelContainer .wheel-seg")].filter((x) => x.dataset.key === "81" && (!x.dataset.ringKind || x.dataset.ringKind === "surah")); s[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await page.waitForFunction(() => !!document.querySelector(".aa-wheel, #exploreModeRow button"), null, { timeout: 15000 });
    await settle(page, 400);
    await page.click('[data-aa-row="recite"] .aa-take');
    await page.waitForSelector(".aa-sheet [data-claim-for] [data-assign-trigger]", { timeout: 8000 });
    const wrapped = await ev(page, () => document.querySelector(".aa-sheet [data-claim-for]").getBoundingClientRect().top > document.querySelector(".aa-sheet [data-gac-record-title]").getBoundingClientRect().bottom - 2);
    if (PROBE) console.log(t, "wrapped", wrapped);
    check(`${t}: POSITIVE CONTROL Explore's Take ▸ sheet carries the 👥 picker${lang === "en" && width === 320 ? ", and its row wraps onto its own line (the case under test)" : ""}`, lang === "en" && width === 320 ? wrapped : true, `wrapped=${wrapped}`);
    await page.click(".aa-sheet [data-claim-for] [data-assign-trigger]"); await settle(page, 300);
    const pop = await rectOf(page, ".aa-sheet [data-claim-for] [data-assign-popover]");
    check(`${t}: in Explore's Take ▸ sheet the 👥 list opens inside the screen${wrapped ? " (its row wraps here)" : ""}`, inside(pop, width, width > 600 ? 900 : 844), JSON.stringify(pop));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 4: the Approach card -- Track / Guide / Breakdown / Coverage.
  await flow("approachcard", lang, width, async (t, page, ctx, errors) => {
    await page.waitForFunction(() => document.querySelector('#wheelContainer .wheel-seg[data-key="memorise"]'), null, { timeout: 10000 });
    await page.$eval('#wheelContainer .wheel-seg[data-key="memorise"]', (e) => e.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await page.waitForFunction(() => document.querySelector(".rnp-track:not([hidden]) .way-tab-btn"), null, { timeout: 10000 }).catch(() => {});
    await settle(page, 600);
    const tabs = await ev(page, () => [...document.querySelectorAll(".rnp-track .way-tab-btn")].map((b) => b.dataset.tab));
    if (PROBE) console.log(t, JSON.stringify(tabs));
    check(`${t}: POSITIVE CONTROL the Approach card opens with four tabs`, tabs.join() === "Track,Guide,Breakdown,Coverage", JSON.stringify(tabs));
    for (const tab of ["Track", "Guide", "Breakdown", "Coverage"]) {
      await ev(page, (tb) => document.querySelector(`.rnp-track .way-tab-btn[data-tab="${tb}"]`).click(), tab);
      await settle(page, 250);
      const p = await ev(page, (tb) => { const pn = document.querySelector(`.rnp-track .way-tab-panel[data-tab="${tb}"]`); const r = pn.getBoundingClientRect(); const b = document.querySelector(`.rnp-track .way-tab-btn[data-tab="${tb}"]`); return { active: pn.classList.contains("active") && b.classList.contains("active"), shown: getComputedStyle(pn).display !== "none" && r.height > 0, textLen: pn.innerText.trim().length, btnOn: b.getBoundingClientRect().right <= document.querySelector(".rnp-track .way-tab-bar").getBoundingClientRect().right + 1 && b.getBoundingClientRect().right <= innerWidth + 1 && b.getBoundingClientRect().width > 0, others: [...document.querySelectorAll(".rnp-track .way-tab-panel.active")].length }; }, tab);
      if (PROBE) console.log(t, tab, JSON.stringify(p));
      check(`${t}: the ${tab} tab opens, is the only panel showing, and has content`, p.active && p.shown && p.textLen > 15 && p.btnOn && p.others === 1, JSON.stringify(p));
    }
    const cov = await ev(page, () => document.querySelector('.rnp-track .way-tab-panel[data-tab="Coverage"]').innerText);
    check(`${t}: Coverage shows the ayah-by-ayah strip or says in words why not`, cov.trim().length > 15, cov.slice(0, 120));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 5: Records page.
  await flow("records", lang, width, async (t, page, ctx, errors) => {
    const r = await ev(page, () => ({ rows: [...document.querySelectorAll("#entriesBody tr")].map((x) => x.innerText.replace(/\s+/g, " ").trim()), chunk: document.getElementById("chunkLabel").textContent, people: [...document.getElementById("personSelect").options].map((o) => o.value), sw: document.documentElement.scrollWidth, vw: innerWidth }));
    if (PROBE) console.log(t, JSON.stringify(r));
    check(`${t}: POSITIVE CONTROL the Records page lists Ahsan's three seeded records`, r.rows.length === 3, JSON.stringify(r.rows));
    check(`${t}: the rows name the unit, Approach and stage`, r.rows[0].includes(refText(lang, "1:1")) && r.rows[1].includes(refText(lang, "1:2")), r.rows[0]);
    check(`${t}: no sideways scroll`, r.sw <= r.vw + 1, `${r.sw} > ${r.vw}`);
    // filter: pending only
    await page.check("#pendingOnly"); await settle(page, 500);
    const pend = await ev(page, () => [...document.querySelectorAll("#entriesBody tr")].map((x) => x.innerText.replace(/\s+/g, " ").trim()));
    check(`${t}: "pending only" keeps just the record awaiting confirmation (1:1)`, pend.length === 1 && pend[0].includes(refText(lang, "1:1")), JSON.stringify(pend));
    await page.uncheck("#pendingOnly"); await settle(page, 400);
    const back = await ev(page, () => document.querySelectorAll("#entriesBody tr").length);
    check(`${t}: unticking brings all three back`, back === 3, String(back));
    // filter: another chunk (surah 2 has no records)
    await page.fill("#unitRef", "2:255"); await page.dispatchEvent("#unitRef", "change"); await settle(page, 700);
    const s2 = await ev(page, () => ({ chunk: document.getElementById("chunkLabel").textContent, rows: [...document.querySelectorAll("#entriesBody tr")].map((x) => x.innerText.replace(/\s+/g, " ").trim()) }));
    check(`${t}: a reference in another surah (2:255) switches the chunk and the list`, s2.chunk.includes("surah_2") && !s2.rows.some((x) => x.includes(refText(lang, "1:1"))), JSON.stringify(s2));
    // filter: another person
    await page.fill("#unitRef", "1:1"); await page.dispatchEvent("#unitRef", "change"); await settle(page, 500);
    // The person picker lives in Home > My account on this page (account-card.js moves it there).
    // The "My account" button sits in the nav's Home group (a <details>): open it the way a reader does, by tapping its summary.
    if (await ev(page, () => { const d = document.querySelector("[data-open-account-card]").closest("details"); return !!d && !d.open; })) { await page.click("details.nav-cat-home > summary"); await settle(page, 300); }
    await page.click("[data-open-account-card]"); await settle(page, 300);
    const acct = await rectOf(page, "#accountCardOverlay .account-sheet");
    check(`${t}: Home > My account opens the card holding the person picker, inside the screen`, inside(acct, width, width > 600 ? 900 : 844), JSON.stringify(acct));
    await page.selectOption("#personSelect", "p2"); await settle(page, 800);
    await page.click("#accountCardClose"); await settle(page, 200);
    const p2 = await ev(page, () => [...document.querySelectorAll("#entriesBody tr")].map((x) => x.innerText.replace(/\s+/g, " ").trim()));
    check(`${t}: choosing Maryam shows her records, not Ahsan's`, !p2.some((x) => x.includes(refText(lang, "1:2"))), JSON.stringify(p2));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, "/app/records.html");

  // 6: Monitor reports.
  await flow("monitor", lang, width, async (t, page, ctx, errors) => {
    const m = await ev(page, () => ({ range: document.getElementById("rangeLabel").textContent, body: document.getElementById("reportBody").innerText, quran: document.getElementById("quranBody").innerText, sw: document.documentElement.scrollWidth, vw: innerWidth }));
    if (PROBE) console.log(t, JSON.stringify(m).slice(0, 400));
    check(`${t}: POSITIVE CONTROL the weekly report renders a range and Ahsan's entries`, m.range.length > 5 && m.body.includes(NAMES[lang][0]), m.range);
    check(`${t}: the Qur'an Approach breakdown renders its rows`, m.quran.split("\n").length >= 3, m.quran.slice(0, 100));
    check(`${t}: no sideways scroll on the page`, m.sw <= m.vw + 1, `${m.sw} > ${m.vw}`);
    // CSV
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 6000 }).catch(() => null), page.click("#csvBtn")]);
    let csv = "";
    if (dl) { const p = await dl.path(); csv = fs.readFileSync(p, "utf8"); }
    check(`${t}: CSV export downloads monitor-week-<date>.csv`, !!dl && /^monitor-week-\d{4}-\d\d-\d\d\.csv$/.test(dl.suggestedFilename()), dl ? dl.suggestedFilename() : "no download");
    // The week label names its first and last day in one unambiguous style, and the first day IS the week the CSV is for.
    const wkKey = await weekKeyRead(page);
    const firstDay = wkKey ? new Date(wkKey + "T00:00:00Z").toLocaleDateString(lang === "bn" ? "bn-BD" : undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "?";
    check(`${t}: the week label reads "${lang === "bn" ? "সপ্তাহ: <d> থেকে <d>" : "Week: <d> to <d>"}", with a month name (no 10/10/2026), starting on the week it read (${wkKey})`, (lang === "bn" ? /^সপ্তাহ: .+ থেকে .+$/ : /^Week: .+ to .+$/).test(m.range) && !/\//.test(m.range) && m.range.includes(refText(lang, firstDay)), `${m.range} / first day ${firstDay}`);
    check(`${t}: the CSV has a header row and a data row for Ahsan`, csv.split("\n").length >= 2 && csv.includes(NAMES[lang][0]), csv.slice(0, 200));
    // Monthly
    await page.click("#monthTabBtn"); await settle(page, 700);
    const mo = await ev(page, () => ({ range: document.getElementById("rangeLabel").textContent, body: document.getElementById("reportBody").innerText, controls: !document.getElementById("monthControls").hidden }));
    check(`${t}: the monthly view renders (month label, report body)`, mo.controls && mo.range.length > 4 && mo.body.includes(NAMES[lang][0]) && mo.range !== m.range, JSON.stringify(mo).slice(0, 200));
    await page.click("#monthPrevBtn"); await settle(page, 600);
    const prev = await ev(page, () => document.getElementById("rangeLabel").textContent);
    check(`${t}: the previous-month button moves the label`, prev !== mo.range, `${prev} vs ${mo.range}`);
    await page.click("#monthNextBtn"); await settle(page, 400);
    const [dl2] = await Promise.all([page.waitForEvent("download", { timeout: 6000 }).catch(() => null), page.click("#csvBtn")]);
    check(`${t}: the monthly CSV downloads monitor-month-<month>.csv`, !!dl2 && /^monitor-month-\d{4}-\d\d\.csv$/.test(dl2.suggestedFilename()), dl2 ? dl2.suggestedFilename() : "no download");
    // Print
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(String(e)));
    const [pop] = await Promise.all([page.waitForEvent("popup", { timeout: 6000 }).catch(() => null), page.click("#printBtn")]);
    const html = pop ? await pop.content() : "";
    check(`${t}: Print opens a report window holding the report`, !!pop && html.includes(NAMES[lang][0]) && /<h1>/.test(html), html.slice(0, 150));
    if (pop) await pop.close().catch(() => {});
    check(`${t}: Print raises no error`, pageErrors.length === 0, pageErrors.join(" | "));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, "/app/monitor.html");
}

// 6b (Architect): Monitor on a device west of Greenwich. The week's days are UTC midnights; formatted in the
// device's own zone they read a day early, so the label's first day must still be the week the page read.
if (!LONLY || LONLY === "en") {
  await flow("monitortz", "en", 390, async (t, page) => {
    const tz = await ev(page, () => Intl.DateTimeFormat().resolvedOptions().timeZone);
    check(`${t}: POSITIVE CONTROL the page's clock is in Los Angeles`, tz === "America/Los_Angeles", tz);
    const range = await ev(page, () => document.getElementById("rangeLabel").textContent);
    const wkKey = await weekKeyRead(page);
    const firstDay = wkKey ? new Date(wkKey + "T00:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "?";
    check(`${t}: in Los Angeles the week label still starts on the week it read (${wkKey})`, range.startsWith(`Week: ${firstDay} to `), `${range} / first day ${firstDay}`);
  }, "/app/monitor.html", "America/Los_Angeles");
}

// 7: Bangla -- no English left on these features (390px).
if (!LONLY || LONLY === "bn") {
  await flow("bnleak", "bn", 390, async (t, page) => {
    await openRead(page);
    const seen = {};
    seen.bar = await ev(page, () => document.getElementById("readApproachBar").innerText);
    await tapBar(page, "#readBarStatusBtn"); await settle(page, 1200);
    seen.status = await ev(page, () => document.getElementById("myStatusCard").innerText);
    await page.click("#myStatusCloseBtn"); await settle(page, 300);
    await tapBar(page, "#readBarRecordBtn"); await settle(page, 900);
    await pickApproach(page, "recite");
    seen.record = await ev(page, () => document.querySelector("[data-ayah-sheet] .ayah-sheet-approach-select")?.closest("section, div")?.innerText ?? "");
    seen.recordCard = await ev(page, () => [...document.querySelectorAll("[data-ayah-sheet] [data-approach-stage-btn]")].map((b) => b.textContent).join(" ") + " " + (document.querySelector("[data-gac-record-title]")?.textContent ?? "") + " " + (document.querySelector("[data-claim-for]")?.innerText ?? ""));
    await closeSheet(page);
    await tapBar(page, "#readBarTakeBtn"); await settle(page, 1000);
    await page.$eval('#wheelContainer .wheel-seg[data-key="memorise"]', (e) => e.dispatchEvent(new MouseEvent("click", { bubbles: true }))).catch(() => {});
    await page.waitForFunction(() => document.querySelector(".rnp-track:not([hidden]) .way-tab-btn"), null, { timeout: 8000 }).catch(() => {});
    seen.tabs = await ev(page, () => [...document.querySelectorAll(".rnp-track .way-tab-btn")].map((b) => b.textContent).join(" "));
    for (const [k, v] of Object.entries(seen)) {
      const left = englishLeft(v);
      if (PROBE) console.log(t, k, JSON.stringify(left));
      check(`${t}: ${k}: POSITIVE CONTROL there is Bangla text to scan`, /[ঀ-৿]/.test(v), String(v).slice(0, 80));
      check(`${t}: ${k}: no English left (${left.slice(0, 5).join(", ") || "none"})`, left.length === 0, JSON.stringify(left));
    }
  });
  for (const [name, pth] of [["records", "/app/records.html"], ["monitor", "/app/monitor.html"]]) {
    await flow(`bnleak-${name}`, "bn", 390, async (t, page) => {
      const text = await ev(page, () => document.getElementById("app").innerText);
      const left = englishLeft(text);
      if (PROBE) console.log(t, JSON.stringify(left));
      check(`${t}: the ${name} page has no English left (${left.slice(0, 6).join(", ") || "none"})`, left.length === 0, JSON.stringify(left));
    }, pth);
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

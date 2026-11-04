// PCF MSA J42 (the Owner, 19 Oct 2026, Read view on Yā-Sīn 36:8, Single Ayah): "Enable Bookmark here for entire
// family and enable choice of unit."
//   * The bookmark dialog's "Assign to" starts with a one-tap "Everyone in the family" (2+ people).
//   * The unit choice is offered on Single Ayah too: This āyah, This page, This rukūʿ, Whole sūrah, This juz -- and,
//     since v12.68 (the Owner, 25 Oct: "Range is missing here. Enable."), Range as a sixth, last choice.
//
// Run from the repository root with serve.js running. SHOT_DIR=... saves screenshots.
// Mutations (--mutate=NAME) each put the old behaviour back; the checks named beside each must FAIL:
//   ayahonly    Single Ayah gets no choices (as before)       -> the six-choices checks
//   noruku      the rukūʿ choice is left out                   -> "six choices in order"
//   unitpos     the picked unit's position ignored             -> "Whole sūrah saves surah:36"
//   noeveryone  ticking Everyone ticks nobody                  -> "Everyone ticks all"
//   nosync      Everyone never shows ticked when all are       -> "shows as ticked when all are ticked by hand"
//   noask       ★ on a bookmarked unit removes/opens at once    -> "★ asks first"
//   nobn        "Whole sūrah" has no Bangla                    -> "Bangla has no English"
//   nowrap      chips do not wrap                              -> layout "whole / no sideways"
//   short       chips 20px tall                                -> "40px tall"
import fs from "node:fs";
import { chromium, newContext, openPage, clickReadTool } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  // Re-anchored 1 Nov 2026 (QR Lead 3c): the guard now also lets the Āyah card hand in its own āyah (`at`).
  ayahonly: ["app/quranrevival.html", 'if ((!at && stageView !== "read") || !currentSurahData) return [];', 'if ((!at && stageView !== "read") || !currentSurahData || info.unitType === "ayah") return [];'],
  noruku: ["app/quranrevival.html", "if (idx && inRuku.length) {", "if (false) {"],
  unitpos: ["app/quranrevival.html", "position: picked?.position ?? unitKey,", "position: unitKey,"],
  noeveryone: ["app/js/bookmark-popover.js", "b.checked = everyoneBox.checked || b.value === selectedPersonId;", "b.checked = b.value === selectedPersonId;"],
  nosync: ["app/js/bookmark-popover.js", "everyoneBox.checked = boxes.length > 0 && boxes.every((b) => b.checked);", "everyoneBox.checked = false;"],
  noask: ["app/quranrevival.html", "if (existing && toggle) {\n        const pick", "if (false) {\n        const pick"],
  nobn: ["app/js/i18n/bn.js", '"Whole sūrah": "পূর্ণ সূরা",', ""],
  nowrap: ["app/js/bookmark-popover.js", "display: flex; flex-wrap: wrap; gap: 0.35rem;", "display: flex; flex-wrap: nowrap; gap: 0.35rem; } .bm-pop-units button { flex-shrink: 0 !important; white-space: nowrap !important;"],
  short: ["app/js/bookmark-popover.js", "flex: 0 1 auto; min-height: 40px;", "flex: 0 1 auto; min-height: 20px; height: 20px;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const SHOTS = process.env.SHOT_DIR;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const surah36 = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/surahs/surah_036.json", "utf8"));
const rec8 = surah36.ayahs.find((a) => a.ayah === 8);

async function open({ lang = "en", w = 390, h = 844 } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => {
      const src = fs.readFileSync(file, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page, errors };
}
const setSel = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
/** The Read view on Yā-Sīn 36:8, Single Ayah. */
async function readView(page, { ayah = "8" } = {}) {
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await setSel(page, "surahSelect", "36"); await page.waitForTimeout(1500);
  await setSel(page, "unitTypeSelect", "ayah"); await page.waitForTimeout(800);
  await setSel(page, "ayahSelect", ayah); await page.waitForTimeout(800);
}
async function openDialog(page) {
  await page.evaluate(() => { window.__stubWriteData = []; });
  await clickReadTool(page, "#readBookmarkBtn");
  await page.waitForSelector(".bm-popover", { timeout: 5000 });
  if (await page.$("[data-bm-exists-add]")) { await page.click("[data-bm-exists-add]"); await page.waitForSelector("[data-bm-pop-save]", { timeout: 5000 }); }
}
async function pickUnit(page, id) {
  if (await page.$(`[data-bm-pop-unit="${id}"]`)) await page.click(`[data-bm-pop-unit="${id}"]`);
  else console.log(`  note  no "${id}" choice in the dialog`);
}
async function save(page) { await page.click("[data-bm-pop-save]"); await page.waitForTimeout(900); }
const writes = (page) => page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "bookmarks"));
const lastSaved = (ws, docId) => { const w = ws.filter((x) => x.id === docId && x.data.saved).at(-1); return w ? w.data.saved.at(-1) : null; };
const chips = (page) => page.evaluate(() => [...document.querySelectorAll("[data-bm-pop-unit]")].map((b) => ({ id: b.dataset.bmPopUnit, text: b.textContent, on: b.getAttribute("aria-checked"), h: b.getBoundingClientRect().height })));
const nameOf = (page) => page.evaluate(() => document.querySelector("[data-bm-pop-name]").value);

// ---- Single Ayah: six choices in order (Range last, v12.68), names, keys -------------------------------------------------------------
{
  const tag = "[en 390 Yā-Sīn 36:8]";
  const { ctx, page, errors } = await open({});
  await readView(page);
  await openDialog(page);
  const cs = await chips(page);
  check(`${tag} Single Ayah offers six choices in order: āyah, page, rukūʿ, sūrah, juz, Range (āyah picked)`, cs.map((c) => `${c.id}:${c.on}`).join(",") === "ayah:true,page:false,ruku:false,surah:false,juz:false,range:false"
    && cs.map((c) => c.text).join("|") === "This āyah|This page|This rukūʿ|Whole sūrah|This juz|Range", JSON.stringify(cs));
  check(`${tag} every choice is 40px tall`, cs.length === 6 && cs.every((c) => c.h >= 40), JSON.stringify(cs));
  check(`${tag} the default Name is the āyah's`, /36:8/.test(await nameOf(page)), await nameOf(page));
  await pickUnit(page, "page");
  check(`${tag} This page names Page ${rec8.page}`, (await nameOf(page)) === `Page ${rec8.page}`, await nameOf(page));
  await pickUnit(page, "juz");
  check(`${tag} This juz names Juz ${rec8.juz}`, (await nameOf(page)) === `Juz ${rec8.juz}`, await nameOf(page));
  await pickUnit(page, "ruku");
  check(`${tag} This rukūʿ names a rukūʿ of sūrah 36`, /Ruku' \d+ of Surah 36/.test(await nameOf(page)), await nameOf(page));
  await pickUnit(page, "surah");
  await save(page);
  const bm = lastSaved(await writes(page), "t1__p1");
  check(`${tag} Whole sūrah saves the sūrah key surah:36 (opening as the Whole Surah unit)`, bm?.position === "surah:36" && bm?.settings?.unitType === "surah", JSON.stringify(bm));
  // Other keys, one each.
  for (const [id, want] of [["page", `page:madani:${rec8.page}`], ["juz", `juz:${rec8.juz}`]]) {
    await openDialog(page); await pickUnit(page, id); await save(page);
    const b = lastSaved(await writes(page), "t1__p1");
    check(`${tag} ${id} saves ${want}`, b?.position === want, JSON.stringify(b?.position));
  }
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---- A wider selected unit keeps its place first (Range, v12.68, comes last) ----------------------------------
{
  const { ctx, page } = await open({});
  await readView(page);
  await setSel(page, "unitTypeSelect", "juz"); await page.waitForTimeout(800);
  await openDialog(page);
  const cs = await chips(page);
  check("[en 390 Juz unit] the selected unit (juz) is first and picked, the rest follow", cs[0]?.id === "juz" && cs[0]?.on === "true" && cs.length === 6, JSON.stringify(cs));
  await ctx.close();
}

// ---- Everyone in the family ----------------------------------------------------------------------------------------
{
  const tag = "[en 390 family]";
  const { ctx, page } = await open({});
  await readView(page);
  await openDialog(page);
  const info = await page.evaluate(() => ({
    first: document.querySelector(".bm-popover [data-bm-pop-everyone]")?.closest("label")?.textContent.trim() ?? null,
    everyoneChecked: document.querySelector("[data-bm-pop-everyone]")?.checked,
    people: [...document.querySelectorAll("[data-bm-pop-assignees] input")].map((c) => c.value),
  }));
  check(`${tag} positive control: the roster has 2+ people and "Everyone in the family" leads Assign to, unticked`, info.people.length >= 2 && info.first === "Everyone in the family" && info.everyoneChecked === false, JSON.stringify(info));
  await page.evaluate(() => document.querySelector("[data-bm-pop-everyone]").click());
  const all = await page.evaluate(() => [...document.querySelectorAll("[data-bm-pop-assignees] input")].every((c) => c.checked));
  check(`${tag} ticking Everyone ticks all`, all);
  await page.evaluate(() => document.querySelector("[data-bm-pop-everyone]").click());
  const left = await page.evaluate(() => [...document.querySelectorAll("[data-bm-pop-assignees] input")].filter((c) => c.checked).map((c) => c.value));
  check(`${tag} unticking Everyone leaves only the reader`, left.join(",") === "p1", left.join(","));
  // By hand: tick each person.
  for (const id of info.people) await page.evaluate((v) => { const c = [...document.querySelectorAll("[data-bm-pop-assignees] input")].find((x) => x.value === v); if (!c.checked) c.click(); }, id);
  check(`${tag} Everyone shows as ticked when all are ticked by hand`, await page.evaluate(() => document.querySelector("[data-bm-pop-everyone]").checked));
  await page.evaluate(() => { const c = [...document.querySelectorAll("[data-bm-pop-assignees] input")].at(-1); c.click(); });
  check(`${tag} ...and not when one is unticked again`, !(await page.evaluate(() => document.querySelector("[data-bm-pop-everyone]").checked)));
  await page.evaluate(() => document.querySelector("[data-bm-pop-everyone]").click());
  await save(page);
  const ws = await writes(page);
  const perDoc = info.people.map((p) => ({ p, n: ws.filter((x) => x.id === `t1__${p}` && x.data.saved).length, bm: lastSaved(ws, `t1__${p}`) }));
  check(`${tag} Everyone saves one copy per person, each in their own document`, perDoc.every((d) => d.n === 1 && d.bm?.position?.startsWith("ayah:36:")) && ws.filter((x) => x.data.saved).length === info.people.length, JSON.stringify(perDoc.map((d) => [d.p, d.n])));
  await ctx.close();
}

// ---- ★ asks first --------------------------------------------------------------------------------------------------
{
  const tag = "[en 390 ★]";
  const { ctx, page } = await open({});
  await readView(page);
  await openDialog(page);
  await save(page);
  await page.evaluate(() => { window.__stubWriteData = []; });
  await page.evaluate(() => document.getElementById("readBookmarkBtn").click());
  await page.waitForTimeout(600);
  const asked = await page.$("[data-bm-exists-choice]");
  check(`${tag} ★ on a bookmarked unit asks first (remove, or add another)`, !!asked && !!(await page.$("[data-bm-exists-remove]")) && !!(await page.$("[data-bm-exists-add]")));
  check(`${tag} nothing was written before a button is pressed`, (await writes(page)).length === 0);
  if (asked) {
    await page.click("[data-bm-exists-add]");
    await page.waitForSelector("[data-bm-pop-save]", { timeout: 5000 });
    check(`${tag} "Add a bookmark…" opens the same dialog with the six choices (Range, v12.68)`, (await chips(page)).length === 6);
  }
  await ctx.close();
}

// ---- Bangla: no English left in the dialog -------------------------------------------------------------------------
{
  const { ctx, page } = await open({ lang: "bn" });
  await readView(page);
  await openDialog(page);
  const txt = await page.evaluate(() => {
    const pop = document.querySelector(".bm-popover").cloneNode(true);
    pop.querySelectorAll(".who-name:not([data-x]), select, option").forEach((e) => e.remove()); // people's names and the folder/For lists are data
    const own = [...pop.querySelectorAll("h3,label,button,span,p")].map((e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ")).join(" ");
    const ev = document.querySelector("[data-bm-pop-everyone]")?.closest("label")?.textContent ?? "";
    return { own, ev };
  });
  const english = txt.own.match(/[A-Za-z]{2,}/g) || [];
  check("[bn 390] Bangla has no English left in the dialog (headings, labels, chips, buttons)", english.length === 0, JSON.stringify(english));
  check("[bn 390] Everyone reads পরিবারের সবাই", txt.ev.trim() === "পরিবারের সবাই", txt.ev);
  await ctx.close();
}

// ---- Layout: four widths, two languages ----------------------------------------------------------------------------
for (const lang of ["en", "bn"]) {
  for (const [w, h] of [[320, 640], [390, 844], [768, 1024], [1280, 800]]) {
    const tag = `[${lang} ${w} layout]`;
    const { ctx, page } = await open({ lang, w, h });
    await readView(page);
    await openDialog(page);
    const m = await page.evaluate(() => {
      const pop = document.querySelector(".bm-popover");
      const pr = pop.getBoundingClientRect();
      const btns = [...document.querySelectorAll("[data-bm-pop-unit]")].map((b) => { const r = b.getBoundingClientRect(); return { h: r.height, w: r.width, l: r.left, r: r.right, cutX: b.scrollWidth - b.clientWidth }; });
      const save = document.querySelector("[data-bm-pop-save]");
      save.scrollIntoView({ block: "nearest" });
      const sr = save.getBoundingClientRect();
      return { sx: document.documentElement.scrollWidth - innerWidth, popSx: pop.scrollWidth - pop.clientWidth, pop: [pr.left, pr.right, pr.top, pr.bottom], W: innerWidth, H: innerHeight, btns, popR: pr.right, saveVisible: sr.top >= 0 && sr.bottom <= innerHeight + 0.5 && sr.width > 0 };
    });
    check(`${tag} no sideways scroll, the dialog inside the screen`, m.sx <= 0 && m.popSx <= 0 && m.pop[0] >= 0 && m.pop[1] <= m.W + 0.5 && m.pop[3] <= m.H + 0.5, JSON.stringify(m));
    check(`${tag} six chips (Range, v12.68), each 40px tall, whole (nothing cut, inside the dialog)`, m.btns.length === 6 && m.btns.every((b) => b.h >= 40 && b.w > 0 && b.cutX <= 1 && b.l >= m.pop[0] - 0.5 && b.r <= m.popR + 0.5), JSON.stringify(m.btns));
    check(`${tag} Save is reachable`, m.saveVisible, JSON.stringify(m));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/bm-family-${lang}-${w}.png` });
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

// PCF MSA J100 (the Owner, 26 Oct 2026, a phone screenshot of Know Your Status, Surah, Approach 13):
//   1. "When select an approach in this status view, the wheel should display the status of that approach, which is
//      not." (ticked A: the wheel SWITCHES to that Approach's own wheel, one slice per unit, coloured by status)
//   2. "How about moving these selections of 2 rows buttons under one button on the top bar, one click shows the 2 bars
//      as it is now, otherwise remain hidden under one button, saves two rows." (ticked A)
// The records are seeded (Yes Approach approach_02: Surah 3 Achieved, Juz 1 Achieved, Surah 112's four āyāt Learning),
// so what each wheel must show is written BY HAND from the seed, and also checked against the app's own tile figure
// (the slices reading Achieved/Mastered must be exactly the units the tile counts).
// Run from the repository root with serve.js on :8080. Every mutation must make the suite exit 1:
//   nopickwheel   choosing an Approach keeps the 35-Approach wheel      -> the one-Approach wheel checks fail
//   norerender    the pull-down does not redraw the wheel              -> the "switches at once" checks fail
//   switchshown   the two rows are always open                         -> "closed until the button" fails
//   noclose       picking a unit leaves the two rows open              -> "picking a unit closes them" fails
//   cuttitle      the title is held on one line and clipped            -> "the title is not cut" fails (320, bn)
//   keylabel      an unnumbered slice falls back to its key            -> "no slice prints an Approach id" fails
import { chromium, newContext, openPage } from "./harness.mjs";
import { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES } from "../../app/js/catalogue-data.js";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
const HTML = "app/quranrevival.html";
const MUT = {
  nopickwheel: ["if (myStatusPick && quranTrackables.some((x) => x.id === myStatusPick)) {", "if (false) {"],
  norerender: ["if (box) { box.outerHTML = myStatusWheelBoxHtml(cache); attachMyStatusWheel(); }", "void box;"],
  switchshown: ['${myStatusSwitchOpen ? "" : " hidden"}>${buttons}</div>', ">${buttons}</div>"],
  noclose: ["myStatusSwitchOpen = false; // PCF MSA J100", "void 0; // PCF MSA J100"],
  keylabel: ['number: numbered ? num(s.unit) : "", statusId', "number: numbered ? num(s.unit) : null, statusId"],
  cuttitle: ["h2#myStatusTitle { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }", "h2#myStatusTitle { flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; }"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const WIDTHS = arg("width") ? [Number(arg("width"))] : [320, 394, 768, 1280];
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const YES = "approach_02", WBW = "approach_04";
if (!APPROACH_TEMPLATES.find((t) => t.id === YES) || !APPROACH_TEMPLATES.find((t) => t.id === WBW)) throw new Error("fixture Approach ids not in APPROACH_TEMPLATES");
const entry = (unitType, st) => `{ unitType: "${unitType}", subjectId: "quran", trackableId: "${YES}", claimedStatus: "${st}", claimedByPersonId: "p1", confirmedStatus: ${st === "learning" ? "null" : `"${st}"`}, confirmState: "${st === "learning" ? "pending" : "confirmed"}", domainIds: [], notes: "" }`;
const SEED = `
DATA.records.push(
  { _id: TENANT_ID + "__p1__surah_3", tenantId: TENANT_ID, personId: "p1", chunkKey: "surah_3", entries: { "surah:3::${YES}": ${entry("surah", "achieved")} } },
  { _id: TENANT_ID + "__p1__surah_112", tenantId: TENANT_ID, personId: "p1", chunkKey: "surah_112", entries: {
    "ayah:112:1::${YES}": ${entry("ayah", "learning")}, "ayah:112:2::${YES}": ${entry("ayah", "learning")},
    "ayah:112:3::${YES}": ${entry("ayah", "learning")}, "ayah:112:4::${YES}": ${entry("ayah", "learning")} } },
  { _id: TENANT_ID + "__p1__subject_quran", tenantId: TENANT_ID, personId: "p1", chunkKey: "subject_quran", entries: { "juz:1::${YES}": ${entry("juz", "achieved")} } }
);`;
const UNIT_WORD = { en: { all: "All units", surah: "Surah", juz: "Juz", ayah: "Āyah" }, bn: { all: "সব ইউনিট", surah: "সূরা", juz: "জুয", ayah: "আয়াত" } };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function start(lang, width) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 900 : 760 },
    seedTemplates: { SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.addInitScript(() => { try { localStorage.setItem("kysWheelUnit", "all"); } catch { /* none */ } });
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    const body = fs.readFileSync(HTML, "utf8");
    if (!body.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    await ctx.route(`**/${HTML}*`, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: body.split(a).join(b) }));
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(700);
  await page.evaluate(() => { const b = ["myStatusBtn", "myStatusWideBtn"].map((id) => document.getElementById(id)).find((e) => e && e.getBoundingClientRect().width > 0); (b ?? document.getElementById("myStatusWideBtn"))?.click(); });
  await page.waitForFunction(() => document.querySelectorAll("#myStatusBody [data-ms-row]").length > 0 && !!document.querySelector("#myStatusOverviewWheel svg"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(400);
  return { ctx, page, errors };
}
const header = (page) => page.evaluate(() => {
  const h = document.querySelector("#myStatusCard header").getBoundingClientRect();
  const R = (id) => { const e = document.getElementById(id); const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
  const title = document.getElementById("myStatusTitle"), btn = document.getElementById("myStatusUnitBtn"), sw = document.getElementById("myStatusWheelSwitch");
  const parts = ["myStatusBackBtn", "myStatusTitle", "myStatusUnitBtn", "myStatusCloseBtn"].map(R);
  const overlap = parts.some((a, i) => parts.some((b, j) => j > i && a.w > 0 && b.w > 0 && a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5));
  const hitBtn = (() => { const r = btn.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && btn.contains(e); })();
  return {
    titleWhole: title.scrollWidth <= title.clientWidth + 1 && title.scrollHeight <= title.clientHeight + 1, titleH: Math.round(title.getBoundingClientRect().height),
    inside: parts.every((p) => p.l >= h.left - 0.5 && p.r <= h.right + 0.5), overlap, headerH: Math.round(h.height),
    btnShown: btn.getBoundingClientRect().width > 0, btnH: Math.round(btn.getBoundingClientRect().height), hitBtn,
    word: btn.querySelector("[data-ms-unit-word]")?.textContent.trim(), expanded: btn.getAttribute("aria-expanded"),
    switchShown: !!sw && sw.getBoundingClientRect().height > 0, switchButtons: sw ? [...sw.querySelectorAll("button")].filter((b) => b.getBoundingClientRect().width > 0).length : 0,
    over: document.documentElement.scrollWidth - innerWidth,
  };
});
const wheel = (page) => page.evaluate(async () => {
  const { STATUS_COLORS } = await import("/app/js/mastery-wheel.js");
  const segs = [...document.querySelectorAll("#myStatusOverviewWheel .wheel-seg")];
  const fill = (e) => (e.getAttribute("fill") || "").toLowerCase();
  const of = (st) => segs.filter((e) => fill(e) === String(STATUS_COLORS[st]).toLowerCase()).length;
  const svg = document.querySelector("#myStatusOverviewWheel svg");
  // No slice may print its key (an Approach id) as a label -- found by looking at the first screenshot.
  const leak = [...(svg?.querySelectorAll("text") ?? [])].filter((x) => /approach_\d/.test(x.textContent)).length;
  return { leak, n: segs.length, keys: [...new Set(segs.map((e) => e.dataset.key))], achieved: of("achieved"), mastered: of("mastered"), learning: of("learning"),
    progress: svg ? svg.querySelectorAll(".wheel-seg-progress").length : 0, centre: svg?.textContent.replace(/\s+/g, " ").trim().slice(-80) ?? "" };
});
const tileN = (page, id, unit) => page.evaluate(([i, u]) => Number(document.querySelector(`#myStatusBody [data-ms-row="${i}"] .ms-tile[data-unit="${u}"]`)?.dataset.n ?? -1), [id, unit]);
const pick = async (page, v) => { await page.selectOption("#myStatusPickSelect", v); await page.waitForTimeout(600); };
const unit = async (page, u) => {
  if (!(await page.evaluate(() => document.getElementById("myStatusWheelSwitch")?.getBoundingClientRect().height > 0))) { await page.click("#myStatusUnitBtn"); await page.waitForTimeout(200); }
  await page.click(`#myStatusWheelSwitch [data-kys-wheel-unit="${u}"]`); await page.waitForTimeout(600);
};

for (const lang of LANGS) for (const width of WIDTHS) {
  const tag = `[${lang} ${width}]`;
  const W = UNIT_WORD[lang];
  const { ctx, page, errors } = await start(lang, width);
  const total = await page.evaluate(() => document.querySelectorAll("#myStatusBody [data-ms-row]").length);

  // ---- 2. One button on the top bar ----
  const h0 = await header(page);
  check(`${tag} the top bar has one unit button, ${W.all} ▾, ≥ 40px, tappable, closed`, h0.btnShown && h0.btnH >= 40 && h0.hitBtn && h0.word === W.all && h0.expanded === "false", JSON.stringify(h0));
  check(`${tag} ...the two rows of units are closed until it is tapped (rows saved)`, !h0.switchShown, JSON.stringify(h0));
  check(`${tag} ...the title is not cut, nothing overlaps, all inside the bar, no sideways scroll`, h0.titleWhole && !h0.overlap && h0.inside && h0.over <= 0, JSON.stringify(h0));
  await page.click("#myStatusUnitBtn"); await page.waitForTimeout(250);
  const h1 = await header(page);
  check(`${tag} one tap opens the rows as before (7 units), the button marked open`, h1.switchShown && h1.switchButtons === 7 && h1.expanded === "true", JSON.stringify({ shown: h1.switchShown, n: h1.switchButtons, exp: h1.expanded }));
  await page.click('#myStatusWheelSwitch [data-kys-wheel-unit="surah"]'); await page.waitForTimeout(600);
  const h2 = await header(page);
  check(`${tag} picking Surah closes them, and the button now reads ${W.surah}`, !h2.switchShown && h2.word === W.surah && h2.expanded === "false", JSON.stringify({ shown: h2.switchShown, word: h2.word, exp: h2.expanded }));

  // ---- 1. The chosen Approach's own wheel ----
  const w0 = await wheel(page);
  check(`${tag} POSITIVE CONTROL: with all Approaches, the Surah wheel is one slice per Approach (${total})`, w0.n === total && w0.keys.length === total, JSON.stringify({ n: w0.n, keys: w0.keys.length }));
  await pick(page, YES);
  const w1 = await wheel(page), t1 = await tileN(page, YES, "surah");
  check(`${tag} choosing Approach 2 switches the wheel to ITS wheel: 114 Surah slices, all that Approach's`, w1.n === 114 && w1.keys.length === 1 && w1.keys[0] === YES, JSON.stringify({ n: w1.n, keys: w1.keys }));
  check(`${tag} ...coloured by status from the records: 2 Achieved (Surah 1 by Juz 1, Surah 3), 1 Learning (112)`, w1.achieved === 2 && w1.learning === 1 && w1.mastered === 0, JSON.stringify(w1));
  check(`${tag} ...and the Achieved + Mastered slices are exactly the Surah tile's figure (${t1})`, w1.achieved + w1.mastered === t1, JSON.stringify({ slices: w1.achieved + w1.mastered, tile: t1 }));
  const inView = await page.evaluate(() => { const r = document.querySelector("#myStatusOverviewWheel svg").getBoundingClientRect(); const b = document.getElementById("myStatusBody").getBoundingClientRect(); return r.top < b.bottom && r.bottom > b.top; });
  check(`${tag} ...the new wheel is on screen after choosing`, inView);
  check(`${tag} ...no slice prints an Approach id (approach_NN) as a label`, w1.leak === 0, String(w1.leak));
  if (width === 394 || width === 1280) await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/kys-one-${lang}-${width}-surah.png` });
  await unit(page, "juz");
  const w2 = await wheel(page), t2 = await tileN(page, YES, "juz");
  check(`${tag} Juz: 30 slices, Juz 1 Achieved, matching the Juz tile (${t2})`, w2.n === 30 && w2.achieved === 1 && w2.achieved + w2.mastered === t2, JSON.stringify({ n: w2.n, a: w2.achieved, tile: t2 }));
  await unit(page, "ayah");
  const w3 = await wheel(page);
  check(`${tag} Āyah: 114 Surah slices, filled by their āyāt Achieved (Surahs 1, 2 and 3 have some)`, w3.n === 114 && w3.progress === 3, JSON.stringify({ n: w3.n, progress: w3.progress }));
  await unit(page, "all");
  const w4 = await wheel(page);
  check(`${tag} All units with one Approach: six rings of its units (30+114+60+556+604+114 = 1478)`, w4.n === 1478 && w4.keys.length === 1, JSON.stringify({ n: w4.n }));
  await pick(page, WBW);
  const w5 = await wheel(page);
  check(`${tag} Word by Word: its words known, by Juz (30 slices)`, w5.n === 30 && w5.keys[0] === WBW, JSON.stringify({ n: w5.n, keys: w5.keys }));
  await pick(page, YES);
  // Way back: a slice opens the Approach's card, whose ← Back returns to the wheel.
  await page.evaluate(() => document.querySelector("#myStatusOverviewWheel .wheel-seg")?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForTimeout(700);
  const card = await page.evaluate(() => { const m = document.getElementById("myStatusDetailMount"); const b = document.getElementById("myStatusDetailBackBtn"); return { open: !!m && !m.hidden && m.getBoundingClientRect().height > 0, back: !!b && b.getBoundingClientRect().width > 0 }; });
  check(`${tag} a slice opens the Approach's card, with ← Back on it`, card.open && card.back, JSON.stringify(card));
  if (card.back) { await page.click("#myStatusDetailBackBtn"); await page.waitForTimeout(500); }
  const back = await page.evaluate(() => { const m = document.getElementById("myStatusDetailMount"); return { closed: !m || m.hidden, wheel: document.querySelectorAll("#myStatusOverviewWheel .wheel-seg").length }; });
  check(`${tag} ...← Back returns to the same wheel`, back.closed && back.wheel === 1478, JSON.stringify(back));
  await pick(page, "");
  const w6 = await wheel(page);
  check(`${tag} "All Approaches" brings back the every-Approach wheel`, w6.keys.length === total, JSON.stringify({ n: w6.n, keys: w6.keys.length }));
  if (width === 394 || width === 320) await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/kys-one-${lang}-${width}.png` });
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::|api\.quran/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
console.log(`\n==== Know Your Status: the chosen Approach's own wheel, units under one button (PCF MSA J100)${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);

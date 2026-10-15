// PCF J26 (the Owner, 15 Oct 2026: "A"): Know Your Status shows one calm line under each Approach's tiles,
// "Before Al-Fātiḥah: Aʿūdhu billāh ● · Bismillah ●", each dot that Approach's own claim. Also the band's wide-screen
// cap on Al-Fātiḥah's page (the audit polish of 14 Oct). Measured on the rendered page, en/bn x 390 / 820 / 1440.
// Mutations: --mutate=<name> restores one defect and must make this suite FAIL.
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
const HTML = "app/quranrevival.html";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUTATIONS = {
  // the line is never drawn
  "no-line": ['${myStatusOpeningLineHtml(trackableId, cache)}${note}', "${note}"],
  // Aʿūdhu billāh's dot reads the wrong record, so it always shows "not started"
  "wrong-key": ['get(buildUnitKey.opening("taawwudh"))', 'get("opening:none")'],
  // Bismillah shown even when it is counted as āyah 1 of the 7
  "bismillah-always": ["if (fatihaCountApplies(1, fatihaOn())) items.push({ name: t(\"Bismillah\")", "if (true) items.push({ name: t(\"Bismillah\")"],
  // no wide-screen cap on the band
  "band-cap": ["@media (min-width: 900px) { .opening-band { max-width: 48rem; margin-left: auto; margin-right: auto; } } /* j26 band-cap */", ""],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
// Memorise: Aʿūdhu billāh achieved, Bismillah (ayah:1:1) learning. Recite: nothing on either.
const SEED = `{ const d = DATA.records.find((r) => r.chunkKey === "surah_1");
  d.entries["opening:taawwudh::memorise"] = { unitType: "opening", subjectId: "quran", trackableId: "memorise", claimedStatus: "achieved", claimedByPersonId: "p1", confirmedStatus: null };
  d.entries["ayah:1:1::memorise"] = { unitType: "ayah", subjectId: "quran", trackableId: "memorise", claimedStatus: "learning", claimedByPersonId: "p1", confirmedStatus: null }; }`;
const browser = await chromium.launch();

async function start(lang, width, countOn = true) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 1000 : 844 }, extraSeedJs: SEED });
  await ctx.addInitScript((on) => { try { localStorage.setItem("mm_fatiha_bismillah_unnumbered", on ? "1" : "0"); } catch (e) {} }, countOn);
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  if (MUTATE) {
    const [from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, HTML), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route("**/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(1200);
  return { ctx, page };
}
async function openKys(page) {
  await page.click("#myStatusWideBtn");
  await page.waitForFunction(() => document.querySelectorAll("#myStatusBody .my-status-row-btn").length > 0, null, { timeout: 10000 });
  await page.waitForTimeout(300);
}
const rowInfo = (page) => page.evaluate(() => {
  const row = (id) => {
    const b = document.querySelector(`[data-my-status-open="${id}"]`);
    if (!b) return null;
    const line = b.querySelector("[data-ms-opening-line]");
    const br = b.getBoundingClientRect(), lr = line ? line.getBoundingClientRect() : null;
    return {
      line: !!line, text: line ? line.textContent.replace(/\s+/g, " ").trim() : "",
      dots: line ? [...line.querySelectorAll("[data-ms-opening]")].map((e) => e.dataset.msOpening) : [],
      inside: !!lr && lr.left >= br.left - 0.5 && lr.right <= br.right + 0.5 && lr.width > 0,
      oneLine: !!lr && lr.height <= 40,
    };
  };
  const rows = document.querySelectorAll("#myStatusBody .my-status-row-btn").length;
  return { rows, lines: document.querySelectorAll("#myStatusBody [data-ms-opening-line]").length, memorise: row("memorise"), recite: row("recite"), ov: document.documentElement.scrollWidth - innerWidth };
});

for (const lang of ["en", "bn"]) for (const width of [390, 820, 1440]) {
  const tag = `${lang} ${width}px`;
  let ctx;
  try {
    const s = await start(lang, width); ctx = s.ctx; const page = s.page;
    await openKys(page);
    const r = await rowInfo(page);
    check(`${tag}: POSITIVE CONTROL Know Your Status lists its Approaches (${r.rows})`, r.rows >= 5, JSON.stringify(r));
    check(`${tag}: every Approach but Word by Word has the line (${r.lines} of ${r.rows})`, r.lines >= r.rows - 1 && r.lines > 0, JSON.stringify(r));
    const want = lang === "bn" ? ["আল-ফাতিহার আগে", "আউযুবিল্লাহ", "বিসমিল্লাহ"] : ["Before Al-Fātiḥah", "Aʿūdhu billāh", "Bismillah"];
    check(`${tag}: it reads "${want.join(" / ")}"`, !!r.memorise && want.every((w) => r.memorise.text.includes(w)), JSON.stringify(r.memorise));
    check(`${tag}: Memorise: Aʿūdhu billāh's dot is its own claim (achieved), Bismillah's is ayah:1:1 (learning)`, !!r.memorise && r.memorise.dots.join() === "achieved,learning", JSON.stringify(r.memorise));
    check(`${tag}: Recite: both dots are "not started"`, !!r.recite && r.recite.dots.join() === "not_started,not_started", JSON.stringify(r.recite));
    check(`${tag}: the line sits inside its Approach's row, on one calm line`, !!r.memorise && r.memorise.inside && r.memorise.oneLine, JSON.stringify(r.memorise));
    check(`${tag}: nothing scrolls sideways (${r.ov})`, r.ov <= 0);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await ctx.close().catch(() => {});
}

// "Bismillah unnumbered" OFF: Bismillah is āyah 1 of the 7, so the line shows Aʿūdhu billāh alone (as the band does).
{
  let ctx;
  try {
    const s = await start("en", 390, false); ctx = s.ctx;
    await openKys(s.page);
    const r = await rowInfo(s.page);
    check(`count off: the line shows Aʿūdhu billāh alone`, !!r.memorise && r.memorise.dots.join() === "achieved" && !r.memorise.text.includes("Bismillah"), JSON.stringify(r.memorise));
  } catch (e) { check(`count off: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await ctx.close().catch(() => {});
}

// The band's wide-screen cap: at 1440px it keeps a calm width and stays centred; at 390px it fills the column.
for (const width of [390, 1440]) {
  let ctx;
  try {
    const s = await start("en", width); ctx = s.ctx; const page = s.page;
    const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
    if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
    await page.click("#tabReadBtn"); await page.waitForTimeout(600);
    await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "1"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.waitForFunction(() => !!document.querySelector("[data-opening-band]"), null, { timeout: 10000 });
    const b = await page.evaluate(() => {
      const band = document.querySelector("[data-opening-band]"), p = band.parentElement;
      const r = band.getBoundingClientRect(), pr = p.getBoundingClientRect();
      return { w: Math.round(r.width), pw: Math.round(pr.width), centred: Math.abs((r.left - pr.left) - (pr.right - r.right)) <= 2 };
    });
    check(`${width}px: POSITIVE CONTROL the band is on Al-Fātiḥah's page`, b.w > 0, JSON.stringify(b));
    if (width >= 900) check(`${width}px: the band keeps a calm width (≤ 770px) and is centred`, b.w <= 770 && b.centred, JSON.stringify(b));
    else check(`${width}px: on a phone the band still fills its column`, b.w >= b.pw - 2, JSON.stringify(b));
  } catch (e) { check(`${width}px band: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await ctx.close().catch(() => {});
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

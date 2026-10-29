// The Owner, 28 Oct 2026 (a phone photo of the Read contents list: "6:161" typed in its search box, "Nothing matches."):
// "How does search work here? Fix it." The box only matched a surah's name or number. It now also takes an āyah
// reference the way the "Go to" box does (6:161, 2:255-257, ৬:১৬১): the āyah is offered first, "Go to 6:161", above its
// surah; Enter or a tap opens the Read view on that āyah; a number past the surah's end says so in words.
//
// Run from the repository root, with serve.js on :8080. Expected values are written by hand (Al-An'aam has 165 āyāt).
// Mutations (each must fail it): noref (no reference parsing), noenter (Enter does nothing), nogo (the row is drawn
// but tapping it opens the surah instead). Not a mutation: dropping openReadContentsAyah's scrollFlowToCurrentAyah()
// leaves every check green (measured 28 Oct 2026, the flow and the Mushaf view at 390): the Read view's own render
// already brings the current āyah into view. The call stays, as goToAyahFromQcr() has it, a no-op belt and braces.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
const PAGE = "app/quranrevival.html";
const MUT = {
  noref: ["const ref = /[:.]/.test(typed) ? parseJumpText(typed) : null;", "const ref = null;"],
  noenter: ['      readContentsBodyEl.querySelector("[data-rc-kind]")?.click();\n', ""],
  nogo: ['const go = row.dataset.rcKind === "ayah" ? openReadContentsAyah(row) :', 'const go = row.dataset.rcKind === "ayah" ? openReadContentsRow("surah", Number(row.dataset.rcN)) :'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const WIDTHS = arg("width") ? [Number(arg("width"))] : [360, 390, 768, 1024, 1440];
const SHOTS = process.env.SHOT_DIR || "";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function start(lang, width) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 900 : 800 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    const body = fs.readFileSync(PAGE, "utf8");
    if (!body.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: body.split(a).join(b) }));
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  return { ctx, page, errors };
}
async function openList(page) {
  if (await page.evaluate(() => !document.getElementById("readContentsMount").hidden)) return;
  // The landing's Read capsule, or (in the Read view) the Read bar's list button: whichever is on screen.
  const id = await page.evaluate(() => ["readContentsBtn", "readListBtn"].find((i) => { const e = document.getElementById(i); return e && e.getClientRects().length && e.offsetParent !== null; }));
  if (id) await page.click(`#${id}`);
  else await page.evaluate(() => document.getElementById("readListBtn")?.click());
  await page.waitForFunction(() => document.querySelectorAll("#readContentsBody .rc-row").length > 100, null, { timeout: 10000 }).catch(() => {});
}
async function type(page, text) {
  await page.fill("#readContentsSearch", text);
  await page.waitForTimeout(100);
  return page.evaluate(() => {
    const body = document.getElementById("readContentsBody");
    const rows = [...body.querySelectorAll(".rc-row")];
    const br = body.getBoundingClientRect();
    return {
      rows: rows.map((r) => ({ kind: r.dataset.rcKind, n: r.dataset.rcN, text: r.innerText.replace(/\s+/g, " ").trim() })),
      empty: body.querySelector(".rc-empty")?.textContent.trim() ?? "",
      inside: rows.every((r) => { const x = r.getBoundingClientRect(); return x.left >= br.left - 0.5 && x.right <= br.right + 0.5; }),
      over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      placeholder: document.getElementById("readContentsSearch").placeholder,
    };
  });
}
// Where the reader is, and whether the āyah's own words are on screen.
const where = (page, key) => page.evaluate((k) => {
  const words = [...document.querySelectorAll(`[data-word-occurrence*=":${k}:"]`)].filter((e) => e.getClientRects().length && e.offsetParent !== null);
  const vh = window.innerHeight, vw = window.innerWidth;
  const seen = words.some((e) => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw; });
  return {
    listOpen: !document.getElementById("readContentsMount").hidden,
    surah: document.getElementById("surahSelect").value, ayah: document.getElementById("ayahSelect").value,
    type: document.getElementById("unitTypeSelect").value, words: words.length, seen,
  };
}, key);

for (const lang of ["en", "bn"]) for (const width of WIDTHS) {
  if (lang === "bn" && ![390, 1024].includes(width)) continue;
  const tag = `[${lang} ${width}]`;
  const D = (s) => (lang === "bn" ? s.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]) : s);

  // 1. The Owner's own case: 6:161.
  let { ctx, page, errors } = await start(lang, width);
  await openList(page);
  const a = await type(page, D("6:161"));
  check(`${tag} "${D("6:161")}" offers the āyah first, then its surah (Al-An'aam)`,
    a.rows.length === 2 && a.rows[0].kind === "ayah" && a.rows[0].n === "6" && a.rows[0].text.includes(D("6:161")) && a.rows[1].kind === "surah" && a.rows[1].n === "6" && !a.empty, JSON.stringify(a));
  check(`${tag} ...every row inside the list, no sideways scroll`, a.inside && a.over <= 0, JSON.stringify(a));
  check(`${tag} ...the box says it takes an āyah like 2:255`, lang === "en" ? /2:255/.test(a.placeholder) : /২:২৫৫/.test(a.placeholder), a.placeholder);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/rc-ayah-${lang}-${width}.png` });
  await page.press("#readContentsSearch", "Enter");
  await page.waitForFunction(() => document.getElementById("readContentsMount").hidden, null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const w = await where(page, "6:161");
  check(`${tag} Enter opens the Read view on 6:161, the list closed`, !w.listOpen && w.surah === "6" && w.ayah === "161", JSON.stringify(w));
  check(`${tag} ...and 6:161's own words are on screen`, w.words > 0 && w.seen, JSON.stringify(w));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/rc-ayah-${lang}-${width}-read.png` });
  check(`${tag} no page errors`, errors.length === 0, errors.join(" | "));
  await ctx.close();

  if (width !== 390 && width !== 1024) continue;
  ({ ctx, page, errors } = await start(lang, width));
  await openList(page);
  // 2. A tap on the row, a range.
  const r = await type(page, D("2:255-257"));
  check(`${tag} "${D("2:255-257")}" offers the range first`, r.rows[0]?.kind === "ayah" && r.rows[0].text.includes(D("2:255")) && r.rows[0].text.includes(D("257")) && r.rows[1]?.n === "2", JSON.stringify(r.rows));
  if (await page.$("#readContentsBody .rc-goto")) await page.click("#readContentsBody .rc-goto");
  await page.waitForTimeout(1500);
  const wr = await where(page, "2:255");
  check(`${tag} ...a tap opens it as a Range from 2:255, its words on screen`, !wr.listOpen && wr.surah === "2" && wr.type === "range" && wr.ayah === "255" && wr.seen, JSON.stringify(wr));
  // 3. Past the end: said in words, the surah still offered.
  await openList(page);
  const p = await type(page, D("6:999"));
  check(`${tag} "${D("6:999")}" says Surah 6 has 165 āyāt, and still offers Surah 6`, (lang === "en" ? /has 165 ayahs/.test(p.empty) : p.empty.includes("১৬৫")) && p.rows.length === 1 && p.rows[0].n === "6", JSON.stringify(p));
  // 4. What already worked still works.
  const cow = await type(page, "cow"), n = await type(page, D("112"));
  check(`${tag} names and numbers still work ("cow" → 1 row, "${D("112")}" → 1 row, no āyah row)`, cow.rows.length === 1 && n.rows.length === 1 && n.rows[0].kind === "surah", JSON.stringify([cow.rows, n.rows]));
  const z = await type(page, D("115:1"));
  check(`${tag} "${D("115:1")}" says there is no Surah 115`, z.rows.length === 0 && (lang === "en" ? /no Surah 115/.test(z.empty) : z.empty.includes("১১৫")), JSON.stringify(z));
  check(`${tag} no page errors (range, end, names)`, errors.length === 0, errors.join(" | "));
  await ctx.close();

  // 5. In the Mushaf (page) view: 6:161 sits on page 150, part-way down the surah's pages; it must be brought into view.
  ({ ctx, page, errors } = await start(lang, width));
  await page.evaluate(() => { const m = document.getElementById("mushafToggle"); if (!m.checked) { m.checked = true; m.dispatchEvent(new Event("change")); } });
  await page.waitForTimeout(500);
  await openList(page);
  await type(page, D("6:161"));
  await page.press("#readContentsSearch", "Enter");
  await page.waitForTimeout(2500);
  const wm = await where(page, "6:161");
  check(`${tag} Mushaf view: Enter lands on 6:161, its words on screen`, !wm.listOpen && wm.surah === "6" && wm.ayah === "161" && wm.words > 0 && wm.seen, JSON.stringify(wm));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/rc-ayah-${lang}-${width}-mushaf.png` });
  check(`${tag} no page errors (Mushaf)`, errors.length === 0, errors.join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Read contents search takes an āyah (6:161): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

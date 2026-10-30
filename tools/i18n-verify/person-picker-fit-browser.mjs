// Audit part 139 (PCF MSA J29, issue #1349): the Tenant and Person pickers are never wider than the screen on any shared or
// module page (Hadith Study, Dua Study and the frozen Quran/Asma/LDOG pages are outside this suite). With a real-length person
// name, at 360/390/768/1024/1440 in English and Bangla, on every page:
//   inside  each picker's right edge is inside the screen
//   scroll  the page does not scroll sideways
//   title   the select's title holds the full chosen name
//   control the long name really is the selected option (positive control)
// Run from the repository root with node serve.js on 8080:
//   node tools/i18n-verify/person-picker-fit-browser.mjs [--page=notes.html] [--width=360] [--lang=bn] [--list] [--shots]
//   --mutate=wide puts width:auto!important;max-width:none!important;min-width:auto!important back on both selects; must FAIL
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const ONLY = arg("page"), MUTATE = arg("mutate"), ONLYW = arg("width"), ONLYL = arg("lang");
const SHOTS = process.argv.includes("--shots"), LIST = process.argv.includes("--list");
if (MUTATE && MUTATE !== "wide") throw new Error(`unknown --mutate=${MUTATE}`);
const OUT = "tools/i18n-verify/out/person-picker-fit";
fs.mkdirSync(OUT, { recursive: true });

const PAGES = ["arabic-study", "bookmarks", "catalogue", "classes", "course-offers", "curriculum", "dawah", "deen-study", "general-study",
  "hadith-collections", "health-study", "homework", "import-notes", "journey-map", "life-skill", "migrate", "monitor",
  "naturelife-study", "notes", "people", "records"].map((p) => p + ".html");
const WIDTHS = [[360, 740], [390, 844], [768, 1024], [1024, 800], [1440, 900]];

const LONG_SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  DATA.tenants[0].name = "Madrasatul Muslimeen (Owner, Prime)";
  DATA.tenantPeople[0].name = lang("Muhammad Abdur-Rahman ibn Abdullah Al-Hashimi", "মুহাম্মদ আব্দুল্লাহ আল-মামুন চৌধুরী আব্দুর রহমান");
})();`;

const MEASURE = () => {
  const W = document.documentElement.clientWidth;
  const out = { pickers: [], scrollW: document.documentElement.scrollWidth, W };
  for (const id of ["tenantSelect", "personSelect"]) {
    const el = document.getElementById(id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    let shown = r.width > 0;
    for (let e = el; e && shown; e = e.parentElement) if (getComputedStyle(e).display === "none") shown = false;
    const opt = el.options[el.selectedIndex];
    out.pickers.push({ id, shown, right: Math.round(r.right), width: Math.round(r.width), title: el.title || "", chosen: opt ? opt.textContent.trim() : "" });
  }
  return out;
};

const WIDE = () => {
  const s = document.createElement("style");
  s.textContent = "#tenantSelect,#personSelect{width:auto!important;max-width:none!important;min-width:auto!important}";
  document.head.appendChild(s);
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const rows = [];
for (const path of PAGES) {
  if (ONLY && path !== ONLY) continue;
  console.log(`\n== ${path} ==`);
  for (const [w, h] of WIDTHS) for (const lang of ["en", "bn"]) {
    if ((ONLYW && String(w) !== ONLYW) || (ONLYL && lang !== ONLYL)) continue;
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: LONG_SEED });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    const url = path === "notes.html" ? "notes.html?unit=ayah:2:255&label=Ayat%20al-Kursi&navBack=1" : path + "?navBack=1";
    const { page: P } = await openPage(ctx, "/app/" + url);
    await P.waitForTimeout(1000);
    // Pages with the shared account card hold their pickers inside it; open it so they are on screen (a no-op elsewhere).
    await P.evaluate(() => { const b = document.querySelector("[data-open-account-card]"); if (b) b.click(); });
    if (MUTATE) await P.evaluate(WIDE);
    await P.waitForTimeout(250);
    if ((w === 360 && lang === "en") || (w === 390 && lang === "bn")) if (SHOTS) await P.screenshot({ path: `${OUT}/${path.replace(/\.html$/, "")}-${w}-${lang}${MUTATE ? "-mut" : ""}.png`, fullPage: true });
    const m = await P.evaluate(MEASURE);
    await ctx.close();
    const tag = `${path} / ${w} / ${lang}`;
    const person = m.pickers.find((p) => p.id === "personSelect");
    if (person) check(`${tag}: positive control, the long name is the selected person`, person.shown && person.chosen.length > 30, JSON.stringify(person));
    check(`${tag}: a picker is on the page`, m.pickers.some((p) => p.shown), JSON.stringify(m.pickers));
    for (const p of m.pickers.filter((x) => x.shown)) {
      check(`${tag}: #${p.id} right edge ${p.right} inside ${m.W}`, p.right <= m.W, `width ${p.width}`);
      if (p.chosen.length > 30) check(`${tag}: #${p.id} title holds the full chosen name`, p.title.includes(p.chosen), `title "${p.title}" chosen "${p.chosen}"`);
    }
    check(`${tag}: page does not scroll sideways (${m.scrollW} vs ${m.W})`, m.scrollW <= m.W);
    rows.push({ path, w, lang, scrollW: m.scrollW, W: m.W, pickers: m.pickers.map((p) => `${p.id}:${p.right}`).join(" ") });
    if (LIST) console.log(`  ${tag}: scrollW ${m.scrollW}/${m.W}  ${rows[rows.length - 1].pickers}`);
  }
}
fs.writeFileSync(`${OUT}/rows${MUTATE ? "-mut" : ""}.json`, JSON.stringify(rows, null, 1));
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
await browser.close();
process.exit(fail ? 1 : 0);

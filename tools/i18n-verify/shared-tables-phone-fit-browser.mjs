// Audit part 93 (PCF MSA J29): can a reader on a phone REACH every column of the tables on Monitor, Records, About, Catalogue,
// Taglines and People?  (Part 92's overflow finder reports any element whose rect ends past the screen, even one inside a box that
// scrolls, so it cannot tell "reachable by scrolling" from "cut off".  This suite can.)
//
// For every visible <table> on each page, at 320, 390 and 768 wide, in Bangla and English, it finds the table's SCROLLER (the
// nearest ancestor-or-self whose overflow-x is not visible) and classifies it:
//   fits       no scroller needed: the table ends inside the screen
//   scrolls    (b) the scroller's own box is inside the screen, it is wider inside than outside, and overflow-x is auto|scroll
//   clipped    (a) overflow-x is hidden|clip and the content is wider than the box: right-hand columns are unreachable
//   page       (c) the table or its scroller ends past the screen, so the whole page scrolls sideways
// Then it scrolls the scroller to its end and requires the LAST header cell to be inside the screen, requires the page itself not to
// scroll sideways, and requires every cell font to be at least 13px.
//   --mutate=clip   puts overflow-x:hidden on the Records table's scroller (it must FAIL)
//   --report        print the per-table classification and rects (used for the before/after table in the report)
//   --shots         save a 320px screenshot of each table scrolled to its end under out/phone-tables/
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/shared-tables-phone-fit-browser.mjs
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const MUTATE = arg("mutate"), REPORT = process.argv.includes("--report"), SHOTS = process.argv.includes("--shots");
if (MUTATE && MUTATE !== "clip") throw new Error(`unknown --mutate=${MUTATE}`);

const PAGES = [["Monitor", "monitor.html"], ["Records", "records.html"], ["About", "about.html"], ["Catalogue", "catalogue.html"], ["Taglines", "taglines.html"], ["People", "people.html"]];
const VIEWPORTS = [[320, 640], [390, 844], [768, 1024]];
const REAL_SEED = `
DATA.tenants[0].name = lang("Madrasatul Muslimeen (Owner, Prime)", "মাদরাসাতুল মুসলিমীন (মালিক, প্রাইম)");
DATA.tenantPeople[0].name = lang("Muhammad Abdur-Rahman ibn Abdullah Al-Hashimi", "মুহাম্মাদ আবদুর রহমান ইবনে আবদুল্লাহ আল-হাশিমী");
DATA.tenantPeople[1].name = lang("Maryam bint Abdullah Al-Hashimi", "মুহাম্মাদ আবদুর রহমান ইবনে আবদুল্লাহ আল-হাশিমী");
DATA.trackables[0].name = lang("Reading (with Tajweed)");
DATA.classes[0].name = lang("Weekend Qur'an Memorisation and Tajweed Circle (Year 7–9)");
DATA.courseOffers[0].name = lang("Weekend Qur'an Memorisation and Tajweed Circle (Year 7–9)");
`;
const OUT = "tools/i18n-verify/out/phone-tables";
fs.mkdirSync(OUT, { recursive: true });

// Runs in the page. Tables are tagged data-pt so the caller can screenshot them.
const MEASURE = (mutate) => {
  const doc = document.documentElement, W = doc.clientWidth;
  const vis = (el) => {
    for (let e = el; e && e !== doc; e = e.parentElement) {
      if (e.hidden || e.inert) return false;
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const rect = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.width)]; };
  const scrollerOf = (t) => { for (let e = t; e && e !== document.body; e = e.parentElement) { if (getComputedStyle(e).overflowX !== "visible") return e; } return null; };
  const out = [];
  [...document.querySelectorAll("table")].filter(vis).forEach((t, i) => {
    let s = scrollerOf(t);
    if (mutate === "clip" && /records\.html/.test(location.pathname) && s) { s.style.overflowX = "hidden"; }
    s = scrollerOf(t);
    const id = t.id || t.querySelector("tbody")?.id || ("table" + i);
    const o = { id, tableRect: rect(t), scroller: s ? (s.tagName.toLowerCase() + (s.id ? "#" + s.id : "") + "." + (s.className || "-")) : null, scrollerRect: s ? rect(s) : null };
    const ox = s ? getComputedStyle(s).overflowX : "visible";
    const inner = s ? s.scrollWidth : t.scrollWidth, box = s ? s.clientWidth : t.clientWidth;
    o.ox = ox; o.inner = inner; o.box = box;
    const pageScrolls = doc.scrollWidth > doc.clientWidth;
    const tr = t.getBoundingClientRect(), sr = (s || t).getBoundingClientRect();
    if (s && (ox === "hidden" || ox === "clip")) o.kind = inner > box + 1 ? "clipped" : "fits";
    else if (sr.right > W + 1 || pageScrolls) o.kind = "page";
    else if (s && inner > box + 1) o.kind = "scrolls";
    else o.kind = tr.right > W + 1 ? "page" : "fits";
    if (s && (ox === "auto" || ox === "scroll")) s.scrollLeft = s.scrollWidth; // to the end (LTR; RTL would be negative, not used here)
    const heads = [...t.querySelectorAll("thead th, tr:first-child th")];
    const last = heads[heads.length - 1];
    o.lastHeadRight = last ? Math.round(last.getBoundingClientRect().right) : null;
    o.lastHeadReachable = !last || (last.getBoundingClientRect().right <= W + 1 && last.getBoundingClientRect().right <= sr.right + 1 && last.getBoundingClientRect().left >= -1);
    o.pageScrolls = pageScrolls; o.docScroll = doc.scrollWidth;
    o.minFont = Math.min(...[...t.querySelectorAll("th, td")].filter(vis).map((c) => parseFloat(getComputedStyle(c).fontSize)));
    t.setAttribute("data-pt", String(i)); o.idx = i;
    if (s && (ox === "auto" || ox === "scroll")) s.scrollLeft = 0;
    out.push(o);
  });
  return out;
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const rows = [];
for (const [name, path] of PAGES) {
  console.log(`\n== ${name} (${path}) ==`);
  for (const [w, h] of VIEWPORTS) for (const lang of ["bn", "en"]) {
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: REAL_SEED });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    const { page: P } = await openPage(ctx, "/app/" + path + "?navBack=1");
    await P.waitForTimeout(1000);
    const tables = await P.evaluate(MEASURE, MUTATE);
    check(`${name} / ${w} ${lang}: at least one table is on screen (positive control)`, tables.length >= 1, `tables: ${tables.length}`);
    for (const t of tables) {
      const tag = `${name} / ${w} ${lang} / ${t.id}`;
      check(`${tag}: not clipped (${t.kind})`, t.kind !== "clipped", `scroller ${t.scroller} ox=${t.ox} inner ${t.inner} > box ${t.box}`);
      check(`${tag}: does not make the page scroll sideways (${t.kind})`, t.kind !== "page" && !t.pageScrolls, `table ${t.tableRect}, scroller ${t.scrollerRect}, doc ${t.docScroll}`);
      check(`${tag}: last header cell reachable at the end of its scroll (right edge ${t.lastHeadRight})`, t.lastHeadReachable);
      check(`${tag}: cell font is 13px or more (${t.minFont})`, t.minFont >= 13);
      rows.push({ page: name, width: w, lang, ...t });
      if (SHOTS && w === 320 && lang === "bn" && !MUTATE) {
        await P.evaluate((i) => { const t = document.querySelector(`[data-pt="${i}"]`); let s = t; for (; s && s !== document.body; s = s.parentElement) if (["auto", "scroll"].includes(getComputedStyle(s).overflowX)) { s.scrollLeft = s.scrollWidth; break; } t.scrollIntoView({ block: "center" }); }, t.idx);
        await P.waitForTimeout(150);
        await P.screenshot({ path: `${OUT}/${path.replace(/\.html$/, "")}-${t.id.replace(/[^a-z0-9]+/gi, "-")}.png` });
      }
    }
    await ctx.close();
  }
}
if (REPORT) for (const r of rows) console.log(`${r.page.padEnd(10)} ${String(r.width).padStart(3)} ${r.lang} ${String(r.id).padEnd(14)} ${r.kind.padEnd(8)} table[l,r,w]=${r.tableRect} scroller=${r.scroller} ${r.scrollerRect} inner=${r.inner} box=${r.box} lastHeadRight=${r.lastHeadRight}`);
if (!MUTATE) fs.writeFileSync(`${OUT}/rows.json`, JSON.stringify(rows, null, 1));
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

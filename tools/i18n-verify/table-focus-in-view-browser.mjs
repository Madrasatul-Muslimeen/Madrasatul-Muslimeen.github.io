// Audit part 116 (PCF MSA J29): when the Tab key lands on a control inside a table that scrolls sideways, is the control fully
// inside the scroller's visible box (and the screen)?  Part 93 proved columns are reachable by scrolling; part 88 proved Tab reaches
// every control; neither asked whether the focused control is IN VIEW.
// For each shared page, at 320/360/390 wide, English and Bangla, with real-length seed data, it presses the real Tab key through the
// page and, for each focused control inside a horizontally scrolling box, measures the % of its rect inside BOTH the box and the screen.
// A control is OK at >= 95% visible.
//   --mutate=nofix  removes the shared fix (js/table-focus.js and its CSS) from the page; it must FAIL
//   --report        print every measured control
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/table-focus-in-view-browser.mjs
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const MUTATE = arg("mutate"), REPORT = process.argv.includes("--report");
if (MUTATE && MUTATE !== "nofix") throw new Error(`unknown --mutate=${MUTATE}`);

const PAGES = [["Monitor", "monitor.html"], ["Records", "records.html"], ["About", "about.html"], ["Catalogue", "catalogue.html"], ["Taglines", "taglines.html"], ["People", "people.html"]];
const VIEWPORTS = [[320, 640], [360, 740], [390, 844]];
const REAL_SEED = `
DATA.tenants[0].name = lang("Madrasatul Muslimeen (Owner, Prime)", "মাদরাসাতুল মুসলিমীন (মালিক, প্রাইম)");
DATA.tenantPeople[0].name = lang("Muhammad Abdur-Rahman ibn Abdullah Al-Hashimi", "মুহাম্মাদ আবদুর রহমান ইবনে আবদুল্লাহ আল-হাশিমী");
DATA.tenantPeople[1].name = lang("Maryam bint Abdullah Al-Hashimi", "মুহাম্মাদ আবদুর রহমান ইবনে আবদুল্লাহ আল-হাশিমী");
DATA.trackables[0].name = lang("Reading (with Tajweed)");
DATA.classes[0].name = lang("Weekend Qur'an Memorisation and Tajweed Circle (Year 7–9)");
DATA.courseOffers[0].name = lang("Weekend Qur'an Memorisation and Tajweed Circle (Year 7–9)");
`;

// In the page: describe the focused element if it sits in a sideways-scrolling box.
const PROBE = () => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  let s = null;
  for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
    if (!el.closest("table")) break;
    const ox = getComputedStyle(e).overflowX;
    if ((ox === "auto" || ox === "scroll") && e.scrollWidth > e.clientWidth + 1) { s = e; break; }
  }
  if (!s) return null;
  const r = el.getBoundingClientRect(), b = s.getBoundingClientRect(), W = document.documentElement.clientWidth;
  const l = Math.max(r.left, b.left, 0), rt = Math.min(r.right, b.right, W);
  const pct = r.width > 0 ? Math.max(0, rt - l) / r.width * 100 : 100;
  const label = (el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + ":" + (el.textContent || el.getAttribute("aria-label") || el.value || "").trim().slice(0, 14));
  return { label, pct: Math.round(pct), r: [Math.round(r.left), Math.round(r.right)], box: [Math.round(b.left), Math.round(b.right)] };
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const all = [];
for (const [name, path] of PAGES) {
  console.log(`\n== ${name} (${path}) ==`);
  for (const [w, h] of VIEWPORTS) for (const lang of ["en", "bn"]) {
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: REAL_SEED });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE === "nofix") await ctx.route("**/js/table-focus.js*", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "export function keepFocusInTables(){}" }));
    const { page: P } = await openPage(ctx, "/app/" + path + "?navBack=1");
    await P.waitForTimeout(1000);
    await P.evaluate(() => { window.scrollTo(0, 0); document.activeElement?.blur?.(); });
    const seen = [];
    for (let i = 0; i < 120; i++) {
      await P.keyboard.press("Tab");
      await P.waitForTimeout(30);
      const m = await P.evaluate(PROBE);
      if (m) seen.push(m);
    }
    for (const m of seen) all.push({ name, w, lang, ...m });
    const bad = seen.filter((m) => m.pct < 95);
    check(`${name} / ${w} ${lang}: every focused table control is >=95% in view (${seen.length} measured)`, bad.length === 0, bad.slice(0, 4).map((m) => `${m.label} ${m.pct}% r=${m.r} box=${m.box}`).join(" | "));
    await ctx.close();
  }
}
// Positive control: the pages known to scroll sideways at 320 in English really were measured.
for (const n of ["Records", "Catalogue", "Taglines", "People"]) {
  check(`${n} / 320 en: the probe measured controls (positive control)`, all.some((r) => r.name === n && r.w === 320 && r.lang === "en"));
}
if (REPORT) {
  console.log("\npage / width / lang / control / % visible");
  for (const r of all) console.log(`${r.name.padEnd(9)} ${r.w} ${r.lang} ${r.label.padEnd(24)} ${r.pct}%`);
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

// MEASURED LAYOUT OPTIONS for surahSelect, unitTypeSelect and tenantSelect.
//
// These three are recorded Owner UI decisions (O3, and the two v08.27 added
// beside it). v08.27 named three possible remedies and did NOT cost them:
// "wrap the row", "shrink the type", "shorten the option text". This measures
// each one so the Owner is choosing between numbers rather than adjectives.
//
// IT CHANGES NOTHING. It applies each candidate to a LIVE COPY of the page in
// the browser, measures, and reverts. No file under app/ is modified, and
// nothing here picks a winner.
//
// THE MEASUREMENT METHOD IS v08.27's CORRECTED ONE: the dropdown arrow is
// measured from a probe carrying the control's own computed font, padding and
// border, and the requirement is the LONGEST OPTION (a <select>'s intrinsic
// width), not whichever option the fixture happened to select.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium, newContext, openPage } from "./harness.mjs";

const root = path.resolve(process.argv[2] || process.cwd());
const VIEWPORTS = [320, 360, 390, 412];
const LANGS = ["en", "bn"];
const TARGETS = ["surahSelect", "unitTypeSelect", "tenantSelect"];

const PROBE = `(() => {
  const measureText = (txt, cs) => {
    const span = document.createElement("span");
    span.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font:" + cs.font;
    span.textContent = txt; document.body.appendChild(span);
    const w = span.getBoundingClientRect().width; span.remove(); return w;
  };
  const arrowOf = (el) => {
    const cs = getComputedStyle(el);
    const probe = document.createElement("select");
    probe.style.cssText = "position:absolute;visibility:hidden;width:max-content;box-sizing:" + cs.boxSizing
      + ";font:" + cs.font + ";padding:" + cs.padding + ";border:" + cs.border + ";";
    const o = document.createElement("option"); o.textContent = "MMMM"; probe.appendChild(o);
    document.body.appendChild(probe);
    const pw = probe.getBoundingClientRect().width; probe.remove();
    const pb = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
             + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    return Math.max(0, pw - measureText("MMMM", cs) - pb);
  };
  const out = {};
  for (const id of ${JSON.stringify(TARGETS)}) {
    const s = document.getElementById(id);
    if (!s) { out[id] = null; continue; }
    const cs = getComputedStyle(s);
    const r = s.getBoundingClientRect();
    const pb = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
             + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    let longest = 0, longestText = "";
    for (const op of s.options) { const t = measureText(op.text, cs); if (t > longest) { longest = t; longestText = op.text; } }
    const usable = Math.round(r.width - pb - arrowOf(s));
    out[id] = {
      w: Math.round(r.width), usable, longest: Math.ceil(longest), longestText,
      shortfall: Math.ceil(longest) - usable,
      fontPx: Math.round(parseFloat(cs.fontSize) * 10) / 10,
      rowH: Math.round(s.closest(".opt-bar, .study-options-body, div")?.getBoundingClientRect().height || 0),
      options: s.options.length,
    };
  }
  // documentElement.scrollHeight is clamped to the viewport while the panel is
  // a fixed overlay, so it read 844 for every candidate and measured NOTHING.
  // The vertical cost of wrapping a row is the PANEL's own content height, and
  // whether that content now exceeds the box it is given. (No backticks in
  // this comment: it lives inside a template literal.)
  const body = document.querySelector(".study-options-body");
  const panel = document.getElementById("panelStudyOptions");
  out.__panelContentH = body ? body.scrollHeight : null;
  out.__panelVisibleH = body ? body.clientHeight : null;
  out.__panelScrolls = body ? body.scrollHeight > body.clientHeight + 1 : null;
  out.__panelH = panel ? Math.round(panel.getBoundingClientRect().height) : null;
  return out;
})()`;

// Each candidate is applied as CSS/DOM in the live page, measured, reverted.
// `font-size: calc(1em - 1px)` resolves `1em` against the PARENT's size, not
// the control's own -- these selects render at 13.1px inside a 16px parent, so
// it made the type BIGGER and every shortfall worse. The type candidates are
// applied as absolute px derived from the measured computed size instead.
const CANDIDATES = {
  "as-is": null,
  "B-type-1px": (px) => `#surahSelect,#unitTypeSelect,#tenantSelect{font-size:${(px - 1).toFixed(1)}px !important}`,
  "B-type-2px": (px) => `#surahSelect,#unitTypeSelect,#tenantSelect{font-size:${(px - 2).toFixed(1)}px !important}`,
  // Let the units bar wrap instead of squeezing every cell onto one line.
  "A-wrap-row": () => `.opt-bar-units{flex-wrap:wrap !important}.opt-bar-units>.opt-cell{flex:1 1 45% !important}`,
  // tenantSelect sits in `.opt-bar-2`'s first cell. Its truncation is specific
  // to that cell -- on people.html it gets 272px and fits -- so the candidate
  // is to give it the whole bar rather than share the row.
  //
  // `.opt-bar` is a GRID, not a flexbox (`grid-template-columns: repeat(4,
  // minmax(0,1fr))`), so the first version of this candidate used flex-wrap
  // and did NOTHING -- it reported 129px short at every width, identical to
  // as-is, which is what gave it away.
  "D-tenant-own-row": () => `.opt-bar-2>.opt-cell:first-child{grid-column:1 / -1 !important}`,
  // Both, for the Owner to see whether they compose.
  "A+D": () => `.opt-bar-units{flex-wrap:wrap !important}.opt-bar-units>.opt-cell{flex:1 1 45% !important}`
    + `.opt-bar-2>.opt-cell:first-child{grid-column:1 / -1 !important}`,
};

// The remedy v08.27 named third -- "shorten the option text" -- which nothing
// has measured. It is a CONTENT change, not CSS, so it is applied to the live
// options and reverted. It is also the only remedy that is user-visible in
// words, and I11 means both languages would need it.
const CONTENT_CANDIDATES = {
  "C-shorter-text": () => {
    const undo = [];
    const shorten = (id, fn) => {
      const el = document.getElementById(id);
      if (!el) return;
      for (const op of el.options) {
        const before = op.textContent;
        const after = fn(before);
        if (after !== before) { undo.push([op, before]); op.textContent = after; }
      }
    };
    // tenantSelect: drop the trailing role list, keeping the tenant's name.
    shorten("tenantSelect", (t) => t.replace(/\s*\([^)]*\)\s*$/, "").trim());
    // unitTypeSelect: "Range of Ayahs" -> "Range"; the Bangla equivalent too.
    shorten("unitTypeSelect", (t) => t.replace(/^Range of Ayahs$/, "Range").replace(/^আয়াতের পরিসর$/, "পরিসর"));
    // surahSelect: drop the leading number, keeping the name.
    shorten("surahSelect", (t) => t.replace(/^[\d\u09E6-\u09EF]+\.\s*/, ""));
    window.__undoContent = () => { for (const [op, before] of undo) op.textContent = before; window.__undoContent = null; };
  },
};

// No single remedy closes all three at 320px, so the combination is measured
// rather than left for the Owner to guess at: the layout candidates that fit
// unitType and tenant, plus the content one that is the only thing large
// enough to move surahSelect.
const COMBINED = `.opt-bar-units{flex-wrap:wrap !important}.opt-bar-units>.opt-cell{flex:1 1 45% !important}`
  + `.opt-bar-2>.opt-cell:first-child{grid-column:1 / -1 !important}`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const rows = [];
for (const lang of LANGS) {
  for (const width of VIEWPORTS) {
    const ctx = await newContext(browser, { banner: true, appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 844 } });
    await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    // The Study-options panel must be OPEN: these controls measure 0 until it
    // is, which is exactly why panel.mjs and not the page sweep owns them.
    await page.evaluate(() => {
      document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((el) => el.remove());
    });
    // The STUDY pillar menu holds Options and starts hidden, so a direct click
    // resolves against a 0x0 box and the panel never opens -- every control
    // then measures 0 and every row of this table reads "n/a". Open the pillar
    // first, the way panel.mjs does and the way a reader does.
    const reachable = await page.evaluate(() => {
      const b = document.getElementById("tabStudyOptionsBtn");
      return !!b && b.getBoundingClientRect().width > 0;
    });
    if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
    await page.click("#tabStudyOptionsBtn");
    await page.waitForTimeout(500);

    // Read the control's REAL computed font size once, so the type candidates
    // shrink from what is rendered rather than from an assumed inherited size.
    const basePx = await page.evaluate(() => {
      const el = document.getElementById("surahSelect");
      return el ? parseFloat(getComputedStyle(el).fontSize) : 16;
    });

    for (const [name, build] of Object.entries(CANDIDATES)) {
      const css = build ? build(basePx) : "";
      await page.evaluate((c) => {
        document.getElementById("__optprobe")?.remove();
        if (!c) return;
        const st = document.createElement("style");
        st.id = "__optprobe"; st.textContent = c;
        document.head.appendChild(st);
      }, css);
      await page.waitForTimeout(120);
      const m = await page.evaluate(PROBE);
      rows.push({ lang, width, candidate: name, m });
    }

    // REMOVE THE LAST CSS CANDIDATE FIRST. Without this the content remedy was
    // measured on top of whichever stylesheet the loop above happened to end
    // on (A+D), and it appeared to fix all three controls partly on A+D's
    // credit. A candidate measured on top of another candidate is not a
    // measurement of either.
    await page.evaluate(() => document.getElementById("__optprobe")?.remove());
    await page.waitForTimeout(120);

    // The content remedy, applied and reverted in the live DOM.
    for (const [name, apply] of Object.entries(CONTENT_CANDIDATES)) {
      await page.evaluate(`(${apply.toString()})()`);
      await page.waitForTimeout(120);
      rows.push({ lang, width, candidate: name, m: await page.evaluate(PROBE) });
      await page.evaluate(() => { if (window.__undoContent) window.__undoContent(); });
    }

    // A+D+C together.
    await page.evaluate((c) => {
      const st = document.createElement("style");
      st.id = "__optprobe"; st.textContent = c; document.head.appendChild(st);
    }, COMBINED);
    await page.evaluate(`(${CONTENT_CANDIDATES["C-shorter-text"].toString()})()`);
    await page.waitForTimeout(150);
    rows.push({ lang, width, candidate: "A+D+C", m: await page.evaluate(PROBE) });
    await page.evaluate(() => {
      if (window.__undoContent) window.__undoContent();
      document.getElementById("__optprobe")?.remove();
    });
    await page.evaluate(() => document.getElementById("__optprobe")?.remove());
    await page.close();
    await ctx.close();
  }
}
await browser.close();

const present = rows.filter((r) => r.m && TARGETS.some((t) => r.m[t]));
if (present.length === 0) {
  console.log("!! NO TARGET SELECT WAS MEASURED -- the panel did not open, or the ids moved.");
  process.exit(2);
}

console.log("\n=== AS-IS: what each control needs and what it gets ===");
console.log("lang  px   control          usable  longest  short  font   longest option");
for (const r of rows.filter((x) => x.candidate === "as-is")) {
  for (const id of TARGETS) {
    const m = r.m[id];
    if (!m || m.w === 0) { console.log(`${r.lang}    ${r.width}  ${id.padEnd(15)} (not rendered)`); continue; }
    console.log(`${r.lang}    ${r.width}  ${id.padEnd(15)} ${String(m.usable).padStart(6)} ${String(m.longest).padStart(8)} ${String(m.shortfall).padStart(6)} ${String(m.fontPx).padStart(5)}  ${JSON.stringify(m.longestText).slice(0, 34)}`);
  }
}

console.log("\n=== CANDIDATES: shortfall after each (negative = fits) ===");
console.log("lang  px   candidate          surah  unitType  tenant   panel content/visible  scrolls");
for (const r of rows) {
  const cell = (id) => { const m = r.m[id]; return !m || m.w === 0 ? "   n/a" : String(m.shortfall).padStart(6); };
  console.log(`${r.lang}    ${r.width}  ${r.candidate.padEnd(17)} ${cell("surahSelect")} ${cell("unitTypeSelect")}  ${cell("tenantSelect")}   `
    + `${String(r.m.__panelContentH).padStart(5)}/${String(r.m.__panelVisibleH).padEnd(5)}      ${r.m.__panelScrolls ? "YES" : "no"}`);
}

fs.writeFileSync(path.join(root, "docs/reports/2026-09-18-select-layout-measurements.json"),
  JSON.stringify(rows, null, 2));
console.log("\nRaw measurements: docs/reports/2026-09-18-select-layout-measurements.json");
console.log("\n==== NO LAYOUT WAS CHOSEN. This script measures and reverts; app/ is untouched. ====");

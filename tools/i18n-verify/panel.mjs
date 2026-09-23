// Study-options PANEL measurement (shell round 14, 15 Aug 2026).
//
// Every layout round since v07.22 has measured the LANDING page (layout.mjs).
// Nothing has ever measured what is INSIDE the dock panel, and nothing has
// ever measured this page above 768px at all -- quranrevival.html has exactly
// one media query, @media (max-width: 720px), so every desktop size takes a
// single untested path.
//
// This opens Study options for real (the panel is hidden until its tab is
// pressed -- see the README) and reports, per viewport:
//   - the panel's own box, and whether its content overflows it
//   - each bar: height, and whether its cells really sit on ONE line
//   - each control: rendered width, and whether its LABEL is ellipsised
//     (label truncation is silent -- .opt-cell > label is nowrap + ellipsis,
//     the same trap navcheck.mjs exists for on nav categories)
//   - how far down the panel the Study screen starts
//
// Usage: node tools/i18n-verify/panel.mjs [en|bn]
import { chromium, newContext, openPage } from "./harness.mjs";

// The STUDY pillar menu (#studyPillarMenu) holds Read/Note/Options and
// starts hidden, so these buttons resolve but measure 0x0 and a direct click
// times out. Open the pillar first, the way a reader does. Checks the
// RENDERED box, never .hidden.
async function clickStudyPillarItem(page, id) {
  const reachable = await page.evaluate((i) => {
    const b = document.getElementById(i);
    return !!b && b.getBoundingClientRect().width > 0;
  }, id);
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(120); }
  await page.click(`#${id}`);
}


const EXE = process.env.CHROMIUM_PATH || undefined;
const LANG = process.argv[2] === "bn" ? "bn" : "en";

// Phones/tablet as every previous round used, PLUS real desktop sizes. The
// three desktop rows are new this round: no layout test has ever run above
// 768px, so "it works on PC" has never been a measured claim.
export const VIEWPORTS = [
  ["360x640", { width: 360, height: 640 }],
  ["390x700", { width: 390, height: 700 }],
  ["390x844", { width: 390, height: 844 }],
  ["412x915", { width: 412, height: 915 }],
  ["768x1024", { width: 768, height: 1024 }],
  ["1280x800", { width: 1280, height: 800 }],
  ["1440x900", { width: 1440, height: 900 }],
  ["1920x1080", { width: 1920, height: 1080 }],
];

/**
 * @param unitType which Study Unit to measure the bars under. Bar 2 holds a
 *   DIFFERENT number of cells per unit type -- three for Single Ayah, four for
 *   a numbered unit (round 18's Ruku'/Juz/Hizb/Page number picker) and five
 *   for Range -- so measuring only the default measures the easiest case and
 *   proves nothing about the other two.
 */
export async function measurePanel(ctx, path, unitType = "ayah") {
  const { page, errors } = await openPage(ctx, path);
  // The panel is a hidden dock panel; press its tab, which is the real flow.
  await clickStudyPillarItem(page, "tabStudyOptionsBtn");
  await page.waitForTimeout(250);
  if (unitType !== "ayah") {
    await page.selectOption("#unitTypeSelect", unitType);
    // A numbered unit fetches its boundary table on first use, so this wait
    // has to outlast a real fetch or the bar is measured while still empty.
    await page.waitForTimeout(1200);
  }
  const m = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const panel = q("#panelStudyOptions");
    const body = q(".study-options-body");
    const bars = [...document.querySelectorAll(".study-options-body > .opt-bar")];

    // A bar holds "one line" if every visible cell OVERLAPS the others
    // vertically. Comparing top edges is wrong and did briefly report a
    // false wrap: a labelled <select> and a bare button beside it are
    // bottom-aligned on purpose, so they legitimately start at different
    // heights while sharing one line.
    const barInfo = bars.map((bar, i) => {
      const cells = [...bar.children].filter((c) => c.getBoundingClientRect().height > 0);
      const rows = [];
      for (const c of cells) {
        const r = c.getBoundingClientRect();
        const row = rows.find((x) => r.top < x.bottom - 1 && r.bottom > x.top + 1);
        if (row) { row.top = Math.min(row.top, r.top); row.bottom = Math.max(row.bottom, r.bottom); }
        else rows.push({ top: r.top, bottom: r.bottom });
      }
      const tops = rows;
      return {
        i,
        h: Math.round(bar.getBoundingClientRect().height),
        cells: cells.length,
        lines: tops.length,
        cellW: cells.map((c) => Math.round(c.getBoundingClientRect().width)),
      };
    });

    // Labels are nowrap + ellipsis: truncation is silent. scrollWidth beats
    // clientWidth exactly when the text is being cut off.
    const labels = [...document.querySelectorAll(".study-options-body .opt-cell > label")].map((l) => ({
      text: l.textContent.trim(),
      w: Math.round(l.getBoundingClientRect().width),
      need: l.scrollWidth,
      cut: l.scrollWidth > l.clientWidth + 1,
    }));

    // A <select>'s chosen option can also be visually cut; measure the text
    // width against the control by cloning into a span.
    //
    // v08.27 -- this used `need > w - 22`, an ASSUMED 22px reserve for the
    // native dropdown arrow that also ignored the control's own padding and
    // border. Those are 10px here, so the heuristic was optimistic by exactly
    // that much and reported "not cut" for a control whose text really was
    // being clipped. It hid a live defect: every number picker on the units
    // bar cut a three-digit value, at every viewport, in both languages.
    //
    // The arrow is MEASURED now, not assumed -- a select sized to max-content
    // is text + padding + border + arrow, so subtracting a span of the same
    // text in the same computed font leaves the arrow. And a number picker's
    // worst case is its LONGEST option ("286", "604"), not whichever the
    // fixture happens to have selected, so both are measured and the cut is
    // judged on the worse of the two.
    const measureText = (txt, cs) => {
      const span = document.createElement("span");
      span.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font}`;
      span.textContent = txt;
      document.body.appendChild(span);
      const w = span.getBoundingClientRect().width;
      span.remove();
      return w;
    };
    const arrowReserve = (() => {
      const model = document.querySelector(".study-options-body .opt-cell > select");
      if (!model) return 22;
      const cs = getComputedStyle(model);
      const probe = document.createElement("select");
      probe.style.cssText = `position:absolute;visibility:hidden;width:max-content;box-sizing:${cs.boxSizing};font:${cs.font};padding:${cs.padding};border:${cs.border};`;
      const opt = document.createElement("option");
      opt.textContent = "MMMM";
      probe.appendChild(opt);
      document.body.appendChild(probe);
      const probeW = probe.getBoundingClientRect().width;
      probe.remove();
      const pb = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
               + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
      return Math.max(0, probeW - measureText("MMMM", cs) - pb);
    })();
    const selects = [...document.querySelectorAll(".study-options-body .opt-cell > select")].map((s) => {
      const cs = getComputedStyle(s);
      const text = s.options[s.selectedIndex]?.text || "";
      const need = Math.ceil(measureText(text, cs));
      let longest = 0;
      for (const op of s.options) { const t = measureText(op.text, cs); if (t > longest) longest = t; }
      longest = Math.ceil(longest);
      const w = Math.round(s.getBoundingClientRect().width);
      const pb = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
               + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
      const usable = Math.round(w - pb - arrowReserve);
      // A hidden select measures 0, and "need > -22" was always true for one --
      // this suite printed "unitNumSelect \"1\" 0px needs 8px" for controls
      // simply not on screen. A hidden control is not a truncated one;
      // `hidden` is reported separately so the absence is not dropped either.
      return { id: s.id, text, w, need, longest, usable, hidden: w === 0,
               cut: w > 0 && (need > usable || longest > usable) };
    });

    const summary = q("#optionsSummary");
    const studyH2 = [...document.querySelectorAll("#panelStudyOptions h2")].find((h) => /Study|অধ্যয়ন|পড়া/.test(h.textContent));
    const panelRect = panel?.getBoundingClientRect();
    return {
      viewportH: window.innerHeight,
      panel: box(panel),
      panelClientH: panel ? panel.clientHeight : null,
      panelScrollH: panel ? panel.scrollHeight : null,
      panelScrolls: panel ? panel.scrollHeight > panel.clientHeight + 1 : null,
      panelTopAboveViewport: panelRect ? Math.round(panelRect.top) : null,
      bodyH: body ? Math.round(body.getBoundingClientRect().height) : null,
      bars: barInfo,
      labels,
      selects,
      summaryH: summary ? Math.round(summary.getBoundingClientRect().height) : 0,
      summaryPresent: !!summary && summary.getBoundingClientRect().height > 0,
      // How far into the panel's own scroll the Study heading sits. Shell
      // round 17 moved the Study screen OUT of this panel and onto the stage,
      // so null is now the correct answer -- and a number reappearing here
      // means the reading has fallen back into the drawer. reading.mjs is what
      // measures the reading screen itself.
      studyHeadingOffset: studyH2 && panelRect ? Math.round(studyH2.getBoundingClientRect().top - panelRect.top + panel.scrollTop) : null,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      panelOverflowsX: panel ? panel.scrollWidth > panel.clientWidth + 1 : null,
    };
  });
  await page.close();
  return { ...m, errors };
}

// This suite printed "!!" warnings and its own "-- REGRESSION" line and then
// ALWAYS EXITED 0, so no caller could ever act on what it found. It counts now.
// Page errors are counted separately: in this sandbox they are almost always
// the proxy's own TLS interception, which will not happen on the owner's
// machine, so they are reported without failing the run.
let problems = 0;
let environmental = 0;
let baselined = 0;
const baselineSeen = new Set();

// Three select truncations this panel has carried for as long as this suite
// has printed them, WITHOUT ever counting them -- so they are pre-existing,
// not a regression this round introduced. Counting them now would make this
// suite permanently red and its exit code meaningless, which is precisely the
// state navcheck.mjs and layout.mjs were just brought out of. Baselined by id;
// anything NEW fails.
//
//   tenantSelect   "Madrasatul Muslimeen (Owner, Prime)" -- 145px cell, 224px
//                  of text. The most user-visible of the three and worth the
//                  Owner's attention: a real tenant's name is cut in the
//                  picker. Recorded, not silently tolerated.
//   surahSelect    "1. Al-Faatiha" -- 74px of text in an 89px cell, tight once
//                  the 22px dropdown arrow is allowed for.
//   unitTypeSelect the Study Unit names, same shape.
// FIXED 22 Sep 2026 (v08.33) -- all three were genuine, MEASURED
// truncations (see app/quranrevival.html's own comments at .opt-bar-2 and
// .opt-bar-units for the exact numbers): tenantSelect never fit at any
// phone width because a tenant's own name is free text of any length,
// unlike a label a round could shorten; Study Unit/Surah were a genuine
// shortage of space, not a redistribution problem. Set left empty rather
// than deleted, so a REAL regression at any of these three ids is reported
// as new rather than silently re-baselined.
const KNOWN_TRUNCATED_SELECTS = new Set([]);

function report(name, m) {
  console.log(`\n--- ${name} (viewport height ${m.viewportH}) ---`);
  console.log(`  panel  ${m.panel.w}x${m.panel.h}px at y=${m.panel.y}   content ${m.panelScrollH}px in ${m.panelClientH}px  -> ${m.panelScrolls ? "SCROLLS" : "fits"}`);
  console.log(`  bars   ${m.bars.map((b) => `#${b.i}: ${b.h}px ${b.cells} cells on ${b.lines} line(s)`).join(" | ")}`);
  console.log(`  cellW  ${m.bars.map((b) => `[${b.cellW.join(",")}]`).join(" ")}`);
  const cutL = m.labels.filter((l) => l.cut);
  console.log(`  labels ${m.labels.length}, truncated: ${cutL.length ? cutL.map((l) => `"${l.text}" ${l.w}px needs ${l.need}px`).join("; ") : "none"}`);
  const cutS = m.selects.filter((s) => s.cut);
  const hiddenS = m.selects.filter((s) => s.hidden);
  console.log(`  selects truncated: ${cutS.length ? cutS.map((s) => `${s.id} "${s.text}" ${s.usable}px usable, needs ${s.need}px (longest option ${s.longest}px)`).join("; ") : "none"}`
    + (hiddenS.length ? ` (${hiddenS.length} not on screen: ${hiddenS.map((s) => s.id).join(", ")})` : ""));
  console.log(`  summary strip ${m.summaryPresent ? m.summaryH + "px" : "absent"} | Study screen in panel: ${m.studyHeadingOffset === null ? "no (round 17: it owns the stage)" : "YES at +" + m.studyHeadingOffset + "px -- REGRESSION"}`);
  if (m.horizontalOverflow) { problems++; console.log("  !! HORIZONTAL OVERFLOW (page)"); }
  if (m.panelOverflowsX) { problems++; console.log("  !! PANEL OVERFLOWS SIDEWAYS"); }
  // The Study screen appearing inside the panel is the round-17 regression this
  // suite's own summary line already called a REGRESSION in capitals -- and
  // then did not count.
  if (m.studyHeadingOffset !== null) { problems++; console.log("  !! STUDY SCREEN IS INSIDE THE PANEL (round 17 regression)"); }
  // A truncated label or select is the thing this suite exists to measure.
  const cutLabels = m.labels.filter((l) => l.cut);
  const cutSelects = m.selects.filter((x) => x.cut);
  for (const x of cutSelects) if (KNOWN_TRUNCATED_SELECTS.has(x.id)) { baselined++; baselineSeen.add(x.id); }
  const newCuts = [...cutLabels.map((l) => `label "${l.text}"`),
                   ...cutSelects.filter((x) => !KNOWN_TRUNCATED_SELECTS.has(x.id)).map((x) => `select #${x.id}`)];
  if (newCuts.length) { problems++; console.log(`  !! NEWLY TRUNCATED: ${newCuts.join("; ")}`); }
  if (m.errors.length) {
    const envOnly = m.errors.every((e) => /ERR_CERT_AUTHORITY_INVALID/.test(e));
    if (envOnly) environmental++; else problems++;
    console.log(`  !! ${envOnly ? "ENVIRONMENTAL " : ""}PAGE ERRORS: ${m.errors.slice(0, 2).join(" | ")}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  for (const banner of [true, false]) {
    console.log(`\n######## tenant banner ${banner ? "SET" : "CLEARED"} -- lang ${LANG} ########`);
    for (const [name, viewport] of VIEWPORTS) {
      const ctx = await newContext(browser, { banner, viewport, appLang: LANG });
      await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
      // Three passes: the default, a numbered unit (four cells on bar 2) and
      // Range (five). Round 18 added the middle one.
      for (const unitType of ["ayah", "page", "range"]) {
        const m = await measurePanel(ctx, "/app/quranrevival.html", unitType);
        report(`${name} · unit=${unitType}`, m);
      }
      await ctx.close();
    }
  }
  await browser.close();
  if (environmental) {
    console.log(`\n     (${environmental} measurement(s) also reported environmental page errors -- this sandbox's TLS proxy, not a defect)`);
  }
  const fixed = [...KNOWN_TRUNCATED_SELECTS].filter((id) => !baselineSeen.has(id));
  if (baselined) console.log(`\n     (${baselined} known pre-existing select truncation(s) tolerated: ${[...baselineSeen].join(", ")})`);
  if (fixed.length) console.log(`     !! a BASELINED truncation no longer occurs: ${fixed.join(", ")} -- if that is a fix, drop it from KNOWN_TRUNCATED_SELECTS`);
  console.log(`\n==== ${problems === 0 ? "PANEL OK (apart from the known baseline)" : problems + " PROBLEM(S)"} ====`);
  process.exit(problems === 0 ? 0 : 1);
}

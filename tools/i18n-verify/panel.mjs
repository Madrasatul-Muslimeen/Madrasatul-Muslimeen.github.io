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

export async function measurePanel(ctx, path) {
  const { page, errors } = await openPage(ctx, path);
  // The panel is a hidden dock panel; press its tab, which is the real flow.
  await page.click("#tabStudyOptionsBtn");
  await page.waitForTimeout(250);
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
    const selects = [...document.querySelectorAll(".study-options-body .opt-cell > select")].map((s) => {
      const span = document.createElement("span");
      const cs = getComputedStyle(s);
      span.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font}`;
      span.textContent = s.options[s.selectedIndex]?.text || "";
      document.body.appendChild(span);
      const need = Math.ceil(span.getBoundingClientRect().width);
      span.remove();
      const w = Math.round(s.getBoundingClientRect().width);
      return { id: s.id, text: span.textContent, w, need, cut: need > w - 22 };
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
      // How far into the panel's own scroll the Study heading sits.
      studyHeadingOffset: studyH2 && panelRect ? Math.round(studyH2.getBoundingClientRect().top - panelRect.top + panel.scrollTop) : null,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      panelOverflowsX: panel ? panel.scrollWidth > panel.clientWidth + 1 : null,
    };
  });
  await page.close();
  return { ...m, errors };
}

function report(name, m) {
  console.log(`\n--- ${name} (viewport height ${m.viewportH}) ---`);
  console.log(`  panel  ${m.panel.w}x${m.panel.h}px at y=${m.panel.y}   content ${m.panelScrollH}px in ${m.panelClientH}px  -> ${m.panelScrolls ? "SCROLLS" : "fits"}`);
  console.log(`  bars   ${m.bars.map((b) => `#${b.i}: ${b.h}px ${b.cells} cells on ${b.lines} line(s)`).join(" | ")}`);
  console.log(`  cellW  ${m.bars.map((b) => `[${b.cellW.join(",")}]`).join(" ")}`);
  const cutL = m.labels.filter((l) => l.cut);
  console.log(`  labels ${m.labels.length}, truncated: ${cutL.length ? cutL.map((l) => `"${l.text}" ${l.w}px needs ${l.need}px`).join("; ") : "none"}`);
  const cutS = m.selects.filter((s) => s.cut);
  console.log(`  selects truncated: ${cutS.length ? cutS.map((s) => `${s.id} "${s.text}" ${s.w}px needs ${s.need}px`).join("; ") : "none"}`);
  console.log(`  summary strip ${m.summaryPresent ? m.summaryH + "px" : "absent"} | Study heading at +${m.studyHeadingOffset}px into panel`);
  if (m.horizontalOverflow) console.log("  !! HORIZONTAL OVERFLOW (page)");
  if (m.panelOverflowsX) console.log("  !! PANEL OVERFLOWS SIDEWAYS");
  if (m.errors.length) console.log(`  !! PAGE ERRORS: ${m.errors.slice(0, 2).join(" | ")}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
  for (const banner of [true, false]) {
    console.log(`\n######## tenant banner ${banner ? "SET" : "CLEARED"} -- lang ${LANG} ########`);
    for (const [name, viewport] of VIEWPORTS) {
      const ctx = await newContext(browser, { banner, viewport, appLang: LANG });
      await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
      const m = await measurePanel(ctx, "/app/quranrevival.html");
      await ctx.close();
      report(name, m);
    }
  }
  await browser.close();
}

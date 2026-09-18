// Landing-page layout regression, the LAYOUT-BACKLOG.md way: measure the
// previous commit's copy of the page and the new one side by side, at five
// viewports, in both tenant-banner states.
import { chromium, newContext, openPage } from "./harness.mjs";

// Chromium: use whatever this machine has. CHROMIUM_PATH overrides;
// otherwise Playwright finds its own download, which is the normal case.
const EXE = process.env.CHROMIUM_PATH || undefined;
// Shell round 14 (15 Aug 2026): the three desktop rows are new. Every layout
// round from v07.22 to v07.39 measured phones and one tablet, so nothing above
// 768px had ever been checked -- and quranrevival.html has exactly one media
// query, @media (max-width: 720px), meaning every PC size takes a single
// untested path. They are permanent now, not a one-off for this round.
const VIEWPORTS = [
  ["390x844", { width: 390, height: 844 }],
  ["412x915", { width: 412, height: 915 }],
  ["390x700", { width: 390, height: 700 }],
  ["360x640", { width: 360, height: 640 }],
  ["768x1024", { width: 768, height: 1024 }],
  ["1280x800", { width: 1280, height: 800 }],
  ["1440x900", { width: 1440, height: 900 }],
  ["1920x1080", { width: 1920, height: 1080 }],
];

async function measure(ctx, path) {
  const { page, errors } = await openPage(ctx, path);
  const m = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const heading = [...document.querySelectorAll("h2, h3")].find((h) => /Mastery Wheel/i.test(h.textContent));
    const svg = q("#wheelContainer svg");
    const dock = q("#dock");
    const card = q("#wheelSection");
    const sidebar = q("#wheelSidebarContainer");
    const dockRect = dock?.getBoundingClientRect();
    // Approach rows visible before scrolling: sidebar rows whose whole box
    // sits above the dock's top edge.
    let rows = 0;
    if (sidebar && dockRect) {
      for (const r of sidebar.querySelectorAll(".way-row")) {
        const rr = r.getBoundingClientRect();
        if (rr.height > 4 && rr.bottom <= dockRect.top + 0.5 && rr.top >= 0) rows++;
      }
    }
    const cardRect = card?.getBoundingClientRect();
    return {
      headingTop: heading ? Math.round(heading.getBoundingClientRect().top) : null,
      wheelWidth: svg ? Math.round(svg.getBoundingClientRect().width) : null,
      dockTop: dockRect ? Math.round(dockRect.top) : null,
      dockBottom: dockRect ? Math.round(dockRect.bottom) : null,
      dockFullyVisible: dockRect ? dockRect.bottom <= window.innerHeight + 0.5 && dockRect.top >= 0 : null,
      gapAboveDock: cardRect && dockRect ? Math.round(dockRect.top - cardRect.bottom) : null,
      approachRows: rows,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      idTargets: (() => {
        // An absent getElementById target is TWO different things, and this
        // scan used to report them as one. An id the page AUTHORS -- `id="x"`
        // appears somewhere in its own script, inside a render template -- is
        // a DEFERRED render: the element is injected when its surface opens,
        // and its absence on the landing page is a render-state fact, not a
        // defect. An id the page references but never authors anywhere is
        // DANGLING: getElementById returns null and the call site is dead.
        // Only the second is a defect, and this suite had never checked for it.
        const src = [...document.querySelectorAll("script")].map((s) => s.textContent).join("\n");
        const ids = [...new Set([...src.matchAll(/getElementById\("([^"]+)"\)/g)].map((m) => m[1]))];
        const authored = new Set([...src.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
        const absent = ids.filter((id) => !document.getElementById(id));
        return {
          total: ids.length,
          deferred: absent.filter((id) => authored.has(id)),
          dangling: absent.filter((id) => !authored.has(id)),
        };
      })(),
    };
  });
  await page.close();
  return { ...m, errors };
}

const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
let regressions = 0;
let shimChecked = false;

// INVESTIGATED AND EMPTIED, 18 Sep 2026. This held 22 ids "this app has been
// missing for as long as this suite has recorded them" -- Asma's edit form and
// QCR's add row. **None of them was missing.** All 22 are authored inside JS
// template literals in `quranrevival.html` and injected when their own surface
// opens; they are absent from the LANDING PAGE, which is the only state this
// suite measures. Proven twice over, by two independent methods that agree:
//
//   * a browser walk that opened each surface -- Asma Names level (3 ids),
//     Refs level (5), the edit overlay (7), the file-into row reached through
//     "+ Create a new Dual Name" (3), and the QCR collection view (4). All 22
//     appeared, each at its own surface.
//   * the static rule now used above: `absent AND authored` = deferred,
//     `absent AND never authored` = dangling. It returns 22 deferred, 0
//     dangling -- the same 22, reached a different way.
//
// So the baseline was never debt; the measurement was conflating a deferred
// render with a broken reference. It is empty rather than deleted, keeping the
// mechanism for a finding that really is pre-existing -- the same shape
// navcheck.mjs uses. **A DANGLING id now fails outright**, which is a real
// assertion this suite has never carried.
const KNOWN_MISSING_IDS = new Set([]);
const baselineSeen = new Set();

for (const banner of [true, false]) {
  console.log(`\n######## tenant banner ${banner ? "SET" : "CLEARED"} ########`);
  for (const [name, viewport] of VIEWPORTS) {
    const ctx = await newContext(browser, { banner, viewport });
    await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    const before = await measure(ctx, "/app/_prev-quranrevival.html");
    const after = await measure(ctx, "/app/quranrevival.html");
    await ctx.close();

    // THE SHIM TRAP, made loud. Without app/_prev-quranrevival.html the whole
    // "before" side measures null, every metric reads as CHANGED, and the run
    // looks like a catastrophic regression while proving nothing. Build it
    // from the comparison commit (`git show <sha>:app/quranrevival.html >
    // app/_prev-quranrevival.html`) and DELETE it before reading coverage.
    if (!shimChecked) {
      shimChecked = true;
      if (before.idTargets.total === 0 || before.headingTop === null) {
        console.log("\n!! NO BASELINE: app/_prev-quranrevival.html did not render.");
        console.log("   Every 'before' number below would be null and every metric would read as CHANGED.");
        console.log("   Create the shim from the commit you are comparing against, then re-run.");
        await browser.close();
        process.exit(2);
      }
    }

    const same = (k) => before[k] === after[k];
    const flags = [];
    for (const k of ["headingTop", "wheelWidth", "approachRows", "gapAboveDock", "dockFullyVisible", "horizontalOverflow"]) {
      if (!same(k)) flags.push(`${k}: ${before[k]} -> ${after[k]}`);
    }
    console.log(`${name}  heading ${before.headingTop}->${after.headingTop}px | wheel ${before.wheelWidth}->${after.wheelWidth}px | rows ${before.approachRows}->${after.approachRows} | gap ${before.gapAboveDock}->${after.gapAboveDock}px | dock visible ${after.dockFullyVisible} | overflow ${after.horizontalOverflow}`);
    console.log(`        getElementById targets: ${before.idTargets.total} -> ${after.idTargets.total}, deferred (authored, rendered on demand): ${after.idTargets.deferred.length}, dangling: ${after.idTargets.dangling.length}`);
    if (after.errors.length) console.log(`        PAGE ERRORS: ${after.errors.slice(0, 3).join(" | ")}`);
    // A CHANGED geometry metric is what this suite EXISTS to detect, and it was
    // printed without being counted -- so the exit code said "no regressions"
    // while the heading, the wheel width or the dock gap had moved. Counted now.
    if (flags.length) { regressions++; console.log(`        !! CHANGED: ${flags.join("; ")}`); }
    // A dangling target -- referenced, never authored anywhere -- is a real
    // defect: getElementById returns null there and always will.
    const dangling = after.idTargets.dangling.filter((id) => !KNOWN_MISSING_IDS.has(id));
    for (const id of after.idTargets.dangling) if (KNOWN_MISSING_IDS.has(id)) baselineSeen.add(id);
    if (dangling.length) { regressions++; console.log(`        !! DANGLING ID TARGETS (referenced, never authored anywhere): ${JSON.stringify(dangling)}`); }
    if (after.horizontalOverflow) { regressions++; console.log("        !! HORIZONTAL OVERFLOW"); }
    if (!after.dockFullyVisible) { regressions++; console.log("        !! DOCK NOT FULLY VISIBLE"); }
    if (after.errors.length) regressions++;
    if (after.approachRows < before.approachRows) { regressions++; console.log("        !! LOST AN APPROACH ROW"); }
  }
}

await browser.close();
const fixed = [...KNOWN_MISSING_IDS].filter((id) => !baselineSeen.has(id));
if (KNOWN_MISSING_IDS.size) {
  console.log(`\n  (${baselineSeen.size} of ${KNOWN_MISSING_IDS.size} known-dangling id targets seen, tolerated as pre-existing)`);
  if (fixed.length) console.log(`  !! a BASELINED dangling id is now authored: ${fixed.join(", ")} -- if that is a fix, drop it from KNOWN_MISSING_IDS`);
}
console.log(`\n==== ${regressions === 0 ? "NO LAYOUT REGRESSIONS" : regressions + " REGRESSION(S)"} ====`);
process.exit(regressions === 0 ? 0 : 1);

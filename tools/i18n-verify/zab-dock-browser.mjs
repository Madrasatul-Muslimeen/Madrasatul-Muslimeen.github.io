// The Owner, 15 Oct 2026 (PCF J25, with a photo): "Zab button covering the Map. Rather move it as shown." On a phone
// the Qur'an page's 🧰 now sits at the right end of the Wheel / Legend / Unit row ([data-zab-dock]) and the floating
// corner hides while it is there; wherever the corner does show, it sits above the page's pinned bottom bar
// ([data-zab-lift]: #tabRow, and the Read view's #readQuickRow).
// Measured on the rendered page, en/bn x 320 / 360 / 390 / 740 / 820.
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
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUTATIONS = {
  // the corner no longer hides while the 🧰 is docked: it covers the bottom tabs again
  "dock-hides-corner": ["app/js/zab-bar.js", "**/js/zab-bar.js*", "body.zab-docked #zabCorner { display: none; }", "body.zab-docked #zabCorner { }"],
  // the three drawer buttons keep their wide size: the row of four runs past a 320px phone
  "dock-row-fit": ["app/quranrevival.html", "**/quranrevival.html*", ".wheel-drawer-btn { min-width: 4.6rem; } }", ".wheel-drawer-btn { } }"],
  // the corner ignores the pinned bottom bar: it covers the Read view's quick buttons
  // (updated in place 1 Nov 2026, v13.13: the anchor had read "12px", which the CSS stopped saying when it moved to rem, so
  //  this mutation threw "found 0 times" and had not run since)
  "lift": ["app/js/zab-bar.js", "**/js/zab-bar.js*", "bottom: calc(.75rem + var(--zab-lift, 0px));", "bottom: .75rem;"],
  // v13.13: the corner is lifted by the bar's HEIGHT wherever the bar is (the old rule): with the page fitting the screen
  // the tabs sit above the spacer and the lifted corner lands on "Mapping My Journey" (J25's complaint, back on every phone)
  "lift-by-height": ["app/js/zab-bar.js", "**/js/zab-bar.js*", "if (b.top < spotBottom && b.bottom > spotTop) lift = Math.max(lift, vh - b.top);", "lift = Math.max(lift, b.height);"],
  // v13.13: the lift is not re-read on scroll: a sticky bar that unsticks at the page's end leaves the corner on the tabs
  "no-scroll-update": ["app/js/zab-bar.js", "**/js/zab-bar.js*", 'window.addEventListener("scroll", soon, { passive: true });', ""],
  // no dock slot on the page: the 🧰 floats over the tabs as before
  "no-dock": ["app/quranrevival.html", "**/quranrevival.html*", '<span class="wheel-zab-dock" data-zab-dock></span>', ""],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

async function open(lang, width) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html", body: body.split(from).join(to) }));
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(1500);
  return { ctx, page };
}
const probe = (page) => page.evaluate(() => {
  const vis = (el) => !!el && el.getClientRects().length > 0 && el.getBoundingClientRect().width > 0;
  const corner = document.getElementById("zabCorner"), dock = document.querySelector(".zab-dock-btn");
  const row = document.getElementById("wheelDrawerRow"), rr = row.getBoundingClientRect();
  const kids = [...row.children].filter(vis).map((k) => k.getBoundingClientRect());
  const tab = document.getElementById("tabJourneyBtn"), tr = tab.getBoundingClientRect();
  // the tab's whole right half, where the corner used to sit
  const tabFree = [0.55, 0.7, 0.85, 0.97].every((f) => { const h = document.elementFromPoint(tr.left + tr.width * f, tr.top + tr.height / 2); return !!h && tab.contains(h); });
  const d = vis(dock) ? dock.getBoundingClientRect() : null;
  return {
    zabOn: !!document.getElementById("zabRoot"), corner: vis(corner), dock: !!d, dw: d ? Math.round(d.width) : 0, dh: d ? Math.round(d.height) : 0,
    dockRight: d ? Math.round(rr.right - d.right) : null, dockLast: d ? kids.every((k) => k.right <= d.right + 0.5) : false,
    inRow: kids.every((k) => k.left >= rr.left - 0.5 && k.right <= rr.right + 0.5), rowSlack: row.scrollWidth - row.clientWidth,
    overlap: kids.some((a, i) => kids.some((b, j) => j > i && a.right > b.left + 0.5 && b.right > a.left + 0.5)), tabFree, ov: document.documentElement.scrollWidth - innerWidth,
  };
});

for (const lang of ["en", "bn"]) for (const width of [320, 360, 390, 740, 820]) {
  const tag = `${lang} ${width}px`;
  const phone = width < 768;
  const { ctx, page } = await open(lang, width);
  try {
    await page.evaluate(() => document.getElementById("wheelDrawerRow").scrollIntoView({ block: "center" }));
    await page.waitForTimeout(300);
    const m = await probe(page);
    check(`${tag}: POSITIVE CONTROL Zab is mounted`, m.zabOn);
    if (phone) {
      check(`${tag}: the 🧰 sits in the Wheel / Legend / Unit row, 40x40`, m.dock && m.dw >= 39.5 && m.dh >= 39.5, JSON.stringify(m));
      check(`${tag}: ...at the row's right end`, m.dockLast && m.dockRight !== null && m.dockRight <= 1, JSON.stringify(m));
      check(`${tag}: ...and the floating corner is hidden`, !m.corner, JSON.stringify(m));
      check(`${tag}: the row of four fits, nothing overlaps`, m.inRow && m.rowSlack <= 0 && !m.overlap, JSON.stringify(m));
    } else {
      check(`${tag}: no docked 🧰 (the Zab bar is shown instead)`, !m.dock && !m.corner, JSON.stringify(m));
    }
    check(`${tag}: "Mapping My Journey" is not covered`, m.tabFree, JSON.stringify(m));
    check(`${tag}: nothing scrolls sideways (${m.ov})`, m.ov <= 0);
    if (phone && width === 390) {
      await page.click(".zab-dock-btn");
      await page.waitForTimeout(600);
      check(`${tag}: tapping the docked 🧰 opens Zab`, await page.evaluate(() => !document.getElementById("zabPanel").hidden && document.querySelector(".zab-dock-btn").getAttribute("aria-pressed") === "true"));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      check(`${tag}: Esc closes it again`, await page.evaluate(() => document.getElementById("zabPanel").hidden && document.querySelector(".zab-dock-btn").getAttribute("aria-pressed") === "false"));
      // the Read view hides the row: the corner comes back, above the pinned quick buttons
      await page.click("#readContentsBtn");
      await page.waitForTimeout(1000);
      await page.locator(".rc-ar").first().click();
      await page.waitForTimeout(2000);
      const r = await page.evaluate(() => {
        const c = document.getElementById("zabCorner"), q = document.getElementById("readQuickRow");
        const shown = c.getClientRects().length > 0, cr = c.getBoundingClientRect(), qr = q.getBoundingClientRect();
        const qVis = q.getClientRects().length > 0 && qr.height > 0;
        // Updated in place 24 Oct 2026 (audit part 72): only buttons ON SCREEN count -- round 666fe0c4 added a tablet-only
        // "Study" menu button that is display:none on a phone, and a 0x0 button is not covered, it is absent.
        const covered = qVis ? [...q.querySelectorAll("button")].filter((b) => b.getClientRects().length > 0 && b.getBoundingClientRect().width > 0).filter((b) => { const br = b.getBoundingClientRect(); const h = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2); return !(h && b.contains(h)); }).map((b) => b.id) : [];
        return { shown, qVis, gap: Math.round(qr.top - cr.bottom), covered };
      });
      check(`${tag}: POSITIVE CONTROL the Read view's quick buttons are on screen`, r.qVis, JSON.stringify(r));
      check(`${tag}: in the Read view the corner 🧰 is back`, r.shown, JSON.stringify(r));
      check(`${tag}: ...above the quick buttons, covering none of them`, r.gap >= 0 && r.covered.length === 0, JSON.stringify(r));
    }
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  await ctx.close();
}

// v13.13 (1 Nov 2026): the Read and Explore views on a phone, where the docked 🧰 is hidden and the corner shows. The tabs
// stick to the bottom only while the page scrolls (#dock is sticky); when the page fits the screen they sit ABOVE the spacer.
// Either way the corner must never sit on a tab, and while the tabs are pinned it stands above them.
const tabsProbe = (page) => page.evaluate(() => {
  const c = document.getElementById("zabCorner"), row = document.getElementById("tabRow");
  const cr = c.getBoundingClientRect(), rr = row.getBoundingClientRect();
  const shown = c.getClientRects().length > 0 && cr.width > 0;
  const tabs = [...row.querySelectorAll("button")].filter((b) => b.getClientRects().length > 0 && b.getBoundingClientRect().width > 0);
  // every tab, sampled across its width: what the finger finds there must be the tab
  const covered = tabs.filter((b) => { const br = b.getBoundingClientRect(); return [0.15, 0.5, 0.85, 0.97].some((f) => { const h = document.elementFromPoint(br.left + br.width * f, br.top + br.height / 2); return !(h && b.contains(h)); }); }).map((b) => b.id || b.textContent.trim());
  const overlap = shown && cr.left < rr.right && cr.right > rr.left && cr.top < rr.bottom && cr.bottom > rr.top;
  const pinned = Math.abs(document.getElementById("dock").getBoundingClientRect().bottom - innerHeight) <= 1;
  return { shown, overlap, covered, pinned, n: tabs.length, corner: [Math.round(cr.top), Math.round(cr.bottom)], row: [Math.round(rr.top), Math.round(rr.bottom)] };
});
for (const lang of ["en", "bn"]) for (const width of [320, 360, 390]) for (const size of ["100%", "200%"]) for (const view of ["tabReadBtn", "tabExploreBtn"]) {
  const tag = `${lang} ${width}px ${size} ${view === "tabReadBtn" ? "Read" : "Explore"}`;
  const { ctx, page } = await open(lang, width);
  try {
    await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, size);
    await page.evaluate((v) => document.getElementById(v).click(), view);
    await page.waitForTimeout(1500);
    for (const at of ["top", "end"]) {
      await page.evaluate((a) => { document.scrollingElement.scrollTop = a === "top" ? 0 : 1e7; }, at);
      await page.waitForTimeout(400);
      const m = await tabsProbe(page);
      const t = `${tag} (page ${at}${m.pinned ? ", tabs pinned" : ""})`;
      check(`${t}: POSITIVE CONTROL the tabs and the corner 🧰 are on screen`, m.n >= 3 && m.shown, JSON.stringify(m));
      check(`${t}: the corner 🧰 covers no tab ("Mapping My Journey" included)`, !m.overlap && m.covered.length === 0, JSON.stringify(m));
      if (m.pinned) check(`${t}: ...it stands above the pinned tabs`, m.corner[1] <= m.row[0], JSON.stringify(m));
    }
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

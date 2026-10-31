// QR Lead audit, 31 Oct 2026 (Search the Qur'an, PCF User Manual 2q34dob): with the reader's text at 200% on a phone, the
// Study options drawer opened by 🔍 Search went ABOVE the screen: its head (the title, ☆ Save these settings and the ✕) sat at
// -80px at 360x740 (✕ at -9px) and -53px at 390x844 (✕ at -12px), and the drawer has no scroll that reaches it. Measured
// before the fix on main v12.135 with this suite's own probe. Cause: the drawer opens UP from the dock with a 74dvh cap, and
// with large text the dock's tabs wrap to two rows (~243px at 360 200%), so 74dvh is more than the room above the dock.
// Now fitPanelRoom() measures the room above the dock (less the drawer's padding and border) into --qr-panel-room.
// At ordinary text nothing moves: the 74dvh cap is the smaller one, and this suite checks the drawer's box is unchanged there.
//   node tools/i18n-verify/qr-panel-head-reach-browser.mjs [--mutate=NAME]   (serve.js on :8080, from the repo root)
//   no-room   the CSS cap ignores --qr-panel-room      -> "the drawer's head is on screen" FAILS at 360/390 200%
//   no-box    the padding and border are not subtracted -> "the drawer's head is on screen" FAILS at 200% (top < 0)
//   no-open   the room is not measured when it opens    -> FAILS in the Read view at 100% (360 en, 390 bn): the room kept from
//             the landing is stale there; the dock's ResizeObserver alone does not re-measure it
//   small-x   the ✕ back to a fixed 26px                -> "the ✕ is a finger-sized target" FAILS everywhere
//   no-stack  fitPanelHead() not called                -> "☆ Save these settings is never cut" FAILS at 150/200% (390-414,
//             360 200%, landscape 200%): the label was cut on main at 9 of 42 sizes before this round
// Also measured (31 Oct): the ✕ was a fixed 26x26px (15px glyph) at every text size; now 2.5rem (40px at 100%).
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-room": ["  .qr-panel { max-height: min(74dvh, var(--qr-panel-room, 74dvh)); }\n", ""],
  "no-box": ["Math.max(96, top - 6 - Math.ceil(box))", "Math.max(96, top - 6)"],
  "small-x": ["width: 2.5rem; height: 2.5rem; font-size: 1.25rem;", "width: 26px; height: 26px; font-size: 15px;"],
  "no-stack": ["      dockTabs.forEach((tab) => { const p = document.getElementById(tab.dataset.panel); if (p) fitPanelHead(p); });\n", ""],
  "no-open": ["        document.getElementById(tab.dataset.panel).hidden = false;\n        fitPanelRoom();\n", "        document.getElementById(tab.dataset.panel).hidden = false;\n"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SHOT_DIR = process.env.SHOT_DIR || "";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function boot(lang, w, h) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [from, to] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const res = await r.fetch(); const body = await res.text();
      if (body.split(from).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found exactly once`);
      r.fulfill({ response: res, body: body.replace(from, to) });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.querySelector("#wheelContainer svg"), null, { timeout: 30000 });
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page };
}
const measure = (page) => page.evaluate(() => {
  const panel = document.getElementById("panelStudyOptions"), dock = document.getElementById("dock");
  const x = panel.querySelector(".qr-panel-x"), head = panel.querySelector(".qr-panel-head");
  const pr = panel.getBoundingClientRect(), xr = x.getBoundingClientRect(), hr = head.getBoundingClientRect(), dr = dock.getBoundingClientRect();
  const hit = document.elementFromPoint(xr.left + xr.width / 2, xr.top + xr.height / 2);
  const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const save = head.querySelector(".preset-save-btn");
  return { saveCut: save.scrollWidth > save.clientWidth + 1, stacked: head.classList.contains("qr-panel-head-stacked"), headH: Math.round(hr.height), xW: Math.round(xr.width), xH: Math.round(xr.height), xRem: +(Math.min(xr.width, xr.height) / root).toFixed(2), open: !panel.hidden && pr.height > 0, top: Math.round(pr.top), bottom: Math.round(pr.bottom), h: Math.round(pr.height),
    headTop: Math.round(hr.top), xTop: Math.round(xr.top), xBottom: Math.round(xr.bottom), xHit: !!hit && x.contains(hit),
    dockTop: Math.round(dr.top), vh: innerHeight, cap74: Math.round(innerHeight * 0.74),
    contentH: Math.round(pr.height - ["paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth"].reduce((n, k) => n + parseFloat(getComputedStyle(panel)[k]), 0)),
    scrollable: panel.scrollHeight > panel.clientHeight };
});
function judge(tag, m, size) {
  check(`${tag} the drawer opened`, m.open, JSON.stringify(m));
  check(`${tag} the drawer's head is on screen (top >= 0), not above it`, m.top >= 0 && m.headTop >= 0, JSON.stringify(m));
  check(`${tag} the ✕ is on screen and it is what a tap there reaches`, m.xTop >= 0 && m.xBottom <= m.dockTop && m.xHit, JSON.stringify(m));
  check(`${tag} the ✕ is a finger-sized target (>= 40px and 2.5rem, so it grows with the text)`, m.xW >= 40 && m.xH >= 40 && m.xRem >= 2.49, JSON.stringify(m));
  check(`${tag} ☆ Save these settings is never cut`, !m.saveCut, JSON.stringify(m));
  if (size === "100%") check(`${tag} at ordinary text the head stays one row (56px, not stacked)`, !m.stacked && m.headH === 56, JSON.stringify(m));
  check(`${tag} the drawer still ends at the dock (opens up from it)`, Math.abs(m.bottom - m.dockTop) <= 2, JSON.stringify(m));
  if (size === "100%") check(`${tag} at ordinary text the 74% cap still rules (box unchanged)`, m.contentH <= m.cap74 + 1 && (m.contentH >= m.cap74 - 1 || !m.scrollable), JSON.stringify(m));
}

// Positive control: the defect this suite exists for must be reproducible by the probe itself, so with the fix's CSS cap
// removed the head is above the screen at 360x740 200%. Run as a mutation (no-room) rather than assumed.
for (const [w, h, lang] of [[360, 740, "en"], [360, 740, "bn"], [390, 844, "en"], [390, 844, "bn"], [768, 1024, "en"], [1024, 768, "en"], [1280, 800, "bn"], [414, 896, "en"], [414, 896, "bn"], [740, 360, "en"]]) {
  const { ctx, page } = await boot(lang, w, h);
  for (const size of ["100%", "150%", "200%"]) {
    await page.evaluate((s) => { document.documentElement.style.fontSize = s; document.scrollingElement.scrollTop = 0; }, size);
    await page.waitForTimeout(350);
    // Route 1: the banner's 🔍 Search (the Manual's way in).
    await page.click("#headSearchBtn"); await page.waitForTimeout(350);
    const tag = `[${lang} ${w}x${h} ${size}]`;
    judge(`${tag} 🔍 Search:`, await measure(page), size);
    if (SHOT_DIR) await page.screenshot({ path: `${SHOT_DIR}/panel-head-${lang}-${w}-${size.replace("%", "")}.png` });
    // ✕ closes it (a real tap at its centre).
    const xr = await page.evaluate(() => { const r = document.querySelector("#panelStudyOptions .qr-panel-x").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.click(xr.x, xr.y); await page.waitForTimeout(250);
    check(`${tag} a tap on the ✕ closes the drawer`, await page.evaluate(() => document.getElementById("panelStudyOptions").hidden));
  }
  await ctx.close();
}
// Route 2: from the Read view, Study ▾ → Options, at the sizes that broke.
for (const [w, h, lang] of [[360, 740, "en"], [390, 844, "bn"]]) {
  const { ctx, page } = await boot(lang, w, h);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(800);
  for (const size of ["100%", "200%"]) {
    await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, size);
    await page.waitForTimeout(350);
    await page.click("#tabStudyBtn"); await page.waitForTimeout(200);
    await page.click("#tabStudyOptionsBtn"); await page.waitForTimeout(350);
    const tag = `[${lang} ${w}x${h} ${size}] Read view, Study ▾ → Options:`;
    judge(tag, await measure(page), size);
    await page.evaluate(() => document.querySelector("#panelStudyOptions .qr-panel-x").click()); await page.waitForTimeout(200);
  }
  await ctx.close();
}
await browser.close();
console.log(`\n==== Study options drawer head on screen (QR Lead audit, Search): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

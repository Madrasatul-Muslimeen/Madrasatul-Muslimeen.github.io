// PCF MSA J109 (the Owner, 1 Nov 2026: "Instead arrow to on/off, i want the toggle way to on/off, everywhere."):
// every show/hide section wears the shared ON/OFF switch from css/shell.css, never a ▸/▾ arrow.
//
// (A) Every pattern the rule covers is drawn on a page that loads the REAL shell.css, shut and open: the switch is 40x24,
//     grey when shut and teal when open, and no arrow glyph can be seen (its font size is 0 / the marker is gone).
// (B) The real Āyah full view (quranrevival.html, the Owner's screenshot) at 390 and 768, English and Bangla.
// Run from the repository root with `node serve.js` on 8080.  --mutate=nocss drops the J109 block (must FAIL).
import { chromium, newContext, openPage, BASE } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) pass++; else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const TEAL = "rgb(31, 138, 126)", GREY = "rgb(201, 208, 220)";

const browser = await chromium.launch();

// ---------- (A) every covered pattern, on the real stylesheet ----------
{
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await page.goto(`${BASE}/app/about.html`, { waitUntil: "domcontentloaded" });
  let css = await page.evaluate(async () => (await fetch("/app/css/shell.css")).text());
  check("(A) positive control: shell.css carries the J109 block", css.includes("PCF MSA J109"));
  if (MUTATE === "nocss") css = css.slice(0, css.indexOf("/* PCF MSA J109"));
  await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>
    ${["ayah-nv-sec", "ayah-ft-sec", "ayah-related-more", "word-card-dict-more", "word-card-more-entries"].map((c) =>
      `<details class="${c}" data-k="${c}-shut"><summary>Shut ${c}</summary><p>body</p></details><details class="${c}" open data-k="${c}-open"><summary>Open ${c}</summary><p>body</p></details>`).join("")}
    ${["ways-caret", "trk-sec-caret", "word-card-form-caret", "note-sec-arrow"].map((c) =>
      `<button type="button" aria-expanded="false" data-k="${c}-shut"${c === "note-sec-arrow" ? ' class="note-sec-toggle"' : ""}><span class="${c}" aria-hidden="true">▸</span> Shut</button><button type="button" aria-expanded="true" data-k="${c}-open"${c === "note-sec-arrow" ? ' class="note-sec-toggle"' : ""}><span class="${c}" aria-hidden="true">▾</span> Open</button>`).join("")}
    <button type="button" data-sec-fold aria-expanded="false" data-k="fold-shut">▶</button><button type="button" data-sec-fold aria-expanded="true" data-k="fold-open">▾</button>
    <button type="button" aria-expanded="false" data-k="mmsw-shut"><span class="mm-sw" aria-hidden="true"></span> Tools</button><button type="button" aria-expanded="true" data-k="mmsw-open"><span class="mm-sw" aria-hidden="true"></span> Tools</button>
  </body></html>`);
  const rows = await page.evaluate(() => [...document.querySelectorAll("[data-k]")].map((el) => {
    const k = el.dataset.k;
    let sw, glyphPx = 0, marker = "none";
    if (el.tagName === "DETAILS") {
      const s = el.querySelector("summary");
      sw = getComputedStyle(s, "::before");
      marker = getComputedStyle(s).display === "list-item" ? "list-item" : "none";
    } else if (el.hasAttribute("data-sec-fold")) {
      sw = getComputedStyle(el, "::before"); glyphPx = parseFloat(getComputedStyle(el).fontSize);
    } else {
      const span = el.firstElementChild; sw = getComputedStyle(span); glyphPx = parseFloat(sw.fontSize);
      const r = span.getBoundingClientRect(); return { k, w: Math.round(r.width), h: Math.round(r.height), bg: sw.backgroundColor, glyphPx, marker };
    }
    return { k, w: Math.round(parseFloat(sw.width)), h: Math.round(parseFloat(sw.height)), bg: sw.backgroundColor, glyphPx, marker };
  }));
  check("(A) positive control: every pattern was drawn", rows.length === 22, `${rows.length}`);
  for (const r of rows) {
    const open = r.k.endsWith("-open");
    check(`(A) ${r.k}: a 40x24 switch`, r.w === 40 && r.h === 24, `${r.w}x${r.h}`);
    check(`(A) ${r.k}: ${open ? "teal (on)" : "grey (off)"}`, r.bg === (open ? TEAL : GREY), r.bg);
    check(`(A) ${r.k}: no arrow can be seen`, r.glyphPx === 0 && r.marker === "none", `glyph ${r.glyphPx}px, marker ${r.marker}`);
  }
  await page.close();
}

// ---------- (B) the real Āyah full view ----------
async function setSelect(page, id, v) { await page.evaluate(([i, x]) => { const s = document.getElementById(i); s.value = String(x); s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]); }
if (MUTATE !== "nocss") for (const [w, lang] of [[390, "en"], [390, "bn"], [768, "en"]]) {
  const tag = `(B) Āyah full view ${w} ${lang}`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
  if (!(await page.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(400);
  await setSelect(page, "surahSelect", 2); await page.waitForTimeout(800); await setSelect(page, "ayahSelect", 13);
  await page.waitForFunction(() => document.querySelector('[data-ayah-num-badge="2:13"]'), null, { timeout: 10000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('[data-ayah-num-badge="2:13"]')?.click());
  await page.waitForTimeout(700);
  // from 768 the card is a window whose 📖 widens its own pane (J70); the pop-up is reached below 768
  if (w < 768) {
    await page.click("[data-ayah-sheet-noteview]").catch(() => {});
    await page.waitForFunction(() => document.querySelectorAll("#ayahNoteViewPopup .ayah-nv-sec").length >= 3, null, { timeout: 8000 }).catch(() => {});
    const secs = await page.evaluate(() => [...document.querySelectorAll("#ayahNoteViewPopup .ayah-nv-sec > summary")].map((s) => {
      const c = getComputedStyle(s, "::before"), r = s.getBoundingClientRect();
      return { open: s.parentElement.open, w: c.width, bg: c.backgroundColor, h: r.height, item: getComputedStyle(s).display };
    }));
    check(`${tag}: positive control, the four sections are there`, secs.length >= 3, `${secs.length}`);
    check(`${tag}: every section wears an ON switch`, secs.every((x) => x.open && x.w === "40px" && x.bg === TEAL && x.item !== "list-item"), JSON.stringify(secs));
    check(`${tag}: a finger-sized row (≥40px)`, secs.every((x) => x.h >= 40), secs.map((x) => x.h).join(","));
    await page.click("#ayahNoteViewPopup .ayah-nv-sec:nth-of-type(2) > summary").catch(() => {});
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => { const d = document.querySelectorAll("#ayahNoteViewPopup .ayah-nv-sec")[1]; return { open: d.open, bg: getComputedStyle(d.querySelector("summary"), "::before").backgroundColor }; });
    check(`${tag}: a tap switches English OFF (grey, hidden)`, !after.open && after.bg === GREY, JSON.stringify(after));
  } else {
    const tr = await page.evaluate(() => { const s = document.querySelector('[data-ayah-ft-sec="tr"] > summary'); return s ? { bg: getComputedStyle(s, "::before").backgroundColor, w: getComputedStyle(s, "::before").width } : null; });
    check(`${tag}: the card's Translations wears an ON switch`, tr && tr.bg === TEAL && tr.w === "40px", JSON.stringify(tr));
  }
  await ctx.close();
}

await browser.close();
console.log(`\n==== show/hide switch (J109): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

// 30 Sep 2026, Owner: "Clicking on the approach slice at the landing wheel
// brings here, asking for another click. Why not straight to the view it is
// meant for?" A wheel slice, or a row of the Approach list, opens the Note view
// with that Approach's Track card ALREADY unfolded, the tapped Approach chosen,
// and the card on screen.
//
// Run from the repository root, with serve.js on :8080. Expected values are
// written by hand: "memorise" is the fixture's first Approach slice.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

for (const lang of ["en", "bn"]) for (const unit of ["ayah", "surah"]) for (const [width, height] of [[390, 844], [1280, 800]]) for (const via of ["slice", "list"]) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  if (unit === "surah") await page.evaluate(() => { const u = document.getElementById("unitTypeSelect"); u.value = "surah"; u.dispatchEvent(new Event("change")); });
  await page.waitForFunction(() => document.querySelector('#wheelContainer .wheel-seg[data-key="memorise"]'));
  // Every write, with its data. ONE is expected and allowed: ayah-notes.js's
  // documented write-capability probe (touchAyahNotesDoc), which stamps only
  // updatedAt on the person's ayahNotes doc the first time the Note view opens
  // in a session. It predates this change and is on main too.
  const before = await page.evaluate(() => ({ noteHidden: document.getElementById("noteView").hidden, writes: (window.__stubWriteData || []).length }));
  if (via === "slice") {
    await page.$eval('#wheelContainer .wheel-seg[data-key="memorise"]', (e) => e.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  } else {
    // The list's row for the same Approach (its section is opened by the handler itself).
    const ok = await page.evaluate(() => { const r = document.querySelector('.wheel-sidebar [data-key="memorise"]'); if (!r) return false; r.dispatchEvent(new MouseEvent("click", { bubbles: true })); return true; });
    if (!ok) { check(`${lang} ${unit} ${width}px list: the Approach row exists`, false); await ctx.close(); continue; }
  }
  await page.waitForFunction(() => !document.getElementById("noteView").hidden && document.querySelector('#noteView [data-note-field="approach"] .note-field-body'), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const b = document.querySelector('#noteView [data-note-field="approach"] .note-field-body');
    const r = b ? b.getBoundingClientRect() : null;
    return {
      note: !document.getElementById("noteView").hidden,
      open: b ? getComputedStyle(b).display !== "none" && r.height > 0 : false,
      onScreen: r ? r.top < innerHeight && r.bottom > 0 : false,
      chosen: document.querySelector("#noteView [data-note-approach-select]")?.value ?? null,
      writes: (window.__stubWriteData || []).map((x) => ({ kind: x.kind, col: x.col, keys: Object.keys(x.data || {}).sort() })),
    };
  });
  const tag = `${lang} ${unit} ${width}px ${via}`;
  check(`${tag}: starts on the wheel, Note view closed`, before.noteHidden === true);
  check(`${tag}: one tap opens the Note view`, m.note, JSON.stringify(m));
  check(`${tag}: its Track card is already unfolded`, m.open, JSON.stringify(m));
  check(`${tag}: the Track card is on screen`, m.onScreen, JSON.stringify(m));
  check(`${tag}: the tapped Approach is the one chosen`, m.chosen === "memorise", JSON.stringify(m));
  const added = m.writes.slice(before.writes).filter((w) => !(w.kind === "update" && w.col === "ayahNotes" && w.keys.join() === "updatedAt"));
  check(`${tag}: the tap writes nothing beyond the Note view's known writability probe`, added.length === 0, JSON.stringify(added));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// QR Lead audit 11, 1 Nov 2026 (the MSA Architect's change request, 9:12 pm): in the Word card's Taṣrīf tab on a 360px
// phone the floating 🧰 corner covered the last "×5" cells at the end of the card's scroll; from 768px the Zab bar covered
// the full-screen card's bottom. Now the card's scroll ends with room under the corner, and from 768px to 899px the card
// stops above the bar (as Contents does). The window on a computer is unchanged. zab-bar.js is not changed.
// (A [data-zab-dock] slot in the header was built and measured first: the WbW header grew up to 101px at 320px 200%.)
//   node tools/i18n-verify/qr-word-card-zab-dock-browser.mjs [--mutate=NAME]   (serve.js on :8080 or QR_BASE, repo root)
//   no-pad    no room under the corner                 -> "the corner lies on nothing" and the Taṣrīf cells FAIL
//   no-drop   the corner stays lifted over the hidden Read bar -> "the corner sits in the screen's corner" FAILS
//   no-lift   the card reaches under the Zab bar again  -> "the card ends above the Zab bar" FAILS (768-899px)
//   pad-all   the room is given at every width          -> "a computer's window is unchanged" FAILS
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
// [from, to, copies]: every copy is replaced, and the count must be exactly as written.
const MUT = {
  "no-pad": ["    body:has(#zabCorner) #quranWordCardMount .word-card-content { padding-bottom: 4.25rem; }\n", "", 1],
  "no-drop": ["    body:has(#quranWordCardMount:not([hidden])) #zabCorner { bottom: 0.75rem; }\n", "", 1],
  "no-lift": ["  @media (min-width: 768px) and (max-width: 899.98px) { body.zab-bar-on #quranWordCardMount:not([hidden]) { bottom: 2.75rem; } }", "", 1],
  "pad-all": ["  @media (max-width: 767.98px) {\n    body:has(#zabCorner)", "  @media (min-width: 1px) {\n    body:has(#zabCorner)", 1],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function open(w, h, lang, size, level) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) await ctx.route("**/app/quranrevival.html*", async (r) => {
    const res = await r.fetch(); let body = await res.text();
    const [from, to, n] = MUT[MUTATE]; const c = body.split(from).length - 1;
    if (c !== n) throw new Error(`mutation ${MUTATE}: anchor found ${c} times, not ${n}`);
    r.fulfill({ response: res, body: body.split(from).join(to) });
  });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.querySelector("#wheelContainer svg"), null, { timeout: 30000 });
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((e) => e.remove()));
  await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, size);
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById("tabReadBtn").click()); await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelector('#readView [data-word-occurrence$=":1:1:1"]')?.click());
  await page.waitForFunction(() => document.querySelector("#quranWordCardMount [data-word-card-level]"), null, { timeout: 10000 }).catch(() => {});
  await page.evaluate((lv) => document.querySelector(`#quranWordCardMount [data-word-card-level="${lv}"]`)?.click(), level);
  await page.waitForTimeout(900);
  return { ctx, page };
}

// At the end of the card's scroll: the corner and the bar against everything the card draws.
const measure = (page) => page.evaluate(async () => {
  const m = document.getElementById("quranWordCardMount"), sc = m.querySelector(".word-card-content"), card = m.querySelector(".quran-word-card");
  sc.scrollTop = sc.scrollHeight; await new Promise((r) => setTimeout(r, 150));
  const r = (e) => e.getBoundingClientRect();
  const shown = (e) => !!e && e.getClientRects().length > 0 && r(e).width > 0 && getComputedStyle(e).visibility !== "hidden";
  const corner = document.getElementById("zabCorner"), bar = document.getElementById("zabBar");
  let bottom = 0, last = "";
  for (const e of card ? card.querySelectorAll("*") : []) { if (!shown(e) || r(e).height < 1) continue;
    const shut = e.closest("details:not([open])"); if (shut && !e.closest("summary") && e !== shut) continue; // a closed section's body
    if (r(e).bottom > bottom) { bottom = r(e).bottom; last = (e.className || e.tagName).toString().slice(0, 30); } }
  return { open: !m.hidden && shown(m), level: m.querySelector('[data-word-card-level][aria-selected="true"]')?.dataset.wordCardLevel,
    corner: shown(corner) ? Math.round(r(corner).top) : null, cornerBottom: shown(corner) ? Math.round(r(corner).bottom) : null, bar: shown(bar) && getComputedStyle(bar).position === "fixed" ? Math.round(r(bar).top) : null,
    bottom: Math.round(bottom), last, mountBottom: Math.round(r(m).bottom), pad: getComputedStyle(sc).paddingBottom, vh: innerHeight };
});

// Phones (the corner): the last thing the card draws ends above the corner, at every size, in both languages.
for (const [w, h, lang] of [[320, 640, "en"], [320, 640, "bn"], [360, 740, "en"], [360, 740, "bn"], [390, 844, "en"], [390, 844, "bn"], [640, 360, "en"]]) for (const size of ["100%", "150%", "200%"]) for (const level of ["wbw", "tasrif", "depth"]) {
  const tag = `${w}x${h} ${lang} ${size} ${level}`;
  const { ctx, page } = await open(w, h, lang, size, level);
  const m = await measure(page);
  check(`${tag}: POSITIVE CONTROL the Word card is open full screen on its tab, the corner 🧰 on screen`, m.open && m.level === level && m.corner !== null && m.mountBottom === m.vh, JSON.stringify(m));
  check(`${tag}: at the end of the scroll the corner lies on nothing the card draws`, m.bottom <= m.corner, JSON.stringify(m));
  check(`${tag}: the corner sits in the screen's corner (not lifted over the Read bar the card covers)`, m.cornerBottom >= m.vh - 16, JSON.stringify(m));
  await ctx.close();
}

// The defect itself: at the end of Taṣrīf's scroll on a 360px phone, the last cells are the card's, not a 🧰's.
for (const lang of ["en", "bn"]) for (const size of ["100%", "150%"]) {
  const tag = `360x740 ${lang} ${size} Taṣrīf at the end of its scroll`;
  const { ctx, page } = await open(360, 740, lang, size, "tasrif");
  const r = await page.evaluate(() => {
    const m = document.getElementById("quranWordCardMount"), sc = m.querySelector(".word-card-content"); sc.scrollTop = sc.scrollHeight;
    const cells = [...m.querySelectorAll(".word-card-ntable td, .word-card-ntable th, .word-card-cj td, [data-noun-cell]")].filter((c) => c.getClientRects().length);
    const vis = cells.filter((c) => { const b = c.getBoundingClientRect(); return b.bottom <= innerHeight && b.top >= 0; });
    const hidden = vis.filter((c) => { const b = c.getBoundingClientRect(); const pts = [[b.right - 4, b.bottom - 4], [(b.left + b.right) / 2, (b.top + b.bottom) / 2]];
      return pts.some(([x, y]) => { const e = document.elementFromPoint(x, y); return e && !c.contains(e) && !m.contains(e); }); });
    return { cells: vis.length, hidden: hidden.map((c) => c.textContent.trim().slice(0, 12)) };
  });
  check(`${tag}: POSITIVE CONTROL Taṣrīf cells are on screen`, r.cells >= 6, JSON.stringify(r));
  check(`${tag}: nothing outside the card lies on any cell`, !r.hidden.length, JSON.stringify(r));
  await ctx.close();
}

// 768-899px (the Zab bar): the full-screen card ends above the bar.
for (const [w, h, lang] of [[768, 1024, "en"], [768, 1024, "bn"], [844, 390, "en"], [820, 1180, "bn"]]) for (const size of ["100%", "200%"]) {
  const tag = `${w}x${h} ${lang} ${size}`;
  const { ctx, page } = await open(w, h, lang, size, "tasrif");
  const m = await measure(page);
  check(`${tag}: POSITIVE CONTROL the Word card is open full screen, the Zab bar on screen`, m.open && m.bar !== null, JSON.stringify(m));
  check(`${tag}: the card ends above the Zab bar, and so does everything it draws`, m.mountBottom <= m.bar && m.bottom <= m.bar, JSON.stringify(m));
  await ctx.close();
}

// A computer: the window is unchanged (no room added to its scroll).
for (const [w, h, lang] of [[1280, 800, "en"], [1024, 768, "bn"]]) {
  const { ctx, page } = await open(w, h, lang, "100%", "tasrif");
  const m = await measure(page);
  check(`${w}x${h} ${lang}: POSITIVE CONTROL the Word card window is open`, m.open, JSON.stringify(m));
  check(`${w}x${h} ${lang}: a computer's window is unchanged (no room added at the end of its scroll)`, m.pad === "0px", JSON.stringify(m));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

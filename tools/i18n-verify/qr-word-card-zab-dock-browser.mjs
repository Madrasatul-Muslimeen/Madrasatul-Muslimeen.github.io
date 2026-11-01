// QR Lead audit 11, 1 Nov 2026 (the MSA Architect's change request, 9:12 pm): in the Word card's Taṣrīf tab on a 360px
// phone the floating 🧰 corner covered the last "×5" cells at the end of the card's scroll. The card now gives the 🧰 a
// place of its own ([data-zab-dock], #wordCardZabDock): static markup in #quranWordCardMount (zab-bar.js scans once, at
// load), moved into the card's header after every render, the header's last item (after × on one row; the end of the
// word's row on a phone). While it shows the corner hides; it is a 40px tile like ‹ and ×, so the header is never taller;
// the window on a computer (900px and up) keeps the corner. zab-bar.js is not changed.
//   node tools/i18n-verify/qr-word-card-zab-dock-browser.mjs [--mutate=NAME]   (serve.js on :8080 or QR_BASE, repo root)
//   no-place    the slot is never moved into the header      -> "the corner hides" and "in the header" FAIL
//   no-hold     the slot is looked up again at every render  -> the re-render / reopen checks FAIL
//   no-px       the 🧰 tile keeps zab-bar's 2.5rem size        -> "the header is no taller" FAILS at 200%
//   no-desktop  the window on a computer docks it too        -> "a computer keeps the corner" FAILS
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
// [from, to, copies]: every copy is replaced, and the count must be exactly as written.
const MUT = {
  "no-place": ["      placeWordCardZab(content);\n", "", 1],
  "no-hold": ["      if (wordCardZabSlot && head && wordCardZabSlot.parentElement !== head) head.append(wordCardZabSlot);",
    '      const s = document.getElementById("wordCardZabDock"); if (s && head && s.parentElement !== head) head.append(s);', 1],
  "no-px": ["  .word-card-zab-dock .zab-dock-btn { width: 40px; height: 40px; min-width: 40px; font-size: 19px; }", "", 1],
  "no-desktop": ["  @media (min-width: 900px) { .word-card-zab-dock { display: none; } }", "", 1],
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

// The corner, the slot, the header (as it is, and with the 🧰 taken out) and the Arabic word's clipping.
const measure = (page) => page.evaluate(() => {
  const m = document.getElementById("quranWordCardMount"), hd = m.querySelector(".quran-word-card > header");
  const corner = document.getElementById("zabCorner"), slot = document.getElementById("wordCardZabDock");
  const btn = slot?.querySelector(".zab-dock-btn");
  const r = (e) => e.getBoundingClientRect();
  const shown = (e) => !!e && e.getClientRects().length > 0 && r(e).width > 0;
  const ar = hd?.querySelector(".word-card-arabic");
  const clip = () => ar ? Math.round(ar.scrollWidth - ar.parentElement.clientWidth) : 0;
  const out = () => hd ? [...hd.children].filter(shown).filter((k) => r(k).left < r(hd).left - 1 || r(k).right > r(hd).right + 1).length : -1;
  const res = { open: !m.hidden && shown(m), cornerShown: shown(corner), inHead: !!hd && slot?.parentElement === hd, btnShown: shown(btn),
    btn: btn ? [Math.round(r(btn).width), Math.round(r(btn).height)] : null, hd: hd ? Math.round(r(hd).height) : 0, clip: clip(), out: out(),
    inView: shown(btn) && r(btn).left >= 0 && r(btn).right <= innerWidth && r(btn).top >= 0 && r(btn).bottom <= innerHeight, level: m.querySelector('[data-word-card-level][aria-selected="true"]')?.dataset.wordCardLevel };
  if (slot && shown(slot)) { slot.style.display = "none"; res.hdWithout = Math.round(r(hd).height); res.clipWithout = clip(); slot.style.display = ""; }
  return res;
});

for (const [w, h, lang] of [[320, 640, "en"], [320, 640, "bn"], [360, 740, "en"], [360, 740, "bn"], [390, 844, "en"], [390, 844, "bn"], [768, 1024, "en"], [844, 390, "bn"]]) for (const size of ["100%", "150%", "200%"]) for (const level of ["wbw", "tasrif"]) {
  const tag = `${w}x${h} ${lang} ${size} ${level}`;
  const { ctx, page } = await open(w, h, lang, size, level);
  const m = await measure(page);
  check(`${tag}: POSITIVE CONTROL the Word card is open full screen on its tab`, m.open && m.level === level, JSON.stringify(m));
  check(`${tag}: the 🧰 is in the card's header, on screen`, m.inHead && m.btnShown && m.inView, JSON.stringify(m));
  check(`${tag}: the corner 🧰 hides while the card is open`, !m.cornerShown, JSON.stringify(m));
  check(`${tag}: the 🧰 is a 40px tile and the header is no taller for it`, m.btn?.[0] === 40 && m.btn?.[1] === 40 && m.hd === m.hdWithout, JSON.stringify(m));
  check(`${tag}: every header item stays inside the header, and the Arabic word is no more cut than without the 🧰`, m.out === 0 && m.clip <= Math.max(1, m.clipWithout), JSON.stringify(m));
  await ctx.close();
}

// The defect itself: at the end of Taṣrīf's scroll on a 360px phone, the last cells are the page's, not a 🧰's.
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

// Re-render (another tab), close and reopen: the same element is put back in the new header each time, and the corner
// comes back exactly while the card is closed. Tapping the card's 🧰 opens the Zab above the card.
for (const [w, h, lang] of [[360, 740, "en"], [320, 640, "bn"]]) {
  const tag = `${w}x${h} ${lang}`;
  const { ctx, page } = await open(w, h, lang, "100%", "wbw");
  await page.evaluate(() => document.querySelector('#quranWordCardMount [data-word-card-level="depth"]')?.click()); await page.waitForTimeout(700);
  let m = await measure(page);
  check(`${tag}: after another tab renders, the 🧰 is in the new header and the corner stays hidden`, m.level === "depth" && m.inHead && m.btnShown && !m.cornerShown, JSON.stringify(m));
  await page.evaluate(() => document.querySelector("#quranWordCardMount [data-word-card-close]")?.click()); await page.waitForTimeout(500);
  m = await measure(page);
  check(`${tag}: closing the card brings the corner back`, !m.open && m.cornerShown && !m.btnShown, JSON.stringify(m));
  await page.evaluate(() => document.querySelector('#readView [data-word-occurrence$=":1:2:2"]')?.click()); await page.waitForTimeout(900);
  m = await measure(page);
  check(`${tag}: reopening the card docks the 🧰 again`, m.open && m.inHead && m.btnShown && !m.cornerShown, JSON.stringify(m));
  const z = await page.evaluate(async () => {
    document.querySelector("#wordCardZabDock .zab-dock-btn").click(); await new Promise((r) => setTimeout(r, 500));
    const p = document.getElementById("zabPanel"); if (!p || p.hidden) return { open: false };
    const b = p.getBoundingClientRect(); const e = document.elementFromPoint((b.left + b.right) / 2, b.top + 10);
    return { open: true, onTop: !!e && p.contains(e) };
  });
  check(`${tag}: the card's 🧰 opens the Zab, above the card`, z.open && z.onTop, JSON.stringify(z));
  await ctx.close();
}

// A computer: the Word card is a window, and the corner stays.
for (const [w, h, lang] of [[1280, 800, "en"], [1024, 768, "bn"]]) {
  const { ctx, page } = await open(w, h, lang, "100%", "tasrif");
  const m = await measure(page);
  check(`${w}x${h} ${lang}: POSITIVE CONTROL the Word card window is open`, m.open, JSON.stringify(m));
  check(`${w}x${h} ${lang}: a computer keeps the corner 🧰 (nothing docked in the window)`, m.cornerShown && !m.btnShown, JSON.stringify(m));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);

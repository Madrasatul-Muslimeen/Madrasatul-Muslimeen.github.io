// Decision 63 (4 Oct 2026) -- the wheel's centre is a DISPLAY: the Owner's
// calligraphy image, the chosen unit in two lines, an open Qur'an; the Surah
// and Ayah pickers live in Choose a Unit. RENDERED, in a real browser, at
// 320/360/390/768/1280, English and Bangla.
//
//   node tools/i18n-verify/wheel-centre-browser.mjs            (from the repo root, node serve.js running)
//   --mutate-image-shift   moves the image 10% down: the placement checks must fail
//   --mutate-select        puts a <select> back in the hub: the picker-removal check must fail
//
// "Identical to main" is measured, not remembered: main's own quranrevival.html
// is read from git (BASELINE_REF, default `main`) and served to the same
// harness at /app/_baseline-quranrevival.html.
import { execFileSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const MUT_IMG = process.argv.includes("--mutate-image-shift");
const MUT_SELECT = process.argv.includes("--mutate-select");

const WIDTHS = [[320, 640], [360, 740], [390, 844], [768, 1024], [1280, 800]];
const BASE_HTML = execFileSync("git", ["show", `${process.env.BASELINE_REF || "main"}:app/quranrevival.html`], { encoding: "utf8", maxBuffer: 64 << 20 });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const real = (errors) => errors.filter((e) => !/Failed to load resource: net::ERR_|ERR_CERT/.test(e));
const waitWheel = (page) => page.waitForFunction(() => document.querySelectorAll("#wheelContainer .wheel-seg").length > 0, null, { timeout: 20000 });

async function open(lang, [w, h], { baseline = false, look = null } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width: w, height: h } });
  if (baseline) await ctx.route("**/app/_baseline-quranrevival.html", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: BASE_HTML }));
  if (look) await ctx.addInitScript((l) => { try { localStorage.setItem("mm_wheel_look", l); } catch {} }, look);
  const { page, errors } = await openPage(ctx, baseline ? "/app/_baseline-quranrevival.html" : "/app/quranrevival.html");
  await waitWheel(page);
  await page.click("#wheelCtaBtn");
  await page.waitForFunction(() => getComputedStyle(document.getElementById("wheelHubPickers") || document.body).display !== "none", null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(250);
  return { ctx, page, errors };
}

// The wheel's own numbers: SVG box, the gold ring (the disc), the slices' outer extent.
const wheelNumbers = (page) => page.evaluate(() => {
  const svg = document.querySelector("#wheelContainer svg.mastery-wheel").getBoundingClientRect();
  const ring = document.querySelector('#wheelContainer svg circle[fill="#13192a"]').getBoundingClientRect();
  let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
  for (const s of document.querySelectorAll("#wheelContainer .wheel-seg")) { const q = s.getBoundingClientRect(); l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); }
  const f = (n) => Math.round(n * 100) / 100;
  return { svgW: f(svg.width), ringW: f(ring.width), slicesW: f(r - l), slicesH: f(b - t) };
});

// ---- 1. the wheel is unchanged -------------------------------------------
console.log("\n=== wheel unchanged vs the baseline ===");
for (const vp of WIDTHS) {
  const a = await open("en", vp, { baseline: true });
  const b = await open("en", vp);
  const [na, nb] = [await wheelNumbers(a.page), await wheelNumbers(b.page)];
  check(`[${vp[0]}] wheel svg, hub ring and slice extent identical to ${process.env.BASELINE_REF || "main"}`, JSON.stringify(na) === JSON.stringify(nb), `${JSON.stringify(na)} vs ${JSON.stringify(nb)}`);
  await a.ctx.close(); await b.ctx.close();
}

// ---- 2. geometry, stacking, content, removal, taps, overflow -------------
const UNITS = [
  // (Surah 1 with the Bismillah option on names its first āyah "Bismillah", decision 55.)
  { unit: "ayah", en: [/^Ayah (1|Bismillah)$/, /^Surah 1 · /], bn: [/^আয়াত (১|বিসমিল্লাহ)$/, /^সূরা ১ · /] },
  { unit: "range", en: [/^Āyāt 1–/, /^Surah 1 · /], bn: [/^আয়াত ১–/, /^সূরা ১ · /] },
  { unit: "surah", en: [/^Surah 1$/, /./], bn: [/^সূরা ১$/, /./] },
  { unit: "ruku", en: [/^Ruku' 1$/, /^Surah 1 · /], bn: [/^রুকু' ১$/, /^সূরা ১ · /] },
  { unit: "juz", en: [/^Juz 1$/, /^from Surah 1 · /], bn: [/^জুয \S+$|^জুয/, /সূরা ১ · .* থেকে$/] },
  { unit: "page", en: [/^Page 1$/, /^from Surah 1 · /], bn: [/^পৃষ্ঠা ১$/, /সূরা ১ · .* থেকে$/] },
];

for (const lang of ["en", "bn"]) for (const vp of WIDTHS) {
  const tag = `[${vp[0]} ${lang}]`;
  console.log(`\n=== ${tag} ===`);
  const { ctx, page, errors } = await open(lang, vp);
  if (MUT_IMG) await page.evaluate(() => { const i = document.getElementById("wheelHubCalligraphy"); i.style.top = "17.03%"; });
  if (MUT_SELECT) await page.evaluate(() => document.getElementById("wheelHubPickers").append(document.createElement("select")));

  const g = await page.evaluate(() => {
    const R = (id) => document.getElementById(id).getBoundingClientRect();
    const ring = document.querySelector('#wheelContainer svg circle[fill="#13192a"]').getBoundingClientRect();
    const img = R("wheelHubCalligraphy");
    const d = ring.width, cx = ring.left + d / 2, cy = ring.top + d / 2;
    const corners = [[img.left, img.top], [img.right, img.top], [img.left, img.bottom], [img.right, img.bottom]];
    const i = document.getElementById("wheelHubCalligraphy");
    const lab = R("wheelHubUnitLabel"), gr = R("wheelHubGraphic");
    return {
      d, want: { l: ring.left + 0.0694 * d, r: ring.left + 0.9486 * d, t: ring.top + 0.0703 * d, b: ring.top + 0.4613 * d },
      img: { l: img.left, r: img.right, t: img.top, b: img.bottom },
      // The Owner's box has transparent top corners that lie outside the disc by
      // their own proportions; the visible arc is inside when the bottom corners
      // and the top-middle are, and the box stays within the ring's square.
      cornersInside: Math.max(Math.hypot(img.left - cx, img.bottom - cy), Math.hypot(img.right - cx, img.bottom - cy), Math.hypot((img.left + img.right) / 2 - cx, img.top - cy)) <= d / 2 + 1
        && img.left >= ring.left - 1 && img.right <= ring.right + 1 && img.top >= ring.top - 1,
      imgBottom: img.bottom, labelTop: lab.top, labelBottom: lab.bottom, graphicTop: gr.top, graphicBottom: gr.bottom, hubBottom: ring.bottom,
      labelTopPct: (lab.top - ring.top) / d,
      alt: i.alt, altLang: i.lang, decoding: i.getAttribute("decoding"), w: i.getAttribute("width"), h: i.getAttribute("height"),
      selects: document.querySelectorAll("#wheelHubPickers select").length,
      typed: [...document.querySelectorAll("#wheelHubPickers *")].filter((e) => e.id !== "wheelHubUnitLabel" && !e.closest("#wheelHubUnitLabel") && !e.closest("svg") && [...e.childNodes].some((n) => n.nodeType === 3 && /[؀-ۿ]/.test(n.textContent))).length,
      arabicTextNodes: [...document.querySelectorAll("#wheelHubPickers *")].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && /[؀-ۿ]/.test(n.textContent))).length,
      pe: getComputedStyle(document.getElementById("wheelHubGraphic")).pointerEvents, ariaHidden: document.getElementById("wheelHubGraphic").getAttribute("aria-hidden"),
      unitFont1: parseFloat(getComputedStyle(document.getElementById("wheelHubUnitLine1")).fontSize),
      unitFont2: parseFloat(getComputedStyle(document.getElementById("wheelHubUnitLine2")).fontSize),
      vw: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  const tol = 1;
  check(`${tag} the image box is within 1px of x 6.94-94.86%, y 7.03-46.13% of the measured ring`,
    Math.abs(g.img.l - g.want.l) <= tol && Math.abs(g.img.r - g.want.r) <= tol && Math.abs(g.img.t - g.want.t) <= tol && Math.abs(g.img.b - g.want.b) <= tol, JSON.stringify({ img: g.img, want: g.want }));
  check(`${tag} ...and it is inside the hub circle`, g.cornersInside);
  check(`${tag} the image's bottom is above the label's top`, g.imgBottom <= g.labelTop + 0.5, `${g.imgBottom} ${g.labelTop}`);
  check(`${tag} the label's bottom is above the Qur'an's top`, g.labelBottom <= g.graphicTop + 0.5, `${g.labelBottom} ${g.graphicTop}`);
  check(`${tag} the Qur'an stays inside the hub's bottom`, g.graphicBottom <= g.hubBottom + 0.5, `${g.graphicBottom} ${g.hubBottom}`);
  check(`${tag} the label's top is at 51% of the hub diameter (the line box may sit a hair lower)`, Math.abs(g.labelTopPct - 0.51) < 0.01, String(g.labelTopPct));
  check(`${tag} label sizes follow the demo (line 1 ~0.068d, line 2 ~0.05d, never below 8.5px)`,
    Math.abs(g.unitFont1 - g.d * 0.068) < 0.2 && Math.abs(g.unitFont2 - Math.max(8.5, g.d * 0.05)) < 0.2 && g.unitFont2 >= 8.5, JSON.stringify([g.unitFont1, g.unitFont2, g.d]));
  check(`${tag} the image carries the Arabic alt, lang=ar, decoding=async, width and height`,
    g.alt === "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ · بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" && g.altLang === "ar" && g.decoding === "async" && g.w === "720" && g.h === "320", JSON.stringify(g));
  check(`${tag} there are no <select> elements in the hub`, g.selects === 0, String(g.selects));
  check(`${tag} the hub has no typed Arabic text nodes (the Arabic is the image)`, g.arabicTextNodes === 0, String(g.arabicTextNodes));
  check(`${tag} the open Qur'an is pointer-events:none and aria-hidden`, g.pe === "none" && g.ariaHidden === "true");
  check(`${tag} no sideways scroll`, g.vw <= 0, String(g.vw));

  // label content for every unit, set through Choose a Unit's own mirrors.
  for (const u of UNITS) {
    await page.evaluate((unit) => { const s = document.getElementById("wheelUnitTypeSelect"); s.value = unit; s.dispatchEvent(new Event("change")); }, u.unit);
    await page.waitForTimeout(250);
    const [l1, l2] = await page.evaluate(() => [document.getElementById("wheelHubUnitLine1").textContent.trim(), document.getElementById("wheelHubUnitLine2").textContent.trim()]);
    const [w1, w2] = u[lang];
    check(`${tag} the label reads the chosen ${u.unit}: "${l1}" / "${l2}"`, w1.test(l1) && w2.test(l2) && (lang === "en" || !/[0-9]/.test(l1 + l2.replace(/Al-[\w'-]+|[A-Za-z' -]+/g, ""))), `${l1} / ${l2}`);
  }
  check(`${tag} no page errors`, real(errors).length === 0, real(errors).slice(0, 3).join(" | "));
  await ctx.close();
}

// ---- 3. Choose a Unit ----------------------------------------------------
for (const lang of ["en", "bn"]) for (const vp of [[320, 640], [390, 844], [1280, 800]]) {
  const tag = `[Choose a Unit ${vp[0]} ${lang}]`;
  console.log(`\n=== ${tag} ===`);
  const { ctx, page, errors } = await open(lang, vp);
  const open_ = async () => { if ((await page.getAttribute("#wheelUnitBtn", "aria-expanded")) !== "true") await page.click("#wheelUnitBtn"); await page.waitForTimeout(150); };
  await open_();
  const rows = () => page.evaluate(() => Object.fromEntries(["wheelUnitSurahRow", "wheelUnitAyahRow", "wheelUnitNumRow", "wheelUnitRangeRow"].map((id) => [id, getComputedStyle(document.getElementById(id)).display !== "none"])));
  let r = await rows();
  check(`${tag} Study Unit, Surah and (for the āyah unit) Āyah rows show; From–To and Number do not`, r.wheelUnitSurahRow && r.wheelUnitAyahRow && !r.wheelUnitNumRow && !r.wheelUnitRangeRow, JSON.stringify(r));

  await page.selectOption("#wheelUnitSurahSelect", "29"); // Al-Ankaboot: a long real name
  await page.waitForTimeout(300);
  const canon = await page.evaluate(() => document.getElementById("surahSelect").value);
  check(`${tag} changing the Surah row changes #surahSelect`, canon === "29", canon);

  await open_();
  await page.evaluate(() => { const s = document.getElementById("wheelUnitTypeSelect"); s.value = "range"; s.dispatchEvent(new Event("change")); });
  await page.waitForTimeout(250); await open_();
  r = await rows();
  check(`${tag} From–To shows only for range (no Āyah, no Number)`, r.wheelUnitRangeRow && !r.wheelUnitAyahRow && !r.wheelUnitNumRow && r.wheelUnitSurahRow, JSON.stringify(r));
  const fit = await page.evaluate(() => {
    const pal = document.querySelector(".wheel-unit-palette").getBoundingClientRect();
    const rowEls = [...document.querySelectorAll(".wheel-unit-row")].filter((e) => getComputedStyle(e).display !== "none");
    return {
      insideScreen: pal.left >= -0.5 && pal.right <= document.documentElement.clientWidth + 0.5,
      rows: rowEls.map((e) => { const kids = [...e.children].map((c) => c.getBoundingClientRect()); return { h: Math.round(e.getBoundingClientRect().height), tops: [...new Set(kids.map((k) => Math.round(k.top)))].length, over: kids.some((k) => k.right > e.getBoundingClientRect().right + 0.5) }; }),
      selW: [...document.querySelectorAll(".wheel-unit-row select")].filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().width)),
    };
  });
  check(`${tag} the palette is on screen, rows do not wrap raggedly or overflow, every select has width`, fit.insideScreen && fit.rows.every((x) => x.h <= 40 && !x.over) && fit.selW.every((w) => w >= 40), JSON.stringify(fit));

  await page.evaluate(() => { const s = document.getElementById("wheelUnitTypeSelect"); s.value = "page"; s.dispatchEvent(new Event("change")); });
  await page.waitForTimeout(250); await open_();
  r = await rows();
  check(`${tag} Number shows for page (no Āyah, no From–To)`, r.wheelUnitNumRow && !r.wheelUnitAyahRow && !r.wheelUnitRangeRow, JSON.stringify(r));
  await page.selectOption("#wheelUnitNumSelect", "257");
  await page.waitForTimeout(400);
  const sur = await page.evaluate(() => ({ surah: document.getElementById("surahSelect").value, label: document.getElementById("wheelHubUnitLine2").textContent }));
  // The issue says 15; that is the demo's invented data. The app's own page table
  // puts page 257 in Surah 14 (Ibrahim, pages 255-261; Al-Hijr starts on 262), and
  // linking stays where it lives (goToUnitNumber), so the surah leaving 29 for 14
  // is the fact asserted.
  check(`${tag} choosing Page 257 moves the surah to its own (14, Ibrahim) -- linking unchanged`, sur.surah === "14", JSON.stringify(sur));
  check(`${tag} ...and the centre says where page 257 starts`, lang === "bn" ? /১৪/.test(sur.label) : /Surah 14/.test(sur.label), sur.label);
  check(`${tag} no page errors`, real(errors).length === 0, real(errors).slice(0, 3).join(" | "));
  await ctx.close();
}

// ---- 4. taps, contrast in the three looks --------------------------------
for (const vp of [[390, 844], [1280, 800]]) {
  console.log(`\n=== taps, ${vp[0]} ===`);
  const { ctx, page } = await open("en", vp);
  const hit = await page.evaluate(() => {
    const ring = document.querySelector('#wheelContainer svg circle[fill="#13192a"]').getBoundingClientRect();
    const segs = [...document.querySelectorAll("#wheelContainer .wheel-seg")];
    const near = segs.map((s) => { const q = s.getBoundingClientRect(); return { s, q, d: Math.hypot(q.left + q.width / 2 - (ring.left + ring.width / 2), q.top + q.height / 2 - (ring.top + ring.height / 2)) }; }).sort((a, b) => a.d - b.d).slice(0, 12);
    // a point just outside the ring along each of the nearest slices' own centres
    return near.map(({ s }) => {
      const len = s.getTotalLength?.(); const bb = s.getBBox(); const m = s.getScreenCTM();
      const p = new DOMPoint(bb.x + bb.width / 2, bb.y + bb.height / 2).matrixTransform(m);
      const el = document.elementFromPoint(p.x, p.y);
      return { ok: el === s || s.contains(el) || !!el?.closest?.(".wheel-seg") , tag: el?.tagName, id: el?.id };
    });
  });
  check(`taps ${vp[0]}: elementFromPoint at the nearest slices' centres never lands on the hub overlay`, hit.every((h) => h.ok && !/wheelHub/.test(h.id || "")), JSON.stringify(hit.filter((h) => !h.ok)));
  await page.click(".wheel-seg");
  await page.waitForTimeout(400);
  const opened = await page.evaluate(() => !document.getElementById("noteView").hidden);
  check(`taps ${vp[0]}: a slice tap still opens its slice`, opened);
  await ctx.close();
}

console.log("\n=== contrast of the label on the hub disc, three looks ===");
const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
for (const look of ["dark", "light", "colour"]) {
  const { ctx, page } = await open("en", [390, 844], { look });
  const c = await page.evaluate(() => ({
    look: document.getElementById("wheelStageWrap").dataset.look,
    fill: getComputedStyle(document.querySelector('#wheelContainer svg circle[fill="#13192a"]')).fill,
    c1: getComputedStyle(document.getElementById("wheelHubUnitLine1")).color, c2: getComputedStyle(document.getElementById("wheelHubUnitLine2")).color,
    disc: document.querySelector('#wheelContainer svg circle[fill="#13192a"]').getAttribute("fill"),
  }));
  const bg = [0x13, 0x19, 0x2a]; const bgL = lum(`rgb(${bg.join(",")})`);
  const ratio = (fg) => { const L = lum(fg); return (Math.max(L, bgL) + 0.05) / (Math.min(L, bgL) + 0.05); };
  check(`look=${look} (applied: ${c.look}): the hub disc is dark and both label lines are >= 4.5:1 on it`, c.disc === "#13192a" && ratio(c.c1) >= 4.5 && ratio(c.c2) >= 4.5, `${ratio(c.c1).toFixed(2)} ${ratio(c.c2).toFixed(2)} ${JSON.stringify(c)}`);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

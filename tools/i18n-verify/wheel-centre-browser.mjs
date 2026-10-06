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

const MUT_BIGBTN = process.argv.includes("--mutate-big-button");
const MUT_STARS = process.argv.includes("--mutate-six-stars");
// Decision 67: the light comes FROM the Qur'an. --mutate-sunrise puts back the
// old rays, every one fanning from the one point at the spine (a sunrise).
const MUT_SUNRISE = process.argv.includes("--mutate-sunrise");
// Architect review of #549: --mutate-cut-pill puts back the one-line ellipsis.
const MUT_CUTPILL = process.argv.includes("--mutate-cut-pill");
const WIDTHS = [[320, 640], [360, 740], [390, 844], [600, 900], [768, 1024], [1280, 800]];
const BASE_HTML = execFileSync("git", ["show", `${process.env.BASELINE_REF || "main"}:app/quranrevival.html`], { encoding: "utf8", maxBuffer: 64 << 20 });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const real = (errors) => errors.filter((e) => !/Failed to load resource: net::ERR_|ERR_CERT/.test(e));
const waitWheel = (page) => page.waitForFunction(() => document.querySelectorAll("#wheelContainer .wheel-seg").length > 0, null, { timeout: 20000 });

async function open(lang, [w, h], { baseline = false, look = null, tap = true } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width: w, height: h } });
  if (baseline) await ctx.route("**/app/_baseline-quranrevival.html", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: BASE_HTML }));
  if (look) await ctx.addInitScript((l) => { try { localStorage.setItem("mm_wheel_look", l); } catch {} }, look);
  const { page, errors } = await openPage(ctx, baseline ? "/app/_baseline-quranrevival.html" : "/app/quranrevival.html");
  await waitWheel(page);
  if (!tap) { await page.waitForTimeout(250); return { ctx, page, errors }; }
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
  // (Surah 1 with the Bismillah option on names its first āyah "Bismillah", decision 55.) Updated in place 5 Oct 2026:
  // the Owner, "Bismillah is still showing as Ayah" -- the Bismillah is named on its own, never "Ayah Bismillah".
  { unit: "ayah", en: [/^(Ayah 1|Bismillah)$/, /^Surah 1 · /], bn: [/^(আয়াত ১|বিসমিল্লাহ)$/, /^সূরা ১ · /] },
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
  // Review of #543: both label lines are nowrap + ellipsis, which fails
  // SILENTLY (a standing lesson). Measure every unit with the longest real
  // surah names, in this language, at this width: no line may be cut.
  const cutLines = [];
  for (const surah of ["29", "2", "114"]) {
    await page.evaluate((v) => { const s = document.getElementById("surahSelect"); s.value = v; s.dispatchEvent(new Event("change", { bubbles: true })); }, surah);
    await page.waitForTimeout(200);
    for (const u of UNITS) {
      await page.evaluate((unit) => { const s = document.getElementById("wheelUnitTypeSelect"); s.value = unit; s.dispatchEvent(new Event("change")); }, u.unit);
      await page.waitForTimeout(150);
      const c = await page.evaluate(() => ["wheelHubUnitLine1", "wheelHubUnitLine2"].map((id) => { const e = document.getElementById(id); return { t: e.textContent.trim(), cut: e.scrollWidth > e.clientWidth + 0.5, w: e.clientWidth }; }));
      for (const x of c) if (x.cut || (x.t && x.w === 0)) cutLines.push(`${surah}/${u.unit}: "${x.t}" (${x.w}px)`);
    }
  }
  check(`${tag} no label line is cut off, for every unit in surahs 29, 2 and 114`, cutLines.length === 0, cutLines.slice(0, 4).join(" | "));
  check(`${tag} no page errors`, real(errors).length === 0, real(errors).slice(0, 3).join(" | "));
  await ctx.close();
}

// ---- 2b. decision 65: the first screen (before the tap) and the light ------
const FIRST = {
  ayah: { en: /^(Ayah 1|Bismillah) · .+$/, bn: /^(আয়াত ১|বিসমিল্লাহ) · \S/ }, // updated in place 5 Oct 2026: never "Ayah Bismillah"
  range: { en: /^Āyāt 1–\d+ · \S/, bn: /^আয়াত ১–[০-৯]+ · \S/ },
  surah: { en: /^[A-Za-z'-]+(?: [A-Za-z'-]+)*$/, bn: /^\S/ },
  ruku: { en: /^Ruku' 1 · \S/, bn: /^রুকু' ১ · \S/ },
  juz: { en: /^Juz 1 · \S/, bn: /^জুয.* · \S/ },
  page: { en: /^Page 1 · \S/, bn: /^পৃষ্ঠা ১ · \S/ },
};
for (const lang of ["en", "bn"]) for (const vp of WIDTHS) {
  const tag = `[first screen ${vp[0]} ${lang}]`;
  console.log(`\n=== ${tag} ===`);
  const { ctx, page, errors } = await open(lang, vp, { tap: false });
  if (MUT_BIGBTN) await page.evaluate(() => { const b = document.getElementById("wheelCtaBtn"); b.style.top = "50%"; b.style.width = "78%"; b.style.minHeight = "40%"; });
  if (MUT_STARS) await page.evaluate(() => document.querySelector(".mu-spark path:last-child").remove());
  if (MUT_SUNRISE) await page.evaluate(() => { document.querySelector(".mu-rays").innerHTML = [[35, 30], [52, 27], [50, 8], [68, 11], [73, -7], [89, 3], [100, -12], [111, 3], [127, -7], [132, 11], [150, 8], [148, 27], [165, 30]].map(([x, y]) => `<polygon points="99.2,60 100.8,60 ${x + 1},${y} ${x - 1},${y}"/>`).join(""); });
  const beams = await page.evaluate(() => [...document.querySelectorAll(".mu-rays polygon")].map((p) => p.getAttribute("points").trim().split(/\s+/).slice(0, 2).map((xy) => xy.split(",").map(Number))));
  const pageGlow = await page.evaluate(() => [...document.querySelectorAll("#wheelHubGraphic svg > g.mu-glow")].length);
  const g = await page.evaluate(() => {
    const R = (id) => document.getElementById(id).getBoundingClientRect();
    const ring = document.querySelector('#wheelContainer svg circle[fill="#13192a"]').getBoundingClientRect();
    const d = ring.width, cx = ring.left + d / 2, cy = ring.top + d / 2;
    const img = R("wheelHubCalligraphy"), btn = R("wheelCtaBtn"), gr = R("wheelHubGraphic");
    const imgEl = document.getElementById("wheelHubCalligraphy");
    const sparks = document.querySelectorAll(".mu-spark path").length;
    const lightEl = document.querySelector(".mu-light");
    let lightTop = 1e9;
    for (const e of lightEl.querySelectorAll("*")) { const q = e.getBoundingClientRect(); if (q.width && q.height) lightTop = Math.min(lightTop, q.top); }
    const b = document.getElementById("wheelCtaBtn"), cs = getComputedStyle(b);
    return {
      d, imgVisible: img.width > 0 && img.height > 0 && getComputedStyle(imgEl).visibility !== "hidden" && imgEl.complete && imgEl.naturalWidth > 0,
      imgPlaced: Math.abs(img.left - (ring.left + 0.0694 * d)) <= 1 && Math.abs(img.top - (ring.top + 0.0703 * d)) <= 1 && Math.abs(img.bottom - (ring.top + 0.4613 * d)) <= 1,
      grVisible: gr.width > 0 && gr.height > 0 && getComputedStyle(document.getElementById("wheelHubGraphic")).display !== "none",
      btnInside: Math.hypot(btn.left - cx, btn.top - cy) <= d / 2 + 1 && Math.hypot(btn.right - cx, btn.bottom - cy) <= d / 2 + 1 && Math.hypot(btn.left - cx, btn.bottom - cy) <= d / 2 + 1 && Math.hypot(btn.right - cx, btn.top - cy) <= d / 2 + 1,
      btnTop: btn.top, btnBottom: btn.bottom, imgBottom: img.bottom, grTop: gr.top,
      topPct: (btn.top - ring.top) / d, wPct: btn.width / d, hPct: btn.height / d,
      line1H: document.querySelector("#wheelCtaBtn .wheel-cta-line1").getBoundingClientRect().height,
      line1Fits: (() => { const l = document.querySelector("#wheelCtaBtn .wheel-cta-line1"); return l.scrollWidth <= l.clientWidth + 0.5; })(), line1Font: parseFloat(getComputedStyle(document.querySelector("#wheelCtaBtn .wheel-cta-line1")).fontSize),
      font: parseFloat(cs.fontSize), line1: document.querySelector("#wheelCtaBtn .wheel-cta-line1").textContent.trim(), line2: document.getElementById("wheelCtaLine2").textContent.trim(),
      labelHidden: document.getElementById("wheelHubUnitLabel").getBoundingClientRect().width === 0,
      sparks, filter: getComputedStyle(lightEl).filter, lightTop, btnBottomForLight: btn.bottom,
      veiled: document.getElementById("wheelStageWrap").classList.contains("wheel-veiled"),
      color: cs.color, bg: cs.backgroundImage,
      vw: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  check(`${tag} the calligraphy is visible before the tap, placed as in v09.63`, g.imgVisible && g.imgPlaced, JSON.stringify(g));
  check(`${tag} the open Qur'an is visible before the tap`, g.grVisible);
  check(`${tag} the button is inside the hub circle`, g.btnInside, JSON.stringify(g));
  check(`${tag} the button's top is below the calligraphy's bottom and its bottom above the Qur'an's top`, g.btnTop >= g.imgBottom - 0.5 && g.btnBottom <= g.grTop + 0.5, `${g.imgBottom} ${g.btnTop} ${g.btnBottom} ${g.grTop}`);
  // Updated in place (Architect review of #549): below a 140px hub the pill is 80% wide, so
  // "Study Quran" stays on one line at the 10.5px floor; 60% everywhere else, as in the demo.
  // Updated in place again, 6 Oct 2026: the Owner renamed it "Take an Approach", which is longer
  // (Bangla more so), so the pill is 80% wide, 85% below a 140px hub (its corners stay inside the ring).
  const wantW = g.d < 140 ? 0.85 : 0.8;
  check(`${tag} the button is at 49% / ${wantW * 100}% wide / >= 15% tall of the diameter`, Math.abs(g.topPct - 0.49) < 0.01 && Math.abs(g.wPct - wantW) < 0.01 && g.hPct >= 0.15 - 0.005, `${g.topPct} ${g.wPct} ${g.hPct}`);
  check(`${tag} the first line reads "Take an Approach" (the Owner, 6 Oct 2026)`, g.line1 === (lang === "bn" ? "একটি পদ্ধতি গ্রহণ করুন" : "Take an Approach"), g.line1);
  check(`${tag} "Take an Approach" is on one line, whole (not cut), its font never below 8px`, g.line1H <= g.line1Font * 1.1 * 1.5 && g.line1Fits && g.line1Font >= 8, `${g.line1H} at ${g.line1Font}px fits=${g.line1Fits}`);
  check(`${tag} its font is 0.066 x diameter, never below 10.5px`, Math.abs(g.font - Math.max(10.5, g.d * 0.066)) < 0.3, `${g.font} ${g.d}`);
  check(`${tag} the label is hidden and the veil is still on`, g.labelHidden && g.veiled);
  check(`${tag} there are exactly 7 stars in the light`, g.sparks === 7, String(g.sparks));
  {
    // Each beam's base (its first two points, in the drawing's own units) must sit on a
    // page's top edge (y 45-62), the bases must be spread across BOTH pages, and no two
    // beams may start at the same point -- one shared point is a sun, not a book.
    const bases = beams.map(([a, b]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    const onPages = bases.every(([x, y]) => y >= 45 && y <= 62 && x >= 30 && x <= 170);
    const xs = bases.map(([x]) => x);
    const spread = Math.min(...xs) < 50 && Math.max(...xs) > 150;
    const distinct = new Set(bases.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)).size === bases.length;
    check(`${tag} the light rises from the pages: ${bases.length} beams, each starting on a page's top edge, spread across both pages, no two from one point`, bases.length >= 12 && onPages && spread && distinct, JSON.stringify(bases.slice(0, 4)));
    check(`${tag} the pages themselves glow (a glow layer in front of the book)`, pageGlow >= 1, String(pageGlow));
  }
  check(`${tag} the light carries brightness(1.5)`, /brightness\(1\.5\)/.test(g.filter), g.filter);
  check(`${tag} the topmost light element is below the button's bottom`, g.lightTop >= g.btnBottomForLight - 0.5, `${g.lightTop} ${g.btnBottomForLight}`);
  check(`${tag} no sideways scroll`, g.vw <= 0, String(g.vw));
  for (const u of Object.keys(FIRST)) {
    await page.evaluate((unit) => { const s = document.getElementById("wheelUnitTypeSelect"); s.value = unit; s.dispatchEvent(new Event("change")); }, u);
    await page.waitForTimeout(250);
    const l2 = await page.evaluate(() => document.getElementById("wheelCtaLine2").textContent.trim());
    // Updated in place (Architect review of #549): on a hub too small for the full name over
    // two lines (320px) line 2 carries the unit alone, and the button's title the full name.
    const full = await page.evaluate(() => document.getElementById("wheelCtaBtn").title.trim());
    const shown = vp[0] <= 320 ? full : l2;
    check(`${tag} the button names the ${u}${vp[0] <= 320 ? " (in full in its title; line 2 \"" + l2 + "\")" : ""}: "${shown}"`, FIRST[u][lang].test(shown) && full.includes(l2.split(" · ")[0]) && (lang === "en" || !/[0-9]/.test(shown)), `${l2} | ${full}`);
    // A name the reader cannot read is not a name: line 2 is never cut, stays inside
    // the button, and the button still ends above the open Qur'an.
    const fit = await page.evaluate((cut) => {
      const l = document.getElementById("wheelCtaLine2");
      if (cut) Object.assign(l.style, { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });
      const r = l.getBoundingClientRect(), b = document.getElementById("wheelCtaBtn").getBoundingClientRect(), gr = document.getElementById("wheelHubGraphic").getBoundingClientRect();
      return { cut: l.scrollWidth > l.clientWidth + 1, inside: r.left >= b.left - 0.5 && r.right <= b.right + 0.5 && r.bottom <= b.bottom + 0.5, above: b.bottom <= gr.top + 0.5, sw: l.scrollWidth, cw: l.clientWidth };
    }, MUT_CUTPILL);
    check(`${tag} line 2 for the ${u} is whole (not cut), inside the button, and the button ends above the Qur'an`, !fit.cut && fit.inside && fit.above, JSON.stringify(fit));
  }
  check(`${tag} no page errors`, real(errors).length === 0, real(errors).slice(0, 3).join(" | "));
  if (lang === "en" && vp[0] === 390) {
    // elementFromPoint at slice centres still lands on slices (before the tap)
    const hit = await page.evaluate(() => [...document.querySelectorAll("#wheelContainer .wheel-seg")].slice(0, 12).map((s) => { const bb = s.getBBox(); const p = new DOMPoint(bb.x + bb.width / 2, bb.y + bb.height / 2).matrixTransform(s.getScreenCTM()); const el = document.elementFromPoint(p.x, p.y); return !!el?.closest?.(".wheel-seg") && !/wheelHub|wheelCta/.test(el.id || ""); }));
    check(`${tag} elementFromPoint at slice centres lands on slices`, hit.length > 0 && hit.every(Boolean), JSON.stringify(hit));
    await page.screenshot({ path: "/tmp/first-390.png" });
    // contrast of the button text on its gold (the darker end of the gradient)
    const lumc = (c) => { const [r, g2, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g2 + 0.0722 * b; };
    const fg = g.color.match(/[\d.]+/g).slice(0, 3).map(Number);
    const worst = Math.min(...[[0xec, 0xd0, 0x8e], [0xc9, 0xa2, 0x4b]].map((bg) => (Math.max(lumc(fg), lumc(bg)) + 0.05) / (Math.min(lumc(fg), lumc(bg)) + 0.05)));
    check(`${tag} the button text is >= 4.5:1 on both ends of its gold (${worst.toFixed(2)})`, worst >= 4.5, String(worst));
  }
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
  // Review of #543: decision 63 / the approved demo put a numbered unit's own
  // number ABOVE the Surah it starts in. Measured on screen, not in the markup.
  const order = await page.evaluate(() => { const y = (id) => document.getElementById(id).getBoundingClientRect().top; return { num: y("wheelUnitNumRow"), surah: y("wheelUnitSurahRow") }; });
  check(`${tag} the Page № row sits above the Surah row (the demo's order)`, order.num < order.surah, JSON.stringify(order));
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

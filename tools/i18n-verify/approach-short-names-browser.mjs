// Issue #385 -- Approach SHORT NAMES: a Catalogue column, shown along the
// wheel's slices, with a Names On/Off toggle (default On, remembered).
// RENDERED, in a real browser, English and Bangla.
//
// Expected texts are written BY HAND below, never read back from the app's
// own approachShortName(). The seed: `recite` has its OWN short name,
// `memorise` is a copy of platform template approach_02 with none of its own
// (so it falls back to the template's default, "Hifz" / "হিফজ"), every other
// Approach has neither (so it prints its full name).
//
//   node tools/i18n-verify/approach-short-names-browser.mjs
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));

const SEED = `
const byId = (id) => DATA.trackables.find((t) => t._id === TENANT_ID + "__" + id);
byId("recite").shortName = { en: "Own Short", bn: "নিজস্ব" };
byId("memorise").sourceTemplateId = "approach_02";
`;

// 40 Approaches with the LONGEST real default short names (16 chars).
const FORTY = `
DATA.trackables = [];
for (let i = 1; i <= 40; i++) {
  DATA.trackables.push({ _id: TENANT_ID + "__a" + i, tenantId: TENANT_ID, moduleId: "quranrevival", subjectId: "quran", order: i, status: "active",
    group: 1, groupName: { en: "One", bn: "এক" }, name: { en: "Long full name number " + i, bn: "দীর্ঘ পূর্ণ নাম " + i },
    shortName: { en: "Listen + Meaning", bn: "অর্থসহ শ্রবণ পদ্ধতি" },
    guide: { what: {}, how: {}, measure: {} }, panels: ["text"] });
}
`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const real = (errors) => errors.filter((e) => !/Failed to load resource: net::ERR_/.test(e));
const waitWheel = (page) => page.waitForFunction(() => document.querySelectorAll("#wheelContainer .wheel-seg").length > 0, null, { timeout: 20000 });
const names = (page) => page.evaluate(() => [...document.querySelectorAll("#wheelContainer .wheel-seg-name")].map((e) => e.textContent.trim()));

// ---- 1. Catalogue: the column, the edit save, the add form ----------------
for (const lang of ["en", "bn"]) {
  console.log(`\n=== Catalogue short names, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width: 1100, height: 900 }, extraSeedJs: SEED });
  const { page, errors } = await openPage(ctx, "/app/catalogue.html");
  await page.waitForFunction(() => document.querySelectorAll("#trackablesBody tr").length > 0, null, { timeout: 15000 });
  await page.click('[data-cat-tab="approaches"]');
  const col = await page.evaluate(() => {
    const head = [...document.querySelectorAll("#trackablesBody")[0].closest("table").querySelectorAll("thead th")].map((th) => th.textContent.trim());
    const cell = (id) => document.querySelector(`#trk-row-${id} .trk-short-name`)?.textContent.trim();
    return { head, recite: cell("recite"), memorise: cell("memorise"), tajweed: cell("tajweed"), tajName: document.querySelector("#trk-row-tajweed td:nth-child(2)")?.textContent.trim() };
  });
  const want = lang === "en" ? { recite: "Own Short", memorise: "Hifz" } : { recite: "নিজস্ব", memorise: "হিফজ" };
  check(`[${lang}] the Approach table has a Short name column`, col.head.length >= 7 && col.head[2] === (lang === "en" ? "Short name" : "সংক্ষিপ্ত নাম"), JSON.stringify(col.head));
  check(`[${lang}] an Approach's own short name shows in the reader's language`, col.recite === want.recite, JSON.stringify(col));
  check(`[${lang}] a template copy with none shows the template default`, col.memorise === want.memorise, JSON.stringify(col));
  check(`[${lang}] an Approach with neither shows its full name`, !!col.tajName && col.tajweed === col.tajName, JSON.stringify(col));

  // Edit: both languages, saved through the normal save path.
  await page.click('#trk-row-recite .editTrkBtn');
  await page.waitForSelector('#trk-row-recite .trkShortNameInput');
  const pre = await page.evaluate(() => [...document.querySelectorAll("#trk-row-recite .trkShortNameInput")].map((e) => e.dataset.lang + "=" + e.value));
  check(`[${lang}] the Edit form offers the short-name pair, pre-filled`, pre.join("|") === "en=Own Short|bn=নিজস্ব", JSON.stringify(pre));
  await page.fill('#trk-row-recite .trkShortNameInput[data-lang="en"]', "Recite Fast");
  await page.fill('#trk-row-recite .trkShortNameInput[data-lang="bn"]', "দ্রুত পাঠ");
  await page.click("#trk-row-recite .saveTrkBtn");
  await page.waitForFunction(() => (window.__stubWriteData || []).some((w) => w.col === "trackables" && w.data?.shortName), null, { timeout: 8000 }).catch(() => {});
  const w = await page.evaluate(() => (window.__stubWriteData || []).filter((x) => x.col === "trackables" && x.data?.shortName).pop());
  check(`[${lang}] Save writes shortName {en, bn} on that document`, w?.id === "t1__recite" && w.data.shortName.en === "Recite Fast" && w.data.shortName.bn === "দ্রুত পাঠ", JSON.stringify(w));

  // Add: optional short name is written when given.
  await page.fill("#newApproachNameEn", "Brand New");
  await page.fill("#newApproachShortEn", "Newbie");
  await page.fill("#newApproachShortBn", "নতুন");
  await page.selectOption("#newApproachSection", "1");
  await page.click("#addApproachBtn");
  await page.waitForFunction(() => (window.__stubWriteData || []).some((x) => x.kind === "set" && x.col === "trackables"), null, { timeout: 8000 }).catch(() => {});
  const c = await page.evaluate(() => (window.__stubWriteData || []).find((x) => x.kind === "set" && x.col === "trackables"));
  check(`[${lang}] Add an Approach saves its optional short name`, c?.data?.shortName?.en === "Newbie" && c.data.shortName.bn === "নতুন", JSON.stringify(c?.data?.shortName));
  check(`[${lang}] no page errors`, real(errors).length === 0, real(errors).join("; "));
  await ctx.close();
}

// ---- 2. The landing wheel: names, toggle, fallback, memory ----------------
for (const lang of ["en", "bn"]) {
  console.log(`\n=== Landing wheel names, appLang=${lang} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width: 390, height: 844 }, extraSeedJs: SEED });
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await waitWheel(page);
  const on = await names(page);
  check(`[${lang}] by default the wheel shows a name on all 10 slices`, on.length === 10, JSON.stringify(on));
  const own = lang === "en" ? "Own Short" : "নিজস্ব", hifz = lang === "en" ? "Hifz" : "হিফজ";
  check(`[${lang}] a slice with its own short name prints it`, on.includes(own), JSON.stringify(on));
  check(`[${lang}] a template copy prints the template default`, on.includes(hifz), JSON.stringify(on));
  const full = await page.evaluate(() => document.querySelector('#wheelContainer .wheel-seg[data-key="tajweed"] title')?.textContent || "");
  check(`[${lang}] a slice with none prints (a clipped form of) its full name`, on.some((n) => n.length > 1 && full.replace("…", "").includes(n.replace("…", ""))) , JSON.stringify({ on, full }));

  // Architect review, 29 Sep 2026: the switch is ONE "Names" toggle on the
  // Wheel look row (its own On/Off row cost the phone layout 46px and an
  // Approach row). Updated in place: it must sit on the SAME line as the look
  // buttons, and be pressed (on) by default.
  const sw = await page.evaluate(() => {
    const b = document.getElementById("wheelNamesBtn");
    const r = b.getBoundingClientRect();
    const look = document.querySelector('#wheelLookSwitch [data-wheel-look="dark"]').getBoundingClientRect();
    return { h: r.height, sameLine: Math.abs((r.top + r.height / 2) - (look.top + look.height / 2)) <= 2, pressed: b.getAttribute("aria-pressed"), overflow: document.documentElement.scrollWidth - innerWidth };
  });
  check(`[${lang}] Names is one toggle on the Wheel look line, >= 36px tall like its neighbours, on by default`, sw.sameLine && sw.h >= 36 && sw.pressed === "true", JSON.stringify(sw));
  check(`[${lang}] no sideways scroll at 390px`, sw.overflow <= 1, String(sw.overflow));

  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
  await page.click('#wheelNamesBtn');
  await page.waitForTimeout(200);
  check(`[${lang}] Off hides every name (numbers stay)`, (await names(page)).length === 0 && (await page.evaluate(() => document.querySelectorAll("#wheelContainer .wheel-seg-num").length)) === 10);
  await page.reload();
  await waitWheel(page);
  const after = await page.evaluate(() => ({ pressed: document.getElementById("wheelNamesBtn").getAttribute("aria-pressed"), stored: localStorage.getItem("mm_wheel_names") }));
  check(`[${lang}] Off is remembered after a reload`, (await names(page)).length === 0 && after.pressed === "false" && after.stored === "off", JSON.stringify(after));
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
  await page.click('#wheelNamesBtn');
  await page.waitForTimeout(200);
  check(`[${lang}] On shows them again`, (await names(page)).length === 10);

  // All-units rings wheel
  await page.click('[data-wheel-show="all"]');
  await page.waitForFunction(() => document.querySelectorAll("#wheelContainer .wheel-ring-seg").length > 0, null, { timeout: 20000 });
  check(`[${lang}] the All-units ring wheel prints the names too`, (await names(page)).length === 10, JSON.stringify(await names(page)));
  await ctx.close();
}

// ---- 3. My Status overview wheel ------------------------------------------
{
  console.log("\n=== My Status overview wheel ===");
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 }, extraSeedJs: SEED });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await waitWheel(page);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
  const id = await page.evaluate(() => ["myStatusBtn", "myStatusWideBtn"].find((i) => { const el = document.getElementById(i); return el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0; }));
  await page.click(`#${id}`);
  await page.waitForFunction(() => document.querySelectorAll("#myStatusBody .wheel-seg").length > 0, null, { timeout: 10000 });
  const n = await page.evaluate(() => [...document.querySelectorAll("#myStatusBody .wheel-seg-name")].map((e) => e.textContent.trim()));
  check("My Status's wheel prints the 10 names", n.length === 10 && n.includes("Own Short") && n.includes("Hifz"), JSON.stringify(n));
  await ctx.close();
}

// ---- 4. 40 Approaches: nothing spills out of its slice ---------------------
// Geometry of renderScopedWheel at the default 360 viewBox: rOuter 176, rInner
// 88, so a name has 88 units of depth, and a slice is 9° wide, i.e. an arc
// 13.8 units wide at its inner edge. Measured on each name's own unrotated
// box (getBBox), so it holds however the text is rotated.
for (const lang of ["en", "bn"]) {
  for (const width of [320, 390, 1100]) {
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 900 }, extraSeedJs: FORTY });
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await waitWheel(page);
    const r = await page.evaluate(() => {
      const svg = document.querySelector("#wheelContainer svg");
      const vb = svg.viewBox.baseVal;
      const els = [...svg.querySelectorAll(".wheel-seg-name")];
      const boxes = els.map((e) => { const b = e.getBBox(); return { w: b.width, h: b.height }; });
      const rendered = els.map((e) => e.getBoundingClientRect());
      const wheel = svg.getBoundingClientRect();
      return {
        n: els.length, vb: vb.width,
        maxW: Math.max(...boxes.map((b) => b.w)), maxH: Math.max(...boxes.map((b) => b.h)),
        inside: rendered.every((b) => b.left >= wheel.left - 1 && b.right <= wheel.right + 1 && b.top >= wheel.top - 1 && b.bottom <= wheel.bottom + 1),
        overflow: document.documentElement.scrollWidth - innerWidth,
        segs: svg.querySelectorAll(".wheel-seg").length,
      };
    });
    const rOuter = r.vb / 2 - 4, depth = rOuter - rOuter * 0.5, arc = rOuter * 0.5 * (9 * Math.PI / 180);
    check(`[${lang} ${width}px] 40 slices, 40 names`, r.segs === 40 && r.n === 40, JSON.stringify(r));
    check(`[${lang} ${width}px] the longest name is within its slice's depth (${r.maxW.toFixed(1)} <= ${depth})`, r.maxW <= depth, JSON.stringify(r));
    check(`[${lang} ${width}px] the tallest name is within its slice's arc width (${r.maxH.toFixed(1)} <= ${arc.toFixed(1)} + 1)`, r.maxH <= arc + 1, JSON.stringify(r));
    check(`[${lang} ${width}px] every name is inside the wheel's box`, r.inside);
    check(`[${lang} ${width}px] no sideways scroll`, r.overflow <= 1, String(r.overflow));
    await ctx.close();
  }
}

// ---- 5. Contrast: white text, dark halo, every status colour ---------------
{
  console.log("\n=== Contrast ===");
  const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const fills = { not_started: "#333f5c", learning: "#8a6a35", practising: "#C9A24B", achieved: "#5b84c4", mastered: "#3fae74" };
  const halo = "#0c1320";
  const rows = Object.entries(fills).map(([k, v]) => `${k}: white/fill ${cr("#ffffff", v).toFixed(2)}, halo/fill ${cr(halo, v).toFixed(2)}`);
  console.log("  " + rows.join("\n  "));
  const haloVsWhite = cr("#ffffff", halo);
  console.log(`  white text vs its own halo ${haloVsWhite.toFixed(2)}:1`);
  // The letters are white on a dark outline: what a reader's eye separates is
  // the text from the OUTLINE, so that pair (not the slice colour) is what
  // must reach 3:1 on every status colour and every look.
  check("white text against its dark halo is >= 3:1 (independent of the slice colour)", haloVsWhite >= 3, String(haloVsWhite));
  check("the halo is itself distinct from every status colour (>= 1.5:1), so the outline never vanishes", Object.values(fills).every((v) => cr(halo, v) >= 1.5), rows.join("; "));
  // The Light look brightens the SVG by 1.9 (CSS filter); recompute with it.
  const bright = (hex) => "#" + [1, 3, 5].map((i) => Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * 1.9)).toString(16).padStart(2, "0")).join("");
  const lightHalo = bright(halo);
  console.log(`  Light look (brightness 1.9): halo becomes ${lightHalo}, white/halo ${cr("#ffffff", lightHalo).toFixed(2)}:1`);
  check("in the Light look the white text still reaches >= 3:1 against its brightened halo", cr("#ffffff", lightHalo) >= 3, String(cr("#ffffff", lightHalo)));
}

await browser.close();
console.log(`\n==== Approach short names: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

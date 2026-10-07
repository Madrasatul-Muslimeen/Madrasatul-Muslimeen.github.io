// Owner decision 84 (7 Oct 2026) -- Explore -> Quran -> a Surah: the Ayah numbers round the wheel are upright,
// at least 11 screen px, never overlap, always show Ayah 1 and the last Ayah, and stay inside the SVG.
// Both views (All Approaches, One Approach), Al-Fatihah (7) / Al-Kahf (110) / Al-Baqarah (286), 320 / 390 / 1280, en + bn.
// Run from tools/i18n-verify:  node explore-ayah-numbers-browser.mjs [--mutate=rotation|eightpx|every]
//
// Every expected value is a fixed number written here (7 / 110 / 286, 11 px), never read off an app function.
// --mutate patches the SERVED mastery-wheel.js in the browser (route), so the app on disk is never touched; each
// mutation must make a named check fail.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const failed = [];
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; failed.push(n); console.log(`  FAIL  ${n} ${d}`); }
};
const mutate = (process.argv.find((a) => a.startsWith("--mutate=")) ?? "").slice(9);
const MUTATIONS = {
  rotation: ['b.el.setAttribute("x", b.x.toFixed(2));', 'b.el.setAttribute("x", b.x.toFixed(2)); b.el.setAttribute("transform", `rotate(${Number(b.el.dataset.angle) - 90} ${b.x.toFixed(2)} ${b.y.toFixed(2)})`);'],
  eightpx: ["const next = minPx / scale;", "const next = 8 / scale;"],
  every: ["for (const k of [1, 2, 5, 10, 20, 50, 100]) {", "for (const k of [1]) {"],
};
if (mutate && !MUTATIONS[mutate]) throw new Error(`unknown --mutate=${mutate}`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function openExplore(lang, width) {
  const ctx = await newContext(browser, { banner: false, viewport: { width, height: 900 }, appLang: lang });
  if (mutate) {
    const [from, to] = MUTATIONS[mutate];
    await ctx.route("**/js/mastery-wheel.js", async (route) => {
      const res = await route.fetch();
      let body = await res.text();
      if (!body.includes(from)) throw new Error(`mutation ${mutate}: the target text is not in mastery-wheel.js`);
      body = body.split(from).join(to);
      await route.fulfill({ response: res, body });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.click("#tabExploreBtn");
  await page.waitForFunction(() => !!document.querySelector("#exploreWheelContainer svg"), null, { timeout: 15000 });
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((el) => el.remove()));
  return { ctx, page };
}
async function goSurah(page, n) {
  await page.evaluate((k) => {
    const segs = [...document.querySelectorAll("#exploreWheelContainer .wheel-seg")].filter((s) => s.dataset.key === String(k) && (!s.dataset.ringKind || s.dataset.ringKind === "surah"));
    segs[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }, n);
  await page.waitForFunction(() => !!document.querySelector(".aa-wheel, #exploreModeRow button"), null, { timeout: 15000 });
  await page.waitForFunction(() => !!document.querySelector("#exploreWheelContainer .wheel-seg-num-up"), null, { timeout: 15000 });
  await page.waitForTimeout(300);
}

/** Everything about the numbers on the wheel now on screen, measured in the browser. */
const measure = (page) => page.evaluate(() => {
  const svg = document.querySelector("#exploreWheelContainer svg.mastery-wheel");
  const sr = svg.getBoundingClientRect();
  const nums = [...svg.querySelectorAll(".wheel-seg-num")].map((el) => {
    const r = el.getBoundingClientRect(), m = el.getCTM();
    return { text: el.textContent.trim(), l: r.left, t: r.top, r: r.right, b: r.bottom, rot: Math.atan2(m.b, m.a) * 180 / Math.PI, px: parseFloat(getComputedStyle(el).fontSize) * svg.getScreenCTM().a };
  });
  let overlaps = 0;
  for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) {
    const a = nums[i], b = nums[j];
    if (a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b) overlaps++;
  }
  const outside = nums.filter((n) => n.l < sr.left - 0.5 || n.r > sr.right + 0.5 || n.t < sr.top - 0.5 || n.b > sr.bottom + 0.5).length;
  const slices = [...svg.querySelectorAll(".wheel-seg")].map((s) => s.getBoundingClientRect());
  return {
    count: nums.length, texts: nums.map((n) => n.text), overlaps, outside,
    maxRot: Math.max(...nums.map((n) => Math.abs(n.rot))), minPx: Math.min(...nums.map((n) => n.px)),
    pageOverflow: document.documentElement.scrollWidth - window.innerWidth, svgW: sr.width,
    onSlices: nums.filter((n) => slices.some((s) => n.l + 1 < s.right && s.left < n.r - 1 && n.t + 1 < s.bottom && s.top < n.b - 1 && document.elementFromPoint((n.l + n.r) / 2, (n.t + n.b) / 2)?.classList.contains("wheel-seg"))).length,
  };
});

const SURAHS = [{ n: 1, last: 7 }, { n: 18, last: 110 }, { n: 2, last: 286 }];
const bnDigits = (s) => String(s).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));

for (const lang of ["en", "bn"]) {
  for (const width of [320, 390, 1280]) {
    const { ctx, page } = await openExplore(lang, width);
    for (const s of SURAHS) {
      await goSurah(page, s.n);
      for (const view of ["all", "one"]) {
        await page.click(`#exploreModeRow [data-v="${view}"]`, { timeout: 8000 });
        await page.waitForFunction((v) => (v === "all" ? !!document.querySelector(".aa-wheel .wheel-seg-num-up") : !!document.querySelector(".wheel-ring-seg") && !!document.querySelector(".mastery-wheel-rings .wheel-seg-num-up")), view, { timeout: 15000 });
        await page.waitForTimeout(300);
        const m = await measure(page);
        const tag = `[${lang} ${width} surah ${s.n} ${view}]`;
        check(`${tag} every shown number is upright (rotation 0)`, m.count > 0 && m.maxRot < 0.01, `max rotation ${m.maxRot}`);
        check(`${tag} every number renders at 11 screen px or more`, m.minPx >= 10.95, `min ${m.minPx}`);
        check(`${tag} no two number boxes intersect`, m.overlaps === 0, `${m.overlaps} overlaps of ${m.count}`);
        const texts = m.texts.map(bnDigits);
        check(`${tag} Ayah 1 and Ayah ${s.last} are shown`, texts[0] === "1" && texts.at(-1) === String(s.last), `first ${texts[0]} last ${texts.at(-1)}`);
        check(`${tag} every box is inside the SVG`, m.outside === 0, `${m.outside} outside`);
        check(`${tag} no number sits on top of a slice`, m.onSlices === 0, `${m.onSlices} on slices`);
        check(`${tag} the page has no sideways overflow`, m.pageOverflow <= 0, String(m.pageOverflow));
        if (lang === "bn") check(`${tag} Bangla digits are used`, m.texts.every((t) => /^[০-৯]+/.test(t)), JSON.stringify(m.texts.slice(0, 4)));
        if (s.n === 2 && view === "all") check(`${tag} Al-Baqarah is thinned (fewer than 286 numbers)`, m.count < 286, String(m.count));
        if (s.n === 1) check(`${tag} Al-Fatihah shows all 7 numbers`, m.count === 7, String(m.count));
      }
    }
    await ctx.close();
  }
}

// ---- the landing wheel (and every other caller) is unchanged: default output is byte-for-byte what main renders ----
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-main-"));
  const mainFile = path.join(dir, "mastery-wheel-main.mjs");
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
  let mainSrc = null;
  for (const ref of ["origin/main", "main"]) {
    try { mainSrc = execFileSync("git", ["show", `${ref}:app/js/mastery-wheel.js`], { cwd: root, encoding: "utf8" }); break; } catch { /* try the next ref */ }
  }
  check("main's mastery-wheel.js could be read for the comparison", !!mainSrc);
  if (mainSrc) {
    fs.writeFileSync(mainFile, mainSrc);
    const oldM = await import(mainFile);
    const newM = await import(path.join(root, "app/js/mastery-wheel.js"));
    const items = Array.from({ length: 40 }, (_, i) => ({ key: i + 1, number: i + 1, statusId: ["learning", "mastered", "not_started"][i % 3], label: `A${i}`, title: `T${i}` }));
    check("renderScopedWheel default output is identical to main's", oldM.renderScopedWheel(items, { centerLabel: "x" }) === newM.renderScopedWheel(items, { centerLabel: "x" }));
    check("renderScopedWheel (roomForNumbers + ring) default output is identical to main's", oldM.renderScopedWheel(items, { centerLabel: "x", roomForNumbers: true, ring: { ratio: 0.4 } }) === newM.renderScopedWheel(items, { centerLabel: "x", roomForNumbers: true, ring: { ratio: 0.4 } }));
    const rings = [[{ key: "a", statusId: "learning", a0: 0, a1: 100 }], [{ key: "b", statusId: "mastered", a0: 10, a1: 350 }]];
    const numbers = [{ angle: 50, text: "1" }, { angle: 200, text: "2" }];
    check("renderRingWheel default output is identical to main's", oldM.renderRingWheel(rings, { numbers, centerLabel: "x" }) === newM.renderRingWheel(rings, { numbers, centerLabel: "x" }));
    check("renderRingWheel (names + roomForNumbers) default output is identical to main's", oldM.renderRingWheel(rings, { numbers, names: [{ angle: 40, arcDeg: 30, text: "Memorise" }], roomForNumbers: true }) === newM.renderRingWheel(rings, { numbers, names: [{ angle: 40, arcDeg: 30, text: "Memorise" }], roomForNumbers: true }));
  }
  // The landing page's own wheel, in the real page: still 8px and rotated, and no upright layer in it.
  const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 900 }, appLang: "en" });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => !!document.querySelector("#wheelContainer .wheel-seg-num, .mastery-wheel .wheel-seg-num"), null, { timeout: 15000 });
  const landing = await page.evaluate(() => {
    const els = [...document.querySelectorAll(".mastery-wheel .wheel-seg-num")];
    return { n: els.length, px: [...new Set(els.map((el) => getComputedStyle(el).fontSize))], rotated: els.every((el) => /^rotate\(/.test(el.getAttribute("transform") ?? "")), up: document.querySelectorAll(".wheel-upright-nums").length };
  });
  check("the landing wheel's numbers are unchanged (8px, rotated, no upright layer)", landing.n > 0 && landing.px.length === 1 && landing.px[0] === "8px" && landing.rotated && landing.up === 0, JSON.stringify(landing));
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed${mutate ? ` (mutation: ${mutate})` : ""}`);
if (mutate) console.log(`failing checks: ${failed.length}${failed.length ? ` e.g. ${failed.slice(0, 3).join(" | ")}` : " -- MUTATION NOT DETECTED"}`);
process.exit(mutate ? (failed.length ? 0 : 1) : (fail ? 1 : 0));

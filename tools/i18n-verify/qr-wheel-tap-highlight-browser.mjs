// QR Lead (the Owner, 29 Oct 2026, a phone screenshot of the landing Mastery Wheel): "Any click on slice shows/ highlight
// this block, it should only highlighted the clicked slice." The blue block was the phone browser's own tap highlight
// (-webkit-tap-highlight-color), which paints the tapped element's bounding RECTANGLE: a wedge's rectangle spans several
// slices. The fix turns it off for every wheel's drawing in quranrevival.html. Headless Chromium does not paint the
// Android highlight, so this asserts what Chrome reads to decide whether to paint it -- the computed value -- on every
// slice and every slice label, with a positive control (an ordinary button keeps the browser default, so the check can
// fail), and that a tap still selects exactly the slice tapped.
//   node tools/i18n-verify/qr-wheel-tap-highlight-browser.mjs [--mutate=no-rule]   (serve.js on :8080)
//   --mutate=no-rule   the 29 Oct rule removed from the served page -> every "no tap block" check FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const RULE = "  .wheel-seg, svg:has(.wheel-seg), svg:has(.wheel-seg) * { -webkit-tap-highlight-color: transparent; }";
if (MUTATE && MUTATE !== "no-rule") throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const CLEAR = /^(transparent|rgba\(0, 0, 0, 0\))$/;

for (const [w, h, lang] of [[360, 780, "en"], [390, 844, "bn"], [768, 1024, "en"], [1280, 900, "en"]]) {
  const tag = `[${lang} ${w}]`;
  const touch = w < 1000;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
  if (MUTATE) {
    const html = fs.readFileSync("app/quranrevival.html", "utf8");
    if (html.split(RULE).length !== 2) throw new Error("mutation anchor not found exactly once");
    await ctx.route(/\/app\/quranrevival\.html(\?.*)?$/, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html.replace(RULE, "") }));
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.querySelectorAll("#wheelContainer .wheel-seg").length >= 8, null, { timeout: 15000 }).catch(() => {});
  const m = await page.evaluate(() => {
    const tap = (e) => getComputedStyle(e).webkitTapHighlightColor;
    const segs = [...document.querySelectorAll("#wheelContainer .wheel-seg")];
    const labels = [...document.querySelectorAll("#wheelContainer .wheel-seg-name, #wheelContainer text")];
    const svg = document.querySelector("#wheelContainer svg");
    const ctrl = document.getElementById("readContentsBtn") || document.querySelector("button");
    return { segs: segs.length, labels: labels.length, segTaps: [...new Set(segs.map(tap))], labelTaps: [...new Set(labels.map(tap))], svgTap: svg ? tap(svg) : null, ctrlTap: ctrl ? tap(ctrl) : null };
  });
  check(`${tag} POSITIVE CONTROL: the landing wheel is drawn (${m.segs} slices, ${m.labels} labels)`, m.segs >= 8 && m.labels > 0, JSON.stringify(m));
  check(`${tag} POSITIVE CONTROL: an ordinary button keeps the browser's tap highlight (${m.ctrlTap})`, !!m.ctrlTap && !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(m.ctrlTap), JSON.stringify(m));
  check(`${tag} no tap block on any slice (${m.segTaps.join(", ")})`, m.segTaps.length > 0 && m.segTaps.every((c) => CLEAR.test(c)), JSON.stringify(m.segTaps));
  check(`${tag} ...nor on a slice's printed name, nor the wheel drawing itself`, m.labelTaps.every((c) => CLEAR.test(c)) && CLEAR.test(m.svgTap ?? ""), JSON.stringify([m.labelTaps, m.svgTap]));
  // A tap on one slice still selects exactly that slice (the wheel's own highlight).
  const pick = await page.evaluate(() => {
    const segs = [...document.querySelectorAll("#wheelContainer .wheel-seg[data-key]")];
    const s = segs[3] ?? segs[0];
    if (!s) return null;
    const r = s.getBoundingClientRect();
    s.scrollIntoView({ block: "center" });
    const b = s.getBoundingClientRect();
    return { key: s.dataset.key, x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  if (pick) {
    // tap at a point that really is inside the wedge: walk toward its centroid until elementFromPoint answers the slice
    const pt = await page.evaluate((key) => {
      const s = document.querySelector(`#wheelContainer .wheel-seg[data-key="${key}"]`), b = s.getBoundingClientRect();
      for (let fy = 0.5; fy <= 0.9; fy += 0.1) for (let fx = 0.1; fx <= 0.9; fx += 0.1) {
        const x = b.left + b.width * fx, y = b.top + b.height * fy, el = document.elementFromPoint(x, y);
        if (el === s) return { x, y };
      }
      return null;
    }, pick.key);
    // the harness's context takes no hasTouch, so a finger tap goes through the DevTools protocol (a real touch event)
    if (pt && touch) {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: pt.x, y: pt.y }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else if (pt) await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(600);
    // a slice tap chooses THAT Approach (jumpToApproach sets #trackableSelect and opens its card): positive, not "nothing"
    const chosen = await page.evaluate(() => document.getElementById("trackableSelect")?.value ?? null);
    check(`${tag} a tap on one slice chooses exactly that slice's Approach (${pick.key})`, !!pt && chosen === pick.key, JSON.stringify({ pt, chosen }));
  }
  if (w === 390) await page.screenshot({ path: `${process.env.SHOT_DIR || "/tmp"}/qr-wheel-tap-${lang}-${w}.png` });
  await ctx.close();
}
await browser.close();
console.log(`\n==== QR wheel: no tap block over the slices${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

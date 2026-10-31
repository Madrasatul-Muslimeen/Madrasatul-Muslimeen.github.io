// QR Lead audit 7, 31 Oct 2026 (Builder audit part 142 D4-D6, passed to the QR Lead by the PCA and the Architect): three
// colours on the Quran Study landing read too faint. Measured on main v13.03 with this suite: Night's "Mastery Wheel" heading
// is the card's gold #C9A24B but sits on the white PAGE under 900px (2.40:1); the "Choose a Unit" caret at opacity 0.75 on the
// gold pill's darker end (4.49:1); the Light look's section caret pale gold on white (1.45:1). Text needs 4.5:1 (the heading
// is a heading, but its Cormorant face is thin, so 4.5 is asked of it too); a caret is a mark and needs 3:1, here asked 4.5:1
// so it reads as clearly as the word beside it. The real background is read off the rendered page: the caret's pill is a
// gradient, so it is measured against BOTH ends of the gradient (the worse one counts).
//   node tools/i18n-verify/qr-wheel-contrast-browser.mjs [--mutate=NAME]   (serve.js on :8080, or QR_BASE; repo root)
//   heading  Night heading back to the card gold      -> "Night heading" FAILS (2.40)
//   caret    the caret back to opacity 0.75            -> "unit caret" FAILS in Night (4.49)
//   ways     Light section caret back to pale gold     -> "Light section caret" FAILS (1.45)
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  heading: ['  [data-card-look="night"] #wheelPopupView > .wheel-heading { color: #7a5410; }\n', "", 1],
  caret: ["  .wheel-unit-capsule-caret { flex: none; font-size: 0.7rem; opacity: 0.9; }", "  .wheel-unit-capsule-caret { flex: none; font-size: 0.7rem; opacity: 0.75; }", 1],
  ways: ['  [data-card-look="light"] .ways-caret { color: #7a5410; }\n', "", 1],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let SRC = null;
if (MUTATE) {
  SRC = fs.readFileSync("app/quranrevival.html", "utf8");
  const [from, to, n] = MUT[MUTATE];
  const got = SRC.split(from).length - 1;
  if (got !== n) throw new Error(`mutation ${MUTATE}: expected ${n} copies, found ${got}`);
  SRC = SRC.split(from).join(to);
  console.log(`mutation ${MUTATE}: replaced ${got}`);
}

// Runs in the page: the element's ink (its own colour times every ancestor's opacity) over the colour behind it. When a
// gradient is behind it, every colour stop of that gradient is a candidate background and the lowest ratio is returned.
function measure(sel) {
  const el = [...document.querySelectorAll(sel)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; });
  if (!el) return null;
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ""); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  // Backgrounds: walk up; the first gradient met gives its stops; the first opaque colour ends the walk.
  let layers = [], stops = null;
  for (let e = el; e; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (!stops && cs.backgroundImage.includes("gradient")) { stops = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse); break; }
    const c = parse(cs.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
  }
  const comp = (base) => { let b = base; for (let i = layers.length - 1; i >= 0; i--) b = over(layers[i], b); return b; };
  const bases = stops && stops.length ? stops.map((s) => over(s, { r: 255, g: 255, b: 255, a: 1 })) : [{ r: 255, g: 255, b: 255, a: 1 }];
  let op = 1; for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
  const f = parse(getComputedStyle(el).color);
  let worst = null;
  for (const base of bases) { const bg = comp(base); const ink = over({ ...f, a: f.a * op }, bg); const r = ratio(ink, bg); if (!worst || r < worst.r) worst = { r, ink: hex(ink), bg: hex(bg) }; }
  return { ...worst, gradient: !!stops };
}

const VIEWS = [[320, 640], [390, 844], [768, 1024], [740, 360], [1280, 800]];
// [label, selector, look, minimum]
const TARGETS = [
  ["Night heading", "#wheelPopupView > .wheel-heading .wheel-title-main", "night", 4.5],
  ["Night heading (Approaches)", "#wheelPopupView > .wheel-heading .wheel-title-approach", "night", 4.5],
  ["Light heading", "#wheelPopupView > .wheel-heading .wheel-title-main", "light", 4.5],
  ["unit caret", "#wheelUnitBtn .wheel-unit-capsule-caret", "night", 4.5],
  ["unit caret", "#wheelUnitBtn .wheel-unit-capsule-caret", "light", 4.5],
  ["Light section caret", ".ways-caret", "light", 4.5],
  ["section caret", ".ways-caret", "night", 4.5],
];
const browser = await chromium.launch();
let seen = { "Night heading": 0, "unit caret": 0, "Light section caret": 0 };
for (const look of ["night", "light"]) for (const lang of ["en", "bn"]) for (const [w, h] of VIEWS) {
  const ctx = await newContext(browser, { viewport: { width: w, height: h }, appLang: lang });
  await ctx.addInitScript((l) => { try { localStorage.setItem("mm_card_look", l); } catch {} }, look);
  if (SRC) await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html", body: SRC }));
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForSelector("#wheelUnitBtn", { state: "attached", timeout: 15000 });
  const lookNow = await page.evaluate(() => document.documentElement.dataset.cardLook);
  check(`${look} ${lang} ${w}x${h}: the page is in the ${look} look`, lookNow === look, lookNow);
  for (const [label, sel, tl, min] of TARGETS) {
    if (tl !== look) continue;
    const m = await page.evaluate(measure, sel);
    if (!m) { console.log(`  --    ${label} ${look} ${lang} ${w}x${h}: not on screen`); continue; }
    if (label in seen) seen[label]++;
    check(`${label} ${look} ${lang} ${w}x${h} reads >= ${min}:1`, m.r >= min, `${m.r.toFixed(2)} (${m.ink} on ${m.bg}${m.gradient ? ", gradient" : ""})`);
  }
  await ctx.close();
}
await browser.close();
// Positive controls: a measurement that never happened proves nothing.
for (const [k, n] of Object.entries(seen)) check(`positive control: "${k}" was really measured (${n} views)`, n >= 4, String(n));
console.log(`\nqr-wheel-contrast: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

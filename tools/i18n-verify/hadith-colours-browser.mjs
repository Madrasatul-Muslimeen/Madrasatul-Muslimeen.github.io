// Hadith Study "Card colours" (the Owner's choice of 8 Nov 2026): Original, A (Night), A2 (Bright navy), A6 (Copper border).
// Checked on the real HadeethEnc card 65070, in both languages and at 360px with 200% text:
//   - the menu bar offers the four, named in the reader's language; choosing one changes the cards at once (no reload);
//   - the choice is stored on the device and survives a reload, with the attribute set before first paint;
//   - each set's text, quiet text, heading, link and pressed mark read on the card's own background (>= 4.5:1);
//   - the Light card look is not touched by any of them;
//   - the picker is at least 40px tall and the bar does not run off the screen.
// Run from the repository root with serve.js on :8080. Exits 0 only when every check passed.
//   --mutate=<name> serves one deliberate break (the run must FAIL); --prove runs them all.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

const MUT = {
  nopersist: ["js/hadith-colours.js", "try { localStorage.setItem(COLOURS_KEY, v); } catch { /* the choice still applies to this visit */ }", ""],
  nolive: ["js/hadith-colours.js", "  document.documentElement.setAttribute(\"data-hadith-colours\", v);\n  return v;\n}\n/** Call once", "  return v;\n}\n/** Call once"],
  paleA2: ["css/hadith.css", "--card-bg-inset: #1f3558;", "--card-bg-inset: #dfe8f7;"],
  faintcopper: ["css/hadith.css", "--card-heading: #D99A5B; --card-link: #D99A5B;", "--card-heading: #3a2a14; --card-link: #3a2a14;"],
  leaklight: ["css/hadith.css", "html[data-card-look=\"night\"][data-hadith-colours=\"a2\"] { --card-bg:", "html[data-hadith-colours=\"a2\"] { --card-bg:"],
  fourth: ["js/hadith-colours.js", "  { id: \"a6\", name: \"Copper border (A6)\" },\n", ""],
  slowhead: ["app/hadith-study.html", "document.documentElement.setAttribute('data-hadith-colours',/^(a|a2|a6)$/.test(c)?c:'original');", ""],
};
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3);
const MUTATE = arg("mutate");
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
if (process.argv.includes("--prove")) {
  const missed = []; let caught = 0;
  for (const name of Object.keys(MUT)) {
    const r = spawnSync(process.execPath, [process.argv[1], `--mutate=${name}`], { encoding: "utf8", timeout: 900000 });
    const out = (r.stdout || "").trim(); const ff = out.split("\n").find((l) => l.startsWith("  FAIL  "));
    if (r.status !== 0 && ff) { caught++; console.log(`  CAUGHT  ${name}: ${ff.trim().slice(0, 130)}`); } else { missed.push(name); console.log(`  MISSED  ${name}`); }
  }
  console.log(`\n==== hadith-colours mutations: ${caught} of ${Object.keys(MUT).length} caught ====`);
  process.exit(missed.length ? 1 : 0);
}

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const SEED = `DATA.hadithKeyMarks = [{ _id: "t1__p1__hadeethenc", tenantId: "t1", scope: "p1", collection: "hadeethenc", schemaVersion: 1, createdBy: "u", entries: {"hadith:hadeethenc:65070":["practice"]} }];`;
async function open(lang, width, zoom = 1, ctxIn = null) {
  const ctx = ctxIn ?? await newContext(browser, { appLang: lang, viewport: { width, height: 800 }, extraSeedJs: SEED });
  if (MUTATE && !ctxIn) {
    const [file0, a, b] = MUT[MUTATE]; const file = file0.replace(/^app\//, "");
    const isHtml = file.endsWith(".html");
    await ctx.route(isHtml ? `**/app/${file}*` : `**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: isHtml ? "text/html; charset=utf-8" : file.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/hadith-study.html?resume=hadith:hadeethenc:65070");
  if (zoom !== 1) await page.evaluate((z) => { document.documentElement.style.fontSize = `${16 * z}px`; }, zoom);
  await page.waitForSelector('[data-hadeethenc-card="65070"] .hkm-btn[aria-pressed="true"]', { timeout: 25000 }).catch(() => {});
  return { ctx, page, errors };
}
const measure = (P) => P.evaluate(() => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r, g, b, a }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (n) => { for (let e = n; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.9) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const rr = (f, b) => { const [x, y] = [lum(f), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  // A gradient background (the Night look's own button) is measured at its WORST colour stop, never at the card behind it.
  const ratio = (sel, ownBg = false) => { const n = document.querySelector(sel); if (!n) return 0; const cs = getComputedStyle(n), f = parse(cs.color);
    let backs = [ownBg ? bgOf(n) : bgOf(n.parentElement)];
    if (ownBg && /gradient/.test(cs.backgroundImage)) backs = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean);
    return Math.round(Math.min(...backs.map((b) => rr(f, b))) * 100) / 100; };
  const card = document.querySelector('[data-hadeethenc-card="65070"]');
  const cs = card ? getComputedStyle(card) : null;
  return { attr: document.documentElement.getAttribute("data-hadith-colours"), cardBg: cs?.backgroundColor, cardBorder: cs?.borderTopColor, cardBorderW: cs?.borderTopWidth,
    text: ratio(".hadith-translation-text, .hadith-fallback"), muted: ratio(".hadith-attribution"), heading: ratio('[data-hadeethenc-card="65070"] .hadith-view-source'),
    link: ratio('[data-hadeethenc-card="65070"] .hadeethenc-crumb'),
    inset: getComputedStyle(document.documentElement).getPropertyValue("--card-bg-inset").trim(), pressed: ratio('.hkm-btn[aria-pressed="true"]', true) };
});
const EXPECT = { a: "rgb(19, 25, 42)", a2: "rgb(31, 53, 88)", a6: "rgb(19, 25, 42)" };

for (const [lang, width, zoom] of [["en", 1280, 1], ["bn", 390, 1], ["en", 360, 2]]) {
  const tag = `[${lang} ${width}px x${zoom}]`;
  console.log(`\n===== hadith card colours ${tag} =====`);
  const { ctx, page: P, errors } = await open(lang, width, zoom);
  const opts = await P.$$eval("#hadithColours option", (os) => os.map((o) => ({ v: o.value, t: o.textContent.trim() })));
  check(`${tag} the menu bar offers four choices`, opts.map((o) => o.v).join() === "original,a,a2,a6", JSON.stringify(opts));
  if (lang === "bn") check(`${tag} named in Bangla`, opts[0].t === "আসল" && opts[3].t.startsWith("তামার"), JSON.stringify(opts.map((o) => o.t)));
  check(`${tag} the picker is at least 40px tall`, (await P.$eval("#hadithColours", (n) => n.getBoundingClientRect().height)) >= 39.5);
  check(`${tag} the bar does not run off the screen`, (await P.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
  const base = await measure(P);
  check(`${tag} it starts on Original (the look as it is today)`, base.attr === "original", base.attr);
  for (const id of ["a", "a2", "a6", "original"]) {
    await P.selectOption("#hadithColours", id);
    await P.waitForTimeout(150);
    const m = await measure(P);
    check(`${tag} [${id}] the cards change at once`, m.attr === id, m.attr);
    if (id !== "original") check(`${tag} [${id}] the card surface is that set's own`, m.cardBg === EXPECT[id], `${m.cardBg}`);
    else check(`${tag} [original] the card surface is back to today's`, m.cardBg === base.cardBg, `${m.cardBg} vs ${base.cardBg}`);
    if (id === "a6") check(`${tag} [a6] the card edge is copper and thicker`, /217, 154, 91/.test(m.cardBorder) && m.cardBorderW === "2px", `${m.cardBorder} ${m.cardBorderW}`);
    for (const k of ["text", "muted", "heading", "link", "pressed"]) check(`${tag} [${id}] ${k} reads on the card (>= 4.5:1)`, m[k] >= 4.5, String(m[k]));
    if (id !== "original") {
      const stored = await P.evaluate(() => localStorage.getItem("mm_hadith_colours"));
      check(`${tag} [${id}] the choice is stored on this device`, stored === id, String(stored));
    }
  }
  await P.selectOption("#hadithColours", "a2");
  await P.reload({ waitUntil: "networkidle" });
  await P.waitForSelector('[data-hadeethenc-card="65070"]', { timeout: 25000 }).catch(() => {});
  const after = await measure(P);
  check(`${tag} the choice survives a reload`, after.attr === "a2" && after.cardBg === EXPECT.a2, JSON.stringify([after.attr, after.cardBg]));
  await P.evaluate(() => document.documentElement.setAttribute("data-card-look", "light"));
  const light = await measure(P);
  check(`${tag} the Light card look is not touched by a colour set (its own card colour stays)`, light.inset.toLowerCase() === "#f6f2e4", light.inset);
  check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== hadith-colours: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);

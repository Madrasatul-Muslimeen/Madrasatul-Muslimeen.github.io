// Issue 479 -- a long tagline scrolls sideways so it can be read whole, with an
// on/off setting and a speed setting.
//
//   node tools/i18n-verify/tagline-scroll-browser.mjs
//   node ... ignore-scroll   (mutation: the strip ignores `scroll`; must FAIL "off")
//   node ... ignore-speed    (mutation: the strip ignores the speed; must FAIL "speed")
import { chromium, newContext, openPage } from "./harness.mjs";
import { taglineSettingsFrom, TAGLINE_SETTING_DEFAULTS } from "../../app/js/taglines.js";
import { scrollPixelsPerSecond, scrollPlan } from "../../app/js/tagline-scroll.js";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = process.argv[2] || "";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

const LONG_EN = "Have you ever weighed a gold bar (12.4 kg) in your hand? It is heavier than you would think, and the weight of a single line of revelation is heavier still, so read it slowly.";
const LONG_BN = "আপনি কি কখনো হাতে একটি সোনার বার (১২.৪ কেজি) ওজন করে দেখেছেন? ভাবনার চেয়ে এটি অনেক ভারী, আর ওহির একটি লাইনের ওজন তার চেয়েও ভারী, তাই ধীরে ধীরে পড়ুন। এক একটি শব্দ থেমে থেমে পড়ুন এবং তার অর্থ নিয়ে ভাবুন, তাহলেই হৃদয়ে তার প্রভাব পড়বে।";
const line = (id, en, bn, extra = {}) => ({ id, text: { en, bn }, link: null, order: extra.order ?? 10, status: "active", holdDays: 7, ayahRef: null, ...extra });
const LINES = [line("long", LONG_EN, LONG_BN, { order: 10 }), line("short", "Short one", "ছোট", { order: 20, holdDays: 0 })];
const seedState = (ctx, id) => ctx.addInitScript((s) => { try { localStorage.setItem("mm_tagline_state", JSON.stringify(s)); } catch {} }, { id, since: Date.now() });
const clear = (page) => page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));

/** Open the landing page showing `id` and wait until it is on the strip. */
async function openStrip({ width = 390, lang = "en", settings = {}, lines = LINES, id = "long", reduced = false }) {
  const ctx = await newContext(browser, { banner: false, appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 844 }, taglines: { lines, settings: { motion: "fade", changeAfterSeconds: 2, pauseOnHold: true, ...settings } } });
  await seedState(ctx, id);
  if (MUTATE) {
    await ctx.route("**/app/js/taglines.js*", async (route) => {
      const r = await route.fetch(); let body = await r.text();
      if (MUTATE === "ignore-scroll") body = body.replace("scroll: s.scroll !== false,", "scroll: true,");
      if (MUTATE === "ignore-speed") body = body.replace(/scrollSpeed: Number\.isFinite\(speed\).*\n/, "scrollSpeed: 4,\n");
      await route.fulfill({ response: r, body });
    });
  }
  const { page: p, errors } = await openPage(ctx, "/app/quranrevival.html");
  if (reduced) await p.emulateMedia({ reducedMotion: "reduce" });
  const want = id === "long" ? (lang === "bn" ? LONG_BN : LONG_EN) : null;
  if (want) await p.waitForFunction((w) => document.querySelector("#taglineStrip .tagline-line")?.textContent.includes(w.slice(0, 12)), want, { timeout: 15000 });
  await clear(p);
  await p.waitForTimeout(500);
  if (reduced) await p.reload(), await p.waitForFunction((w) => document.querySelector("#taglineStrip .tagline-line")?.textContent.includes(w.slice(0, 12)), want, { timeout: 15000 });
  return { ctx, page: p, errors };
}

const SNAP = () => {
  const strip = document.getElementById("taglineStrip");
  const el = strip.querySelector(".tagline-line:not(.tagline-leaving)");
  const track = el.querySelector(".tagline-track");
  const m = new DOMMatrix(getComputedStyle(track).transform);
  const sr = strip.getBoundingClientRect();
  const range = document.createRange();
  const tn = [...track.querySelectorAll("*"), track].flatMap((n) => [...n.childNodes]).filter((n) => n.nodeType === 3 && n.textContent.trim());
  const last = tn[tn.length - 1];
  range.setStart(last, Math.max(0, last.textContent.length - 1));
  range.setEnd(last, last.textContent.length);
  const rr = range.getBoundingClientRect();
  return {
    tx: Math.round(m.m41), text: el.textContent.trim(), title: el.getAttribute("title"),
    ellipsis: getComputedStyle(el).textOverflow === "ellipsis", scrolling: el.classList.contains("tagline-scrolling"),
    lastInside: rr.right <= sr.right + 1 && rr.left >= sr.left - 1, stripH: Math.round(sr.height),
    stripW: Math.round(sr.width),
  };
};

// ---- pure: clamping and the speed map ------------------------------------
{
  const f = (v) => taglineSettingsFrom({ taglineSettings: v });
  check("clamp: speed 0 -> 4", f({ scrollSpeed: 0 }).scrollSpeed === 4);
  check("clamp: speed 99 -> 4", f({ scrollSpeed: 99 }).scrollSpeed === 4);
  check("clamp: speed \"x\" -> 4", f({ scrollSpeed: "x" }).scrollSpeed === 4);
  check("clamp: missing speed -> 4", f({}).scrollSpeed === 4 && taglineSettingsFrom(null).scrollSpeed === 4);
  check("clamp: speed 1 and 10 kept, 6.4 rounds to 6", f({ scrollSpeed: 1 }).scrollSpeed === 1 && f({ scrollSpeed: 10 }).scrollSpeed === 10 && f({ scrollSpeed: 6.4 }).scrollSpeed === 6);
  check("clamp: missing / junk scroll -> true, false stays false", f({}).scroll === true && f({ scroll: "no" }).scroll === true && f({ scroll: false }).scroll === false);
  check("defaults: scroll on, speed 4", TAGLINE_SETTING_DEFAULTS.scroll === true && TAGLINE_SETTING_DEFAULTS.scrollSpeed === 4);
  check("map: 27 px/s at 1, 135 at 10", scrollPixelsPerSecond(1) === 27 && scrollPixelsPerSecond(10) === 135);
  check("plan: 270px at 27px/s slides 10s, plus two 1.5s holds", scrollPlan(270, 1).slideMs === 10000 && scrollPlan(270, 1).totalMs === 13000);
}

// ---- on the strip --------------------------------------------------------
for (const lang of ["en", "bn"]) {
  for (const width of [320, 390, 1280]) {
    const tag = `${lang} ${width}px`;
    const { ctx, page, errors } = await openStrip({ width, lang, settings: { scrollSpeed: 10 } });
    const s0 = await page.evaluate(SNAP);
    const stripW = s0.stripW;
    const longWide = await page.evaluate(() => { const t = document.querySelector("#taglineStrip .tagline-track"); return t.offsetWidth; });
    check(`[${tag}] the long line is wider than the strip`, longWide > stripW, `${longWide} vs ${stripW}`);
    check(`[${tag}] no ellipsis while scrolling`, s0.scrolling && !s0.ellipsis, JSON.stringify(s0));
    check(`[${tag}] the start is shown still first`, s0.tx === 0, JSON.stringify(s0));
    let moved = false, ended = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 14000 && !(moved && ended)) {
      const s = await page.evaluate(SNAP);
      if (s.tx < -2) moved = true;
      if (moved && s.lastInside) ended = true;
      await page.waitForTimeout(150);
    }
    check(`[${tag}] the transform changes over time`, moved);
    check(`[${tag}] the last character ends up inside the strip`, ended);
    check(`[${tag}] the strip keeps its height`, (await page.evaluate(SNAP)).stripH <= 19, String((await page.evaluate(SNAP)).stripH));
    check(`[${tag}] no page errors (besides TLS)`, errors.filter((e) => !/ERR_CERT|net::/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}

{
  // The short line never moves.
  const { ctx, page } = await openStrip({ settings: { scrollSpeed: 10 }, lines: [line("short", "Short one", "ছোট", { holdDays: 7 })], id: "short" });
  await page.waitForTimeout(2800);
  const a = await page.evaluate(SNAP);
  await page.waitForTimeout(1800);
  const b = await page.evaluate(SNAP);
  check("a short line never moves and keeps the ellipsis setting", a.tx === 0 && b.tx === 0 && !a.scrolling && a.ellipsis, JSON.stringify([a, b]));
  await ctx.close();
}

// ---- off / reduced motion -------------------------------------------------
{
  const { ctx, page } = await openStrip({ settings: { scroll: false } });
  await page.waitForTimeout(2500);
  const s = await page.evaluate(SNAP);
  await page.waitForTimeout(1500);
  const s2 = await page.evaluate(SNAP);
  check("off: with scroll false the long line does not move and keeps the ellipsis", s.tx === 0 && s2.tx === 0 && s.ellipsis && !s.scrolling, JSON.stringify([s, s2]));
  await ctx.close();
}
{
  const { ctx, page } = await openStrip({ reduced: true });
  await page.waitForTimeout(2500);
  const s = await page.evaluate(SNAP);
  check("reduced motion: it does not move, keeps the ellipsis, and the title holds the full text", s.tx === 0 && s.ellipsis && !s.scrolling && s.title === LONG_EN, JSON.stringify(s));
  await ctx.close();
}

// ---- speed ----------------------------------------------------------------
{
  const pass1 = {};
  for (const speed of [1, 10]) {
    const { ctx, page } = await openStrip({ settings: { scrollSpeed: speed } });
    const total = await page.evaluate(() => document.querySelector("#taglineStrip .tagline-track").getAnimations()[0]?.effect.getComputedTiming().duration);
    pass1[speed] = total;
    await ctx.close();
  }
  const over = (LONG_EN.length);
  void over;
  const ratio = pass1[1] && pass1[10] ? (pass1[1] - 3000) / (pass1[10] - 3000) : 0;
  check("speed: a pass at speed 10 is much shorter than at speed 1 (slide ratio ~ 147/27)", pass1[10] < pass1[1] && Math.abs(ratio - 147 / 27) < 0.6, `${pass1[1]} / ${pass1[10]} ratio ${ratio.toFixed(2)}`);
}

// ---- the line waits for its pass ------------------------------------------
{
  // An ayah-attached long line is open; the reader goes to another ayah, which
  // schedules the ordinary line 2 s later. The long line must not be removed
  // before its first pass has been shown.
  const lines = [line("gen", "Ordinary line", "সাধারণ", { order: 10 }), line("long", LONG_EN, LONG_BN, { order: 20, ayahRef: "1:3", holdDays: 0 })];
  const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 844 }, taglines: { lines, settings: { motion: "fade", changeAfterSeconds: 2, scrollSpeed: 10 } } });
  await seedState(ctx, "gen");
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(2600);
  await clear(page);
  const setAyah = (n) => page.evaluate((v) => { const sel = document.getElementById("ayahSelect"); sel.value = v; sel.dispatchEvent(new Event("change", { bubbles: true })); }, String(n));
  await setAyah(3);
  await page.waitForFunction(() => document.querySelector("#taglineStrip .tagline-line")?.textContent.includes("Have you ever"), null, { timeout: 5000 });
  const total = await page.evaluate(() => document.querySelector("#taglineStrip .tagline-track").getAnimations()[0]?.effect.getComputedTiming().duration);
  const t0 = Date.now();
  await setAyah(1);
  await page.waitForTimeout(2600); // past the 2 s "Change after"
  const still = await page.evaluate(() => document.querySelector("#taglineStrip .tagline-line:not(.tagline-leaving)").textContent.includes("Have you ever"));
  check("wait: with Change after 2 s the line is not replaced halfway through its pass", total > 4000 && still, `pass ${total}ms, still=${still}`);
  await page.waitForFunction(() => document.querySelector("#taglineStrip .tagline-line:not(.tagline-leaving)")?.textContent.trim() === "Ordinary line", null, { timeout: 15000 });
  const waited = Date.now() - t0;
  check("wait: it changes once the pass has ended", waited >= total - 600, `${waited}ms vs pass ${total}ms`);
  await ctx.close();
}

// ---- links keep working ---------------------------------------------------
{
  const lines = [line("lk", LONG_EN, LONG_BN, { link: { url: "https://example.org/x", target: "external" } })];
  const { ctx, page } = await openStrip({ lines });
  const info = await page.evaluate(() => { const a = document.querySelector("#taglineStrip a.tagline-line"); return { tag: a?.tagName, href: a?.href, scrolling: a?.classList.contains("tagline-scrolling"), target: a?.target }; });
  check("a link stays a link while it scrolls", info.tag === "A" && /example\.org/.test(info.href) && info.scrolling && info.target === "_blank", JSON.stringify(info));
  await ctx.close();
}

// ---- the settings page ------------------------------------------------------
for (const lang of ["en", "bn"]) {
  const ctx = await newContext(browser, { banner: false, appLang: lang === "bn" ? "bn" : null, viewport: { width: 390, height: 900 }, taglines: { lines: LINES, settings: { motion: "fade", changeAfterSeconds: 2 } } });
  const { page } = await openPage(ctx, "/app/taglines.html");
  await page.waitForSelector("#scrollToggle", { state: "visible", timeout: 15000 });
  const ui = await page.evaluate(() => ({
    on: document.getElementById("scrollToggle").checked, speed: document.getElementById("scrollSpeedInput").value,
    label: document.querySelector('label[for="scrollToggle"]').textContent.trim(), speedLabel: document.querySelector('label[for="scrollSpeedInput"]').textContent.trim(),
    words: document.getElementById("scrollSpeedLabel").textContent.trim(), type: document.getElementById("scrollSpeedInput").type,
  }));
  check(`[settings ${lang}] defaults: on, speed 4, a slider`, ui.on === true && ui.speed === "4" && ui.type === "range", JSON.stringify(ui));
  if (lang === "bn") check("[settings bn] the controls are translated", /[ঀ-৿]/.test(ui.label) && /[ঀ-৿]/.test(ui.speedLabel) && /মাঝারি/.test(ui.words), JSON.stringify(ui));
  else check("[settings en] the controls read in plain words", ui.label === "Scroll long lines" && ui.speedLabel === "Scroll speed" && /Medium/.test(ui.words), JSON.stringify(ui));

  if (lang === "en") {
    await page.waitForTimeout(400);
    const prev = () => page.evaluate(() => { const el = document.querySelector("#previewStrip .tagline-line:not(.tagline-leaving)"); return { scrolling: el.classList.contains("tagline-scrolling"), width: el.clientWidth, track: el.querySelector(".tagline-track")?.offsetWidth, d: el.querySelector(".tagline-track")?.getAnimations()[0]?.effect.getComputedTiming().duration ?? null }; });
    // Make the first line long in the preview.
    await page.evaluate((txt) => { const i = document.querySelector("#lineRows .tl-text"); i.value = txt; i.dispatchEvent(new Event("change", { bubbles: true })); }, LONG_EN + " " + LONG_EN);
    await page.waitForTimeout(300);
    const p1 = await prev();
    check("[settings] the preview scrolls a long line", p1.scrolling && p1.d > 3000, JSON.stringify(p1));
    await page.evaluate(() => { const s = document.getElementById("scrollSpeedInput"); s.value = "10"; s.dispatchEvent(new Event("input", { bubbles: true })); });
    await page.waitForTimeout(200);
    const p2 = await prev();
    check("[settings] the preview reacts live to the slider", p2.d < p1.d, JSON.stringify([p1.d, p2.d]));
    await page.click("#scrollToggle");
    await page.waitForTimeout(200);
    const p3 = await prev();
    check("[settings] the preview stops when the checkbox is cleared", !p3.scrolling && p3.d === null, JSON.stringify(p3));
    await page.click("#saveBtn");
    await page.waitForTimeout(600);
    const writes = await page.evaluate(() => JSON.parse(sessionStorage.getItem("__stubWrites") || "[]"));
    const w = writes.find((x) => x.col === "tenants");
    check("[settings] Save writes taglineSettings (the full settings object)", Boolean(w) && w.data.includes("taglineSettings"), JSON.stringify(writes));
    const saved = await page.evaluate(() => (window.__stubWriteData || []).find((x) => x.col === "tenants")?.data?.taglineSettings ?? null);
    check("[settings] the written settings carry scroll false and scrollSpeed 10", saved?.scroll === false && saved?.scrollSpeed === 10, JSON.stringify(saved));
  }
  await ctx.close();
}

console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
await browser.close();
process.exit(fail ? 1 : 0);
